/** Own ZPLAY fair colour model. No provider probability or cap is inferred.
 * The host must explicitly accept its policy and financial lifecycle before
 * installing this candidate. No endpoint, wallet or release is created.
 */
import { randomBytes as cryptoRandomBytes, createHash } from 'node:crypto';
import { GAME_ID } from '../rules.mjs';
const MAX = 9223372036854775807n;
const text = value => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(value);
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const fail = code => { throw new Error('SUPERWILDS_GAMBLE_MODEL_' + code); };

/** Both caps are mandatory and separate. The demo's displayed500DMO limit
 * does not establish which cap it represents, so it is never a default.
 */
export function validateOperatorGamblePolicy(policy) {
  if (!policy || Object.keys(policy).sort().join('|') !== 'maxAttempts|maxPendingMinor|maxTargetMinor|version' ||
    !text(policy.version) || !Number.isSafeInteger(policy.maxAttempts) || policy.maxAttempts < 1 || policy.maxAttempts > 1000 ||
    typeof policy.maxPendingMinor !== 'bigint' || policy.maxPendingMinor < 1n || policy.maxPendingMinor > MAX / 2n ||
    typeof policy.maxTargetMinor !== 'bigint' || policy.maxTargetMinor < 2n || policy.maxTargetMinor > MAX) fail('EXPLICIT_OPERATOR_POLICY_REQUIRED');
  return freeze({ ...policy });
}

export function createSuperWildsFairGambleModel({ policy, randomBytes = cryptoRandomBytes } = {}) {
  const acceptedPolicy = validateOperatorGamblePolicy(policy);
  if (typeof randomBytes !== 'function') fail('CRYPTO_ENTROPY_REQUIRED');
  const law = freeze({ schema: 'zplay/superwilds-own-fair-colour/v1', gameId: GAME_ID,
    gambleVersion: 'zplay-superwilds-fair-colour-1', owner: 'ZPLAY',
    colors: ['RED', 'BLACK'], probabilities: ['1/2', '1/2'], payout: 'Correct choice doubles the pending liability; incorrect choice releases it',
    playerWalletDebit: 'None; the prior win is already reserved', providerProbabilityModel: false,
    policy: { version: acceptedPolicy.version, maxAttempts: acceptedPolicy.maxAttempts,
      maxPendingMinor: String(acceptedPolicy.maxPendingMinor), maxTargetMinor: String(acceptedPolicy.maxTargetMinor) } });
  return freeze({ gameId: GAME_ID, gambleVersion: law.gambleVersion,
    gambleSha256: createHash('sha256').update(JSON.stringify(law)).digest('hex'), policy: acceptedPolicy,
    approved: false, verification: { fairColorVerified: true, operatorPolicyVerified: false, reservationLifecycleVerified: false }, law,
    sampleColor() {
      const bytes = randomBytes(1);
      if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 1) fail('CRYPTO_ENTROPY_INVALID');
      // Each low bit occurs128times over the256equally likely byte values.
      return bytes[0] & 1 ? 'BLACK' : 'RED';
    },
    validateColor: color => color === 'RED' || color === 'BLACK',
  });
}
