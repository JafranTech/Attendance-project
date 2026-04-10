-- ============================================================
-- Attendance SaaS - Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor to set up all required tables
-- Last updated: Production readiness audit fixes applied
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  department  TEXT,
  config      JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
-- One row per user (upserted on renewal); plan extends from current expiry
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  plan                 TEXT NOT NULL CHECK (plan IN ('trial', 'monthly', 'semester')),
  expiry_date          TIMESTAMPTZ NOT NULL,
  razorpay_payment_id  TEXT UNIQUE,   -- UNIQUE: prevents duplicate webhook retries from double-extending
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance table
-- Unique per (user_id, subject, date) — upserted from the API
CREATE TABLE IF NOT EXISTS public.attendance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,
  date       DATE NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('present', 'absent', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, subject, date)
);

-- Payment Transactions audit table
-- Every webhook event (success AND failure) is logged here permanently.
-- This makes Vercel function logs irrelevant for payment dispute resolution.
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT NOT NULL,                    -- TEXT to tolerate edge cases (notes parsing)
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  amount               BIGINT,                           -- in paise (1 INR = 100 paise)
  currency             TEXT DEFAULT 'INR',
  plan                 TEXT,
  status               TEXT NOT NULL,                   -- 'success' | 'duplicate' | 'db_error' | 'bad_payload'
  raw_payload          JSONB,                            -- full Razorpay event body for audit
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_user_id             ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date                ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user            ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment  ON public.payment_transactions(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user     ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order    ON public.payment_transactions(razorpay_order_id);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_attendance_updated_at ON public.attendance;
CREATE TRIGGER set_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Service role key (used by backend) bypasses RLS automatically.
-- RLS protects against accidental direct client access.
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- ── Unique constraint on razorpay_payment_id (applied via migration) ──────────
-- ALTER TABLE public.subscriptions
--   ADD CONSTRAINT subscriptions_razorpay_payment_id_unique UNIQUE (razorpay_payment_id);
-- Already applied via Supabase MCP migration: add_unique_payment_id_and_transactions_table
