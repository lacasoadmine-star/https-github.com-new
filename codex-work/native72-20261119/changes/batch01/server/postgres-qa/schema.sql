-- QA-only minimal sw_rebuild contract, not a production migration.
-- sw_rebuild full DDL is not available from the redacted deployed source.
-- Exact sw_nine DDL below comes from the deployed nine-engine migration.
CREATE SCHEMA sw_rebuild;
CREATE TABLE sw_rebuild.users(id TEXT PRIMARY KEY,role TEXT NOT NULL,status TEXT NOT NULL);
CREATE TABLE sw_rebuild.sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES sw_rebuild.users(id),expires BIGINT NOT NULL);
CREATE TABLE sw_rebuild.wallets(id TEXT PRIMARY KEY,balance BIGINT NOT NULL CHECK(balance>=0));
CREATE TABLE sw_rebuild.transfers(id TEXT PRIMARY KEY,sender TEXT NOT NULL REFERENCES sw_rebuild.wallets(id),recipient TEXT NOT NULL REFERENCES sw_rebuild.wallets(id),amount BIGINT NOT NULL CHECK(amount>0),kind TEXT NOT NULL,actor TEXT NOT NULL REFERENCES sw_rebuild.users(id));
CREATE TABLE sw_rebuild.ledger(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,transfer_id TEXT NOT NULL REFERENCES sw_rebuild.transfers(id),wallet_id TEXT NOT NULL REFERENCES sw_rebuild.wallets(id),delta BIGINT NOT NULL,UNIQUE(transfer_id,wallet_id));
CREATE TABLE sw_rebuild.rounds(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES sw_rebuild.users(id),game TEXT NOT NULL,bet BIGINT NOT NULL CHECK(bet>=0),payout BIGINT NOT NULL CHECK(payout>=0),outcome JSONB NOT NULL,settled_order BIGINT GENERATED ALWAYS AS IDENTITY);
CREATE TABLE sw_rebuild.account_limits(user_id TEXT PRIMARY KEY REFERENCES sw_rebuild.users(id),max_balance BIGINT CHECK(max_balance>=0));
CREATE SCHEMA sw_native_library;
CREATE TABLE sw_native_library.rounds(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES sw_rebuild.users(id),game_id TEXT NOT NULL,status TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
BEGIN;
SELECT pg_advisory_xact_lock(2606242166);
DO $$ BEGIN
 IF to_regclass('sw_rebuild.users') IS NULL OR to_regclass('sw_rebuild.wallets') IS NULL OR to_regclass('sw_rebuild.rounds') IS NULL THEN RAISE EXCEPTION 'Existing Superwin wallet schema required';END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS sw_nine;
CREATE TABLE IF NOT EXISTS sw_nine.game_rounds(
 round_id UUID PRIMARY KEY,user_id TEXT NOT NULL REFERENCES sw_rebuild.users(id) ON DELETE RESTRICT,
 game_id VARCHAR(64) NOT NULL,bet BIGINT NOT NULL CHECK(bet>=0),base_bet BIGINT NOT NULL CHECK(base_bet>0),
 total_win BIGINT NOT NULL CHECK(total_win>=0),wheel_multiplier SMALLINT NOT NULL,
 request_key VARCHAR(128) NOT NULL,request_hash CHAR(64) NOT NULL,result_json JSONB NOT NULL,
 math_sha256 CHAR(64) NOT NULL,status TEXT NOT NULL DEFAULT 'SETTLED' CHECK(status='SETTLED'),
 is_free BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_key),UNIQUE(round_id,user_id));
CREATE INDEX IF NOT EXISTS idx_nine_user_time ON sw_nine.game_rounds(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nine_game_time ON sw_nine.game_rounds(game_id,created_at DESC);
CREATE TABLE IF NOT EXISTS sw_nine.wallet_transactions(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id TEXT NOT NULL REFERENCES sw_rebuild.users(id) ON DELETE RESTRICT,
 round_id UUID NOT NULL,game_id VARCHAR(64) NOT NULL,type TEXT NOT NULL CHECK(type IN('BET','WIN','REFUND','GAMBLE_BET','GAMBLE_WIN','BONUS_WIN')),
 amount BIGINT NOT NULL CHECK(amount>0),balance_after BIGINT NOT NULL CHECK(balance_after>=0),
 transfer_id TEXT UNIQUE NOT NULL REFERENCES sw_rebuild.transfers(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(round_id,type));
CREATE INDEX IF NOT EXISTS idx_nine_tx_user_time ON sw_nine.wallet_transactions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nine_tx_round ON sw_nine.wallet_transactions(round_id);
CREATE TABLE IF NOT EXISTS sw_nine.free_spins(user_id TEXT NOT NULL REFERENCES sw_rebuild.users(id),game_id TEXT NOT NULL,
 remaining INT NOT NULL CHECK(remaining BETWEEN 0 AND 500),bet BIGINT NOT NULL CHECK(bet>0),PRIMARY KEY(user_id,game_id));
CREATE TABLE IF NOT EXISTS sw_nine.actions(id UUID PRIMARY KEY,parent_id UUID NOT NULL REFERENCES sw_nine.game_rounds(round_id),
 user_id TEXT NOT NULL REFERENCES sw_rebuild.users(id),kind TEXT NOT NULL CHECK(kind IN('GAMBLE','PICK')),
 request_key VARCHAR(128) NOT NULL,request_hash CHAR(64) NOT NULL,attempt INT NOT NULL,result_json JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(user_id,request_key),UNIQUE(parent_id,kind,attempt));
CREATE TABLE IF NOT EXISTS sw_nine.reconciliation_flags(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 round_id UUID NOT NULL,reason TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),resolved_at TIMESTAMPTZ,
 UNIQUE(round_id,reason));
COMMIT;
