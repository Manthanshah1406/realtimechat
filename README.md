# RealTimeChat

A full-stack real-time chat application — 1-on-1 messaging, group chat, presence indicators, typing indicators, read receipts, and file sharing. Built with the PERN stack + Socket.IO + Redis.

> **Live demo:** https://realtimechat-khaki.vercel.app
> **GitHub:** https://github.com/Manthanshah1406/realtimechat

---

## Features

| | Feature |
|-|---------|
| 🔐 | JWT authentication — signup, login, protected routes |
| 💬 | Real-time 1-on-1 direct messaging |
| 👥 | Group chat — create, add/remove members, admin roles |
| 🟢 | Online presence — green dot via Redis, contact-scoped broadcast |
| ✍️ | Typing indicators — 5s TTL Redis keys, "X is typing…" |
| ✓✓ | Read receipts — sent · delivered · seen (persisted across reloads) |
| 🔔 | Unread badges — per conversation, clears on open |
| 📎 | File & image sharing via Cloudinary |
| 🔄 | Auto-reconnect + resync — fetches missed messages on reconnect |
| 📅 | Date separators — Today / Yesterday / full date |
| 🛡️ | Rate limiting — Redis INCR/EXPIRE, 30 msg/10s per user |
| ✅ | Input validation — Zod schemas on all REST endpoints |
| 📱 | Mobile responsive — sidebar collapses on small screens |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS |
| Backend | Node.js 22, Express 4, Socket.IO 4 |
| Database | PostgreSQL 16 |
| Cache / PubSub | Redis 7 |
| Auth | JWT + bcrypt |
| File uploads | Cloudinary |
| Validation | Zod |

---

## Architecture

```
React Client
    │
    ├── REST (auth, conversations, messages, upload)
    └── WebSocket (messages, presence, typing, receipts)
         │
    Express + Socket.IO
         │
         ├── @socket.io/redis-adapter ──► Redis
         │                                  └── presence keys, typing TTLs,
         │                                      socket pub/sub, rate limits
         └── PostgreSQL
                └── users, conversations, messages, message_status
```

**Why Redis matters:** Multiple Node instances can't share socket state directly. `@socket.io/redis-adapter` uses pub/sub so any instance can broadcast to any connected socket — horizontal scaling without sticky sessions.

---

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 16 on `localhost:5432`
- Redis on `localhost:6379`

```cmd
REM Start Redis via Docker:
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack-server:latest
```

### 1. Clone & install

```cmd
git clone https://github.com/YOUR_USERNAME/realtimechat.git
cd realtimechat
install.bat
```

Or manually:
```cmd
cd server && npm install
cd ..\client && npm install
```

### 2. Create the database (pgAdmin or psql)

```sql
CREATE DATABASE realtimechat;
CREATE USER chatuser WITH PASSWORD 'chatpass';
GRANT ALL PRIVILEGES ON DATABASE realtimechat TO chatuser;
GRANT ALL ON SCHEMA public TO chatuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO chatuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO chatuser;
```

### 3. Configure environment

```cmd
copy server\.env.example server\.env
```

Edit `server/.env`:
```env
DATABASE_URL=postgres://chatuser:chatpass@localhost:5432/realtimechat
REDIS_URL=redis://localhost:6379
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
CLIENT_ORIGIN=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Migrate + seed

```cmd
cd server
npm run migrate
npm run seed
```

Seed creates 3 demo users (all password: `demo1234`):
- `alice@demo.com`
- `bob@demo.com`
- `charlie@demo.com`

### 5. Start

```cmd
REM One command (from project root):
start.bat

REM Or manually in two terminals:
cd server && npm run dev      # http://localhost:4000
cd client && npm run dev      # http://localhost:5173
```

---

## Deploy to Production

### Server → Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select this repo, set root directory to `server`
3. Add environment variables (from `server/.env.example`):
   - `DATABASE_URL` — from Neon/Supabase
   - `REDIS_URL` — from Upstash (`rediss://...`)
   - `JWT_SECRET` — generate a strong secret
   - `CLIENT_ORIGIN` — your Vercel URL
   - `CLOUDINARY_*` — from Cloudinary dashboard
   - `NODE_ENV=production`
4. Railway auto-detects `npm start` from `package.json`

### Database → Neon

