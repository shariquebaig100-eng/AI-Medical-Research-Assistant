const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatControllers');

router.post('/', chatController.sendMessage);
router.post('/feedback', chatController.submitFeedback);
router.get('/:sessionId', chatController.getSession);
router.delete('/:sessionId', chatController.clearSession);

module.exports = router;