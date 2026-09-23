const { getPool } = require('../config/db');

async function create({ conversationId, senderId, content, attachmentUrl = null }) {
  const { rows } = await getPool().query(
    `INSERT INTO messages (conversation_id, sender_id, content, attachment_url, type)
     VALUES ($1, $2, $3, $4, 'text')
     RETURNING *`,
    [conversationId, senderId, content, attachmentUrl]
  );
  return rows[0];
}

/**
 * Insert a system/event message (no sender).
 * e.g. "Group created by Alice", "Bob was added by Alice"
 */
async function createSystem(conversationId, content) {
  const { rows } = await getPool().query(
    `INSERT INTO messages (conversation_id, sender_id, content, type)
     VALUES ($1, NULL, $2, 'system')
     RETURNING *`,
    [conversationId, content]
  );
  return rows[0];
}

/**
 * Paginated history, oldest-first.
 * Uses LEFT JOIN on users so system messages (sender_id = NULL) are included.
 */
async function findByConversation(conversationId, limit = 30, offset = 0, since = null) {
  let rows;

  if (since) {
    ({ rows } = await getPool().query(
      `SELECT
         m.*,
         u.username,
         u.avatar_url,
         CASE
           WHEN COUNT(*) FILTER (WHERE ms.status = 'seen')      > 0 THEN 'seen'
           WHEN COUNT(*) FILTER (WHERE ms.status = 'delivered') > 0 THEN 'delivered'
           ELSE NULL
         END AS status
       FROM messages m
       LEFT JOIN users u ON u.id = m.sender_id
       LEFT JOIN message_status ms
              ON ms.message_id = m.id
             AND ms.user_id <> m.sender_id
       WHERE m.conversation_id = $1
         AND m.created_at > $2
       GROUP BY m.id, u.username, u.avatar_url
       ORDER BY m.created_at ASC
       LIMIT $3 OFFSET $4`,
      [conversationId, since, limit, offset]
    ));
    return rows;
  }

  ({ rows } = await getPool().query(
    `SELECT
       m.*,
       u.username,
       u.avatar_url,
       CASE
         WHEN COUNT(*) FILTER (WHERE ms.status = 'seen')      > 0 THEN 'seen'
         WHEN COUNT(*) FILTER (WHERE ms.status = 'delivered') > 0 THEN 'delivered'
         ELSE NULL
       END AS status
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     LEFT JOIN message_status ms
            ON ms.message_id = m.id
           AND ms.user_id <> m.sender_id
     WHERE m.conversation_id = $1
     GROUP BY m.id, u.username, u.avatar_url
     ORDER BY m.created_at DESC
     LIMIT $2 OFFSET $3`,
    [conversationId, limit, offset]
  ));
  return rows.reverse();
}

module.exports = { create, createSystem, findByConversation };
