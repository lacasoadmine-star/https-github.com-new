-- Disposable test database only. Relevant journal columns/types/uniqueness
-- match the host contracts; this is not a full production schema or migration.
CREATE SCHEMA sw_rebuild;
CREATE TABLE sw_rebuild.users(id text PRIMARY KEY);
CREATE TABLE sw_rebuild.wallets(id text PRIMARY KEY, balance bigint NOT NULL CHECK(balance >= 0));
CREATE SCHEMA sw_nine;
CREATE TABLE sw_nine.game_rounds(
  round_id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES sw_rebuild.users(id),
  game_id varchar(64) NOT NULL,
  request_key varchar(128) NOT NULL,
  result_json jsonb NOT NULL,
  UNIQUE(user_id,request_key), UNIQUE(round_id,user_id)
);
CREATE TABLE sw_nine.actions(
  id uuid PRIMARY KEY,
  parent_id uuid NOT NULL REFERENCES sw_nine.game_rounds(round_id),
  user_id text NOT NULL REFERENCES sw_rebuild.users(id),
  kind text NOT NULL CHECK(kind IN('GAMBLE','PICK')),
  request_key varchar(128) NOT NULL,
  result_json jsonb NOT NULL,
  UNIQUE(user_id,request_key)
);
CREATE SCHEMA sw_new_m10;
CREATE TABLE sw_new_m10.requests(
  user_id text NOT NULL,
  request_key uuid NOT NULL,
  kind text NOT NULL CHECK(kind IN('SPIN','TAKE_WIN','GAMBLE')),
  fingerprint char(64) NOT NULL,
  receipt jsonb NOT NULL,
  PRIMARY KEY(user_id,request_key)
);
