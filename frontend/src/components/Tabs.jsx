import { Search, Plus, List, ShieldCheck } from 'lucide-react';

const tabBase =
  'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors';

export default function Tabs({ view, onChange, user }) {
  const tabs = [
    { key: 'browse', label: 'Browse ads', Icon: Search },
    { key: 'post', label: 'Post an ad', Icon: Plus },
  ];
  if (user) tabs.push({ key: 'my-ads', label: 'My ads', Icon: List });
  if (user && user.is_admin) tabs.push({ key: 'admin', label: 'Admin', Icon: ShieldCheck });

  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-stone-100 p-1">
      {tabs.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`${tabBase} ${
            view === key ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}
