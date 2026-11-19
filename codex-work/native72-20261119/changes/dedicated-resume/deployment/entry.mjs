import previous from '../native72habesha7/entry.mjs';
export * from '../native72habesha7/entry.mjs';
import { createProductionHandler } from '../native72habesha3/routes.mjs';
import { installDedicatedReleases } from './handler.mjs';
import { releasePins } from './release-pins.mjs';

export default installDedicatedReleases(previous, { ...releasePins, createProductionHandler });
