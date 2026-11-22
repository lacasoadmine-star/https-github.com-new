-- PREPARED ONLY: never executed by this component. No accounts or balances
-- are created/reset. This adds new M10 tables AND a trigger on the existing
-- wallet table: it is a shared-table migration requiring host/role review.
BEGIN;

DO $$ BEGIN
 IF to_regclass('sw_rebuild.wallets') IS NULL OR to_regclass('sw_rebuild.users') IS NULL
 OR to_regclass('sw_rebuild.transfers') IS NULL OR to_regclass('sw_rebuild.ledger') IS NULL
 OR to_regclass('sw_new_m10.rounds') IS NULL THEN
  RAISE EXCEPTION 'Existing wallet, paired ledger and prepared M10 round journal required';
 END IF;
 IF current_setting('transaction_isolation') <> 'read committed' THEN
  RAISE EXCEPTION 'M10_RESERVATIONS_REQUIRE_READ_COMMITTED';
 END IF;
END $$;

CREATE TABLE sw_new_m10.reservations (
 round_id uuid PRIMARY KEY REFERENCES sw_new_m10.rounds(round_id) DEFERRABLE INITIALLY DEFERRED,
 user_id text NOT NULL REFERENCES sw_rebuild.users(id),
 house_wallet_id text NOT NULL REFERENCES sw_rebuild.wallets(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 closed_reason text CHECK(closed_reason IN('COLLECTED','LOST')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(user_id<>house_wallet_id),
 CHECK((amount_minor>0 AND closed_reason IS NULL) OR (amount_minor=0 AND closed_reason IS NOT NULL))
);
CREATE INDEX m10_reservations_house ON sw_new_m10.reservations(house_wallet_id);
CREATE UNIQUE INDEX m10_one_pending_win_per_player ON sw_new_m10.reservations(user_id) WHERE amount_minor>0;

CREATE TABLE sw_new_m10.wallet_movements (
 transfer_id text PRIMARY KEY REFERENCES sw_rebuild.transfers(id),
 round_id uuid NOT NULL REFERENCES sw_new_m10.rounds(round_id) DEFERRABLE INITIALLY DEFERRED,
 user_id text NOT NULL REFERENCES sw_rebuild.users(id),
 kind text NOT NULL CHECK(kind IN('BET','WIN')),
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 balance_after bigint NOT NULL CHECK(balance_after>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(round_id,kind)
);

CREATE TABLE sw_new_m10.reservation_events (
 event_key text PRIMARY KEY,
 round_id uuid NOT NULL REFERENCES sw_new_m10.rounds(round_id) DEFERRABLE INITIALLY DEFERRED,
 user_id text NOT NULL REFERENCES sw_rebuild.users(id),
 house_wallet_id text NOT NULL REFERENCES sw_rebuild.wallets(id),
 kind text NOT NULL CHECK(kind IN('BET','RESERVE','INCREASE','RELEASE','COLLECT')),
 action_id uuid,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 pending_before bigint NOT NULL CHECK(pending_before>=0),
 pending_after bigint NOT NULL CHECK(pending_after>=0),
 transfer_id text UNIQUE REFERENCES sw_new_m10.wallet_movements(transfer_id),
 receipt jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);

-- The fixed definer functions read only the specifically qualified tables.
-- Review their owner and existing writer roles before installing; no role
-- name or GRANT on production is guessed by this prepared script.
CREATE FUNCTION sw_new_m10.enforce_house_floor() RETURNS trigger
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE held numeric;
BEGIN
 IF current_setting('transaction_isolation') <> 'read committed' THEN
  RAISE EXCEPTION 'M10_RESERVATIONS_REQUIRE_READ_COMMITTED';
 END IF;
 -- BEFORE UPDATE already owns the wallet row lock. READ COMMITTED + VOLATILE
 -- reads a fresh reservation snapshot after a concurrent holder commits.
 SELECT COALESCE(SUM(amount_minor),0) INTO held
 FROM sw_new_m10.reservations WHERE house_wallet_id=NEW.id;
 IF NEW.balance IS NULL OR NEW.balance < held THEN RAISE EXCEPTION 'M10_RESERVED_HOUSE_FUNDS'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION sw_new_m10.enforce_reservation_funding() RETURNS trigger
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE gross bigint; others numeric;
BEGIN
 IF current_setting('transaction_isolation') <> 'read committed' THEN
  RAISE EXCEPTION 'M10_RESERVATIONS_REQUIRE_READ_COMMITTED';
 END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'M10_RESERVATION_DELETE_FORBIDDEN'; END IF;
 IF TG_OP='UPDATE' AND (NEW.round_id IS DISTINCT FROM OLD.round_id
 OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.house_wallet_id IS DISTINCT FROM OLD.house_wallet_id) THEN
  RAISE EXCEPTION 'M10_RESERVATION_IDENTITY_IMMUTABLE';
 END IF;
 IF TG_OP='UPDATE' AND OLD.closed_reason IS NOT NULL THEN
  RAISE EXCEPTION 'M10_CLOSED_RESERVATION_IMMUTABLE';
 END IF;
 -- Normal host operations lock all player/house rows in stable order BEFORE
 -- reservation DML. This check also prevents an accidental direct overclaim.
 SELECT balance INTO gross FROM sw_rebuild.wallets WHERE id=NEW.house_wallet_id FOR UPDATE;
 IF NOT FOUND OR gross IS NULL THEN RAISE EXCEPTION 'M10_HOUSE_WALLET_MISSING'; END IF;
 SELECT COALESCE(SUM(amount_minor),0) INTO others FROM sw_new_m10.reservations
 WHERE house_wallet_id=NEW.house_wallet_id AND round_id<>NEW.round_id;
 IF others+NEW.amount_minor > gross THEN RAISE EXCEPTION 'M10_HOUSE_CAPACITY_UNAVAILABLE'; END IF;
 RETURN NEW;
END $$;

CREATE TRIGGER m10_reserved_house_floor BEFORE UPDATE OF balance ON sw_rebuild.wallets
 FOR EACH ROW EXECUTE FUNCTION sw_new_m10.enforce_house_floor();
CREATE TRIGGER m10_reservation_funding BEFORE INSERT OR UPDATE OR DELETE ON sw_new_m10.reservations
 FOR EACH ROW EXECUTE FUNCTION sw_new_m10.enforce_reservation_funding();
ALTER TABLE sw_rebuild.wallets ENABLE ALWAYS TRIGGER m10_reserved_house_floor;
ALTER TABLE sw_new_m10.reservations ENABLE ALWAYS TRIGGER m10_reservation_funding;
REVOKE ALL ON FUNCTION sw_new_m10.enforce_house_floor() FROM PUBLIC;
REVOKE ALL ON FUNCTION sw_new_m10.enforce_reservation_funding() FROM PUBLIC;

-- Application needs reviewed SELECT/INSERT permissions on append-only events
-- and movements, and SELECT/INSERT/UPDATE (not DELETE) on reservations. Its
-- existing wallet/transfer/ledger rights are retained. Accepted round/collection
-- receipts remain immutable. No grants or release flags are applied here.
COMMIT;
