-- LOCAL DISPOSABLE DATABASE ONLY. Deliberately synthetic users/funds/models.
-- Mirrors the existing wallet/transfer/paired-ledger/session table contract.
CREATE SCHEMA sw_rebuild;
CREATE SCHEMA sw_nine;
CREATE SCHEMA sw_native_library;
CREATE SCHEMA qa_superwilds;
CREATE TABLE sw_rebuild.users(id text PRIMARY KEY, role text NOT NULL, status text NOT NULL);
CREATE TABLE sw_rebuild.sessions(token text PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),expires bigint NOT NULL);
CREATE TABLE sw_rebuild.wallets(id text PRIMARY KEY REFERENCES sw_rebuild.users(id),balance bigint NOT NULL CHECK(balance>=0));
CREATE TABLE sw_rebuild.account_limits(user_id text PRIMARY KEY REFERENCES sw_rebuild.users(id),max_balance bigint);
CREATE TABLE sw_rebuild.transfers(id text PRIMARY KEY,sender text NOT NULL REFERENCES sw_rebuild.wallets(id),
  recipient text NOT NULL REFERENCES sw_rebuild.wallets(id),amount bigint NOT NULL CHECK(amount>0),kind text NOT NULL,actor text NOT NULL);
CREATE TABLE sw_rebuild.ledger(transfer_id text NOT NULL REFERENCES sw_rebuild.transfers(id),
  wallet_id text NOT NULL REFERENCES sw_rebuild.wallets(id),delta bigint NOT NULL,PRIMARY KEY(transfer_id,wallet_id));
CREATE TABLE sw_rebuild.rounds(id text PRIMARY KEY,user_id text NOT NULL,game text NOT NULL,bet bigint NOT NULL,payout bigint NOT NULL,
  outcome jsonb NOT NULL,settled_order bigserial UNIQUE NOT NULL);
CREATE TABLE sw_nine.game_rounds(round_id uuid PRIMARY KEY,user_id text NOT NULL,game_id text NOT NULL,
  request_key text NOT NULL,result_json jsonb NOT NULL,UNIQUE(user_id,request_key));
CREATE TABLE sw_nine.actions(id uuid PRIMARY KEY,user_id text NOT NULL,game_id text NOT NULL,kind text NOT NULL,
  request_key text NOT NULL,result_json jsonb NOT NULL,UNIQUE(user_id,request_key));
CREATE TABLE sw_native_library.rounds(id text PRIMARY KEY,user_id text NOT NULL,game_id text NOT NULL,status text NOT NULL);
-- A distinct existing-game hold proves the shared available-house calculation.
CREATE TABLE qa_superwilds.other_holds(id uuid PRIMARY KEY,user_id text NOT NULL,house_id text NOT NULL,amount_minor bigint NOT NULL CHECK(amount_minor>=0));
