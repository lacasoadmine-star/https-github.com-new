-- Prepared additive upgrade only. No account, wallet, balance or accepted
-- receipt is created, reset or rewritten. Apply inside the reviewed host's
-- migration path after taking the existing backup; this module never runs it.
BEGIN;
LOCK TABLE sw_new_superwilds.requests, sw_new_superwilds.reservation_events IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE sw_new_superwilds.requests DROP CONSTRAINT IF EXISTS requests_kind_check;
ALTER TABLE sw_new_superwilds.requests ADD CONSTRAINT requests_kind_check CHECK(kind IN('SPIN','TAKE_WIN','GAMBLE'));
ALTER TABLE sw_new_superwilds.reservation_events DROP CONSTRAINT IF EXISTS reservation_events_kind_check;
ALTER TABLE sw_new_superwilds.reservation_events ADD CONSTRAINT reservation_events_kind_check CHECK(kind IN('BET','RESERVE','INCREASE','RELEASE','COLLECT'));
CREATE TABLE IF NOT EXISTS sw_new_superwilds.gambles (
  action_id uuid PRIMARY KEY,
  round_id uuid NOT NULL,
  user_id text NOT NULL,
  attempt integer NOT NULL CHECK(attempt BETWEEN 1 AND 1000),
  request_key uuid NOT NULL,
  stake_minor bigint NOT NULL CHECK(stake_minor>0),
  payout_minor bigint NOT NULL CHECK(payout_minor>=0 AND (payout_minor=0 OR payout_minor::numeric=stake_minor::numeric*2)),
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(round_id,attempt), UNIQUE(user_id,request_key),
  FOREIGN KEY(user_id,round_id) REFERENCES sw_new_superwilds.rounds(user_id,round_id)
);
COMMIT;
