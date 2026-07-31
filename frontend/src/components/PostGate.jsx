import { LogIn, UserPlus } from 'lucide-react';

export default function PostGate({ onLogin, onSignup }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <LogIn size={22} />
      </div>
      <h2 className="text-xl font-bold text-stone-900">Log in to post a ride</h2>
      <p className="text-sm text-stone-500">
        Posting needs an account so riders know it's really you — and can reach you.
      </p>
      <div className="mt-3 flex w-full flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={onLogin}
          className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={onSignup}
          className="flex-1 rounded-xl bg-stone-100 py-2.5 text-sm font-bold text-stone-800 hover:bg-stone-200"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
