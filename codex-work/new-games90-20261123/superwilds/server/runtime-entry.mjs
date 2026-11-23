// Bundle this one entry to native72-batch01/new90-superwilds-runtime.mjs.
// Existing bootstrap's flat allowlist and retained module paths stay intact.
export { createSuperWildsRuntimeHost } from './runtime-host.mjs';
export { requested90RuntimeConfiguration } from './runtime-release.mjs';
import { createHash } from 'node:crypto';
import { prepareSuperWildsSchema } from './runtime-schema.mjs';
import m10Journal from '../../../continue71-20261122/m10-host-lifecycle/prepare-journal.sql';
import m10Reservations from '../../../continue71-20261122/m10-house-reservations/prepare-schema.sql';
import ownJournal from './prepare-journal.sql';
import ownReservations from './prepare-reservations.sql';
const migrations = [
  ['m10-journal', m10Journal], ['m10-reservations', m10Reservations],
  ['superwilds-journal', ownJournal], ['superwilds-reservations', ownReservations],
].map(([name, sql]) => Object.freeze({ name, sql, sha256: createHash('sha256').update(sql).digest('hex') }));
export const prepareSuperWildsRuntimeSchema = (pool, options) => prepareSuperWildsSchema(pool, migrations, options);
