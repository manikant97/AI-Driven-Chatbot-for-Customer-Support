const express = require('express');
const router = express.Router();
const { 
  createChat, 
  getChats, 
  getChat, 
  sendMessage, 
  deleteChat 
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// Apply protect middleware to all routes
router.use(protect);

// Chat routes
router.route('/')
  .get(getChats)
  .post(createChat);

router.route('/:id')
  .get(getChat)
  .delete(deleteChat);

router.post('/:id/message', sendMessage);

module.exports = router;
