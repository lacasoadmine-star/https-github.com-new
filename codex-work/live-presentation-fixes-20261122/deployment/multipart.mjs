// Parse Worker download bytes without decoding or duplicating the entire bundle.
// Every part body is a view over the original buffer. No network operations here.
export function findBytes(bytes, needle, from = 0) {
  if (!needle.length) throw new Error('Empty delimiter');
  for (let at = bytes.indexOf(needle[0], from); at >= 0; at = bytes.indexOf(needle[0], at + 1)) {
    if (at + needle.length > bytes.length) return -1;
    let equal = true;
    for (let n = 1; n < needle.length; n++) if (bytes[at + n] !== needle[n]) { equal = false; break; }
    if (equal) return at;
  }
  return -1;
}

export function parseWorkerMultipart(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new Error('Worker download must be bytes');
  const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', { fatal: true });
  const crlf = new Uint8Array([13, 10]), headerEnd = new Uint8Array([13, 10, 13, 10]);
  const lineEnd = findBytes(bytes, crlf);
  if (lineEnd < 3 || lineEnd > 200) throw new Error('Invalid multipart boundary');
  const boundaryLine = decoder.decode(bytes.subarray(0, lineEnd));
  if (!/^--[A-Za-z0-9'()+_,./:=?-]+$/.test(boundaryLine)) throw new Error('Unsafe multipart boundary');
  const marker = encoder.encode('\r\n' + boundaryLine), parts = [], names = new Set();
  let at = 0;
  while (at < bytes.length) {
    if (findBytes(bytes, encoder.encode(boundaryLine), at) !== at) throw new Error('Missing part boundary');
    const suffix = at + lineEnd;
    if (bytes[suffix] === 45 && bytes[suffix + 1] === 45) {
      const tail = decoder.decode(bytes.subarray(suffix + 2));
      if (tail !== '' && tail !== '\r\n') throw new Error('Unexpected multipart trailing data');
      return { boundary: boundaryLine.slice(2), parts, closingOffset: at };
    }
    if (bytes[suffix] !== 13 || bytes[suffix + 1] !== 10) throw new Error('Invalid part separator');
    const end = findBytes(bytes, headerEnd, suffix + 2);
    if (end < 0 || end - suffix > 16384) throw new Error('Invalid part headers');
    const headers = decoder.decode(bytes.subarray(suffix + 2, end));
    const name = /(?:^|\r\n)content-disposition:\s*form-data;[^\r\n]*\bname="([^"\r\n]+)"/i.exec(headers)?.[1];
    const contentType = /(?:^|\r\n)content-type:\s*([^\r\n]+)/i.exec(headers)?.[1];
    if (!name || names.has(name)) throw new Error('Missing or duplicate module name');
    names.add(name);
    const bodyStart = end + 4, bodyEnd = findBytes(bytes, marker, bodyStart);
    if (bodyEnd < 0) throw new Error('Unterminated part');
    parts.push({ name, contentType, body: bytes.subarray(bodyStart, bodyEnd), bodyStart, bodyEnd });
    at = bodyEnd + 2;
  }
  throw new Error('Missing multipart terminator');
}

export function appendWorkerParts(bytes, parsed, additions) {
  const encoder = new TextEncoder(), names = new Set(parsed.parts.map(p => p.name));
  const chunks = [];
  const add = ({ name, contentType, content }) => {
    if (!/^[A-Za-z0-9_.\/-]+$/.test(name)) throw new Error('Invalid module name');
    if (!/^[A-Za-z0-9+;= .\/-]+$/.test(contentType)) throw new Error('Invalid content type');
    // Worker downloads omit file headers. On upload each module must be a file,
    // otherwise the multipart parser treats the entire bundle as text fields.
    const filename = name === 'metadata' ? '' : '; filename="' + name + '"';
    chunks.push(encoder.encode('--' + parsed.boundary + '\r\nContent-Disposition: form-data; name="' + name + '"' + filename + '\r\nContent-Type: ' + contentType + '\r\n\r\n'));
    chunks.push(typeof content === 'string' ? encoder.encode(content) : content);
    chunks.push(encoder.encode('\r\n'));
  };
  for (const part of parsed.parts) {
    const type = part.contentType || (part.name.endsWith('.mjs') ? 'application/javascript+module' : part.name.endsWith('.bin') ? 'application/octet-stream' : null);
    if (!type) throw new Error('Unknown downloaded module type: ' + part.name);
    add({ name: part.name, contentType: type, content: part.body });
  }
  for (const addition of additions) {
    const { name, contentType, content } = addition;
    if (!/^[A-Za-z0-9_.\/-]+$/.test(name) || names.has(name)) throw new Error('Invalid or colliding new module');
    names.add(name);
    add({ name, contentType, content });
  }
  chunks.push(encoder.encode('--' + parsed.boundary + '--\r\n'));
  let offset = 0, chunkIndex = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (chunkIndex >= chunks.length) { controller.close(); return; }
      const part = chunks[chunkIndex], end = Math.min(offset + 65536, part.length);
      controller.enqueue(part.subarray(offset, end)); offset = end;
      if (offset === part.length) { chunkIndex++; offset = 0; }
    }
  });
  return { body, contentType: 'multipart/form-data; boundary=' + parsed.boundary, byteLength: chunks.reduce((n, p) => n + p.byteLength, 0) };
}
