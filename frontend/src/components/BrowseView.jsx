import { useEffect, useState } from 'react';
import { fetchRides } from '../api/rides';
import RideCard from './RideCard';
import ContactModal from './ContactModal';

export default function BrowseView() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchRides().then((data) => {
      if (!cancelled) {
        setRides(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2.5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Browse ads</h1>
          <p className="mt-1.5 text-sm text-stone-500">
            {loading ? 'Loading ads…' : `${rides.length} ${rides.length === 1 ? 'ad' : 'ads'} posted around campus`}
          </p>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl border border-stone-200 bg-stone-100" />
          ))}
        </div>
      )}

      {!loading && rides.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-400">
          No rides posted yet — check back soon.
        </div>
      )}

      {!loading && rides.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rides.map((ride) => (
            <RideCard key={ride.id} ride={ride} onOpen={() => setSelected(ride)} />
          ))}
        </div>
      )}

      <ContactModal ride={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
