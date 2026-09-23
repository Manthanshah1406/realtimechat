import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth }  from '../context/AuthContext';
import { useToast } from '../components/UI/Toast';
import Spinner      from '../components/UI/Spinner';

export default function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const toast      = useToast();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast('Email and password are required.', 'warning');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      toast(err.response?.data?.message || 'Login failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💬</div>
          <h1 className="text-2xl font-bold text-gray-900">RealTimeChat</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              id="password" name="password" type="password" autoComplete="current-password"
              value={form.password} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60
              text-white font-semibold rounded-xl py-2.5 transition flex items-center justify-center gap-2"
          >
            {loading ? <><Spinner size="sm" /><span>Signing in…</span></> : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          No account?{' '}
          <Link to="/signup" className="text-brand-600 hover:underline font-medium">
            Sign up
          </Link>
        </p>

        {/* Demo hint */}
        <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 text-center">
          Demo: <span className="font-mono">alice@demo.com</span> / <span className="font-mono">demo1234</span>
        </div>
      </div>
    </div>
  );
}
