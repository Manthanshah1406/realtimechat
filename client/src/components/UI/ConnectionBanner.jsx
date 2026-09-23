import { useSocket } from '../../context/SocketContext';

/**
 * Sticky top banner shown when the socket drops or is reconnecting.
 */
export default function ConnectionBanner() {
  const { connected, reconnecting } = useSocket();

  if (connected) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-50 text-xs font-semibold text-center py-1.5 shadow
        bg-yellow-400 text-yellow-900"
    >
      {reconnecting
        ? '🔄 Reconnecting… messages will sync when back online'
        : '⚠️ Connection lost — waiting to reconnect'}
    </div>
  );
}
