const { Router } = require('express');
const { getMessages } = require('../controllers/message.controller');
const { authMiddleware } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

// GET /api/messages/:conversationId?page=1&limit=30
router.get('/:conversationId', getMessages);

module.exports = router;
