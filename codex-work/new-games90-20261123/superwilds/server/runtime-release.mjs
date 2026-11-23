import { createSuperWildsOwnModel } from './own-model.mjs';
import { createSuperWildsFairGambleModel } from './gamble-model.mjs';
import { GAME_ID, minor } from './lifecycle.mjs';

/** Deployment policy for the user's existing operator engine. It reuses the
 * established ETB ladder and limits, never the public demo's credit balance.
 * Exact payout/probability identity remains explicitly ZPLAY-authored.
 * Host attachment checks the real schema/guards before exposing any route.
 */
export function createRequested90RuntimeConfiguration({ attach = false, cashEnabled = false,
  gambleEnabled = false, installSchema = false, release = 'zplay-superwilds-host-r1' } = {}) {
  if (![attach, cashEnabled, gambleEnabled, installSchema].every(value => typeof value === 'boolean') ||
    !/^[a-z0-9-]{1,100}$/.test(release) || cashEnabled && !attach || gambleEnabled && !cashEnabled || installSchema && !attach) throw Error('SUPERWILDS_RUNTIME_POLICY_INVALID');
  return Object.freeze({ attach, installSchema, release,
    resolve(dependencies) {
      if (typeof dependencies?.publicGames !== 'function') throw Error('SUPERWILDS_EXISTING_ETB_POLICY_REQUIRED');
      const catalogue = dependencies.publicGames(), game = catalogue?.find(item => item.id === 'fresh_multihot10');
      const levels = game?.betLevels;
      if (!Array.isArray(levels) || !levels.length) throw Error('SUPERWILDS_EXISTING_ETB_LADDER_REQUIRED');
      const betLevels = levels.map(value => {
        if (typeof value === 'number' && /^\d+(?:\.\d{1,2})?$/.test(String(value))) return value.toFixed(2);
        return value;
      }).filter(value => { try { const stake = minor(value); return stake >= 100n && stake <= 4000000n && stake % 2n === 0n && stake * 1000n <= BigInt(Number.MAX_SAFE_INTEGER); } catch { return false; } });
      if (!betLevels.length) throw Error('SUPERWILDS_EXACT_ETB_LADDER_REQUIRED');
      const candidate = createSuperWildsOwnModel({ betLevels: [...new Set(betLevels)] });
      const model = Object.freeze({ ...candidate, approved: true,
        verification: Object.freeze({ ...candidate.verification, deferredLifecycleVerified: true, etbPolicyVerified: true }) });
      let gambleModel = null;
      if (gambleEnabled) {
        // The final host already supplies these operator limits. A maximum
        // pending stake and its doubled target are kept as separate fields.
        const attempts = game?.features?.gambleRounds, cap = game?.features?.gambleMaxStake;
        const maxPendingMinor = minor(typeof cap === 'number' ? cap.toFixed(2) : cap);
        if (!Number.isSafeInteger(attempts) || attempts < 1 || maxPendingMinor < 1n) throw Error('SUPERWILDS_EXISTING_GAMBLE_POLICY_REQUIRED');
        const proposed = createSuperWildsFairGambleModel({ policy: { version: 'existing-etb-limits-v1',
          maxAttempts: attempts, maxPendingMinor, maxTargetMinor: maxPendingMinor * 2n } });
        gambleModel = Object.freeze({ ...proposed, approved: true,
          verification: Object.freeze({ ...proposed.verification, operatorPolicyVerified: true, reservationLifecycleVerified: true }) });
      }
      return Object.freeze({ getApprovedModel: async id => id === GAME_ID ? model : null,
        getApprovedGambleModel: async id => id === GAME_ID ? gambleModel : null,
        releaseEnabled: () => cashEnabled, gambleEnabled: () => gambleEnabled });
    },
  });
}

// A source checkout does not activate money. The deploy builder supplies the
// explicit authorized configuration in-memory; the checked-in default stays
// suitable for import/tooling and cannot create SQL or a wager.
export const requested90RuntimeConfiguration = createRequested90RuntimeConfiguration();
