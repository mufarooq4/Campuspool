import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import { pool } from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});
app.use('/api/auth', authLimiter);

// Middleware: verify the token, attach the user to req
function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;   // { id, is_admin } — now available to the route
    next();               // valid → proceed to the actual route
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// GET /api/rides — public feed, soonest first
app.get('/api/rides', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.origin, r.destination, r.depart_at,
              r.seats_total, r.fare, r.driver_id,
              u.name AS driver_name, u.phone
       FROM rides r
       JOIN users u ON u.id = r.driver_id
       WHERE r.depart_at > now()
       ORDER BY r.depart_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/rides failed:', err);
    res.status(500).json({ error: 'Could not fetch rides' });
  }
});

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, is_admin`,
      [name, email.toLowerCase(), phone, password_hash]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That email is already registered' });
    }
    console.error('signup failed:', err);
    res.status(500).json({ error: 'Could not create account' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      `SELECT id, name, email, phone, is_admin, password_hash
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    delete user.password_hash;
    res.json({ token, user });
  } catch (err) {
    console.error('login failed:', err);
    res.status(500).json({ error: 'Could not log in' });    
  }
});

// GET /api/rides/mine — the logged-in user's own ads
app.get('/api/rides/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.origin, r.destination, r.depart_at,
              r.seats_total, r.fare, r.driver_id,
              u.name AS driver_name, u.phone
       FROM rides r
       JOIN users u ON u.id = r.driver_id
       WHERE r.driver_id = $1
       ORDER BY r.depart_at ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/rides/mine failed:', err);
    res.status(500).json({ error: 'Could not fetch your rides' });
  }
});
// GET /api/me — who is the current token's user?
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, is_admin FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/me failed:', err);
    res.status(500).json({ error: 'Could not fetch user' });
  }
});

// POST /api/rides — publish a new ad (driver comes from the token)
app.post('/api/rides', requireAuth, async (req, res) => {
  try {
    const { origin, destination, depart_at, seats_total, fare } = req.body;

    if (!origin || !destination || !depart_at || !seats_total) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO rides (driver_id, origin, destination, depart_at, seats_total, fare)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, driver_id, origin, destination, depart_at, seats_total, fare`,
      [req.user.id, origin, destination, depart_at, seats_total, fare ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/rides failed:', err);
    res.status(500).json({ error: 'Could not create ride' });
  }
});

// DELETE /api/rides/:id — remove an ad (owner or admin only)
app.delete('/api/rides/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    let result;

    if (req.user.is_admin) {
      // Admin: delete any ride, no ownership condition
      result = await pool.query(
        'DELETE FROM rides WHERE id = $1',
        [id]
      );
    } else {
      // Regular user: delete only if they own it
      result = await pool.query(
        'DELETE FROM rides WHERE id = $1 AND driver_id = $2',
        [id, req.user.id]
      );
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ride not found or not yours' });
    }

    res.json({ deleted: id });
  } catch (err) {
    console.error('DELETE /api/rides/:id failed:', err);
    res.status(500).json({ error: 'Could not delete ride' });
  }
});

// GET /api/admin/rides — every ad (admin only)
app.get('/api/admin/rides', requireAuth, async (req, res) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admins only' });
  }

  try {
    const result = await pool.query(
      `SELECT r.id, r.origin, r.destination, r.depart_at,
              r.seats_total, r.fare, r.driver_id,
              u.name AS driver_name, u.phone
       FROM rides r
       JOIN users u ON u.id = r.driver_id
       ORDER BY r.depart_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/admin/rides failed:', err);
    res.status(500).json({ error: 'Could not fetch rides' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));