import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});