-- Prepared only. No existing wallet, balance, account, ledger, session or
-- payment data is changed. This creates an immutable per-game event journal;
-- it does not install the required shared house-floor or ownership hooks.
BEGIN;
CREATE SCHEMA IF NOT EXISTS sw_new_superwilds;
CREATE TABLE IF NOT EXISTS sw_new_superwilds.rounds (
  round_id uuid PRIMARY KEY,
  ordinal bigserial UNIQUE NOT NULL,
  user_id text NOT NULL,
  game_id text NOT NULL CHECK (game_id='zplay72_multi_hot_5_super_wilds_v1'),
  request_key uuid NOT NULL,
  stake_minor bigint NOT NULL CHECK (stake_minor>0),
  win_minor bigint NOT NULL CHECK (win_minor>=0),
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,request_key),
  UNIQUE(user_id,round_id)
);
CREATE INDEX IF NOT EXISTS superwilds_owner_latest
  ON sw_new_superwilds.rounds(user_id,game_id,ordinal DESC);
CREATE TABLE IF NOT EXISTS sw_new_superwilds.collections (
  round_id uuid PRIMARY KEY,
  collection_id uuid UNIQUE NOT NULL,
  user_id text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor>0),
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(user_id,round_id) REFERENCES sw_new_superwilds.rounds(user_id,round_id)
);
CREATE TABLE IF NOT EXISTS sw_new_superwilds.requests (
  user_id text NOT NULL,
  request_key uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('SPIN','TAKE_WIN')),
  fingerprint char(64) NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,request_key)
);
-- The eventual existing application role should receive SELECT/INSERT only
-- on these journals. No role or credentials are guessed or created here.
COMMIT;
