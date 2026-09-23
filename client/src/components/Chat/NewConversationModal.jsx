import { useEffect, useState } from 'react';
import api from '../../api/client';

// Deterministic avatar colour from username
const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-rose-500',   'bg-amber-500', 'bg-cyan-500',
  'bg-pink-500',   'bg-indigo-500',
];
function avatarColor(username = '') {
  let n = 0;
  for (const c of username) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function UserCard({ user, selected, onToggle }) {
  return (
    <button
      onClick={() => onToggle(user)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition
        ${selected
          ? 'border-brand-500 bg-brand-50'
          : 'border-gray-100 bg-white hover:border-brand-200 hover:bg-gray-50'}`}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center
        text-white font-bold text-sm ${avatarColor(user.username)}`}>
        {user.username[0].toUpperCase()}
      </div>

      {/* Name */}
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{user.username}</p>
        <p className="text-xs text-gray-400 truncate">{user.email || 'Member'}</p>
      </div>

      {/* Checkmark */}
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
        border-2 transition ${selected ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
        {selected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  );
}

export default function NewConversationModal({ onClose, onCreate }) {
  const [type,      setType]      = useState('direct');
  const [query,     setQuery]     = useState('');
  const [users,     setUsers]     = useState([]);
  const [searched,  setSearched]  = useState(false); // true once a search has completed
  const [selected,  setSelected]  = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setSearched(false);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/users/search?q=${encodeURIComponent(query)}`)
        .then(({ data }) => { setUsers(data.users); setSearched(true); })
        .catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const toggleUser = (u) => {
    setSelected((prev) =>
      prev.find((x) => x.id === u.id)
        ? prev.filter((x) => x.id !== u.id)
        : type === 'direct' ? [u] : [...prev, u]
    );
  };

  const handleCreate = async () => {
    setError('');
    if (selected.length === 0) { setError('Select at least one user.'); return; }
    if (type === 'group' && !groupName.trim()) { setError('Enter a group name.'); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/conversations', {
        type,
        name: type === 'group' ? groupName.trim() : null,
        memberIds: selected.map((u) => u.id),
      });
      onCreate(data.conversation);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create conversation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">New Conversation</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center
              text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Type toggle */}
        <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-xl">
          {[
            { key: 'direct', label: '👤 Direct' },
            { key: 'group',  label: '👥 Group'  },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setType(key); setSelected([]); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
                ${type === key
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Group name */}
        {type === 'group' && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              placeholder="e.g. Dev Team, Weekend Trip…"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Search input — visually distinct from results */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
            Search People
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Type a username…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm
                bg-gray-50 focus:bg-white focus:outline-none focus:ring-2
                focus:ring-brand-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Results — cards, clearly different from the input */}
        {query.trim() && (
          <div className="mb-4 max-h-52 overflow-y-auto scrollbar-thin space-y-2">
            {users.length > 0
              ? users.map((u) => (
                  <UserCard
                    key={u.id}
                    user={u}
                    selected={!!selected.find((x) => x.id === u.id)}
                    onToggle={toggleUser}
                  />
                ))
              : searched && (
                  <div className="flex flex-col items-center justify-center py-6 px-4
                    border-2 border-dashed border-gray-200 rounded-xl text-center">
                    <span className="text-3xl mb-2">🔍</span>
                    <p className="text-sm font-medium text-gray-500">No users found</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      No one matched "<span className="font-semibold">{query}</span>"
                    </p>
                  </div>
                )
            }
          </div>
        )}

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {selected.map((u) => (
              <span
                key={u.id}
                className="flex items-center gap-1.5 bg-brand-100 text-brand-700
                  text-xs font-medium px-3 py-1.5 rounded-full"
              >
                <span className={`w-4 h-4 rounded-full text-white flex items-center justify-center text-xs
                  ${avatarColor(u.username)}`}>
                  {u.username[0].toUpperCase()}
                </span>
                {u.username}
                <button
                  onClick={() => toggleUser(u)}
                  className="hover:text-red-500 transition leading-none"
                  aria-label={`Remove ${u.username}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm mb-3 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={loading || selected.length === 0}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40
            disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition"
        >
          {loading ? 'Creating…' : type === 'group' ? 'Create Group' : 'Start Chat'}
        </button>
      </div>
    </div>
  );
}
