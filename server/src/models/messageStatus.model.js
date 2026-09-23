const { getPool } = require('../config/db');

/**
 * Upsert a status row for a single message + user pair.
 * Uses ON CONFLICT so calling it multiple times is safe.
 */
async function upsert(messageId, userId, status) {
  const { rows } = await getPool().query(
    `INSERT INTO message_status (message_id, user_id, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (message_id, user_id)
     DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
     RETURNING *`,
    [messageId, userId, status]
  );
  return rows[0];
}

/**
 * Mark all messages in a conversation as 'seen' for a given user.
 * Called when the user opens a conversation.
 */
async function markConversationSeen(conversationId, userId) {
  await getPool().query(
    `INSERT INTO message_status (message_id, user_id, status)
     SELECT m.id, $2, 'seen'
     FROM messages m
     WHERE m.conversation_id = $1
       AND m.sender_id <> $2
     ON CONFLICT (message_id, user_id)
     DO UPDATE SET status = 'seen', updated_at = NOW()`,
    [conversationId, userId]
  );
}

/**
 * Count unread messages per conversation for a user.
 * Returns [{ conversation_id, unread_count }]
 */
async function getUnreadCounts(userId) {
  const { rows } = await getPool().query(
    `SELECT m.conversation_id,
            COUNT(*) AS unread_count
     FROM messages m
     LEFT JOIN message_status ms
            ON ms.message_id = m.id AND ms.user_id = $1
     WHERE m.sender_id <> $1
       AND (ms.status IS NULL OR ms.status <> 'seen')
       AND m.conversation_id IN (
             SELECT conversation_id
             FROM conversation_members
             WHERE user_id = $1
           )
     GROUP BY m.conversation_id`,
    [userId]
  );
  return rows;
}

/**
 * Get status rows for a list of message IDs.
 * Used to render checkmark indicators on the sender's side.
 */
async function getStatusForMessages(messageIds) {
  if (!messageIds.length) return [];
  const { rows } = await getPool().query(
    `SELECT * FROM message_status WHERE message_id = ANY($1)`,
    [messageIds]
  );
  return rows;
}

module.exports = { upsert, markConversationSeen, getUnreadCounts, getStatusForMessages };
