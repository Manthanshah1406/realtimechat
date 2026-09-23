import { useState, useEffect, useRef } from 'react';
import ConversationList from '../components/Chat/ConversationList';
import MessageThread    from '../components/Chat/MessageThread';
import { useUnreadCounts } from '../hooks/useUnreadCounts';
import { useSocket }       from '../context/SocketContext';

export default function ChatPage() {
  const [activeConversation, setActiveConversation] = useState(null);
  const [removedFromIds,     setRemovedFromIds]      = useState(new Set());
  // Maps conversationId → ISO timestamp of when user was re-added after dismissing
  const [historyFromMap,     setHistoryFromMap]      = useState({});
  const { counts, markRead } = useUnreadCounts();
  const { socket } = useSocket();
  const activeRef  = useRef(null);

  useEffect(() => { activeRef.current = activeConversation; }, [activeConversation]);

  // Track removed conversations — read-only mode
  useEffect(() => {
    if (!socket) return;
    const handler = ({ conversationId }) => {
      setRemovedFromIds((prev) => new Set([...prev, conversationId]));
    };
    socket.on('conversation:removed', handler);
    return () => socket.off('conversation:removed', handler);
  }, [socket]);

  // Re-added — clear removed state, restore send ability
  useEffect(() => {
    if (!socket) return;
    const handler = (conversationId) => {
      setRemovedFromIds((prev) => {
        if (!prev.has(conversationId)) return prev;
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
    };
    socket.on('conversation:join', handler);
    return () => socket.off('conversation:join', handler);
  }, [socket]);

  // Called by ConversationList when user is re-added after having dismissed the group
  // We record the timestamp so MessageThread only loads messages from that point
  const handleRejoin = (conversationId) => {
    setHistoryFromMap((prev) => ({
      ...prev,
      [conversationId]: new Date().toISOString(),
    }));
  };

  const handleDismiss = (conversationId) => {
    setRemovedFromIds((prev) => {
      const next = new Set(prev);
      next.delete(conversationId);
      return next;
    });
    // Also clear historyFrom if dismissed again
    setHistoryFromMap((prev) => {
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
    if (activeRef.current?.id === conversationId) {
      setActiveConversation(null);
    }
  };

  const handleSelect = (conv) => {
    setActiveConversation(conv);
    markRead(conv.id);
  };

  const handleBack = () => setActiveConversation(null);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <aside className="w-80 border-r flex-shrink-0 flex flex-col hidden sm:flex">
        <ConversationList
          activeId={activeConversation?.id}
          onSelect={handleSelect}
          counts={counts}
          markRead={markRead}
          removedFromIds={removedFromIds}
          onDismiss={handleDismiss}
          onRejoin={handleRejoin}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {activeConversation ? (
          <MessageThread
            conversation={activeConversation}
            onBack={handleBack}
            markRead={markRead}
            isRemoved={removedFromIds.has(activeConversation.id)}
            onDismiss={() => handleDismiss(activeConversation.id)}
            historyFrom={historyFromMap[activeConversation.id] || null}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
            <div className="text-center px-8">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-xl font-semibold text-gray-600">Welcome to RealTimeChat</p>
              <p className="text-sm mt-2">Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
