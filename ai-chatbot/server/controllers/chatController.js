const Chat = require('../models/Chat');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// @desc    Create a new chat
// @route   POST /api/chat
// @access  Private
exports.createChat = async (req, res, next) => {
  try {
    const { title } = req.body;
    
    const chat = new Chat({
      userId: req.user.userId,
      title: title || 'New Chat',
      messages: []
    });

    await chat.save();

    res.status(201).json({
      success: true,
      chat
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all chats for a user
// @route   GET /api/chat
// @access  Private
exports.getChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 })
      .select('-messages');

    res.json({
      success: true,
      count: chats.length,
      chats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single chat
// @route   GET /api/chat/:id
// @access  Private
exports.getChat = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message
// @route   POST /api/chat/:id/message
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    
    // Add user message to chat
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      {
        $push: {
          messages: {
            sender: 'user',
            content
          }
        }
      },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Generate AI response
    try {
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful customer support assistant for an e-commerce store. Be friendly, concise, and helpful."
          },
          ...chat.messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          {
            role: "user",
            content: content
          }
        ]
      });

      const aiResponse = response.data.choices[0].message.content;

      // Add AI response to chat
      chat.messages.push({
        sender: 'bot',
        content: aiResponse
      });

      await chat.save();

      res.json({
        success: true,
        message: aiResponse,
        chat
      });

    } catch (error) {
      console.error('OpenAI API Error:', error);
      // Add error message to chat
      chat.messages.push({
        sender: 'bot',
        content: "I'm sorry, I'm having trouble connecting to the AI service. Please try again later."
      });
      
      await chat.save();
      
      res.status(500).json({
        success: false,
        message: 'Error generating AI response',
        error: error.message
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a chat
// @route   DELETE /api/chat/:id
// @access  Private
exports.deleteChat = async (req, res, next) => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
