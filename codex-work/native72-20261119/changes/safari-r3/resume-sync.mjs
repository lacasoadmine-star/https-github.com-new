// Safari Simba-specific policy for an idle foreground account reconciliation.
// This is presentation state only; the authenticated Player API owns balances.
export function shouldRefreshSafariOnResume({
  active,
  hidden,
  focused,
  modalOpen,
  roundBusy,
  autoActive,
  pending,
  phase,
}) {
  return active === true
    && hidden === false
    && focused === true
    && modalOpen === false
    && roundBusy === false
    && autoActive === false
    && pending === false
    && phase === 'ready';
}
