import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Returns a Set of user IDs that are currently online.
 *
 * Strategy:
 * - On connect the SERVER pushes presence:online for each contact already online
 *   (see presenceHandlers.js) — so we just listen and build the set.
 * - presence:check is used as a fallback after conversations load.
 */
export function usePresence(userIds = []) {
  const { socket } = useSocket();
  const [online, setOnline] = useState(new Set());

  // Listen to real-time presence events — register once per socket instance
  useEffect(() => {
    if (!socket) return;

    const handleOnline = ({ userId }) =>
      setOnline((prev) => new Set([...prev, userId]));

    const handleOffline = ({ userId }) =>
      setOnline((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });

    socket.on('presence:online',  handleOnline);
    socket.on('presence:offline', handleOffline);

    return () => {
      socket.off('presence:online',  handleOnline);
      socket.off('presence:offline', handleOffline);
    };
  }, [socket]);

  // Whenever userIds list changes (conversations loaded), do a fresh check
  useEffect(() => {
    if (!socket || !userIds.length) return;

    socket.emit('presence:check', userIds, (res) => {
      if (res?.online) {
        setOnline(new Set(res.online));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, userIds.join(',')]);

  return online;
}
