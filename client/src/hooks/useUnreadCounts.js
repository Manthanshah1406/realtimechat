import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth }   from '../context/AuthContext';

/**
 * Maintains unread message counts per conversation.
 * Returns { counts: { [conversationId]: number }, markRead }
 *
 * Only increments for messages from OTHER users — never for messages
 * the current user sent themselves.
 */
export function useUnreadCounts() {
  const { socket } = useSocket();
  const { user }   = useAuth();
  const [counts, setCounts] = useState({});

  const refresh = useCallback(() => {
    socket?.emit('unread:get', null, ({ counts: rows }) => {
      const map = {};
      rows.forEach(({ conversation_id, unread_count }) => {
        map[conversation_id] = parseInt(unread_count, 10);
      });
      setCounts(map);
    });
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    refresh();

    const onNew = (msg) => {
      // Never count a message the current user sent
      const senderId = msg.sender_id || msg.senderId;
      if (senderId === user?.id) return;

      setCounts((prev) => ({
        ...prev,
        [msg.conversation_id]: (prev[msg.conversation_id] || 0) + 1,
      }));
    };

    socket.on('message:new', onNew);
    return () => socket.off('message:new', onNew);
  }, [socket, refresh, user?.id]);

  const markRead = useCallback((conversationId) => {
    setCounts((prev) => ({ ...prev, [conversationId]: 0 }));
    socket?.emit('conversation:open', { conversationId });
  }, [socket]);

  return { counts, markRead };
}
