import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth }  from '../context/AuthContext';
import { useToast } from '../components/UI/Toast';
import Spinner      from '../components/UI/Spinner';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate   = useNavigate();
  const toast      = useToast();
  const [form, setForm]     = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
      toast('All fields are required.', 'warning');
      return;
    }
    if (form.username.length < 2) {
      toast('Username must be at least 2 characters.', 'warning');
      return;
    }
    if (form.password.length < 6) {
      toast('Password must be at least 6 characters.', 'warning');
      return;
    }
    setLoading(true);
    try {
      await signup(form.username, form.email, form.password);
      navigate('/');
    } catch (err) {
      toast(err.response?.data?.message || 'Signup failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💬</div>
          <h1 className="text-2xl font-bold text-gray-900">RealTimeChat</h1>
          <p className="text-sm text-gray-400 mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
              Username
            </label>
            <input
              id="username" name="username" type="text" autoComplete="username"
              value={form.username} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              placeholder="johndoe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email" name="email" type="email" autoComplete="email"
              value={form.email} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password" name="password" type="password" autoComplete="new-password"
              value={form.password} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              placeholder="Min. 6 characters"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60
              text-white font-semibold rounded-xl py-2.5 transition flex items-center justify-center gap-2"
          >
            {loading ? <><Spinner size="sm" /><span>Creating account…</span></> : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
