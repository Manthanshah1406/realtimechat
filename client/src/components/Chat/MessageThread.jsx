import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../../api/client';
import { useAuth }    from '../../context/AuthContext';
import { useSocket }  from '../../context/SocketContext';
import { useToast }   from '../UI/Toast';
import Spinner        from '../UI/Spinner';
import MessageInput    from './MessageInput';
import TypingIndicator from './TypingIndicator';
import GroupInfoPanel  from '../Group/GroupInfoPanel';

// ── System / event message (group created, member added, etc.) ────────────────
function SystemMessage({ content }) {
  return (
    <div className="flex justify-center my-3">
      <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200
        px-3 py-1 rounded-full text-center max-w-xs">
        {content}
      </span>
    </div>
  );
}

// ── Date separator label ──────────────────────────────────────────────────────
function formatDateLabel(dateStr) {
  const d   = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (d.toDateString() === now.toDateString())       return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  // Same year → "Monday, 14 Sept"
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
  }
  // Different year → "14 Sept 2024"
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function DateSeparator({ dateStr }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1
        rounded-full border border-gray-200 flex-shrink-0">
        {formatDateLabel(dateStr)}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ── Attachment renderer ───────────────────────────────────────────────────────
function Attachment({ url, mine }) {
  if (!url) return null;
  const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) ||
    url.includes('image') || url.includes('cloudinary');

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mb-1">
        <img
          src={url}
          alt="attachment"
          className="max-w-[240px] max-h-[200px] rounded-xl object-cover cursor-pointer
            hover:opacity-90 transition"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mb-1 px-3 py-2 rounded-xl text-xs font-medium
        underline-offset-2 hover:underline
        ${mine ? 'bg-white/20 text-white' : 'bg-gray-100 text-brand-600'}`}
    >
      <span className="text-base">📄</span>
      <span className="truncate max-w-[160px]">
        {url.split('/').pop()?.split('?')[0] || 'Download file'}
      </span>
      <span className="flex-shrink-0">↗</span>
    </a>
  );
}
function Ticks({ status }) {
  if (!status) {
    // Single white tick — sent
    return (
      <svg className="inline w-4 h-4 ml-0.5 flex-shrink-0" viewBox="0 0 16 11" fill="none"
        style={{ color: 'rgba(255,255,255,0.7)' }}>
        <path d="M1.5 5.5L5.5 9.5L14.5 1.5" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (status === 'delivered') {
    // Double white tick — delivered
    return (
      <span className="inline-flex items-center ml-0.5 flex-shrink-0"
        style={{ color: 'rgba(255,255,255,0.7)' }}>
        <svg className="w-4 h-4 -mr-2" viewBox="0 0 16 11" fill="none">
          <path d="M1.5 5.5L5.5 9.5L14.5 1.5" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <svg className="w-4 h-4" viewBox="0 0 16 11" fill="none">
          <path d="M1.5 5.5L5.5 9.5L14.5 1.5" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  // Double bright cyan tick — seen
  return (
    <span className="inline-flex items-center ml-0.5 flex-shrink-0"
      style={{ color: '#67e8f9' }}>
      <svg className="w-4 h-4 -mr-2" viewBox="0 0 16 11" fill="none">
        <path d="M1.5 5.5L5.5 9.5L14.5 1.5" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <svg className="w-4 h-4" viewBox="0 0 16 11" fill="none">
        <path d="M1.5 5.5L5.5 9.5L14.5 1.5" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

export default function MessageThread({ conversation, onBack, markRead, isRemoved = false, onDismiss, historyFrom = null }) {
  const { user }               = useAuth();
  const { socket, registerResync } = useSocket();
  const toast                  = useToast();

  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [msgStatus, setMsgStatus] = useState({});
  const [showGroup, setShowGroup] = useState(false);
  const [members, setMembers]     = useState(conversation.members || []);
  const bottomRef = useRef(null);

  // Keep members in sync if conversation prop changes (e.g. switching chats)
  useEffect(() => {
    setMembers(conversation.members || []);
  }, [conversation.id]);

  const displayName =
    conversation.type === 'group'
      ? conversation.name || 'Group'
      : members.find((m) => m.id !== user?.id)?.username || 'Direct message';

  // Load history
  useEffect(() => {
    setMessages([]);
    setMsgStatus({});
    setLoading(true);
    api.get(`/messages/${conversation.id}${historyFrom ? `?since=${encodeURIComponent(historyFrom)}` : ''}`)
      .then(({ data }) => {
        setMessages(data.messages);
        const statusMap = {};
        data.messages.forEach((m) => { if (m.status) statusMap[m.id] = m.status; });
        setMsgStatus(statusMap);
      })
      .catch(() => toast('Failed to load messages', 'error'))
      .finally(() => setLoading(false));
  }, [conversation.id, historyFrom]);

  // Register resync callback — fires on socket reconnect
  useEffect(() => {
    const unregister = registerResync(conversation.id, async (since) => {
      try {
        const { data } = await api.get(
          `/messages/${conversation.id}?since=${encodeURIComponent(since)}`
        );
        if (data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = data.messages.filter((m) => !existingIds.has(m.id));
            return [...prev, ...fresh];
          });
          // Also update status for resynced messages
          const statusMap = {};
          data.messages.forEach((m) => { if (m.status) statusMap[m.id] = m.status; });
          setMsgStatus((prev) => ({ ...prev, ...statusMap }));
          toast(`Synced ${data.messages.length} missed message(s)`, 'info', 2500);
        }
      } catch {
        // silent — they'll see the gap when they scroll
      }
    });
    return unregister;
  }, [conversation.id, registerResync, toast]);

  // Mark conversation open (seen) — also clears the local unread badge
  useEffect(() => {
    if (!socket) return;
    socket.emit('conversation:open', { conversationId: conversation.id });
    markRead?.(conversation.id);   // ← clear badge immediately
  }, [socket, conversation.id]);

  // Real-time new messages
  useEffect(() => {
    if (!socket) return;
    const onNew = (msg) => {
      if (msg.conversation_id === conversation.id) {
        setMessages((prev) => [...prev, msg]);
        socket.emit('conversation:open', { conversationId: conversation.id });
        markRead?.(conversation.id);   // ← keep badge at 0 while open
      }
    };
    socket.on('message:new', onNew);
    return () => socket.off('message:new', onNew);
  }, [socket, conversation.id]);

  // Read receipt updates
  useEffect(() => {
    if (!socket) return;
    const onStatus = ({ messageId, conversationId, status }) => {
      if (conversationId !== conversation.id) return;
      setMsgStatus((prev) => {
        if (messageId) return { ...prev, [messageId]: status };
        // bulk update
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => { updated[id] = status; });
        return updated;
      });
    };
    socket.on('message:status_update', onStatus);
    return () => socket.off('message:status_update', onStatus);
  }, [socket, conversation.id]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback((content, attachmentUrl = null) => {
    if (!socket || (!content?.trim() && !attachmentUrl)) return;
    socket.emit('message:send', {
      conversationId: conversation.id,
      content: content || null,
      attachmentUrl,
    }, (ack) => {
      if (ack?.status === 'error') toast(ack.message || 'Failed to send message', 'error');
    });
  }, [socket, conversation.id, toast]);

  const isMine = (msg) => msg.sender_id === user?.id || msg.senderId === user?.id;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white flex-shrink-0 shadow-sm">
        {/* Back button — always visible */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-full
              hover:bg-gray-100 text-gray-600 hover:text-brand-600 transition flex-shrink-0"
            aria-label="Back to conversations"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className="w-5 h-5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div className="w-9 h-9 rounded-full flex items-center justify-center
          font-bold text-sm flex-shrink-0 text-white"
          style={conversation.type === 'group'
            ? { background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }
            : { background: '#3b82f6' }}>
          {conversation.type === 'group' ? '👥' : displayName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{displayName}</p>
          <p className="text-xs text-gray-400">
            {conversation.type === 'group'
              ? `${members.length} member${members.length !== 1 ? 's' : ''}`
              : 'Direct message'}
          </p>
        </div>
        {conversation.type === 'group' && (
          <button
            onClick={() => setShowGroup((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition text-sm px-2 py-1 rounded hover:bg-gray-100 flex-shrink-0"
            title="Group info"
            aria-label="Group info"
          >
            ⚙️
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Message area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-1 bg-gray-50">

            {/* Loading skeletons */}
            {loading && (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? '' : 'justify-end'}`}>
                    <div className="animate-pulse h-9 bg-gray-200 rounded-2xl"
                      style={{ width: `${120 + (i * 23) % 120}px` }} />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && messages.length === 0 && (
              <div className="text-center mt-16">
                <div className="text-5xl mb-3">👋</div>
                <p className="text-sm font-medium text-gray-500">No messages yet</p>
                <p className="text-xs text-gray-400 mt-1">Say hello!</p>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, idx) => {
              const mine     = isMine(msg);
              const showName = !mine && conversation.type === 'group';
              const prev     = messages[idx - 1];
              const grouped  = prev &&
                prev.sender_id === msg.sender_id &&
                new Date(msg.created_at) - new Date(prev.created_at) < 60_000;
              const status   = msgStatus[msg.id];

              // Show date separator when day changes between messages
              const msgDate  = new Date(msg.created_at || msg.createdAt);
              const prevDate = prev ? new Date(prev.created_at || prev.createdAt) : null;
              const showDate = !prevDate ||
                msgDate.toDateString() !== prevDate.toDateString();

              return (
                <div key={msg.id || idx}>
                  {showDate && (
                    <DateSeparator dateStr={msg.created_at || msg.createdAt} />
                  )}

                  {/* System message — centred pill, no bubble */}
                  {msg.type === 'system' ? (
                    <SystemMessage content={msg.content} />
                  ) : (
                    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${grouped && !showDate ? 'mt-0.5' : 'mt-3'}`}>
                      <div className={`max-w-[75%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                        {showName && !grouped && (
                          <span className="text-xs text-brand-600 font-semibold mb-1 ml-1">
                            {msg.username}
                          </span>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm break-words
                          ${mine
                            ? 'bg-brand-600 text-white rounded-br-none'
                            : 'bg-gray-200 text-gray-900 rounded-bl-none'}`}
                        >
                          <Attachment url={msg.attachment_url} mine={mine} />
                          {msg.content && (
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          )}
                          <div className="flex items-center justify-end gap-0.5 mt-1">
                            <span className={`text-xs ${mine ? 'text-white/60' : 'text-gray-500'}`}>
                              {new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                            {mine && <Ticks status={status} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <TypingIndicator conversationId={conversation.id} />
          {isRemoved ? (
            <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-400 italic flex items-center gap-1.5">
                🚫 You were removed — read-only
              </span>
              <button
                onClick={onDismiss}
                className="flex-shrink-0 text-xs font-semibold text-red-500
                  hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200
                  px-3 py-1.5 rounded-lg transition"
              >
                🗑 Delete from list
              </button>
            </div>
          ) : (
            <MessageInput onSend={handleSend} conversationId={conversation.id} />
          )}
        </div>

        {/* Group side panel */}
        {showGroup && conversation.type === 'group' && (
          <GroupInfoPanel
            conversation={{ ...conversation, members }}
            onClose={() => setShowGroup(false)}
            onMembersChange={setMembers}
          />
        )}
      </div>
    </div>
  );
}
