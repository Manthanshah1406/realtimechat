import { useEffect, useState, useMemo, useRef } from 'react';
import api from '../../api/client';
import { useAuth }          from '../../context/AuthContext';
import { useSocket }        from '../../context/SocketContext';
import { usePresence }      from '../../hooks/usePresence';
import NewConversationModal from './NewConversationModal';

export default function ConversationList({ activeId, onSelect, counts = {}, markRead, removedFromIds = new Set(), onDismiss, onRejoin }) {
  const { user, logout }  = useAuth();
  const { socket }        = useSocket();
  const [conversations,     setConversations]     = useState([]);
  const [dismissedIds,      setDismissedIds]       = useState(new Set());
  const [rejoinedIds,       setRejoinedIds]        = useState(new Set());
  const [loading,           setLoading]            = useState(true);
  const [showModal,         setShowModal]          = useState(false);
  const dismissedRef = useRef(new Set()); // always-fresh ref for socket handlers

  const peerIds = useMemo(() =>
    [...new Set(
      conversations.flatMap((c) =>
        (c.members || []).filter((m) => m.id !== user?.id).map((m) => m.id)
      )
    )],
  [conversations, user?.id]);

  const online = usePresence(peerIds);

  // Keep ref in sync so socket handlers always see latest dismissedIds
  useEffect(() => { dismissedRef.current = dismissedIds; }, [dismissedIds]);

  const loadConversations = () => {
    api.get('/conversations')
      .then(({ data }) => setConversations(data.conversations))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadConversations(); }, []);

  // Bump to top on new message
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversation_id);
        if (idx === -1) return prev;
        const preview = msg.content || (msg.attachment_url ? '📷 Photo' : null);
        const updated = {
          ...prev[idx],
          last_message: preview,
          last_message_at: msg.created_at,
        };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
    };
    socket.on('message:new', handler);
    return () => socket.off('message:new', handler);
  }, [socket]);

  // New group added — reload list
  useEffect(() => {
    if (!socket) return;
    const handler = (conversationId) => {
      socket.join?.(`conversation:${conversationId}`);

      // Use ref to get fresh value — avoids stale closure in socket handler
      const wasDismissed = dismissedRef.current.has(conversationId);

      if (wasDismissed) {
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(conversationId);
          return next;
        });
        setRejoinedIds((prev) => new Set([...prev, conversationId]));
        onRejoin?.(conversationId);
      }

      api.get('/conversations').then(({ data }) => {
        setConversations(data.conversations);
      }).catch(console.error);
    };
    socket.on('conversation:join', handler);
    return () => socket.off('conversation:join', handler);
  }, [socket]);

  // Dismiss — remove from visible list immediately
  const handleDismiss = (convId) => {
    setDismissedIds((prev) => {
      const next = new Set([...prev, convId]);
      dismissedRef.current = next;
      return next;
    });
    setRejoinedIds((prev) => {
      const next = new Set(prev);
      next.delete(convId);
      return next;
    });
    onDismiss?.(convId);
  };

  const handleConversationCreated = async (conv) => {
    setShowModal(false);
    socket?.emit('conversation:join', conv.id);
    try {
      const { data } = await api.get('/conversations');
      setConversations(data.conversations);
      const created = data.conversations.find((c) => c.id === conv.id) || conv;
      onSelect(created);
      markRead(conv.id);
    } catch (err) {
      console.error('Failed to reload conversations after create:', err);
    }
  };

  const handleSelect = (conv) => {
    onSelect(conv);
    markRead(conv.id);
  };

  const getDisplayName = (conv) => {
    if (conv.type === 'group') return conv.name || 'Group';
    const other = conv.members?.find((m) => m.id !== user?.id);
    return other?.username || 'Direct message';
  };

  const getPeerId = (conv) => conv.members?.find((m) => m.id !== user?.id)?.id;

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter out dismissed conversations
  const visibleConversations = conversations.filter((c) => !dismissedIds.has(c.id));
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <span className="font-bold text-gray-900 text-lg">Chats</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user?.username}</span>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500 transition">
            Sign out
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading && (
          <div className="space-y-1 p-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-3 items-center p-3">
                <div className="w-11 h-11 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-2 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && visibleConversations.length === 0 && (
          <div className="text-center mt-16 px-4">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm font-medium text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">Start one below</p>
          </div>
        )}

        {visibleConversations.map((conv) => {
          const peerId    = getPeerId(conv);
          const isOnline  = conv.type === 'direct' && peerId && online.has(peerId);
          const unread    = counts[conv.id] || 0;
          const name      = getDisplayName(conv);
          const isRemoved = removedFromIds.has(conv.id);

          return (
            <button
              key={conv.id}
              onClick={() => handleSelect(conv)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition border-b border-gray-50
                ${activeId === conv.id ? 'bg-blue-50 border-r-2 border-brand-600' : ''}
                ${isRemoved ? 'opacity-60' : ''}`}
            >
              <div className="relative flex-shrink-0">
                {conv.type === 'group' ? (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-bold"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                    👥
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm">
                    {name[0]?.toUpperCase()}
                  </div>
                )}
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className={`text-sm truncate ${unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                    {name}
                  </p>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    {formatTime(conv.last_message_at)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p className={`text-xs truncate ${isRemoved ? 'text-gray-400 italic' : unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                    {isRemoved ? 'You were removed' : conv.last_message || (conv.type === 'group' ? 'Group chat' : 'No messages yet')}
                  </p>
                  {unread > 0 && !isRemoved && (
                    <span className="ml-2 flex-shrink-0 bg-brand-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                  {isRemoved && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismiss(conv.id); }}
                      className="ml-2 flex-shrink-0 text-gray-400 hover:text-red-500 w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50 transition text-xs"
                      title="Delete from list"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* New conversation */}
      <div className="p-3 border-t bg-white">
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2.5 rounded-xl transition"
        >
          + New Conversation
        </button>
      </div>

      {showModal && (
        <NewConversationModal
          onClose={() => setShowModal(false)}
          onCreate={handleConversationCreated}
        />
      )}
    </div>
  );
}
