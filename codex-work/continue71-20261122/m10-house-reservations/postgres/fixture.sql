-- DISPOSABLE TEST DATABASE ONLY. The harness creates a new random database
-- before loading this file. These synthetic contracts are not production DDL.
-- The shared ledger intentionally has NO id column: the application may rely
-- only on its established transfer_id, wallet_id and delta columns.
BEGIN;

CREATE SCHEMA sw_rebuild;
CREATE TABLE sw_rebuild.users (
  id text PRIMARY KEY,
  role text NOT NULL,
  status text NOT NULL
);
CREATE TABLE sw_rebuild.wallets (
  id text PRIMARY KEY,
  balance bigint NOT NULL CHECK (balance >= 0)
);
CREATE TABLE sw_rebuild.transfers (
  id text PRIMARY KEY,
  sender text NOT NULL REFERENCES sw_rebuild.wallets(id),
  recipient text NOT NULL REFERENCES sw_rebuild.wallets(id),
  amount bigint NOT NULL CHECK (amount > 0),
  kind text NOT NULL,
  actor text NOT NULL REFERENCES sw_rebuild.users(id)
);
CREATE TABLE sw_rebuild.ledger (
  transfer_id text NOT NULL REFERENCES sw_rebuild.transfers(id),
  wallet_id text NOT NULL REFERENCES sw_rebuild.wallets(id),
  delta bigint NOT NULL,
  PRIMARY KEY (transfer_id, wallet_id)
);
CREATE TABLE sw_rebuild.account_limits (
  user_id text PRIMARY KEY REFERENCES sw_rebuild.users(id),
  max_balance bigint CHECK (max_balance >= 0)
);

CREATE SCHEMA sw_native_library;
CREATE TABLE sw_native_library.rounds (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES sw_rebuild.users(id),
  game_id text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- This retains the old transfer CTE's audit target, allowing the race to run
-- the existing SQL unchanged. New M10 transfers must never write this table.
CREATE SCHEMA sw_nine;
CREATE TABLE sw_nine.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES sw_rebuild.users(id),
  round_id uuid NOT NULL,
  game_id varchar(64) NOT NULL,
  type text NOT NULL CHECK (type IN ('BET', 'WIN', 'REFUND', 'GAMBLE_BET', 'GAMBLE_WIN', 'BONUS_WIN')),
  amount bigint NOT NULL CHECK (amount > 0),
  balance_after bigint NOT NULL CHECK (balance_after >= 0),
  transfer_id text UNIQUE NOT NULL REFERENCES sw_rebuild.transfers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, type)
);

-- The reservation component consumes this prepared M10 journal contract.
-- No model, rules, sampler, authentication route or production activation is
-- simulated by the minimal journal rows used in these database tests.
CREATE SCHEMA sw_new_m10;
CREATE TABLE sw_new_m10.rounds (
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

COMMIT;
