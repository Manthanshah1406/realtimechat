const { getPool } = require('../config/db');

async function create({ type, name = null, memberIds, creatorId }) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO conversations (type, name) VALUES ($1, $2) RETURNING *`,
      [type, name]
    );
    const conversation = rows[0];

    for (const userId of memberIds) {
      const role = type === 'group' && userId === creatorId ? 'admin' : 'member';
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, $3)`,
        [conversation.id, userId, role]
      );
    }

    await client.query('COMMIT');
    return conversation;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * List conversations for a user, enriched with:
 * - members (id, username, avatar_url)
 * - last message content + timestamp
 */
async function findByUserIdWithDetails(userId) {
  const { rows } = await getPool().query(
    `SELECT
       c.id,
       c.type,
       c.name,
       c.created_at,
       -- Last message — show content or 📷 Photo / 📎 File label
       COALESCE(lm.content, CASE WHEN lm.attachment_url IS NOT NULL THEN '📷 Photo' ELSE NULL END) AS last_message,
       lm.created_at     AS last_message_at,
       -- Members as JSON array (include role for admin checks)
       (
         SELECT json_agg(json_build_object(
           'id',         u.id,
           'username',   u.username,
           'avatar_url', u.avatar_url,
           'role',       cm2.role
         ))
         FROM conversation_members cm2
         JOIN users u ON u.id = cm2.user_id
         WHERE cm2.conversation_id = c.id
       ) AS members
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     LEFT JOIN LATERAL (
       SELECT content, attachment_url, created_at
       FROM messages
       WHERE conversation_id = c.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lm ON true
     WHERE cm.user_id = $1
     ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
    [userId]
  );
  return rows;
}

async function findById(id, requestingUserId) {
  const { rows } = await getPool().query(
    `SELECT c.*
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     WHERE c.id = $1 AND cm.user_id = $2`,
    [id, requestingUserId]
  );
  return rows[0] || null;
}

/**
 * Find an existing direct conversation between exactly two users.
 * Returns the conversation row or null.
 */
async function findDirectBetween(userIdA, userIdB) {
  const { rows } = await getPool().query(
    `SELECT c.*
     FROM conversations c
     JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $1
     JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = $2
     WHERE c.type = 'direct'
     LIMIT 1`,
    [userIdA, userIdB]
  );
  return rows[0] || null;
}

module.exports = { create, findByUserIdWithDetails, findById, findDirectBetween };
