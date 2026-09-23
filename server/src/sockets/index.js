const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { getPubClient, getSubClient } = require('../config/redis');
const { socketAuthMiddleware } = require('../middleware/auth');
const { getPool } = require('../config/db');
const registerMessageHandlers  = require('./messageHandlers');
const registerPresenceHandlers  = require('./presenceHandlers');
const registerTypingHandlers    = require('./typingHandlers');

let io;

/**
 * Fetch all conversation IDs this user belongs to and join their Socket.IO rooms.
 * This ensures messages broadcast to `conversation:{id}` reach this socket.
 */
async function joinConversationRooms(socket) {
  const { rows } = await getPool().query(
    `SELECT conversation_id FROM conversation_members WHERE user_id = $1`,
    [socket.user.id]
  );
  for (const row of rows) {
    socket.join(`conversation:${row.conversation_id}`);
  }
}

function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN,
      credentials: true,
    },
    adapter: createAdapter(getPubClient(), getSubClient()),
  });

  // Authenticate every socket connection via JWT
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    console.log(`Socket connected: ${socket.id} (user ${socket.user.username})`);

    // Personal room — lets us target this user directly
    socket.join(`user:${socket.user.id}`);

    // Join all existing conversation rooms
    try {
      await joinConversationRooms(socket);
    } catch (err) {
      console.error('Failed to join conversation rooms:', err.message);
    }

    registerMessageHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerTypingHandlers(io, socket);

    // Allow client to join a new conversation room after creation
    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} (user ${socket.user.username})`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialised — call initSocketIO() first');
  return io;
}

module.exports = { initSocketIO, getIO };
