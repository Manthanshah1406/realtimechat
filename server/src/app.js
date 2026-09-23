require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectPostgres } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { initSocketIO } = require('./sockets');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const conversationRoutes = require('./routes/conversation.routes');
const messageRoutes      = require('./routes/message.routes');
const uploadRoutes       = require('./routes/upload.routes');

const app = express();
const httpServer = http.createServer(app);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static uploads (local dev) ────────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/upload',        uploadRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  await connectPostgres();
  await connectRedis();
  initSocketIO(httpServer);

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
