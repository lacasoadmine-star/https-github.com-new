import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseWorkerMultipart } from './multipart.mjs';

const ascii = value => new TextEncoder().encode(value);
const concat = (...items) => {
  const result = new Uint8Array(items.reduce((sum, item) => sum + item.length, 0));
  let offset = 0;
  for (const item of items) { result.set(item, offset); offset += item.length; }
  return result;
};
const encode = (parts, { boundary = 'worker-boundary-123', end = '\r\n' } = {}) => concat(
  ...parts.flatMap(part => [ascii('--' + boundary + '\r\n' + (part.headers ??
    'Content-Disposition: form-data; name="' + part.name + '"' + (part.type ? '\r\nContent-Type: ' + part.type : '')) + '\r\n\r\n'), part.body, ascii('\r\n')]),
  ascii('--' + boundary + '--' + end),
);
const type = boundary => 'multipart/form-data; boundary="' + boundary + '"';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('no-filename Cloudflare parts preserve every invalid UTF-8 binary byte', () => {
  const body = Uint8Array.from([0, 255, 254, 128, 192, 175, 237, 160, 128, 13, 10, 0, 226, 130]);
  const script = ascii('export default {};\n');
  const wire = encode([{ name: 'worker.mjs', body: script }, { name: 'asset.bin', body }]);
  const parsed = parseWorkerMultipart(wire, type('worker-boundary-123'));
  assert.equal(parsed.parts.length, 2);
  assert.equal(parsed.parts[0].type, 'application/javascript+module');
  assert.equal(parsed.parts[1].type, 'application/octet-stream');
  assert.deepEqual(parsed.parts[0].body, script);
  assert.deepEqual(parsed.parts[1].body, body);
  assert.equal(hash(parsed.parts[1].body), hash(body));
  assert.equal(parsed.parts[1].body.buffer, wire.buffer);
  assert.equal(parsed.parts[1].typeInferred, true);
});

test('boundary-like bytes inside a body are never mistaken for delimiter lines', () => {
  const boundary = 'worker-boundary-123';
  const body = concat(ascii('begin--' + boundary + '\r\n'),
    ascii('\r\n--' + boundary + 'suffix\r\n'),
    ascii('\r\n--' + boundary + '--suffix\r\n'),
    ascii('\n--' + boundary + '\r\n'),
    Uint8Array.of(255, 0, 128), ascii('\r\n--' + boundary + '-\r\nend'));
  const parsed = parseWorkerMultipart(encode([{ name: 'binary.bin', body }], { boundary }), type(boundary));
  assert.deepEqual(parsed.parts[0].body, body);
});

test('body newlines, leading whitespace and zero-length bodies are preserved exactly', () => {
  const samples = ['', '\r\n', '\n', '\r', '\r\n\r\n', ' text\n\n', '\tdata\r\n'];
  const parsed = parseWorkerMultipart(encode(samples.map((value, index) => ({ name: index + '.mjs', body: ascii(value) }))));
  for (let index = 0; index < samples.length; index++) assert.deepEqual(parsed.parts[index].body, ascii(samples[index]));
});

test('explicit content type and optional quoted filename are preserved', () => {
  const wire = encode([{ name: 'ignored', headers: 'Content-Disposition: form-data; name="dir/a;b.mjs"; filename="a\\\"b.js"\r\nContent-Type: text/plain; charset="utf-8"', body: ascii('x') }]);
  const part = parseWorkerMultipart(wire).parts[0];
  assert.equal(part.name, 'dir/a;b.mjs');
  assert.equal(part.filename, 'a"b.js');
  assert.equal(part.type, 'text/plain; charset="utf-8"');
  assert.equal(part.typeInferred, false);
});

test('byte-offset views and ArrayBuffer input do not shift or decode bodies', () => {
  const expected = Uint8Array.of(255, 0, 254, 10);
  const wire = encode([{ name: 'body.bin', body: expected }]);
  const backing = concat(Uint8Array.of(8, 9, 10), wire, Uint8Array.of(11, 12));
  assert.deepEqual(parseWorkerMultipart(backing.subarray(3, 3 + wire.length)).parts[0].body, expected);
  assert.deepEqual(parseWorkerMultipart(wire.buffer).parts[0].body, expected);
});

test('a closing delimiter may end at EOF or have exactly one framing CRLF', () => {
  for (const end of ['', '\r\n']) {
    const wire = encode([{ name: 'x.mjs', body: ascii('last\n') }], { end });
    assert.equal(parseWorkerMultipart(wire).byteLength, wire.length);
    assert.deepEqual(parseWorkerMultipart(wire).parts[0].body, ascii('last\n'));
  }
});

