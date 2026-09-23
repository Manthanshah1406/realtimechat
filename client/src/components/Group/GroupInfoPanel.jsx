import { useState } from 'react';
import api from '../../api/client';
import { useAuth }   from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function GroupInfoPanel({ conversation, onClose, onMembersChange }) {
  const { user }   = useAuth();
  const { socket } = useSocket();

  const [members,      setMembers]      = useState(conversation.members || []);
  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState([]);
  const [searched,     setSearched]     = useState(false);
  const [showAdd,      setShowAdd]      = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  // Leave flow states
  const [leaveStep,    setLeaveStep]    = useState('idle'); // 'idle' | 'must_promote' | 'confirm'
  const [promotePick,  setPromotePick]  = useState(null);  // user to promote before leaving

  const myRole  = members.find((m) => m.id === user?.id)?.role;
  const isAdmin = myRole === 'admin';
  const otherMembers = members.filter((m) => m.id !== user?.id);
  const hasAnotherAdmin = otherMembers.some((m) => m.role === 'admin');

  // ── Search users ────────────────────────────────────────────────────────────
  const searchUsers = async (q) => {
    setQuery(q);
    setSearched(false);
    if (!q.trim()) { setResults([]); return; }
    const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
    setResults(data.users.filter((u) => !members.find((m) => m.id === u.id)));
    setSearched(true);
  };

  // ── Add member ──────────────────────────────────────────────────────────────
  const addMember = async (u) => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/conversations/${conversation.id}/members`, { userId: u.id });
      const updated = [...members, { ...u, role: 'member' }];
      setMembers(updated);
      onMembersChange?.(updated);
      setResults((prev) => prev.filter((x) => x.id !== u.id));
      setQuery('');
      setSearched(false);
      socket?.emit('conversation:join', conversation.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  // ── Remove member ───────────────────────────────────────────────────────────
  const removeMember = async (memberId) => {
    setError('');
    try {
      await api.delete(`/conversations/${conversation.id}/members/${memberId}`);
      const updated = members.filter((m) => m.id !== memberId);
      setMembers(updated);
      onMembersChange?.(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  // ── Promote to admin ────────────────────────────────────────────────────────
  const promoteToAdmin = async (memberId, thenLeave = false) => {
    setError('');
    setLoading(true);
    try {
      await api.patch(`/conversations/${conversation.id}/members/${memberId}/role`);
      const updated = members.map((m) => m.id === memberId ? { ...m, role: 'admin' } : m);
      setMembers(updated);
      onMembersChange?.(updated);
      if (thenLeave) {
        await doLeave();
      } else {
        setLeaveStep('idle');
        setPromotePick(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to promote member');
    } finally {
      setLoading(false);
    }
  };

  // ── Leave ───────────────────────────────────────────────────────────────────
  const doLeave = async () => {
    setError('');
    try {
      await api.delete(`/conversations/${conversation.id}/leave`);
      onClose();
      window.location.reload();
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'MUST_PROMOTE_ADMIN') {
        setLeaveStep('must_promote');
      } else {
        setError(err.response?.data?.message || 'Failed to leave group');
      }
    }
  };

  const handleLeaveClick = () => {
    if (isAdmin && !hasAnotherAdmin && otherMembers.length > 0) {
      // Block immediately on client — no need to hit server
      setLeaveStep('must_promote');
    } else {
      setLeaveStep('confirm');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-72 border-l bg-white flex flex-col flex-shrink-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h3 className="font-bold text-sm text-gray-800">Group Info</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center
            text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
        >✕</button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">

        {/* Group avatar + name */}
        <div className="px-4 py-4 border-b text-center">
          <div className="w-14 h-14 rounded-full text-2xl text-white font-bold
            flex items-center justify-center mx-auto mb-2"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
            👥
          </div>
          <p className="font-semibold text-gray-900">{conversation.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Group · {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Members list */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Members</p>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand-500 text-white text-xs
                    font-bold flex items-center justify-center flex-shrink-0">
                    {m.username[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {m.username}
                      {m.id === user?.id && (
                        <span className="text-gray-400 font-normal"> (you)</span>
                      )}
                    </p>
                    {m.role === 'admin' && (
                      <p className="text-xs text-violet-600 font-semibold">Admin</p>
                    )}
                  </div>
                </div>

                {/* Admin actions on other members */}
                {isAdmin && m.id !== user?.id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {m.role !== 'admin' && (
                      <button
                        onClick={() => promoteToAdmin(m.id)}
                        disabled={loading}
                        title="Make admin"
                        className="text-xs text-violet-500 hover:text-violet-700
                          px-2 py-1 rounded-lg hover:bg-violet-50 transition disabled:opacity-50"
                      >
                        ★ Admin
                      </button>
                    )}
                    <button
                      onClick={() => removeMember(m.id)}
                      disabled={loading}
                      className="text-xs text-red-400 hover:text-red-600
                        px-2 py-1 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add Member — admin only */}
        {isAdmin && (
          <div className="px-4 pb-4">
            {!showAdd ? (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  border-2 border-dashed border-brand-300 text-brand-600 hover:bg-brand-50
                  text-sm font-semibold transition"
              >
                <span className="text-lg leading-none">+</span>
                Add Member
              </button>
            ) : (
              <div className="border-2 border-brand-200 rounded-xl p-3 bg-brand-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-brand-700 uppercase">Add Member</p>
                  <button
                    onClick={() => { setShowAdd(false); setQuery(''); setResults([]); }}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >✕</button>
                </div>
                <div className="relative mb-2">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => searchUsers(e.target.value)}
                    placeholder="Search username…"
                    className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2
                      text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                </div>
                {results.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg divide-y max-h-36 overflow-y-auto">
                    {results.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => addMember(u)}
                        disabled={loading}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm
                          hover:bg-brand-50 transition text-left disabled:opacity-50"
                      >
                        <div className="w-6 h-6 rounded-full bg-brand-500 text-white
                          text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {u.username[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800 flex-1">{u.username}</span>
                        <span className="text-brand-600 text-xs font-semibold">+ Add</span>
                      </button>
                    ))}
                  </div>
                )}
                {searched && results.length === 0 && query.trim() && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    No users found for "{query}"
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mx-4 mb-3 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
      </div>

      {/* ── Leave section ─────────────────────────────────────────────────── */}
      <div className="p-4 border-t space-y-2">

        {/* Step: idle — show Leave button */}
        {leaveStep === 'idle' && (
          <button
            onClick={handleLeaveClick}
            className="w-full flex items-center justify-center gap-2 text-sm text-red-500
              hover:text-red-700 font-semibold py-2.5 rounded-xl hover:bg-red-50
              transition border border-red-200"
          >
            🚪 Leave Group
          </button>
        )}

        {/* Step: must_promote — admin must pick a new admin first */}
        {leaveStep === 'must_promote' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-800">
              👑 You're the only admin
            </p>
            <p className="text-xs text-amber-700">
              Promote someone to admin before leaving so the group isn't leaderless.
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {otherMembers.filter((m) => m.role !== 'admin').map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPromotePick(m)}
                  disabled={loading}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                    transition disabled:opacity-50
                    ${promotePick?.id === m.id
                      ? 'bg-violet-100 border border-violet-400'
                      : 'bg-white border border-gray-200 hover:bg-violet-50'}`}
                >
                  <div className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs
                    font-bold flex items-center justify-center flex-shrink-0">
                    {m.username[0].toUpperCase()}
                  </div>
                  <span className="flex-1 text-left font-medium text-gray-800">{m.username}</span>
                  {promotePick?.id === m.id && (
                    <span className="text-violet-600 text-xs font-semibold">Selected</span>
                  )}
                </button>
              ))}
            </div>

            {promotePick && (
              <button
                onClick={() => promoteToAdmin(promotePick.id, true)}
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs
                  font-semibold py-2 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Promoting…' : `Make ${promotePick.username} admin & Leave`}
              </button>
            )}

            <button
              onClick={() => { setLeaveStep('idle'); setPromotePick(null); }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Step: confirm — simple confirmation */}
        {leaveStep === 'confirm' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-red-800">Leave group?</p>
            <p className="text-xs text-red-600">
              You won't receive messages from this group anymore.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setLeaveStep('idle')}
                className="flex-1 text-xs font-semibold py-2 rounded-lg border
                  border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={doLeave}
                disabled={loading}
                className="flex-1 text-xs font-semibold py-2 rounded-lg bg-red-500
                  hover:bg-red-600 text-white transition disabled:opacity-50"
              >
                {loading ? 'Leaving…' : 'Leave'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
