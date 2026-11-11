import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files = {
  baseline: process.env.FRESH_BASELINE_RUNTIME,
  candidate: process.env.FRESH_CANDIDATE_RUNTIME
};
if (!files.baseline || !files.candidate) throw Error('Explicit FRESH_BASELINE_RUNTIME and FRESH_CANDIDATE_RUNTIME private file paths are required');
for (const [name, file] of Object.entries(files)) {
  const source = await readFile(file, 'utf8');
  const marker = 'const service=await createSlotService(';
  if (source.split(marker).length !== 2) throw Error('BOOTSTRAP_CUTOFF_MISMATCH');
  const imports = "import pg from 'pg';import Redis from 'ioredis';";
  if (!source.startsWith(imports)) throw Error('DEPENDENCY_IMPORT_MISMATCH');
  const fixture = source.slice(0, source.indexOf(marker)).replace(imports, "import pg from './pg-fixture.mjs';import Redis from './redis-fixture.mjs';") + '\nexport { migration };\n';
  await writeFile(new URL('./' + name + '-service-fixture.mjs', import.meta.url), fixture);
  console.log(JSON.stringify({ name, originalSha256: createHash('sha256').update(source).digest('hex'), transformation: 'Only database/Redis transports replaced; production initializer omitted. All evaluated game, authentication and financial methods retained.' }));
}
