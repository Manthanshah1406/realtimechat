# RealTimeChat — 5-Day Sprint Plan (Sept 15 → Sept 20)

> **Today:** Sept 15 · **Deadline:** Sept 20 (end of day) · **Days left: 5**
>
> Scope: **Core backend + Redis only.** No Docker, no file sharing, no cloud deploy.
> Run Postgres and Redis locally. Focus is on getting the real-time features
> working end-to-end and demo-ready.

---

## What's IN

| # | Feature |
|---|---------|
| ✅ | Phase 0 — Server scaffold + DB migrations |
| ✅ | Phase 1 — Auth (JWT + bcrypt) |
| ✅ | Phase 2 — Real-time 1-on-1 messaging |
| ✅ | Phase 3 — Redis adapter + presence + typing indicators |
| ✅ | Phase 4 — Group chat |
| ✅ | Phase 5 — Read receipts + unread counts |

## What's OUT

| # | Feature | Reason |
|---|---------|--------|
| ❌ | Docker / Docker Compose | Running locally instead |
| ❌ | File / image sharing | Nice-to-have, time cost high |
| ❌ | Full hardening + 2-instance test | Can explain in interview without live demo |
| ❌ | Cloud deploy | Out of scope for now |

---

## Local Prerequisites

Before starting, make sure these are running on your machine:

- **Node.js** 20+
- **PostgreSQL** — running on `localhost:5432`
- **Redis** — running on `localhost:6379`

```bash
# Quick check
psql -U postgres -c "\l"        # Postgres running?
redis-cli ping                  # Should return PONG
```

Create the database once:
```bash
psql -U postgres -c "CREATE DATABASE realtimechat;"
psql -U postgres -c "CREATE USER chatuser WITH PASSWORD 'chatpass';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE realtimechat TO chatuser;"
```

---

## Day-by-Day Schedule

### Day 1 — Sept 15 (Today) · Finish Phase 0
**Target:** Server starts, connects to Postgres + Redis, health check passes.

- [ ] `server/migrations/001_create_users.sql`
- [ ] `server/migrations/002_create_conversations.sql`
- [ ] `server/migrations/003_create_messages.sql`
- [ ] `server/migrations/004_create_message_status.sql`
- [ ] `server/migrations/migrate.js` — runner that executes all SQL files in order
- [ ] `server/src/models/messageStatus.model.js`
- [ ] `server/uploads/.gitkeep`
- [ ] `server/.env` filled from `.env.example`
- [ ] `npm install` in `server/`
- [ ] `npm run migrate` — tables created in Postgres
- [ ] `npm run dev` — logs "PostgreSQL connected", "Redis connected"
- [ ] `GET http://localhost:4000/health` → `{ "status": "ok" }`

---

### Day 2 — Sept 16 · Phase 1 (Auth) + Phase 2 server
**Target:** Signup/login working. Socket messaging persists to DB.

**Auth (server)**
- [ ] Verify POST `/api/auth/signup` creates user, returns JWT
- [ ] Verify POST `/api/auth/login` validates password, returns JWT
- [ ] Verify GET `/api/auth/me` returns current user (protected)
- [ ] Test with curl or Postman

**Messaging (server)**
- [ ] Socket handler: on `message:send` → insert into `messages` table → emit `message:new` to room
- [ ] Socket `connection`: query user's conversation IDs → `socket.join(conversation:{id})` for each
- [ ] GET `/api/messages/:conversationId` returns paginated rows with sender info

**Auth (client)**
- [ ] `client/package.json` + `npm install`
- [ ] Login + Signup pages (plain forms, no styling needed yet)
- [ ] `useAuth` hook — stores JWT in localStorage, reads it on refresh
- [ ] Protected route — redirect to `/login` if no token

---

### Day 3 — Sept 17 · Phase 2 client + Phase 3
**Target:** Two users can chat in real time. Presence + typing visible.

**Messaging (client)**
- [ ] `SocketContext` — creates socket with JWT auth, exposes to tree
- [ ] `ConversationList` — fetches from GET `/api/conversations`, renders list
- [ ] `MessageThread` — loads history on mount, appends incoming `message:new` events
- [ ] `MessageInput` — sends `message:send` event on Enter, clears field

