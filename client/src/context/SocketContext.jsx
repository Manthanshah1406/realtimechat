import {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const socketRef       = useRef(null);
  const [connected,     setConnected]     = useState(false);
  const [reconnecting,  setReconnecting]  = useState(false);

  // Track the timestamp of the last message received — used for resync
  const lastReceivedAt = useRef(null);

  // Resync listeners: components register callbacks to fetch missed messages
  // Map<conversationId, callback>
  const resyncListeners = useRef(new Map());

  const registerResync = useCallback((conversationId, fn) => {
    resyncListeners.current.set(conversationId, fn);
    return () => resyncListeners.current.delete(conversationId);
  }, []);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setReconnecting(false);
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      // Socket.IO built-in exponential back-off
      reconnection:           true,
      reconnectionAttempts:   20,
      reconnectionDelay:      1000,
      reconnectionDelayMax:   8000,
      randomizationFactor:    0.3,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);

      // If we have a lastReceivedAt, fire all registered resync callbacks
      if (lastReceivedAt.current) {
        resyncListeners.current.forEach((fn) => fn(lastReceivedAt.current));
      }
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      // If server closed connection don't show reconnecting — it will auto-reconnect
      if (reason !== 'io server disconnect') {
        setReconnecting(true);
      }
    });

    socket.on('reconnect_attempt', () => setReconnecting(true));

    socket.on('reconnect', () => {
      setReconnecting(false);
    });

    socket.on('reconnect_failed', () => {
      setReconnecting(false);
      console.error('Socket reconnection failed after max attempts');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
    });

    // Track the timestamp of every incoming message
    socket.on('message:new', (msg) => {
      if (msg.created_at) {
        lastReceivedAt.current = msg.created_at;
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      reconnecting,
      registerResync,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}
