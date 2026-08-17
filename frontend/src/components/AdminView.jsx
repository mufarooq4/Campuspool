import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { fetchAllRides, deleteRide, formatDepart } from '../api/rides';

const CURRENCY = 'Rs.';

function AdminRow({ ride, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirmDelete() {
    setDeleting(true);
    setError('');
    try {
      await deleteRide(ride.id);
      onDeleted(ride.id);
    } catch (err) {
      setError(err.message || 'Could not remove this ad. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-3.5 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold text-stone-900">
          {ride.origin} → {ride.destination}
        </div>
        <div className="mt-1 text-sm text-stone-500">
          {ride.driver_name} · {ride.phone} · {formatDepart(ride.depart_at)} · {ride.fare > 0 ? `${CURRENCY} ${ride.fare.toLocaleString()}` : 'Free'}
        </div>
      </div>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex flex-none items-center gap-1.5 rounded-lg bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
        >
          <Trash2 size={14} />
          Remove
        </button>
      ) : (
        <div className="flex flex-none flex-col items-end gap-1.5">
          <span className="text-xs font-semibold text-red-700">Remove permanently?</span>
          {error && <span className="text-xs font-semibold text-red-700">{error}</span>}
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setConfirming(false)} className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-200">
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? 'Removing…' : 'Yes, remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminView() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchAllRides()
      .then((data) => {
        if (!cancelled) {
          setRides(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load ads. Please try again.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Admin</h1>
        <p className="mt-1.5 text-sm text-stone-500">All ads posted on CampusPool.</p>
      </div>

      {loading && (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl border border-stone-200 bg-stone-100" />)}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-dashed border-red-300 bg-red-50 p-10 text-center text-sm text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && rides.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-400">
          No ads posted yet.
        </div>
      )}

      {!loading && !error && rides.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {rides.map((r) => (
            <AdminRow key={r.id} ride={r} onDeleted={(id) => setRides((prev) => prev.filter((x) => x.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}
