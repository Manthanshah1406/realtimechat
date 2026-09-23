import { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth }   from '../../context/AuthContext';

export default function TypingIndicator({ conversationId }) {
  const { socket } = useSocket();
  const { user }   = useAuth();
  const [typers, setTypers] = useState({}); // { userId: username }

  useEffect(() => {
    if (!socket) return;

    const onStart = ({ userId, username }) => {
      if (userId === user?.id) return; // don't show own indicator
      setTypers((prev) => ({ ...prev, [userId]: username || 'Someone' }));
    };

    const onStop = ({ userId }) => {
      setTypers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on('typing:start', onStart);
    socket.on('typing:stop',  onStop);

    return () => {
      socket.off('typing:start', onStart);
      socket.off('typing:stop',  onStop);
    };
  }, [socket, user?.id, conversationId]);

  const names = Object.values(typers);
  if (!names.length) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : `${names.slice(0, -1).join(', ')} and ${names.at(-1)} are typing`;

  return (
    <div className="px-5 py-1 flex items-center gap-2 text-xs text-gray-400">
      {/* Animated dots */}
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      {label}…
    </div>
  );
}
