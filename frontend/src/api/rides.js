// ---------------------------------------------------------------------------
// Data + auth layer. Swap these bodies for real fetch() calls to your REST
// API later — every function keeps the same signature/shape so nothing else
// in the app needs to change. TODO backend comments mark the real call.
// ---------------------------------------------------------------------------

const AVATAR_COLORS = ['#1f8a5b', '#2a6fdb', '#e0662a', '#7c5cd6', '#c8993a', '#0f9aa0', '#c14b7a'];
const SESSION_KEY = 'campuspool_mock_session';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

function pickColor(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function decorateRide(ride) {
  return { ...ride, initials: initials(ride.driver_name), avatarColor: pickColor(ride.id + ride.driver_name) };
}

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

function currentUserId() {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setSession(userId) {
  try {
    if (userId) localStorage.setItem(SESSION_KEY, userId);
    else localStorage.removeItem(SESSION_KEY);
  } catch { }
}

// Formats an ISO timestamp (depart_at) into a display label. Call this at
// render time — never persist a formatted string.
export function formatDepart(isoString) {
  if (!isoString) return 'Time TBD';
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  const now = new Date();
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((day - today) / 86400000);
  const dayLabel =
    diffDays === 0 ? 'Today' :
      diffDays === 1 ? 'Tomorrow' :
        d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${dayLabel} · ${time}`;
}

export function waLink(phone) {
  const digits = (phone || '').replace(/[^\d]/g, '');
  if (!digits) return '#';
  return `https://wa.me/${digits}?text=${encodeURIComponent('Hi, I saw your ride on CampusPool')}`;
}

export function callLink(phone) {
  const digits = (phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '#';
}

// ---------------------------- Auth ----------------------------------------

// GET /api/me
export async function getCurrentUser() {
  const token = getToken();
  if (!token) return null;              // no token → nobody's logged in

  const res = await fetch(`${API}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    setToken(null);
  }

  if (!res.ok) {
    return null;
  }

  return res.json();
}

// POST /api/login
export async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Login failed');
  }

  const { token, user } = await res.json();
  setToken(token);        // ← the whole point: stash the token
  return user;
}

// POST /api/signup
export async function signup({ name, email, phone, password }) {
  const res = await fetch(`${API}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, password }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Signup failed');
  }

  const { token, user } = await res.json();
  setToken(token);
  return user;
}

// POST /api/logout
export async function logout() {
  setToken(null);
}

// --------------------------- Rides -----------------------------------------
const API = 'http://localhost:3000/api';

const TOKEN_KEY = 'campuspool_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// GET /api/rides  (public feed)
export async function fetchRides() {
  // TODO backend: return fetch('/api/rides').then(r => r.json());
  const res = await fetch(`${API}/rides`);
  if (!res.ok) throw new Error('Failed to fetch rides');
  return res.json();
}

// GET /api/rides/mine  (current user's own ads)
export async function fetchMyRides() {
  const res = await fetch(`${API}/rides/mine`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch your rides');
  return res.json();
}

// GET /api/admin/rides  (admin: every ad)
export async function fetchAllRides() {
  const res = await fetch(`${API}/admin/rides`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch all rides');
  return res.json();
}

// POST /api/rides  (driver_name/phone come from the logged-in user server-side)
export async function postAd(payload) {
  const res = await fetch(`${API}/rides`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to post ad');
  }
  return res.json();
}

// DELETE /api/rides/:id
export async function deleteRide(id) {
  const res = await fetch(`${API}/rides/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete ride');
  }
  return res.json();
}