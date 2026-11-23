-- Apply only with the final authenticated host wiring and reviewed DB role.
-- Existing wallets, accounts, balances and accepted receipts are preserved.
BEGIN;
DO $$ BEGIN
 IF to_regclass('sw_rebuild.wallets') IS NULL OR to_regclass('sw_rebuild.users') IS NULL
 OR to_regclass('sw_rebuild.transfers') IS NULL OR to_regclass('sw_rebuild.ledger') IS NULL
 OR to_regclass('sw_new_superwilds.rounds') IS NULL THEN
  RAISE EXCEPTION 'SUPERWILDS_EXISTING_WALLET_AND_JOURNAL_REQUIRED';
 END IF;
 IF current_setting('transaction_isolation') <> 'read committed' THEN
  RAISE EXCEPTION 'SUPERWILDS_RESERVATIONS_REQUIRE_READ_COMMITTED';
 END IF;
END $$;
LOCK TABLE sw_rebuild.wallets IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE sw_new_superwilds.reservations (
 round_id uuid PRIMARY KEY REFERENCES sw_new_superwilds.rounds(round_id) DEFERRABLE INITIALLY DEFERRED,
 user_id text NOT NULL REFERENCES sw_rebuild.users(id),
 house_wallet_id text NOT NULL REFERENCES sw_rebuild.wallets(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 closed_reason text CHECK(closed_reason IN('COLLECTED','LOST')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(user_id<>house_wallet_id),
 CHECK((amount_minor>0 AND closed_reason IS NULL) OR (amount_minor=0 AND closed_reason IS NOT NULL))
);
CREATE INDEX superwilds_reservations_house ON sw_new_superwilds.reservations(house_wallet_id);
CREATE UNIQUE INDEX superwilds_one_pending_win ON sw_new_superwilds.reservations(user_id) WHERE amount_minor>0;
CREATE TABLE sw_new_superwilds.wallet_movements (
 transfer_id text PRIMARY KEY REFERENCES sw_rebuild.transfers(id),
 round_id uuid NOT NULL REFERENCES sw_new_superwilds.rounds(round_id) DEFERRABLE INITIALLY DEFERRED,
 user_id text NOT NULL REFERENCES sw_rebuild.users(id),
 kind text NOT NULL CHECK(kind IN('BET','WIN')),
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 balance_after bigint NOT NULL CHECK(balance_after>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(round_id,kind)
);
CREATE TABLE sw_new_superwilds.reservation_events (
 event_key text PRIMARY KEY,
 round_id uuid NOT NULL REFERENCES sw_new_superwilds.rounds(round_id) DEFERRABLE INITIALLY DEFERRED,
 user_id text NOT NULL REFERENCES sw_rebuild.users(id),
 house_wallet_id text NOT NULL REFERENCES sw_rebuild.wallets(id),
 kind text NOT NULL CHECK(kind IN('BET','RESERVE','COLLECT')),
 action_id uuid,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 pending_before bigint NOT NULL CHECK(pending_before>=0),
 pending_after bigint NOT NULL CHECK(pending_after>=0),
 transfer_id text UNIQUE REFERENCES sw_new_superwilds.wallet_movements(transfer_id),
 receipt jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);

-- Include the prepared M10 liability if installed. Both games share the
-- existing house wallet; two separate per-game floors would permit overclaim.
CREATE FUNCTION sw_new_superwilds.total_reserved(wallet_id text,
 excluded_schema text DEFAULT NULL, excluded_round uuid DEFAULT NULL) RETURNS numeric
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE held numeric; m10_held numeric;
BEGIN
 SELECT COALESCE(SUM(amount_minor),0) INTO held FROM sw_new_superwilds.reservations
 WHERE house_wallet_id=wallet_id AND NOT (COALESCE(excluded_schema='sw_new_superwilds',false)
 AND COALESCE(round_id=excluded_round,false));
 IF to_regclass('sw_new_m10.reservations') IS NOT NULL THEN
  SELECT COALESCE(SUM(amount_minor),0) INTO m10_held FROM sw_new_m10.reservations
  WHERE house_wallet_id=wallet_id AND NOT (COALESCE(excluded_schema='sw_new_m10',false)
  AND COALESCE(round_id=excluded_round,false));
  held:=held+m10_held;
 END IF;
 RETURN held;
END $$;
CREATE FUNCTION sw_new_superwilds.enforce_house_floor() RETURNS trigger
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF current_setting('transaction_isolation') <> 'read committed' THEN
  RAISE EXCEPTION 'SUPERWILDS_RESERVATIONS_REQUIRE_READ_COMMITTED';
 END IF;
 -- The wallet row lock is held by this UPDATE. VOLATILE at READ COMMITTED
 -- sees reservations committed while an older raw writer waited for it.
 IF NEW.balance IS NULL OR NEW.balance < sw_new_superwilds.total_reserved(NEW.id) THEN
  RAISE EXCEPTION 'SUPERWILDS_RESERVED_HOUSE_FUNDS';
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION sw_new_superwilds.enforce_reservation_funding() RETURNS trigger
 LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE gross bigint;
BEGIN
 IF TG_TABLE_SCHEMA NOT IN ('sw_new_superwilds','sw_new_m10') OR TG_TABLE_NAME<>'reservations' THEN
  RAISE EXCEPTION 'SUPERWILDS_RESERVATION_TABLE_INVALID';
 END IF;
 IF current_setting('transaction_isolation') <> 'read committed' THEN
  RAISE EXCEPTION 'SUPERWILDS_RESERVATIONS_REQUIRE_READ_COMMITTED';
 END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'SUPERWILDS_RESERVATION_DELETE_FORBIDDEN'; END IF;
 IF TG_OP='UPDATE' AND (NEW.round_id IS DISTINCT FROM OLD.round_id OR NEW.user_id IS DISTINCT FROM OLD.user_id
 OR NEW.house_wallet_id IS DISTINCT FROM OLD.house_wallet_id) THEN
  RAISE EXCEPTION 'SUPERWILDS_RESERVATION_IDENTITY_IMMUTABLE';
 END IF;
 IF TG_OP='UPDATE' AND OLD.closed_reason IS NOT NULL THEN
  RAISE EXCEPTION 'SUPERWILDS_CLOSED_RESERVATION_IMMUTABLE';
 END IF;
 SELECT balance INTO gross FROM sw_rebuild.wallets WHERE id=NEW.house_wallet_id FOR UPDATE;
 IF NOT FOUND OR gross IS NULL THEN RAISE EXCEPTION 'SUPERWILDS_HOUSE_WALLET_MISSING'; END IF;
 IF sw_new_superwilds.total_reserved(NEW.house_wallet_id,TG_TABLE_SCHEMA,NEW.round_id)+NEW.amount_minor > gross THEN
  RAISE EXCEPTION 'SUPERWILDS_HOUSE_CAPACITY_UNAVAILABLE';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER superwilds_reserved_house_floor BEFORE UPDATE OF balance ON sw_rebuild.wallets
 FOR EACH ROW EXECUTE FUNCTION sw_new_superwilds.enforce_house_floor();
CREATE TRIGGER superwilds_reservation_funding BEFORE INSERT OR UPDATE OR DELETE ON sw_new_superwilds.reservations
 FOR EACH ROW EXECUTE FUNCTION sw_new_superwilds.enforce_reservation_funding();
ALTER TABLE sw_rebuild.wallets ENABLE ALWAYS TRIGGER superwilds_reserved_house_floor;
ALTER TABLE sw_new_superwilds.reservations ENABLE ALWAYS TRIGGER superwilds_reservation_funding;
DO $$ BEGIN
 IF to_regclass('sw_new_m10.reservations') IS NOT NULL THEN
  CREATE TRIGGER superwilds_m10_reservation_funding BEFORE INSERT OR UPDATE OR DELETE ON sw_new_m10.reservations
  FOR EACH ROW EXECUTE FUNCTION sw_new_superwilds.enforce_reservation_funding();
  ALTER TABLE sw_new_m10.reservations ENABLE ALWAYS TRIGGER superwilds_m10_reservation_funding;
 END IF;
END $$;
REVOKE ALL ON FUNCTION sw_new_superwilds.enforce_house_floor() FROM PUBLIC;
REVOKE ALL ON FUNCTION sw_new_superwilds.enforce_reservation_funding() FROM PUBLIC;
-- total_reserved returns aggregate liability, not accounts or session data.
-- Assign the reviewed existing app role its required SELECT/INSERT/UPDATE
-- rights before wiring the service. No roles/grants or cash flags are guessed.
COMMIT;
