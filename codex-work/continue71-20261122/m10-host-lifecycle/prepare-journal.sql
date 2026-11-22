-- Prepared, NOT applied. New namespace only; existing schemas/accounts/ledger
-- are neither changed nor seeded. Run only with the reviewed host integration.
BEGIN;

CREATE SCHEMA IF NOT EXISTS sw_new_m10;

CREATE TABLE IF NOT EXISTS sw_new_m10.rounds (
  round_id uuid PRIMARY KEY,
  ordinal bigserial UNIQUE NOT NULL,
  user_id text NOT NULL,
  game_id text NOT NULL CHECK (game_id = 'zplay72_multi_hot_10_v1'),
  request_key uuid NOT NULL,
  stake_minor numeric(18,0) NOT NULL CHECK (stake_minor > 0),
  win_minor numeric(18,0) NOT NULL CHECK (win_minor >= 0),
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, request_key)
);
CREATE INDEX IF NOT EXISTS new_m10_rounds_owner_latest
  ON sw_new_m10.rounds (user_id, game_id, ordinal DESC);

CREATE TABLE IF NOT EXISTS sw_new_m10.collections (
  round_id uuid PRIMARY KEY REFERENCES sw_new_m10.rounds(round_id),
  collection_id uuid UNIQUE NOT NULL,
  user_id text NOT NULL,
  amount_minor numeric(18,0) NOT NULL CHECK (amount_minor > 0),
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sw_new_m10.requests (
  user_id text NOT NULL,
  request_key uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('SPIN', 'TAKE_WIN', 'GAMBLE')),
  fingerprint char(64) NOT NULL,
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_key)
);

CREATE TABLE IF NOT EXISTS sw_new_m10.gambles (
  round_id uuid NOT NULL REFERENCES sw_new_m10.rounds(round_id),
  attempt integer NOT NULL CHECK (attempt > 0),
  gamble_id uuid UNIQUE NOT NULL,
  user_id text NOT NULL,
  request_key uuid NOT NULL,
  pending_minor numeric(18,0) NOT NULL CHECK (pending_minor >= 0),
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (round_id, attempt),
  UNIQUE (user_id, request_key)
);

-- The adapter only INSERTs journal rows. It never UPDATEs accepted round or
-- collection receipts. Restrict the eventual application role to SELECT/INSERT
-- here using the existing deployment's actual role; no role is guessed here.
COMMIT;
