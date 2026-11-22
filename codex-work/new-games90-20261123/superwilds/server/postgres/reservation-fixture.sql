-- Test-only callbacks' REAL enforced reservation floor. Not a production
-- migration, permission scheme or claim that this has been installed live.
CREATE TABLE sw_new_superwilds.reservations(
  round_id uuid PRIMARY KEY REFERENCES sw_new_superwilds.rounds(round_id) DEFERRABLE INITIALLY DEFERRED,
  user_id text NOT NULL REFERENCES sw_rebuild.wallets(id),
  house_id text NOT NULL REFERENCES sw_rebuild.wallets(id),
  amount_minor bigint NOT NULL CHECK(amount_minor>=0), closed boolean NOT NULL DEFAULT false
);
CREATE FUNCTION qa_superwilds.total_reserved(house text) RETURNS bigint LANGUAGE sql STABLE
  SET search_path=pg_catalog AS $$
  SELECT COALESCE((SELECT SUM(amount_minor) FROM sw_new_superwilds.reservations WHERE house_id=house),0)::bigint
    +COALESCE((SELECT SUM(amount_minor) FROM qa_superwilds.other_holds WHERE house_id=house),0)::bigint
$$;
CREATE FUNCTION qa_superwilds.enforce_floor() RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.balance IS NULL OR NEW.balance < qa_superwilds.total_reserved(NEW.id) THEN
    RAISE EXCEPTION 'QA_SUPERWILDS_RESERVED_HOUSE_FLOOR';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER qa_superwilds_house_floor BEFORE UPDATE OF balance ON sw_rebuild.wallets
  FOR EACH ROW EXECUTE FUNCTION qa_superwilds.enforce_floor();
ALTER TABLE sw_rebuild.wallets ENABLE ALWAYS TRIGGER qa_superwilds_house_floor;
CREATE FUNCTION qa_superwilds.enforce_funding() RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  SET search_path=pg_catalog AS $$
DECLARE gross bigint; before bigint:=0;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'QA_SUPERWILDS_HOLD_DELETE_FORBIDDEN'; END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.round_id<>OLD.round_id OR NEW.user_id<>OLD.user_id OR NEW.house_id<>OLD.house_id THEN
      RAISE EXCEPTION 'QA_SUPERWILDS_HOLD_IDENTITY_IMMUTABLE';
    END IF;
    IF OLD.closed AND (NEW.amount_minor<>OLD.amount_minor OR NEW.closed<>OLD.closed) THEN
      RAISE EXCEPTION 'QA_SUPERWILDS_HOLD_ALREADY_CLOSED';
    END IF;
    before:=OLD.amount_minor;
  END IF;
  SELECT balance INTO gross FROM sw_rebuild.wallets WHERE id=NEW.house_id FOR UPDATE;
  IF gross IS NULL OR NEW.amount_minor IS NULL OR NEW.amount_minor<0 OR
      qa_superwilds.total_reserved(NEW.house_id)-before+NEW.amount_minor>gross THEN
    RAISE EXCEPTION 'QA_SUPERWILDS_HOLD_UNFUNDED';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER qa_superwilds_reservation_funding BEFORE INSERT OR UPDATE OR DELETE ON sw_new_superwilds.reservations
  FOR EACH ROW EXECUTE FUNCTION qa_superwilds.enforce_funding();
ALTER TABLE sw_new_superwilds.reservations ENABLE ALWAYS TRIGGER qa_superwilds_reservation_funding;
