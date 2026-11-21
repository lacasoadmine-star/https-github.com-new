import { entryModule } from '../integration/additive-upload.mjs';
export { PREVIEW_DEPLOYMENT_MODULES } from '../integration/additive-upload.mjs';

/** Generate only the new outer entry. The active entry and all old bytes stay intact. */
export function visualPreviewEntry(activeMainModule) {
  const original = entryModule(activeMainModule);
  const ending = 'export default createAdditiveWorker(previous,config);\n';
  if (!original.endsWith(ending)) throw Error('ADDITIVE_ENTRY_CONTRACT_CHANGED');
  return original.slice(0, -ending.length)
    + "import {createVisualPreviewWorker} from './preview-worker.mjs';\n"
    + "import previewManifest from './preview-manifest.mjs';\n"
    + 'export default createVisualPreviewWorker(createAdditiveWorker(previous,config),previewManifest);\n';
}
