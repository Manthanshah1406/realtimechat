const { getPubClient } = require('../config/redis');
const { getPool }      = require('../config/db');

async function getContactIds(userId) {
  const { rows } = await getPool().query(
    `SELECT DISTINCT cm2.user_id
     FROM conversation_members cm1
     JOIN conversation_members cm2 ON cm2.conversation_id = cm1.conversation_id
     WHERE cm1.user_id = $1 AND cm2.user_id <> $1`,
    [userId]
  );
  return rows.map((r) => r.user_id);
}

function registerPresenceHandlers(io, socket) {
  const redis  = getPubClient();
  const userId = socket.user.id;

  (async () => {
    try {
      // Mark this user online
      await redis.set(`user:${userId}:online`, '1');

      const contacts = await getContactIds(userId);

      // 1. Tell each contact "this user is now online"
      for (const contactId of contacts) {
        io.to(`user:${contactId}`).emit('presence:online', { userId });
      }

      // 2. Tell THIS socket which contacts are already online right now
      for (const contactId of contacts) {
        const val = await redis.get(`user:${contactId}:online`);
        if (val === '1') {
          socket.emit('presence:online', { userId: contactId });
        }
      }
    } catch (err) {
      console.error('presence connect error', err);
    }
  })();

  // Bulk status check — called by client after conversations load
  socket.on('presence:check', async (userIds, callback) => {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return callback?.({ online: [] });
      }

      // Check each key individually — avoids pipeline format confusion
      const onlineUsers = [];
      for (const id of userIds) {
        const val = await redis.get(`user:${id}:online`);
        if (val === '1') onlineUsers.push(id);
      }

      callback?.({ online: onlineUsers });
    } catch (err) {
      console.error('presence:check error', err);
      callback?.({ online: [] });
    }
  });

  socket.on('disconnect', async () => {
    try {
      await redis.del(`user:${userId}:online`);
      const contacts = await getContactIds(userId);
      for (const contactId of contacts) {
        io.to(`user:${contactId}`).emit('presence:offline', { userId });
      }
    } catch (err) {
      console.error('presence disconnect error', err);
    }
  });
}

module.exports = registerPresenceHandlers;
