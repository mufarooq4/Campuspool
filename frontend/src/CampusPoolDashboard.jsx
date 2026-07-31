import { useCallback, useEffect, useRef, useState } from 'react';
import { Car, LogIn } from 'lucide-react';
import Tabs from './components/Tabs';
import Toast from './components/Toast';
import BrowseView from './components/BrowseView';
import PostAdView from './components/PostAdView';
import PostGate from './components/PostGate';
import LoginView from './components/LoginView';
import SignupView from './components/SignupView';
import MyAdsView from './components/MyAdsView';
import AdminView from './components/AdminView';
import { getCurrentUser, logout } from './api/rides';

export default function CampusPoolDashboard() {
  const [view, setView] = useState('browse');
  const [pendingView, setPendingView] = useState(null); // where to land after login/signup
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  const showToast = useCallback((message) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }, []);

  function goToLogin(landOn) {
    setPendingView(landOn || null);
    setView('login');
  }

  function goToSignup(landOn) {
    setPendingView(landOn || null);
    setView('signup');
  }

  function handleAuthed(u) {
    setUser(u);
    setView(pendingView || 'browse');
    setPendingView(null);
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    showToast('Logged out.');
    setView('browse');
  }

  function handleTabChange(key) {
    if ((key === 'my-ads' || key === 'admin') && !user) {
      goToLogin(key);
      return;
    }
    setView(key);
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      <Toast message={toast} />

      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3.5 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <Car size={21} />
            </span>
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-tight">CampusPool</div>
              <div className="text-xs font-medium text-stone-400">Islamabad · student carpools</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Tabs view={view} onChange={handleTabChange} user={user} />
            {!authLoading && (
              user ? (
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-stone-700">{user.name}</span>
                  <button type="button" onClick={handleLogout} className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-200">
                    Log out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => goToLogin(null)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  <LogIn size={15} />
                  Log in
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-7 pb-16">
        {view === 'browse' && <BrowseView />}

        {view === 'post' && (user ? (
          <PostAdView onPosted={() => setView('browse')} onToast={showToast} />
        ) : (
          <PostGate onLogin={() => goToLogin('post')} onSignup={() => goToSignup('post')} />
        ))}

        {view === 'my-ads' && user && <MyAdsView />}
        {view === 'admin' && user && user.is_admin && <AdminView />}

        {view === 'login' && (
          <LoginView onLoggedIn={handleAuthed} onGoSignup={() => goToSignup(pendingView)} />
        )}
        {view === 'signup' && (
          <SignupView onSignedUp={handleAuthed} onGoLogin={() => goToLogin(pendingView)} />
        )}
      </main>
    </div>
  );
}
