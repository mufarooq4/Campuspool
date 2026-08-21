import express from 'express';
import cors from 'cors';
//import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import { pool } from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/* ------------------------------------------------------------------ *
 * Boot-time config validation — fail fast, never start half-configured
 * ------------------------------------------------------------------ */
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: missing required env var ${key}`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

const IS_PROD = process.env.NODE_ENV === 'production';
const BCRYPT_ROUNDS = 12;
const TOKEN_TTL = '2h';
const CAMPUS_EMAIL = /@(?:s\.)?giki\.edu\.pk$/i;

// Constant-time-ish login: compare against a real hash when the user is absent,
// so response timing does not reveal whether an email is registered.
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.7Kk8bHqXn3vJ8lqOxvJZ2mYwF1nD3Bu';

const app = express();
app.disable('x-powered-by');
//app.use(helmet());

// Railway/Vercel put exactly one proxy in front. Never use `true` — a client
// can forge X-Forwarded-For and mint unlimited rate-limit keys.
app.set('trust proxy', IS_PROD ? 1 : false);

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
  })
);

app.use(express.json({ limit: '10kb' }));

/* ------------------------------------------------------------------ *
 * Rate limiters
 * ------------------------------------------------------------------ */
// ipKeyGenerator collapses an IPv6 /64 to one bucket. Without it a single
// IPv6 allocation yields ~18 quintillion distinct keys and the limit is fiction.
const byUserOrIp = (req) => req.user?.id ?? ipKeyGenerator(req.ip);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { error: 'Too many attempts. Please try again later.' },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { error: 'Too many accounts created from this network.' },
});

// THE missing control. This endpoint had no limiter, which is how 3,650
// junk rides landed in one 20-minute window.
const createRideLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: byUserOrIp,
  message: { error: 'Ride creation limit reached. Try again in an hour.' },
});

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: byUserOrIp,
});

app.use('/api/auth', authLimiter);

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

/* ------------------------------------------------------------------ *
 * Auth middleware
 * ------------------------------------------------------------------ */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = { id: payload.id };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// is_admin is NOT read from the token. A token lives for hours; a revoked
// admin would keep their powers until it expired. Read the live row instead.
async function requireAdmin(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Admins only' });
    }
    req.user.is_admin = true;
    return next();
  } catch (err) {
    return next(err);
  }
}

async function isAdmin(userId) {
  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return Boolean(rows[0]?.is_admin);
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */
const MAX_HORIZON_DAYS = 30;

function normalisePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (/^03\d{9}$/.test(digits)) return `+92${digits.slice(1)}`;   // 03001234567
  if (/^923\d{9}$/.test(digits)) return `+${digits}`;             // 923001234567
  return null;
}

function validateSignup(body) {
  const { name, email, phone, password } = body ?? {};
  if (!name || !email || !phone || !password) {
    throw new AppError('All fields are required', 400);
  }
  const cleanName = String(name).trim();
  if (cleanName.length < 2 || cleanName.length > 80) {
    throw new AppError('Name must be between 2 and 80 characters', 400);
  }
  const cleanEmail = String(email).trim().toLowerCase();
  if (!CAMPUS_EMAIL.test(cleanEmail)) {
    throw new AppError('Registration is limited to GIKI email addresses', 400);
  }
  const cleanPhone = normalisePhone(phone);
  if (!cleanPhone) {
    throw new AppError('Enter a valid Pakistani mobile number', 400);
  }
  if (String(password).length < 10 || String(password).length > 128) {
    throw new AppError('Password must be between 10 and 128 characters', 400);
  }
  return { name: cleanName, email: cleanEmail, phone: cleanPhone, password: String(password) };
}

function validateRide(body) {
  const { origin, destination, depart_at, seats_total, fare } = body ?? {};
  if (!origin || !destination || !depart_at || seats_total === undefined) {
    throw new AppError('Missing required fields', 400);
  }

  const o = String(origin).trim();
  const d = String(destination).trim();
  if (o.length < 2 || o.length > 120 || d.length < 2 || d.length > 120) {
    throw new AppError('Origin and destination must be 2–120 characters', 400);
  }
  if (o.toLowerCase() === d.toLowerCase()) {
    throw new AppError('Origin and destination cannot be the same', 400);
  }

  const when = new Date(depart_at);
  if (Number.isNaN(when.getTime())) {
    throw new AppError('depart_at is not a valid date', 400);
  }
  if (when <= new Date()) {
    throw new AppError('Departure time must be in the future', 400);
  }
  if (when > new Date(Date.now() + MAX_HORIZON_DAYS * 86_400_000)) {
    throw new AppError(`Departure time cannot be more than ${MAX_HORIZON_DAYS} days ahead`, 400);
  }

  const seats = Number(seats_total);
  if (!Number.isInteger(seats) || seats < 1 || seats > 8) {
    throw new AppError('seats_total must be a whole number between 1 and 8', 400);
  }

  const price = fare === undefined || fare === null ? 0 : Number(fare);
  if (!Number.isFinite(price) || price < 0 || price > 100_000) {
    throw new AppError('fare must be between 0 and 100000', 400);
  }

  return { origin: o, destination: d, depart_at: when.toISOString(), seats_total: seats, fare: price };
}

/* ------------------------------------------------------------------ *
 * Health
 * ------------------------------------------------------------------ */
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

/* ------------------------------------------------------------------ *
 * Auth routes
 * ------------------------------------------------------------------ */
app.post('/api/auth/signup', signupLimiter, async (req, res, next) => {
  try {
    const { name, email, phone, password } = validateSignup(req.body);
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, is_admin`,
      [name, email, phone, password_hash]
    );

    const user = rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') {
      // Deliberately vague: naming the field would confirm which of email or
      // phone is already on the platform.
      return res.status(409).json({ error: 'An account with those details already exists' });
    }
    next(err);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, phone, is_admin, password_hash
       FROM users WHERE email = $1`,
      [String(email).trim().toLowerCase()]
    );

    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user?.password_hash ?? DUMMY_HASH);

    if (!user || !ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    delete user.password_hash;
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

app.get('/api/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, is_admin FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) throw new AppError('User not found', 404);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ *
 * Rides
 * ------------------------------------------------------------------ */

// Feed now requires auth and does NOT return phone numbers. Previously this
// was an unauthenticated endpoint dumping every user's mobile number.
app.get('/api/rides', requireAuth, readLimiter, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { rows } = await pool.query(
      `SELECT r.id, r.origin, r.destination, r.depart_at,
              r.seats_total, r.fare, r.driver_id,
              u.name AS driver_name
       FROM rides r
       JOIN users u ON u.id = r.driver_id
       WHERE r.depart_at > now()
       ORDER BY r.depart_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Contact details are released one ride at a time, to a signed-in user, and
