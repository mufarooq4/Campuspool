import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { pool } from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

// GET /api/rides — all upcoming rides, soonest first
app.get('/api/rides', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         r.id,
         r.origin,
         r.destination,
         r.depart_at,
         r.seats_total,
         r.fare,
         r.driver_id,
         u.name  AS driver_name,
         u.phone
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

// POST /api/rides — publish a new ad
app.post('/api/rides', async (req, res) => {
  const { driver_name, phone, origin, destination, depart_at, seats_total, fare } = req.body;

  if (!driver_name || !phone || !origin || !destination || !depart_at || !seats_total) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO rides (driver_name, phone, origin, destination, depart_at, seats_total, fare)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, driver_name, phone, origin, destination, depart_at, seats_total, fare`,
      [driver_name, phone, origin, destination, depart_at, seats_total, fare ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/rides failed:', err);
    res.status(500).json({ error: 'Could not create ride' });
  }
});

// POST /api/auth/signup — create an account
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, is_admin`,
      [name, email, phone, password_hash]
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));