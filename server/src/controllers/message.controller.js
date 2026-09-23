const MessageModel = require('../models/message.model');

async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    // `since` is an ISO timestamp — used for resync after reconnect
    const since = req.query.since || null;

    const messages = await MessageModel.findByConversation(
      conversationId, limit, offset, since
    );
    res.json({ messages, page, limit });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMessages };
