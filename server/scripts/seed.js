/**
 * Demo seed script.
 * Creates 3 users, 1 direct conversation, 1 group, and sample messages.
 *
 * Usage:
 *   node scripts/seed.js
 *
 * Safe to re-run — uses ON CONFLICT DO NOTHING for users.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const USERS = [
  { username: 'alice',   email: 'alice@demo.com',   password: 'demo1234' },
  { username: 'bob',     email: 'bob@demo.com',     password: 'demo1234' },
  { username: 'charlie', email: 'charlie@demo.com', password: 'demo1234' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Users ───────────────────────────────────────────────────────────────
    console.log('Seeding users…');
    const userIds = {};
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      const { rows } = await client.query(
        `INSERT INTO users (username, email, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
         RETURNING id`,
        [u.username, u.email, hash]
      );
      userIds[u.username] = rows[0].id;
      console.log(`  ✅ ${u.username} → ${rows[0].id}`);
    }

    // ── Direct conversation: alice ↔ bob ─────────────────────────────────
    console.log('\nSeeding direct conversation (alice ↔ bob)…');
    const { rows: [directConv] } = await client.query(
      `INSERT INTO conversations (type) VALUES ('direct')
       ON CONFLICT DO NOTHING
       RETURNING id`
    );

    let directId;
    if (directConv) {
      directId = directConv.id;
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES
         ($1, $2, 'member'), ($1, $3, 'member')
         ON CONFLICT DO NOTHING`,
        [directId, userIds.alice, userIds.bob]
      );
    } else {
      // Already exists — find it
      const { rows } = await client.query(
        `SELECT c.id FROM conversations c
         JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $1
         JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = $2
         WHERE c.type = 'direct' LIMIT 1`,
        [userIds.alice, userIds.bob]
      );
      directId = rows[0]?.id;
    }

    if (directId) {
      const directMessages = [
        { sender: 'alice', content: 'Hey Bob! 👋' },
        { sender: 'bob',   content: 'Alice! Good to see you here 😄' },
        { sender: 'alice', content: 'This app is looking great' },
        { sender: 'bob',   content: 'Totally agree — real-time messaging works perfectly' },
        { sender: 'alice', content: 'And Redis is handling presence + typing like a charm 🚀' },
      ];
      for (const m of directMessages) {
        await client.query(
          `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)`,
          [directId, userIds[m.sender], m.content]
        );
      }
      console.log(`  ✅ Direct conversation seeded (id: ${directId})`);
    }

    // ── Group conversation: alice + bob + charlie ────────────────────────
    console.log('\nSeeding group conversation…');
    const { rows: [groupConv] } = await client.query(
      `INSERT INTO conversations (type, name) VALUES ('group', 'Dev Team 🛠️') RETURNING id`
    );
    const groupId = groupConv.id;

    await client.query(
      `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES
       ($1, $2, 'admin'), ($1, $3, 'member'), ($1, $4, 'member')`,
      [groupId, userIds.alice, userIds.bob, userIds.charlie]
    );

    const groupMessages = [
      { sender: 'alice',   content: 'Welcome to the Dev Team group! 🎉' },
      { sender: 'bob',     content: 'Nice, all three of us here' },
      { sender: 'charlie', content: 'Hey everyone! Ready to build something awesome' },
      { sender: 'alice',   content: 'Let\'s do it 💪' },
      { sender: 'bob',     content: 'Group messaging works perfectly too 👌' },
    ];
    for (const m of groupMessages) {
      await client.query(
        `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)`,
        [groupId, userIds[m.sender], m.content]
      );
    }
    console.log(`  ✅ Group conversation seeded (id: ${groupId})`);

    await client.query('COMMIT');

    console.log('\n✅ Seed complete!');
    console.log('\nDemo credentials (all passwords: demo1234):');
    console.log('  alice@demo.com');
    console.log('  bob@demo.com');
    console.log('  charlie@demo.com');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