// the disclosure is logged. This is the accountability trail you want if a
// ride goes wrong.
app.get('/api/rides/:id/contact', requireAuth, readLimiter, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.name, u.phone
       FROM rides r JOIN users u ON u.id = r.driver_id
       WHERE r.id = $1 AND r.depart_at > now()`,
      [req.params.id]
    );
    if (!rows[0]) throw new AppError('Ride not found', 404);

    console.info(
      JSON.stringify({
        event: 'contact_revealed',
        ride_id: req.params.id,
        by_user: req.user.id,
        at: new Date().toISOString(),
      })
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.get('/api/rides/mine', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.origin, r.destination, r.depart_at,
              r.seats_total, r.fare, r.driver_id
       FROM rides r
       WHERE r.driver_id = $1
       ORDER BY r.depart_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post('/api/rides', requireAuth, createRideLimiter, async (req, res, next) => {
  try {
    const ride = validateRide(req.body);

    // driver_id comes from the verified token, never from the request body.
    const { rows } = await pool.query(
      `INSERT INTO rides (driver_id, origin, destination, depart_at, seats_total, fare)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, driver_id, origin, destination, depart_at, seats_total, fare`,
      [req.user.id, ride.origin, ride.destination, ride.depart_at, ride.seats_total, ride.fare]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // rides_no_dupe unique index — the database refusing a duplicate posting
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You already posted this ride for that hour' });
    }
    // CHECK constraint — validation should have caught it, so this is a
    // safety net rather than the primary gate
    if (err.code === '23514') {
      return res.status(400).json({ error: 'Ride details failed a database constraint' });
    }
    next(err);
  }
});

app.delete('/api/rides/:id', requireAuth, async (req, res, next) => {
  try {
    const admin = await isAdmin(req.user.id);

    const { rowCount } = admin
      ? await pool.query('DELETE FROM rides WHERE id = $1', [req.params.id])
      : await pool.query('DELETE FROM rides WHERE id = $1 AND driver_id = $2', [
          req.params.id,
          req.user.id,
        ]);

    if (rowCount === 0) throw new AppError('Ride not found or not yours', 404);
    res.json({ deleted: req.params.id });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */
app.get('/api/admin/rides', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { rows } = await pool.query(
      `SELECT r.id, r.origin, r.destination, r.depart_at,
              r.seats_total, r.fare, r.driver_id,
              u.name AS driver_name, u.phone
       FROM rides r
       JOIN users u ON u.id = r.driver_id
       ORDER BY r.depart_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Abuse dashboard: bursts of rides from very few accounts is the fingerprint
// of scripted insertion.
app.get('/api/admin/abuse', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT date_trunc('minute', created_at) AS minute,
              count(*) AS rides,
              count(DISTINCT driver_id) AS drivers
       FROM rides
       WHERE created_at > now() - interval '24 hours'
       GROUP BY 1
       HAVING count(*) > 20
       ORDER BY 1 DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ *
 * 404 + centralised error handler (must be last)
 * ------------------------------------------------------------------ */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  const status = err.isOperational ? err.statusCode : 500;
  if (!err.isOperational) console.error('unhandled:', err);
  res.status(status).json({
    error: status === 500 ? 'Something went wrong' : err.message,
  });
});

/* ------------------------------------------------------------------ *
 * Start + graceful shutdown
 * ------------------------------------------------------------------ */
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`API running on port ${PORT}`));

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}