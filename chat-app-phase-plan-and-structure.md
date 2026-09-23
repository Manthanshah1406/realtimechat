# RealTimeChat — End-to-End Chat Application (Phase-Wise Plan & Structure)

## 1. Project Overview

A full-stack real-time chat application supporting 1-on-1 and group chats,
online presence, typing indicators, message history, and file sharing —
built to demonstrate WebSocket architecture, horizontal scaling with Redis,
and clean full-stack engineering.

**Stack:** PERN (Postgres, Express, React, Node) + Socket.IO + Redis + Docker

**Why this impresses HRs/interviewers:** Chat apps look simple but touch a
lot of real backend concepts — WebSockets, connection state, horizontal
scaling of stateful connections, message ordering/delivery, and read
receipts. Doing this well (not just "a socket.io tutorial clone") is a
strong signal.

---

## 2. Core Functionality

- User auth (signup/login, JWT)
- 1-on-1 direct messaging
- Group chat (create group, add/remove members)
- Real-time message delivery via WebSockets (Socket.IO)
- Online/offline presence indicators
- Typing indicators ("X is typing...")
- Message read receipts (sent / delivered / seen)
- Persistent message history (Postgres), paginated
- File/image sharing in chat
- Unread message counts per conversation
- Redis used for:
  - Socket.IO adapter (so multiple server instances can broadcast to each
    other — this is the key scaling concept to highlight)
  - Online presence store (`SET user:{id}:online`)
  - Typing indicator ephemeral state (auto-expiring keys)
- Docker Compose to run Postgres, Redis, and the app together

---

## 3. High-Level Architecture

```
Client A (React)                     Client B (React)
     |                                     |
     |  WebSocket (Socket.IO)              |  WebSocket
     v                                     v
        Node/Express Server Instance(s)
                    |
        Socket.IO Redis Adapter (pub/sub)
                    |
                 Redis  ---- presence, typing state, socket pub/sub
                    |
                Postgres  ---- users, conversations, messages, read receipts
```

**Why Redis matters here (be ready to explain this):**
If you run more than one Node server instance (for scaling), a socket
connected to Server A can't directly notify a socket connected to Server B.
Redis Pub/Sub (via `@socket.io/redis-adapter`) lets all server instances
broadcast events to each other, so messages reach the right user no matter
which instance they're connected to.

---

## 4. Data Model (Postgres)

**users**
`id, username, email, password_hash, avatar_url, created_at`

**conversations**
`id, type (direct/group), name (nullable for direct), created_at`

**conversation_members**
`id, conversation_id (FK), user_id (FK), joined_at, role (member/admin)`

**messages**
`id, conversation_id (FK), sender_id (FK), content, attachment_url, created_at`

**message_status**
`id, message_id (FK), user_id (FK), status (delivered/seen), updated_at`

---

## 5. Phase-Wise Build Plan

### Phase 0 — Setup (Day 1–2)
- Monorepo: `client/` (React + Vite) and `server/` (Express)
- Docker Compose: Postgres + Redis containers
- Postgres schema/migrations for tables above
- Basic Express server with health check
- Push initial commit

**Deliverable:** App boots, connects to Postgres and Redis.

---

### Phase 1 — Auth (Day 3–5)
- Signup/login with JWT + bcrypt
- Auth middleware for protected REST routes
- Frontend: login/signup pages, store token, protected routes
- Basic user profile (avatar, username)

**Deliverable:** Users can register and log in.

---

### Phase 2 — Direct Messaging Core (Day 6–10)
- REST endpoints: create/get conversations, fetch message history (paginated)
- Socket.IO server setup, JWT auth on socket handshake
- Client connects socket on login
- Send/receive messages in real time for 1-on-1 chat
- Persist every message to Postgres on send
- Basic chat UI: conversation list + message thread

**Deliverable:** Two logged-in users can chat with each other in real time.

---

### Phase 3 — Redis Integration (Day 11–14)
- Add `@socket.io/redis-adapter` so the app is ready to scale across
  multiple Node instances
- Online presence: set/unset `user:{id}:online` in Redis on
  connect/disconnect, broadcast presence changes
- Typing indicator: short-TTL Redis key `typing:{conversationId}:{userId}`,
  auto-expires, broadcast typing/stopped-typing events
- Frontend: show green dot for online users, "typing..." indicator

