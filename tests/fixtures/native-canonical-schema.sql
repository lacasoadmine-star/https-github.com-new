CREATE SCHEMA sw_rebuild;
CREATE TABLE sw_rebuild.users(id text PRIMARY KEY,role text NOT NULL CHECK(role IN('owner','agent','player','cashier')),status text NOT NULL CHECK(status IN('active','blocked')),parent_id text REFERENCES sw_rebuild.users(id));
CREATE TABLE sw_rebuild.wallets(id text PRIMARY KEY,balance bigint NOT NULL DEFAULT 0,credit_limit bigint NOT NULL DEFAULT 0 CHECK(credit_limit>=0),CHECK(balance>=0 OR id='external-clearing'));
CREATE TABLE sw_rebuild.transfers(id text PRIMARY KEY,sender text NOT NULL REFERENCES sw_rebuild.wallets(id),recipient text NOT NULL REFERENCES sw_rebuild.wallets(id),amount bigint NOT NULL CHECK(amount>0),kind text NOT NULL,actor text NOT NULL,notes text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),CHECK(sender<>recipient));
CREATE TABLE sw_rebuild.ledger(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,transfer_id text NOT NULL REFERENCES sw_rebuild.transfers(id),wallet_id text NOT NULL REFERENCES sw_rebuild.wallets(id),delta bigint NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE sw_rebuild.rounds(id text PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),game text NOT NULL,bet bigint NOT NULL CHECK(bet>0),payout bigint NOT NULL CHECK(payout>=0),outcome jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),settled_order bigint GENERATED ALWAYS AS IDENTITY NOT NULL);
CREATE TABLE sw_rebuild.audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor text NOT NULL,event text NOT NULL,target text NOT NULL,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE sw_rebuild.live_revisions(user_id text PRIMARY KEY REFERENCES sw_rebuild.users(id),revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0));
CREATE TABLE sw_rebuild.account_limits(user_id text PRIMARY KEY REFERENCES sw_rebuild.users(id),max_deposit bigint,max_withdrawal bigint,max_balance bigint CHECK(max_balance>=0));

CREATE FUNCTION sw_rebuild.sw_live_touch(ids text[]) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO sw_rebuild.live_revisions(user_id,revision)
 SELECT DISTINCT u.id,1 FROM sw_rebuild.users u WHERE u.id=ANY(ids)
 ON CONFLICT(user_id) DO UPDATE SET revision=sw_rebuild.live_revisions.revision+1;
END $$;
CREATE FUNCTION sw_rebuild.sw_live_user_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM sw_live_touch(ARRAY[NEW.id]);
 RETURN NEW;
END $$;
CREATE TRIGGER sw_live_wallet_change AFTER INSERT OR UPDATE ON sw_rebuild.wallets FOR EACH ROW EXECUTE FUNCTION sw_rebuild.sw_live_user_change();
