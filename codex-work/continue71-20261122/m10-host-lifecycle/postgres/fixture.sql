-- Disposable database contracts, not a production migration. The runner must
-- create its own random localhost database before applying these definitions.
-- The ledger deliberately has no id column. No existing data is reset.
BEGIN;
CREATE SCHEMA sw_rebuild;
CREATE TABLE sw_rebuild.users(id text PRIMARY KEY,role text NOT NULL,status text NOT NULL);
CREATE TABLE sw_rebuild.sessions(token text PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),expires bigint NOT NULL);
CREATE TABLE sw_rebuild.wallets(id text PRIMARY KEY,balance bigint NOT NULL CHECK(balance>=0));
CREATE TABLE sw_rebuild.transfers(id text PRIMARY KEY,sender text NOT NULL REFERENCES sw_rebuild.wallets(id),recipient text NOT NULL REFERENCES sw_rebuild.wallets(id),amount bigint NOT NULL CHECK(amount>0),kind text NOT NULL,actor text NOT NULL REFERENCES sw_rebuild.users(id));
CREATE TABLE sw_rebuild.ledger(transfer_id text NOT NULL REFERENCES sw_rebuild.transfers(id),wallet_id text NOT NULL REFERENCES sw_rebuild.wallets(id),delta bigint NOT NULL,PRIMARY KEY(transfer_id,wallet_id));
CREATE TABLE sw_rebuild.rounds(id text PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),game text NOT NULL,bet bigint NOT NULL CHECK(bet>=0),payout bigint NOT NULL CHECK(payout>=0),outcome jsonb NOT NULL,settled_order bigint GENERATED ALWAYS AS IDENTITY);
CREATE TABLE sw_rebuild.account_limits(user_id text PRIMARY KEY REFERENCES sw_rebuild.users(id),max_balance bigint CHECK(max_balance>=0));

CREATE SCHEMA sw_native_library;
CREATE TABLE sw_native_library.rounds(id text PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),game_id text NOT NULL,status text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());

CREATE SCHEMA sw_nine;
CREATE TABLE sw_nine.game_rounds(
  round_id uuid PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),
  game_id varchar(64) NOT NULL,bet bigint NOT NULL CHECK(bet>=0),base_bet bigint NOT NULL CHECK(base_bet>0),
  total_win bigint NOT NULL CHECK(total_win>=0),wheel_multiplier smallint NOT NULL,
  request_key varchar(128) NOT NULL,request_hash char(64) NOT NULL,result_json jsonb NOT NULL,
  math_sha256 char(64) NOT NULL,status text NOT NULL DEFAULT 'SETTLED' CHECK(status='SETTLED'),
  is_free boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,request_key),UNIQUE(round_id,user_id));
CREATE TABLE sw_nine.actions(
  id uuid PRIMARY KEY,parent_id uuid NOT NULL REFERENCES sw_nine.game_rounds(round_id),
  user_id text NOT NULL REFERENCES sw_rebuild.users(id),kind text NOT NULL CHECK(kind IN('GAMBLE','PICK')),
  request_key varchar(128) NOT NULL,request_hash char(64) NOT NULL,attempt int NOT NULL,result_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,request_key),UNIQUE(parent_id,kind,attempt));
CREATE TABLE sw_nine.wallet_transactions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id text NOT NULL REFERENCES sw_rebuild.users(id),
  round_id uuid NOT NULL,game_id varchar(64) NOT NULL,type text NOT NULL CHECK(type IN('BET','WIN','REFUND','GAMBLE_BET','GAMBLE_WIN','BONUS_WIN')),
  amount bigint NOT NULL CHECK(amount>0),balance_after bigint NOT NULL CHECK(balance_after>=0),
  transfer_id text UNIQUE NOT NULL REFERENCES sw_rebuild.transfers(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(round_id,type));
COMMIT;

-- Apply ../prepare-journal.sql next, followed by the frozen reservation DDL.
