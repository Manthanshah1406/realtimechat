const MessageModel       = require('../models/message.model');
const MessageStatusModel = require('../models/messageStatus.model');
const { getPool }        = require('../config/db');
const { messageSendLimiter } = require('../middleware/socketRateLimiter');

/**
 * Handles real-time message events.
 * Persists every message to Postgres then broadcasts to the conversation room.
 * Also handles read receipts and unread counts.
 */
function registerMessageHandlers(io, socket) {

  // ── Send message ──────────────────────────────────────────────────────────
  socket.on('message:send', async (data, callback) => {
    try {
      // Rate limit — 30 messages per 10 seconds per user
      const allowed = await messageSendLimiter(socket.user.id, callback);
      if (!allowed) return;

      const { conversationId, content, attachmentUrl = null } = data;

      if (!conversationId || (!content?.trim() && !attachmentUrl)) {
        if (callback) callback({ status: 'error', message: 'conversationId and content are required' });
        return;
      }

      // Persist
      const message = await MessageModel.create({
        conversationId,
        senderId: socket.user.id,
        content: content?.trim() || null,
        attachmentUrl,
      });

      // Broadcast to room (includes sender so their UI updates too)
      io.to(`conversation:${conversationId}`).emit('message:new', {
        ...message,
        username: socket.user.username,
      });

      // Mark as 'delivered' for all other members currently in the room
      const { rows: members } = await getPool().query(
        `SELECT user_id FROM conversation_members
         WHERE conversation_id = $1 AND user_id <> $2`,
        [conversationId, socket.user.id]
      );
      for (const { user_id } of members) {
        await MessageStatusModel.upsert(message.id, user_id, 'delivered');
      }

      // Notify sender of delivered status
      socket.emit('message:status_update', {
        messageId: message.id,
        conversationId,
        status: 'delivered',
      });

      if (callback) callback({ status: 'ok', message });
    } catch (err) {
      console.error('message:send error', err);
      if (callback) callback({ status: 'error', message: err.message });
    }
  });

  // ── User opened a conversation — mark all messages seen ──────────────────
  socket.on('conversation:open', async ({ conversationId }, callback) => {
    try {
      await MessageStatusModel.markConversationSeen(conversationId, socket.user.id);

      // Tell the senders their messages were seen
      const { rows: messages } = await getPool().query(
        `SELECT DISTINCT sender_id FROM messages
         WHERE conversation_id = $1 AND sender_id <> $2`,
        [conversationId, socket.user.id]
      );
      for (const { sender_id } of messages) {
        io.to(`user:${sender_id}`).emit('message:status_update', {
          conversationId,
          status: 'seen',
          seenBy: socket.user.id,
        });
      }

      if (callback) callback({ status: 'ok' });
    } catch (err) {
      console.error('conversation:open error', err);
    }
  });

  // ── Fetch unread counts for all conversations ────────────────────────────
  socket.on('unread:get', async (_, callback) => {
    try {
      const counts = await MessageStatusModel.getUnreadCounts(socket.user.id);
      if (callback) callback({ counts });
    } catch (err) {
      console.error('unread:get error', err);
      if (callback) callback({ counts: [] });
    }
  });
}

module.exports = registerMessageHandlers;