1. Go to [neon.tech](https://neon.tech) → Create project
2. Copy the connection string → set as `DATABASE_URL` in Railway
3. Run migrations against Neon:
   ```cmd
   cd server
   set DATABASE_URL=<your_neon_connection_string>
   npm run migrate
   ```

### Redis → Upstash

1. Go to [upstash.com](https://upstash.com) → Create Redis database
2. Copy the `rediss://` URL → set as `REDIS_URL` in Railway

### Client → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set root directory to `client`
3. Add environment variables:
   - `VITE_API_URL=https://your-server.railway.app`
   - `VITE_SOCKET_URL=https://your-server.railway.app`
4. Vercel auto-detects Vite and deploys

### After deploy

Update `CLIENT_ORIGIN` on Railway with your Vercel URL, then redeploy.

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | — | Register (zod validated) |
| POST | `/api/auth/login` | — | Login → JWT |
| GET | `/api/auth/me` | ✅ | Current user |
| GET | `/api/users` | ✅ | All users except self |
| GET | `/api/users/search?q=` | ✅ | Search by username |
| GET | `/api/conversations` | ✅ | List with members + last message |
| POST | `/api/conversations` | ✅ | Create direct or group |
| GET | `/api/conversations/:id` | ✅ | Single conversation |
| POST | `/api/conversations/:id/members` | ✅ | Add member (admin) |
| DELETE | `/api/conversations/:id/members/:uid` | ✅ | Remove member (admin) |
| PATCH | `/api/conversations/:id/members/:uid/role` | ✅ | Promote to admin |
| DELETE | `/api/conversations/:id/leave` | ✅ | Leave group |
| GET | `/api/messages/:convId?page=&limit=&since=` | ✅ | Paginated history |
| POST | `/api/upload` | ✅ | Upload file → Cloudinary URL |
| GET | `/health` | — | Health check |

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `message:send` | Client → Server | Send message (rate limited) |
| `message:new` | Server → Client | New message broadcast |
| `message:status_update` | Server → Client | delivered / seen receipt |
| `conversation:open` | Client → Server | Mark conversation seen |
| `conversation:join` | Bidirectional | Join new conversation room |
| `typing:start` / `typing:stop` | Bidirectional | Typing indicator |
| `presence:online` / `presence:offline` | Server → Client | Presence updates |
| `presence:check` | Client → Server | Bulk online status query |
| `unread:get` | Client → Server | Fetch unread counts |

---

## Project Structure

```
realtimechat/
├── client/src/
│   ├── api/client.js              # Axios + JWT interceptor
│   ├── context/
│   │   ├── AuthContext.jsx        # login/signup/logout
│   │   └── SocketContext.jsx      # connect, reconnect, resync
│   ├── hooks/
│   │   ├── usePresence.js         # online status tracking
│   │   └── useUnreadCounts.js     # unread badge counts
│   ├── components/
│   │   ├── Chat/                  # ConversationList, MessageThread,
│   │   │                          # MessageInput, TypingIndicator, Modal
│   │   ├── Group/GroupInfoPanel   # member management
│   │   └── UI/                    # Toast, Spinner, ConnectionBanner
│   └── pages/                     # Login, Signup, Chat
│
├── server/src/
│   ├── config/                    # db, redis, cloudinary
│   ├── sockets/                   # message, presence, typing handlers
│   ├── middleware/                 # auth, rateLimiter, socketRateLimiter, validate
│   ├── routes/                    # auth, users, conversations, messages, upload
│   ├── controllers/               # auth, conversation, message
│   └── models/                    # user, conversation, message, messageStatus
│
├── server/migrations/             # 5 SQL files + runner
├── server/scripts/seed.js         # demo data
├── install.bat                    # install all dependencies
├── start.bat                      # start Redis + server + client
└── README.md
```

---

## Interview Talking Points

- **Redis adapter for scaling** — why Socket.IO needs pub/sub across instances (vs sticky sessions)
- **Ephemeral state in Redis** — typing TTLs never bloat Postgres with transient data
- **Rate limiting with INCR/EXPIRE** — atomic Redis counter, no external library needed
- **Resync on reconnect** — `?since=<ISO>` fetches only the gap, not full history
- **Contact-scoped presence** — broadcasts only to users sharing a conversation
- **Zod validation** — schema-first, coerces + sanitises input before controllers see it
- **Transaction safety** — conversation creation uses `BEGIN/COMMIT/ROLLBACK`
- **REST vs WebSocket** — REST for CRUD/history, sockets only for real-time events

---

## Future Features

These are planned improvements beyond the current MVP:

| Feature | Description |
|---------|-------------|
| 📱 Push notifications | Browser/mobile push when a message arrives and the app is in background |
| 🔍 Message search | Full-text search across conversation history |
| 😀 Emoji reactions | React to messages with emoji (like Slack/WhatsApp) |
| ✏️ Edit & delete messages | Edit sent messages, delete for everyone |
| 📞 Voice / video calls | WebRTC-based peer-to-peer calling |
| 👤 User profiles | Avatar upload, bio, status message |
| 🔔 Notification preferences | Per-conversation mute settings |
| 📌 Pinned messages | Pin important messages in a group |
| 🌙 Dark mode | System-aware dark/light theme toggle |
| 📲 Mobile app | React Native client using the same backend |

---

## License

MIT
