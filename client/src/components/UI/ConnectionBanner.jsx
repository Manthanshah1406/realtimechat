import { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';

/**
 * Sticky top banner shown only when an active socket connection drops or is reconnecting.
 * Does not display on initial startup/page load.
 */
export default function ConnectionBanner() {
  const { connected, reconnecting } = useSocket();
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);

  useEffect(() => {
    if (connected) {
      setHasConnectedOnce(true);
    }
  }, [connected]);

  // Don't show anything during initial load / before first successful connection
  if (!hasConnectedOnce || connected) return null;

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

