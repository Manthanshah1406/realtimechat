const ConversationModel = require('../models/conversation.model');
const MessageModel      = require('../models/message.model');
const { getPool }       = require('../config/db');
const { getIO }         = require('../sockets');

async function getConversations(req, res, next) {
  try {
    const conversations = await ConversationModel.findByUserIdWithDetails(req.user.id);
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

async function createConversation(req, res, next) {
  try {
    const { type, name, memberIds } = req.body;
    // body already validated by zod middleware

    const allMembers = [...new Set([req.user.id, ...memberIds])];

    if (type === 'direct') {
      if (allMembers.length !== 2) {
        return res.status(400).json({ message: 'Direct conversation requires exactly 2 members' });
      }
      const existing = await ConversationModel.findDirectBetween(req.user.id, memberIds[0]);
      if (existing) return res.status(200).json({ conversation: existing });
    }

    const conversation = await ConversationModel.create({
      type,
      name: name?.trim() || null,
      memberIds: allMembers,
      creatorId: req.user.id,
    });

    // Notify ALL members (except creator) to reload their conversation list
    const io = getIO();
    for (const memberId of allMembers) {
      if (memberId !== req.user.id) {
        io.to(`user:${memberId}`).emit('conversation:join', conversation.id);
      }
    }

    // System message saved to DB — will appear when conversation loads
    if (type === 'group') {
      const { rows: memberRows } = await getPool().query(
        `SELECT username FROM users WHERE id = ANY($1)`,
        [allMembers]
      );
      const names = memberRows.map((r) => r.username).join(', ');
      await MessageModel.createSystem(
        conversation.id,
        `Group "${name}" created by ${req.user.username} · Members: ${names}`
      );
    }

    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

async function getConversationById(req, res, next) {
  try {
    const conversation = await ConversationModel.findById(req.params.id, req.user.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const { rows: members } = await getPool().query(
      `SELECT u.id, u.username, u.avatar_url, cm.role
       FROM conversation_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.conversation_id = $1`,
      [req.params.id]
    );
    res.json({ conversation: { ...conversation, members } });
  } catch (err) {
    next(err);
  }
}

async function addMember(req, res, next) {
  try {
    const { id: conversationId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    // Only admins can add members
    const { rows: [caller] } = await getPool().query(
      `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, req.user.id]
    );
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    await getPool().query(
      `INSERT INTO conversation_members (conversation_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversationId, userId]
    );

    // System message: "Bob was added by Alice"
    const { rows: [addedUser] } = await getPool().query(
      `SELECT username FROM users WHERE id = $1`, [userId]
    );
    const io = getIO();
    const sysMsg = await MessageModel.createSystem(
      conversationId,
      `${addedUser?.username} was added by ${req.user.username}`
    );
    io.to(`conversation:${conversationId}`).emit('message:new', { ...sysMsg, username: null });

    // Tell the new member's socket to join the room
    getIO().to(`user:${userId}`).emit('conversation:join', conversationId);

    res.json({ message: 'Member added' });
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    const { id: conversationId, userId } = req.params;

    const { rows: [caller] } = await getPool().query(
      `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, req.user.id]
    );
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Use the leave endpoint to remove yourself' });
    }

    await getPool().query(
      `DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    // System message: "Bob was removed by Alice"
    const { rows: [removedUser] } = await getPool().query(
      `SELECT username FROM users WHERE id = $1`, [userId]
    );
    const sysMsg = await MessageModel.createSystem(
      conversationId,
      `${removedUser?.username} was removed by ${req.user.username}`
    );
    const io = getIO();
    // Tell the room about the removal
    io.to(`conversation:${conversationId}`).emit('message:new', { ...sysMsg, username: null });
    // Tell the removed user specifically — they need to leave the UI
    io.to(`user:${userId}`).emit('conversation:removed', { conversationId });

    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}

async function promoteToAdmin(req, res, next) {
  try {
    const { id: conversationId, userId } = req.params;

    // Only admins can promote
    const { rows: [caller] } = await getPool().query(
      `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, req.user.id]
    );
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can promote members' });
    }

    await getPool().query(
      `UPDATE conversation_members SET role = 'admin'
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    res.json({ message: 'Member promoted to admin' });
  } catch (err) {
    next(err);
  }
}

async function leaveConversation(req, res, next) {
  try {
    const { id: conversationId } = req.params;

    // Check if user is admin
    const { rows: [me] } = await getPool().query(
      `SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, req.user.id]
    );

    if (me?.role === 'admin') {
      // Count remaining members other than self
      const { rows: others } = await getPool().query(
        `SELECT user_id FROM conversation_members
         WHERE conversation_id = $1 AND user_id <> $2`,
        [conversationId, req.user.id]
      );

      if (others.length > 0) {
        // Check if there's another admin
        const { rows: otherAdmins } = await getPool().query(
          `SELECT user_id FROM conversation_members
           WHERE conversation_id = $1 AND user_id <> $2 AND role = 'admin'`,
          [conversationId, req.user.id]
        );

        if (otherAdmins.length === 0) {
          return res.status(400).json({
            message: 'You must promote another member to admin before leaving.',
            code: 'MUST_PROMOTE_ADMIN',
          });
        }
      }
    }

    await getPool().query(
      `DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, req.user.id]
    );
    res.json({ message: 'Left conversation' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getConversations,
  createConversation,
  getConversationById,
  addMember,
  removeMember,
  leaveConversation,
  promoteToAdmin,
};
