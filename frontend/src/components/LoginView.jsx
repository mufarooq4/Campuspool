import { useState } from 'react';
import { login } from '../api/rides';

export default function LoginView({ onLoggedIn, onGoSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputClass =
    'w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 outline-none transition-shadow focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10';
  const labelClass = 'mb-1.5 block text-xs font-bold text-stone-600';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const user = await login(email, password);
      onLoggedIn(user);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-5 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Log in</h1>
        <p className="mt-1.5 text-sm text-stone-500">Welcome back to CampusPool.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-center text-xs text-stone-400">
          mufarooq9000@gmail.com / campus123
        </p>

        <p className="text-center text-sm text-stone-500">
          No account?{' '}
          <button type="button" onClick={onGoSignup} className="font-bold text-emerald-700 hover:underline">
            Sign up
          </button>
        </p>
      </form>
    </div>
  );
}
