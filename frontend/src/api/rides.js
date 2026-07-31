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

// Demo accounts, so you can test "My ads" / "Admin" without a backend.
let MOCK_USERS = [
  { id: 'u1', name: 'Ayesha Khan', email: 'ayesha@campuspool.pk', phone: '+92 301 2223344', password: 'demo123', is_admin: false },
  { id: 'u2', name: 'Admin', email: 'admin@campuspool.pk', phone: '+92 300 0000000', password: 'admin123', is_admin: true },
];

let MOCK_RIDES = [
  { id: 'r1', driver_name: 'Ayesha Khan', phone: '+92 301 2223344', origin: 'F-11 Markaz', destination: 'GIKI Campus', depart_at: '2026-07-25T07:30:00', seats_total: 3, fare: 900, owner_id: 'u1' },
  { id: 'r2', driver_name: 'Bilal Ahmed', phone: '+92 333 4455667', origin: 'G-9', destination: 'NUST H-12', depart_at: '2026-07-24T17:00:00', seats_total: 4, fare: 250, owner_id: null },
  { id: 'r3', driver_name: 'Sara Malik', phone: '+92 345 6677889', origin: 'DHA Phase 2', destination: 'Air University', depart_at: '2026-07-27T08:00:00', seats_total: 3, fare: 400, owner_id: null },
  { id: 'r4', driver_name: 'Usman Tariq', phone: '+92 312 9988001', origin: 'Bahria Town', destination: 'COMSATS Islamabad', depart_at: '2026-07-25T06:45:00', seats_total: 4, fare: 300, owner_id: null },
  { id: 'r5', driver_name: 'Hina Raza', phone: '+92 321 9988776', origin: 'F-7', destination: 'Quaid-i-Azam University', depart_at: '2026-07-24T09:00:00', seats_total: 2, fare: 200, owner_id: null },
  { id: 'r6', driver_name: 'Zain Abbas', phone: '+92 300 1231234', origin: 'I-8 Markaz', destination: 'FAST NUCES', depart_at: '2026-07-29T08:15:00', seats_total: 3, fare: 220, owner_id: null },
].map(decorateRide);

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
  } catch {}
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
  // TODO backend: return fetch('/api/me').then(r => (r.ok ? r.json() : null));
  await new Promise((r) => setTimeout(r, 80));
  const id = currentUserId();
  return publicUser(MOCK_USERS.find((u) => u.id === id));
}

// POST /api/login
export async function login(email, password) {
  // TODO backend:
  // const res = await fetch('/api/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
  // if (!res.ok) throw new Error((await res.json()).message);
  // return res.json();
  await new Promise((r) => setTimeout(r, 200));
  const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.password !== password) throw new Error('Incorrect email or password.');
  setSession(user.id);
  return publicUser(user);
}

// POST /api/signup
export async function signup({ name, email, phone, password }) {
  // TODO backend:
  // const res = await fetch('/api/signup', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name, email, phone, password }) });
  // if (!res.ok) throw new Error((await res.json()).message);
  // return res.json();
  await new Promise((r) => setTimeout(r, 200));
  if (MOCK_USERS.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
    throw new Error('That email is already registered.');
  }
  const user = { id: 'u' + Date.now(), name: name.trim(), email: email.trim(), phone: phone.trim(), password, is_admin: false };
  MOCK_USERS = [...MOCK_USERS, user];
  setSession(user.id);
  return publicUser(user);
}

// POST /api/logout
export async function logout() {
  // TODO backend: await fetch('/api/logout', { method: 'POST' });
  await new Promise((r) => setTimeout(r, 80));
  setSession(null);
}

// --------------------------- Rides -----------------------------------------
const API = 'http://localhost:3000/api';
// GET /api/rides  (public feed)
export async function fetchRides() {
  // TODO backend: return fetch('/api/rides').then(r => r.json());
  const res = await fetch(`${API}/rides`);
  if (!res.ok) throw new Error('Failed to fetch rides');
  return res.json();
}

// GET /api/rides/mine  (current user's own ads)
export async function fetchMyRides() {
  // TODO backend: return fetch('/api/rides/mine').then(r => r.json());
  await new Promise((r) => setTimeout(r, 120));
  const id = currentUserId();
  return MOCK_RIDES.filter((r) => r.owner_id === id);
}

// GET /api/admin/rides  (admin: every ad)
export async function fetchAllRides() {
  // TODO backend: return fetch('/api/admin/rides').then(r => r.json());
  await new Promise((r) => setTimeout(r, 120));
  return MOCK_RIDES;
}

// POST /api/rides  (driver_name/phone come from the logged-in user server-side)
export async function postAd(payload) {
  // TODO backend:
  // return fetch('/api/rides', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) }).then(r => r.json());
  await new Promise((r) => setTimeout(r, 150));
  const id = currentUserId();
  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) throw new Error('You must be logged in to post an ad.');
  const ride = decorateRide({
    id: 'r' + Date.now(),
    driver_name: user.name,
    phone: user.phone,
    owner_id: user.id,
    ...payload,
  });
  MOCK_RIDES = [ride, ...MOCK_RIDES];
  return ride;
}

// DELETE /api/rides/:id
export async function deleteRide(id) {
  // TODO backend: await fetch(`/api/rides/${id}`, { method: 'DELETE' });
  await new Promise((r) => setTimeout(r, 120));
  MOCK_RIDES = MOCK_RIDES.filter((r) => r.id !== id);
}
