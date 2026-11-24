import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function fixtureWalletClass(){
 // Expose the unchanged legacy wallet class only inside this opt-in test
 // process. Its Bun connection constructor never contacts a service database.
 globalThis.Bun={SQL:class{constructor(){throw new Error('TEST_FIXTURE_REJECTED_SERVICE_DATABASE');}}};
 const source=await readFile(new URL('../baseline/native-family-20261104.mjs',import.meta.url),'utf8');
 const directory=await mkdtemp(join(tmpdir(),'jetx-wallet-fixture-')),filename=join(directory,'wallet.mjs');
 await writeFile(filename,source+'\nexport {q as SharedWalletStore};\n');
 const module=await import(pathToFileURL(filename));
 return module.SharedWalletStore;
}
