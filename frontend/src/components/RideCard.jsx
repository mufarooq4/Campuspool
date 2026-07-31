import { MapPin, Navigation, ArrowRight, Clock, Users, Phone } from 'lucide-react';
import { formatDepart } from '../api/rides';

const CURRENCY = 'Rs.';

export default function RideCard({ ride, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4.5 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: ride.avatarColor }}
          >
            {ride.initials}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-stone-900">{ride.driver_name}</div>
            <div className="text-xs font-medium text-stone-400">Driver</div>
          </div>
        </div>
        <span className="flex-none whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          {ride.seats_total} {ride.seats_total === 1 ? 'seat' : 'seats'}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 text-sm font-semibold text-stone-800">
        <MapPin size={15} className="text-emerald-700" />
        <span>{ride.origin}</span>
        <ArrowRight size={15} className="mx-0.5 text-stone-300" />
        <Navigation size={15} className="text-stone-600" />
        <span>{ride.destination}</span>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-stone-500">
        <div className="flex items-center gap-1.5">
          <Clock size={15} className="text-stone-400" />
          <span className="font-semibold text-stone-800">{formatDepart(ride.depart_at)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={15} className="text-stone-400" />
          <span className="font-semibold text-stone-800">{ride.seats_total} offered</span>
        </div>
      </div>

      <div className="h-px bg-stone-100" />

      <div className="flex items-center justify-between gap-2.5">
        <div className="leading-tight">
          <div className="text-xl font-bold text-stone-900">
            {ride.fare > 0 ? `${CURRENCY} ${ride.fare.toLocaleString()}` : 'Free'}
          </div>
          <div className="text-[11px] font-bold tracking-wide text-stone-400">PER SEAT</div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
          <Phone size={14} />
          Contact driver
        </span>
      </div>
    </button>
  );
}
