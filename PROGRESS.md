# RealTimeChat — Build Progress Tracker

---

## Quick Status Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Setup & Scaffold | ✅ Complete |
| 1 | Auth | ✅ Complete |
| 2 | Direct Messaging | ✅ Complete |
| 3 | Redis — Presence + Typing | ✅ Complete |
| 4 | Group Chat | ✅ Complete |
| 5 | Read Receipts + Unread | ✅ Complete |
| 6 | File / Image Sharing | ✅ Complete |
| 7 | Hardening | ✅ Complete |
| 8 | Deploy | 🔄 In Progress |

---

## Phase 0 — Setup ✅

- [x] `.gitignore` — blocks `.env`, `node_modules`, `uploads/`
- [x] `server/.env.example` + `client/.env.example` — all vars documented
- [x] `server/package.json` — all dependencies including zod, cloudinary
- [x] `server/src/app.js` — Express + Socket.IO + bootstrap
- [x] `server/src/config/db.js` — pg Pool
- [x] `server/src/config/redis.js` — ioredis pub/sub clients
- [x] `server/src/config/cloudinary.js` — Cloudinary + multer-storage-cloudinary
- [x] `server/src/sockets/index.js` — Socket.IO init, Redis adapter, JWT auth
- [x] `server/src/sockets/messageHandlers.js` — send, persist, deliver, seen, unread, rate limit
- [x] `server/src/sockets/presenceHandlers.js` — Redis online keys, contact-scoped
- [x] `server/src/sockets/typingHandlers.js` — 5s TTL Redis keys
- [x] `server/src/middleware/auth.js` — REST + Socket JWT middleware
- [x] `server/src/middleware/rateLimiter.js` — express-rate-limit for REST
- [x] `server/src/middleware/socketRateLimiter.js` — Redis INCR/EXPIRE for socket events
- [x] `server/src/middleware/validate.js` — Zod schemas + validate() factory
- [x] `server/src/middleware/errorHandler.js`
- [x] All routes, controllers, models
- [x] `server/migrations/` — 5 SQL files + migrate.js runner
- [x] `server/scripts/seed.js` — demo users + conversations
- [x] Full client scaffold — React 18, Vite, TailwindCSS, all components

---

## Phase 1 — Auth ✅

- [x] POST `/api/auth/signup` — zod validation, bcrypt, JWT
- [x] POST `/api/auth/login` — zod validation, JWT
- [x] GET `/api/auth/me` — protected
- [x] Login + Signup pages with toast errors and spinner
- [x] `useAuth` hook — localStorage, auto-login on refresh
- [x] Protected route wrapper

---

## Phase 2 — Direct Messaging ✅

- [x] Create / list / get conversations
- [x] Duplicate direct conversation prevention
- [x] `GET /api/users/search` — find users
- [x] `message:send` → persist → broadcast `message:new`
- [x] Socket joins all conversation rooms on connect
- [x] `ConversationList` — last message, timestamp, real-time bump
- [x] `MessageThread` — history, real-time, grouped, date separators
- [x] `NewConversationModal` — user card search, direct/group toggle
- [x] `MessageInput` — Enter to send, typing events, file attach + preview

---

## Phase 3 — Redis Integration ✅

- [x] `@socket.io/redis-adapter` — horizontally scalable
- [x] Presence: `SET user:{id}:online`, broadcast to contacts only
- [x] On connect: push already-online contacts to connecting socket
- [x] `presence:check` socket event — individual redis.get per user
- [x] Typing: `SETEX typing:{convId}:{userId}` 5s TTL
- [x] `usePresence` hook — listeners + fresh check when conversations load
- [x] Green dot in ConversationList
- [x] `TypingIndicator` — animated dots + username

---

## Phase 4 — Group Chat ✅

- [x] Create group (name + members), distinct purple 👥 avatar
- [x] Add member (admin only) — socket `conversation:join` to new member
- [x] Remove member (admin only)
- [x] Promote to admin
- [x] Leave group — blocks admin leave without successor, promote-then-leave flow
- [x] `GroupInfoPanel` — member list, add/remove, promote, leave
- [x] Group appears in sidebar instantly for all members without refresh
- [x] System messages: "Group created by…", "X was added by…", "X was removed by…"

---

## Phase 5 — Read Receipts & Unread Counts ✅

- [x] `message_status` — delivered / seen per user
- [x] Mark `delivered` on send, `seen` on `conversation:open`
- [x] `unread:get` socket event
- [x] `useUnreadCounts` at ChatPage level — shared state
- [x] Badge clears on open + while conversation is active
- [x] Sender never sees own unread badge
- [x] SVG tick icons — ✓ white (sent), ✓✓ white (delivered), ✓✓ cyan (seen)
- [x] Ticks survive page reload — status JOIN in message query

---

## Phase 6 — File / Image Sharing ✅

- [x] `POST /api/upload` — Cloudinary via multer-storage-cloudinary
- [x] `attachment_url` stored on message
- [x] Paperclip button, upload spinner, preview with ✕ remove
- [x] Caption alongside attachment
- [x] Images inline (clickable), files as download link

---

## Phase 7 — Hardening ✅

- [x] Socket auto-reconnect — 20 attempts, 1s–8s exponential backoff
- [x] `ConnectionBanner` — "Reconnecting…" when socket drops
- [x] Resync on reconnect — `?since=<ISO>` fetches only missed messages
- [x] Missed messages deduplicated before appending
- [x] Redis-backed rate limiter — 30 msg/10s per user via INCR+EXPIRE
- [x] Zod validation on signup, login, createConversation
- [x] Form validation on all client auth forms (toast warnings)
- [x] Date separators — Today / Yesterday / date
- [x] Member count in group header updates live (onMembersChange)

---

## Phase 8 — Deploy 🔄

- [ ] `npm install zod` in server (add to install step)
- [ ] Server → Railway or Render
- [ ] Postgres → Neon or Supabase
- [ ] Redis → Upstash
- [ ] Client → Vercel
- [ ] Set env vars on each platform
- [ ] Update `CLIENT_ORIGIN` on server with Vercel URL
- [ ] Update `VITE_API_URL` + `VITE_SOCKET_URL` on client with server URL
- [ ] Smoke test live URLs
- [ ] Push to GitHub with clean commit history
- [ ] Add live URL + GitHub link to resume
