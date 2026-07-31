import { useState } from 'react';
import { signup } from '../api/rides';

export default function SignupView({ onSignedUp, onGoLogin }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputClass =
    'w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 outline-none transition-shadow focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10';
  const labelClass = 'mb-1.5 block text-xs font-bold text-stone-600';

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      setError('Please fill in every field.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const user = await signup(form);
      onSignedUp(user);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-5 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Sign up</h1>
        <p className="mt-1.5 text-sm text-stone-500">Create an account to post rides.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div>
          <label className={labelClass}>Full name</label>
          <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Ayesha Khan" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="you@example.com" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Phone number</label>
          <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="e.g. +92 300 1234567" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} placeholder="At least 6 characters" className={inputClass} />
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>

        <p className="text-center text-sm text-stone-500">
          Already have an account?{' '}
          <button type="button" onClick={onGoLogin} className="font-bold text-emerald-700 hover:underline">
            Log in
          </button>
        </p>
      </form>
    </div>
  );
}
