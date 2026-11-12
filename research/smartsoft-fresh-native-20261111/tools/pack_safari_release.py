"""Pack the reviewed additive runtime for the existing pinned Railway Function."""
import base64,hashlib,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1];out=root/'native-machines/safari-simba-2/server/release'
data=(out/'slot-runtime.mjs').read_bytes();sha=hashlib.sha256(data).hexdigest()
packed=subprocess.run(['node','-e',"const fs=require('node:fs'),z=require('node:zlib');process.stdout.write(z.brotliCompressSync(fs.readFileSync(process.argv[1]),{params:{[z.constants.BROTLI_PARAM_QUALITY]:11}}));",str(out/'slot-runtime.mjs')],check=True,capture_output=True).stdout
source="""import pg from 'pg';
import Redis from 'ioredis';
import { brotliDecompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
void pg; void Redis;
const runtimeBytes = brotliDecompressSync(Buffer.from('%s', 'base64'));
if (runtimeBytes.length !== %d || createHash('sha256').update(runtimeBytes).digest('hex') !== '%s') throw new Error('NATIVE_RUNTIME_INTEGRITY_MISMATCH');
const runtimeURL = new URL('./native-slot-runtime.mjs', import.meta.url);
await writeFile(runtimeURL, runtimeBytes, { mode: 0o600 });
await import(runtimeURL.href);
"""%(base64.b64encode(packed).decode(),len(data),sha)
command='./run.sh '+base64.b64encode(source.encode()).decode();assert len(command)<131000,len(command)
(out/'nine-slot-function.ts').write_text(source)
metadata=json.loads((out/'metadata.json').read_text());metadata.update(functionCharacters=len(source),slotCommandCharacters=len(command),compressedBytes=len(packed));(out/'metadata.json').write_text(json.dumps(metadata,indent=2))
print(json.dumps(metadata))
