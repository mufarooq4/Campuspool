import { useState } from 'react';
import { Plus } from 'lucide-react';
import { postAd } from '../api/rides';

const initialForm = { origin: '', destination: '', depart: '', seats: '3', fare: '' };

export default function PostAdView({ onPosted, onToast }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.origin.trim() || !form.destination.trim() || !form.depart || !form.seats) {
      setError('Please fill in origin, destination, departure time and seats.');
      return;
    }

    const seats_total = Math.max(1, parseInt(form.seats, 10) || 1);
    const fare = Math.max(0, parseInt(form.fare, 10) || 0);

    setSubmitting(true);
    try {
      await postAd({
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        depart_at: form.depart ? new Date(form.depart).toISOString() : null,
        seats_total,
        fare,
      });
      setForm(initialForm);
      onToast('Ad published — riders can now reach you.');
      onPosted();
    } catch (err) {
      setError(err.message || 'Something went wrong publishing your ad. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 outline-none transition-shadow focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10';
  const labelClass = 'mb-1.5 block text-xs font-bold text-stone-600';

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-5">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Post an ad</h1>
        <p className="mt-1.5 text-sm text-stone-500">Share your route — riders will contact you directly.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4.5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Origin</label>
            <input value={form.origin} onChange={(e) => setField('origin', e.target.value)} placeholder="e.g. F-11 Markaz" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Destination</label>
            <input value={form.destination} onChange={(e) => setField('destination', e.target.value)} placeholder="e.g. GIKI Campus" className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Departure</label>
            <input type="datetime-local" value={form.depart} onChange={(e) => setField('depart', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Total seats</label>
            <input type="number" min="1" max="8" value={form.seats} onChange={(e) => setField('seats', e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Fare per seat</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-400">Rs.</span>
            <input type="number" min="0" value={form.fare} onChange={(e) => setField('fare', e.target.value)} placeholder="0" className={`${inputClass} pl-11`} />
          </div>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
        >
          <Plus size={16} />
          {submitting ? 'Publishing…' : 'Publish ad'}
        </button>
      </form>
    </div>
  );
}
