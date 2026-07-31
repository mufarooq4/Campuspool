import { MessageCircle, Phone, X } from 'lucide-react';
import { waLink, callLink, formatDepart } from '../api/rides';

export default function ContactModal({ ride, onClose }) {
  if (!ride) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-5">
      <div onClick={(e) => e.stopPropagation()} className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span
            className="flex h-13 w-13 flex-none items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: ride.avatarColor }}
          >
            {ride.initials}
          </span>
          <div>
            <div className="text-[17px] font-bold text-stone-900">{ride.driver_name}</div>
            <div className="text-xs font-medium text-stone-400">
              {ride.origin} → {ride.destination}
            </div>
          </div>
        </div>

        <div className="h-px bg-stone-100" />

        <div className="flex flex-col gap-2 text-sm text-stone-700">
          <div><strong>Departs:</strong> {formatDepart(ride.depart_at)}</div>
          <div><strong>Seats:</strong> {ride.seats_total}</div>
          <div><strong>Fare:</strong> {ride.fare > 0 ? `Rs. ${ride.fare.toLocaleString()}` : 'Free'} per seat</div>
          <div><strong>Phone:</strong> {ride.phone}</div>
        </div>

        <a
          href={waLink(ride.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700"
        >
          <MessageCircle size={16} />
          Message on WhatsApp
        </a>
        <a href={callLink(ride.phone)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-100 py-3 text-sm font-bold text-stone-800 hover:bg-stone-200">
          <Phone size={16} />
          Call {ride.phone}
        </a>
        <button type="button" onClick={onClose} className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-stone-400 hover:text-stone-600">
          <X size={13} />
          Close
        </button>
      </div>
    </div>
  );
}