test('duplicate module names reject instead of silently overwriting a module', () => {
  const wire = encode([{ name: 'a.mjs', body: ascii('first') }, { name: 'a.mjs', body: ascii('second') }]);
  assert.throws(() => parseWorkerMultipart(wire), /DUPLICATE_PART_NAME/);
});

test('truncated or malformed closing delimiters and trailing bytes reject', () => {
  const wire = encode([{ name: 'x.bin', body: Uint8Array.of(255, 0) }], { end: '' });
  for (const remove of [1, 2, 3, 10]) assert.throws(() => parseWorkerMultipart(wire.subarray(0, wire.length - remove)), /CLOSING_BOUNDARY_MISSING/);
  for (const extra of ['\r\ntrailer', '\r\n\r\n', 'junk']) {
    assert.throws(() => parseWorkerMultipart(concat(wire, ascii(extra))), /TRAILING_BYTES|CLOSING_BOUNDARY_MISSING/);
  }
});

test('wrong boundary, preamble, duplicate parameters and folded headers reject', () => {
  const wire = encode([{ name: 'x.bin', body: ascii('x') }]);
  assert.throws(() => parseWorkerMultipart(wire, type('different')), /OPENING_BOUNDARY_MISMATCH/);
  assert.throws(() => parseWorkerMultipart(concat(ascii('preamble\r\n'), wire)), /OPENING_BOUNDARY_REQUIRED/);
  assert.throws(() => parseWorkerMultipart(wire, 'multipart/form-data; boundary=a; boundary=b'), /DUPLICATE_OR_INVALID_PARAMETER/);
  for (const headers of [
    'Content-Disposition: form-data; name="x"; name="y"',
    'Content-Disposition: form-data; name="x"\r\nContent-Disposition: form-data; name="y"',
    'Content-Disposition: form-data;\r\n name="x"',
    'Content-Disposition: form-data; name="x"\r\nContent-Type: application/octet-stream\r\nContent-Type: text/plain',
  ]) assert.throws(() => parseWorkerMultipart(encode([{ headers, body: ascii('x') }])));
});

test('missing names, non-ASCII headers, encoded payloads and wrong content lengths reject', () => {
  for (const headers of [
    'Content-Disposition: form-data',
    'Content-Disposition: form-data; name=""',
    'Content-Disposition: form-data; name="café.bin"',
    'Content-Disposition: form-data; name="x"\r\nContent-Transfer-Encoding: base64',
    'Content-Disposition: form-data; name="x"\r\nContent-Length: 2',
    'Content-Disposition: form-data; name="x"\r\nContent-Type: invalid',
  ]) assert.throws(() => parseWorkerMultipart(encode([{ headers, body: ascii('x') }])));
});

test('embedding the single exported function requires no imports or outer helpers', () => {
  const embedded = new Function('return (' + parseWorkerMultipart.toString() + ');')();
  const body = Uint8Array.of(255, 0, 192, 128, 10);
  assert.deepEqual(embedded(encode([{ name: 'x.bin', body }])).parts[0].body, body);
});

test('rebuilding native FormData from parsed Blob parts preserves bytes and MIME types', async () => {
  const original = parseWorkerMultipart(encode([
    { name: 'entry.mjs', body: ascii('export default {};\r\n\n') },
    { name: 'asset.bin', body: Uint8Array.of(0, 255, 128, 192, 175, 13, 10, 0) },
  ]));
  const form = new FormData();
  for (const part of original.parts) form.append(part.name, new Blob([part.body], { type: part.type }), part.filename ?? part.name);
  const request = new Request('https://isolated.invalid/', { method: 'POST', body: form });
  const rebuilt = parseWorkerMultipart(new Uint8Array(await request.arrayBuffer()), request.headers.get('content-type'));
  assert.equal(rebuilt.parts.length, original.parts.length);
  for (let index = 0; index < original.parts.length; index++) {
    assert.equal(rebuilt.parts[index].name, original.parts[index].name);
    assert.equal(rebuilt.parts[index].type, original.parts[index].type);
    assert.equal(hash(rebuilt.parts[index].body), hash(original.parts[index].body));
  }
});

test('large binary modules and hundreds of parts preserve per-part digests', () => {
  const large = new Uint8Array(8 * 1024 * 1024);
  for (let index = 0; index < large.length; index++) large[index] = index % 256;
  const original = [{ name: 'large.bin', body: large }, ...Array.from({ length: 304 }, (_, index) => ({ name: index + '.mjs', body: ascii('export const n=' + index + ';\n') }))];
  const parsed = parseWorkerMultipart(encode(original));
  assert.equal(parsed.parts.length, 305);
  for (let index = 0; index < original.length; index++) assert.equal(hash(parsed.parts[index].body), hash(original[index].body));
});