**Redis / Presence / Typing**
- [ ] Confirm `@socket.io/redis-adapter` is active (check server logs on connect)
- [ ] Online presence: green dot next to username in conversation list
- [ ] `TypingIndicator` component — shows "X is typing...", clears after 5s
- [ ] `MessageInput` emits `typing:start` on keystroke, `typing:stop` on blur/send

**Smoke test**
- [ ] Open two browser tabs (different users) — messages appear on both sides instantly
- [ ] Refresh one tab — history loads from Postgres

---

### Day 4 — Sept 18 · Phase 4 (Group Chat) + Phase 5 (Read Receipts)
**Target:** Groups work. Unread badges + read receipts visible.

**Group Chat**
- [ ] "New Chat" button — modal to pick direct or group, select users, set group name
- [ ] POST `/api/conversations` with `type: 'group'`
- [ ] All group members join socket room, messages broadcast to all
- [ ] Group info panel — member list, leave group button

**Read Receipts**
- [ ] On `message:new` receipt: emit `conversation:open` when user opens conversation → mark `seen`
- [ ] `messageStatus` upsert: `delivered` on receipt, `seen` on open
- [ ] Unread count badge on each conversation in the list
- [ ] Checkmark icons on messages: ✓ sent · ✓✓ delivered · ✓✓ blue = seen

---

### Day 5 — Sept 19–20 · Polish + Demo-ready
**Target:** App looks presentable, works reliably, ready to demo or walk through in an interview.

**UI Polish**
- [ ] Consistent Tailwind styling across all screens
- [ ] Loading spinners on conversation list + message thread
- [ ] Empty states ("No conversations yet", "Start a conversation!")
- [ ] Error toasts for failed sends / auth errors
- [ ] Basic mobile-responsive layout

**Reliability**
- [ ] Socket auto-reconnect verified (Socket.IO handles this by default)
- [ ] On reconnect: re-fetch messages since last received timestamp
- [ ] Form validation on signup/login (empty fields, email format)

**Demo prep**
- [ ] Seed script: 2–3 demo users + a sample conversation with messages
  ```bash
  node server/scripts/seed.js
  ```
- [ ] Clean run: drop DB, re-migrate, re-seed, start server → walk through demo flow
- [ ] Update README: feature list, local setup steps, screenshots

---

## Local Dev Commands (reference)

```bash
# Start server
cd server
npm run dev       # nodemon watches for changes

# Start client
cd client
npm run dev       # Vite dev server on http://localhost:5173

# Run migrations
cd server
npm run migrate

# Run seed (Day 5)
node scripts/seed.js
```

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Postgres not set up locally | Do this first on Day 1 before writing any code |
| Redis not running | `redis-server` or install via chocolatey/homebrew |
| Socket room join logic wrong | Log `socket.rooms` on connect to verify |
| Falling behind on Day 3 | Ship messaging without typing indicator first, add it after |
| Falling behind on Day 4 | Drop read receipts, keep unread count badge only |

---

## End-State Demo Script (Sept 20)

1. `npm run dev` in `server/` → server up on `:4000`
2. `npm run dev` in `client/` → UI on `:5173`
3. Sign up as **Alice**, sign up as **Bob** in incognito tab
4. Alice starts a direct chat with Bob → both see messages in real time
5. Bob's green dot shows in Alice's sidebar
6. Bob types → Alice sees "Bob is typing..."
7. Create a group with Alice + Bob → both receive messages
8. Open a conversation → unread badge clears, blue ticks appear on messages
9. In interview: point to `sockets/index.js` → Redis adapter → explain cross-instance broadcast

---

## Daily Tracking

| Day | Date    | Phase(s) target         | Status |
|-----|---------|-------------------------|--------|
| 1   | Sept 15 | Phase 0 complete        | ✅ || 2   | Sept 16 | Phase 1 + P2 server     | ⬜ |
| 3   | Sept 17 | Phase 2 client + Phase 3 | ⬜ |
| 4   | Sept 18 | Phase 4 + Phase 5       | ⬜ |
| 5   | Sept 19–20 | Polish + Demo        | ✅ |
