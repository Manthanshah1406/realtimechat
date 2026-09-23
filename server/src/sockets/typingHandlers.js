const { getPubClient } = require('../config/redis');

const TYPING_TTL = 5; // seconds — auto-expires so stale indicators never stick

/**
 * Typing indicators via short-TTL Redis keys.
 * Key: typing:{conversationId}:{userId}
 *
 * Emits to the conversation room excluding the sender.
 */
function registerTypingHandlers(io, socket) {
  const redis  = getPubClient();
  const userId = socket.user.id;
  const username = socket.user.username;

  socket.on('typing:start', async ({ conversationId }) => {
    if (!conversationId) return;
    try {
      await redis.setex(`typing:${conversationId}:${userId}`, TYPING_TTL, username);
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        userId,
        username,
        conversationId,
      });
    } catch (err) {
      console.error('typing:start error', err);
    }
  });

  socket.on('typing:stop', async ({ conversationId }) => {
    if (!conversationId) return;
    try {
      await redis.del(`typing:${conversationId}:${userId}`);
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        userId,
        conversationId,
      });
    } catch (err) {
      console.error('typing:stop error', err);
    }
  });
}

module.exports = registerTypingHandlers;
