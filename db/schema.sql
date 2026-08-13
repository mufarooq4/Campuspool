-- CampusPool schema
-- Run:  psql -U postgres -d CampusPool -f db/schema.sql

DROP TABLE IF EXISTS rides;
DROP TABLE IF EXISTS users;

-- ---------------------------------------------------------------- users ----
CREATE TABLE users (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text        NOT NULL,
    email         text        NOT NULL UNIQUE,
    phone         text        NOT NULL,
    password_hash text        NOT NULL,
    is_admin      boolean     NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- rides ----
CREATE TABLE rides (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin       text        NOT NULL,
    destination  text        NOT NULL,
    depart_at    timestamptz NOT NULL,
    seats_total  integer     NOT NULL CHECK (seats_total BETWEEN 1 AND 8),
    fare         integer     NOT NULL DEFAULT 0 CHECK (fare >= 0),
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rides_depart_at_idx ON rides (depart_at);
CREATE INDEX rides_driver_id_idx ON rides (driver_id);

-- ----------------------------------------------------------- seed users ----
-- Passwords are bcrypt hashes: demo123 / admin123
INSERT INTO users (name, email, phone, password_hash, is_admin) VALUES
  ('Ayesha Khan', 'ayesha@campuspool.pk', '+92 301 2223344',
   '$2b$10$OTLDLrfpQ7yNX1LoEY72D.y/3WOOjYqfijM7gCaCOpqSo1GhFIgFy', false),
  ('Admin',       'admin@campuspool.pk',  '+92 300 0000000',
   '$2b$10$4yVt0GnRoL7sGRyqDRU3Fu5RK.GsOljGcdE7cM.fehf3vHc1DYqvm', true),
  ('Bilal Ahmed', 'bilal@campuspool.pk',  '+92 333 4455667',
   '$2b$10$OTLDLrfpQ7yNX1LoEY72D.y/3WOOjYqfijM7gCaCOpqSo1GhFIgFy', false),
  ('Sara Malik',  'sara@campuspool.pk',   '+92 345 6677889',
   '$2b$10$OTLDLrfpQ7yNX1LoEY72D.y/3WOOjYqfijM7gCaCOpqSo1GhFIgFy', false);

-- ----------------------------------------------------------- seed rides ----
INSERT INTO rides (driver_id, origin, destination, depart_at, seats_total, fare)
SELECT id, 'F-11 Markaz', 'GIKI Campus', now() + interval '1 day 8 hours', 3, 900
FROM users WHERE email = 'ayesha@campuspool.pk';

INSERT INTO rides (driver_id, origin, destination, depart_at, seats_total, fare)
SELECT id, 'G-9', 'NUST H-12', now() + interval '6 hours', 4, 250
FROM users WHERE email = 'bilal@campuspool.pk';

INSERT INTO rides (driver_id, origin, destination, depart_at, seats_total, fare)
SELECT id, 'DHA Phase 2', 'Air University', now() + interval '3 days', 3, 400
FROM users WHERE email = 'sara@campuspool.pk';

INSERT INTO rides (driver_id, origin, destination, depart_at, seats_total, fare)
SELECT id, 'I-8 Markaz', 'FAST NUCES', now() + interval '2 days 4 hours', 2, 220
FROM users WHERE email = 'ayesha@campuspool.pk';