**Deliverable:** Presence and typing indicators work; app is horizontally
scalable in principle (this is your strongest talking point).

---

### Phase 4 — Group Chat (Day 15–18)
- Create group conversation, add/remove members
- Broadcast messages to all members of a group via Socket.IO rooms
  (`socket.join(conversationId)`)
- Group info UI: member list, add/remove member (admin only)

**Deliverable:** Group chat works alongside direct messages.

---

### Phase 5 — Read Receipts & Unread Counts (Day 19–21)
- `message_status` table: mark delivered on receipt, seen when opened
- Emit `message_seen` event when user opens a conversation
- Unread count per conversation shown in conversation list
- Update UI with checkmarks (sent / delivered / seen)

**Deliverable:** WhatsApp-style read receipts and unread badges.

---

### Phase 6 — File/Image Sharing (Day 22–24)
- File upload endpoint (multer or direct-to-S3/Cloudinary signed URL)
- Store `attachment_url` on message
- Render images/files inline in chat UI

**Deliverable:** Users can send images/files in chat.

---

### Phase 7 — Hardening & Scaling Proof (Day 25–27)
- Rate limit message sending per user (Redis-backed)
- Graceful reconnect handling on client (auto-reconnect socket, resync
  missed messages since last seen timestamp)
- Run 2 server instances behind a simple load balancer (or just 2 ports)
  locally to prove Redis adapter actually syncs messages across instances —
  screenshot/demo this, it's a great interview story
- Error handling middleware, input validation

**Deliverable:** App survives disconnects and proves horizontal scalability.

---

### Phase 8 — Polish & Deploy (Day 28–30+)
- Docker Compose: full stack (Postgres, Redis, server, client) — one-command
  startup
- Deploy: server on Render/Railway, Postgres on Neon/Supabase, Redis on
  Upstash, frontend on Vercel
- README: architecture diagram, setup instructions, feature list, screenshots
  or a short demo GIF

**Deliverable:** Deployed, dockerized, portfolio-ready chat app.

---

## 6. Suggested Folder Structure

```
realtimechat/
├── client/                          # React (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   │   ├── ConversationList.jsx
│   │   │   │   ├── MessageThread.jsx
│   │   │   │   ├── MessageInput.jsx
│   │   │   │   └── TypingIndicator.jsx
│   │   │   ├── Auth/
│   │   │   └── Group/
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useSocket.js
│   │   ├── context/
│   │   │   └── SocketContext.jsx
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── server/                          # Express + Socket.IO
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                # Postgres pool
│   │   │   └── redis.js             # Redis client + adapter setup
│   │   ├── sockets/
│   │   │   ├── index.js             # socket.io init, auth middleware
│   │   │   ├── messageHandlers.js
│   │   │   ├── presenceHandlers.js
│   │   │   └── typingHandlers.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── rateLimiter.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── conversation.routes.js
│   │   │   ├── message.routes.js
│   │   │   └── upload.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── conversation.controller.js
│   │   │   └── message.controller.js
│   │   ├── models/
│   │   │   ├── user.model.js
│   │   │   ├── conversation.model.js
│   │   │   ├── message.model.js
│   │   │   └── messageStatus.model.js
│   │   └── app.js
│   ├── migrations/
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## 7. Commit Checkpoints

1. `chore: project setup, docker compose (postgres, redis)`
2. `feat: auth (signup/login/jwt)`
3. `feat: 1-on-1 real-time messaging via socket.io`
4. `feat: redis adapter for socket.io scaling`
5. `feat: online presence + typing indicators`
6. `feat: group chat with rooms`
7. `feat: read receipts + unread counts`
8. `feat: file/image sharing`
9. `feat: rate limiting + reconnect handling`
10. `chore: multi-instance scaling test + dockerize + deploy`

---

## 8. What You Should Be Able to Explain in an Interview

- Why Socket.IO needs a Redis adapter to scale across multiple server
  instances (sticky sessions vs pub/sub broadcast)
- How presence and typing indicators are kept ephemeral (TTL keys) instead
  of bloating Postgres with transient state
- How you'd handle message ordering and delivery guarantees if the socket
  disconnects mid-send
- Why REST is used for history/CRUD while WebSockets are used only for
  real-time events (separation of concerns)
- Trade-offs of Socket.IO vs raw WebSockets vs a managed service (Pusher/Ably)
