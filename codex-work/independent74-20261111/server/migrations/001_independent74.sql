-- REVIEW AND RUN ONLY AFTER ACTUAL POSTGRESQL SCHEMA/LEDGER VERIFICATION.
-- This migration is not executed by the application at startup.
-- It creates only the new game's private schema, never alters existing tables,
-- and never creates or funds an account/bank wallet.
BEGIN;
CREATE SCHEMA IF NOT EXISTS sw_independent74;
CREATE TABLE IF NOT EXISTS sw_independent74.rounds (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  game_id text NOT NULL,
  request_id uuid NOT NULL,
  state jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'lost', 'collected')),
  version integer NOT NULL CHECK (version > 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS independent74_one_active_round
  ON sw_independent74.rounds(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS independent74_round_history
  ON sw_independent74.rounds(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS sw_independent74.requests (
  user_id text NOT NULL,
  request_id uuid NOT NULL,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  round_id uuid NOT NULL REFERENCES sw_independent74.rounds(id),
  created_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, request_id)
);
CREATE TABLE IF NOT EXISTS sw_independent74.receipts (
  round_id uuid PRIMARY KEY REFERENCES sw_independent74.rounds(id),
  user_id text NOT NULL,
  game_id text NOT NULL,
  result jsonb NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS independent74_receipt_history
  ON sw_independent74.receipts(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS sw_independent74.liabilities (
  round_id uuid PRIMARY KEY REFERENCES sw_independent74.rounds(id) DEFERRABLE INITIALLY DEFERRED,
  user_id text NOT NULL,
  bank_wallet_id text NOT NULL,
  game_id text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS independent74_bank_liability
  ON sw_independent74.liabilities(bank_wallet_id);
COMMIT;
