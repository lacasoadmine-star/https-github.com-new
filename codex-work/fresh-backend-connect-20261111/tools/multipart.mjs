/**
 * Parse a Cloudflare Worker download without decoding any module body.
 *
 * Body values are zero-copy Uint8Array views into the supplied bytes. Keep the
 * input immutable until they have been consumed. Only ASCII MIME headers and
 * delimiter bytes are interpreted. No preamble or epilogue is accepted.
 *
 * All helpers are nested deliberately: parseWorkerMultipart.toString() is a
 * self-contained function suitable for the existing Cloudflare execution tool.
 */
export function parseWorkerMultipart(input, contentType = undefined) {
  const fail = (code) => { throw new Error('WORKER_MULTIPART_' + code); };
  const bytes = input instanceof Uint8Array ? input
    : input instanceof ArrayBuffer ? new Uint8Array(input) : null;
  if (!bytes) fail('BYTES_REQUIRED');
  const token = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
  const trim = value => value.replace(/^[ \t]+|[ \t]+$/g, '');
  const ascii = (start, end) => {
    let value = '';
    for (let index = start; index < end; index++) {
      const byte = bytes[index];
      if (byte !== 9 && byte !== 10 && byte !== 13 && (byte < 32 || byte > 126)) fail('NON_ASCII_HEADER');
      value += String.fromCharCode(byte);
    }
    return value;
  };
  const parameters = value => {
    if (typeof value !== 'string' || /[^\x20-\x7e\t]/.test(value)) fail('INVALID_HEADER_VALUE');
    const first = value.indexOf(';');
    const head = trim(first === -1 ? value : value.slice(0, first));
    const result = Object.create(null);
    let cursor = first === -1 ? value.length : first;
    while (cursor < value.length) {
      if (value[cursor++] !== ';') fail('INVALID_PARAMETER');
      while (value[cursor] === ' ' || value[cursor] === '\t') cursor++;
      const nameStart = cursor;
      while (cursor < value.length && !['=', ';', ' ', '\t'].includes(value[cursor])) cursor++;
      const key = value.slice(nameStart, cursor).toLowerCase();
      if (!token.test(key) || Object.hasOwn(result, key)) fail('DUPLICATE_OR_INVALID_PARAMETER');
      while (value[cursor] === ' ' || value[cursor] === '\t') cursor++;
      if (value[cursor++] !== '=') fail('INVALID_PARAMETER');
      while (value[cursor] === ' ' || value[cursor] === '\t') cursor++;
      let decoded = '';
      if (value[cursor] === '"') {
        cursor++;
        let closed = false;
        while (cursor < value.length) {
          const character = value[cursor++];
          if (character === '"') { closed = true; break; }
          if (character === '\\') {
            if (cursor >= value.length) fail('UNTERMINATED_QUOTED_PARAMETER');
            decoded += value[cursor++];
          } else decoded += character;
        }
        if (!closed) fail('UNTERMINATED_QUOTED_PARAMETER');
        while (value[cursor] === ' ' || value[cursor] === '\t') cursor++;
        if (cursor < value.length && value[cursor] !== ';') fail('INVALID_PARAMETER_SUFFIX');
      } else {
        const end = value.indexOf(';', cursor);
        decoded = trim(value.slice(cursor, end === -1 ? value.length : end));
        if (!token.test(decoded)) fail('INVALID_PARAMETER_TOKEN');
        cursor = end === -1 ? value.length : end;
      }
      result[key] = decoded;
    }
    return { head, values: result };
  };
  let boundary;
  if (contentType !== undefined && contentType !== null) {
    const parsed = parameters(contentType);
    if (!/^multipart\/(?:form-data|mixed)$/i.test(parsed.head)) fail('INVALID_CONTENT_TYPE');
    boundary = parsed.values.boundary;
  } else {
    // Some download APIs expose only the byte body. Inference is bounded to
    // the first delimiter line and never searches or decodes module content.
    let end = -1;
    for (let index = 2; index < Math.min(bytes.length - 1, 74); index++) {
      if (bytes[index] === 13 && bytes[index + 1] === 10) { end = index; break; }
    }
    if (bytes[0] !== 45 || bytes[1] !== 45 || end < 0) fail('OPENING_BOUNDARY_REQUIRED');
    boundary = ascii(2, end);
  }
  if (typeof boundary !== 'string' || !/^[0-9A-Za-z'()+_,./:=? -]{1,70}$/.test(boundary) || boundary.endsWith(' ')) fail('INVALID_BOUNDARY');
  const marker = Uint8Array.from('--' + boundary, character => character.charCodeAt(0));
  const equalAt = (at, expected) => {
    if (at < 0 || at + expected.length > bytes.length) return false;
    for (let index = 0; index < expected.length; index++) if (bytes[at + index] !== expected[index]) return false;
    return true;
  };
  const crlfAt = at => bytes[at] === 13 && bytes[at + 1] === 10;
  if (!equalAt(0, marker) || !crlfAt(marker.length)) fail('OPENING_BOUNDARY_MISMATCH');
  const findDelimiter = start => {
    let at = bytes.indexOf(13, start);
    while (at !== -1) {
      if (crlfAt(at) && equalAt(at + 2, marker)) {
        const suffix = at + 2 + marker.length;
        if (crlfAt(suffix)) return { at, after: suffix + 2, closing: false };
        if (bytes[suffix] === 45 && bytes[suffix + 1] === 45) {
          const end = suffix + 2;
          if (end === bytes.length || crlfAt(end)) return { at, after: crlfAt(end) ? end + 2 : end, closing: true };
        }
      }
      at = bytes.indexOf(13, at + 1);
    }
    fail('CLOSING_BOUNDARY_MISSING');
  };
  const parts = [], names = new Set();
  let cursor = marker.length + 2;
  while (cursor < bytes.length) {
    const headerStart = cursor;
    let headerEnd = -1;
    const limit = Math.min(bytes.length - 3, headerStart + 16384);
    for (let at = headerStart; at < limit; at++) {
      if (crlfAt(at) && crlfAt(at + 2)) { headerEnd = at; break; }
    }
    if (headerEnd < 0) fail('HEADER_TERMINATOR_MISSING_OR_TOO_LARGE');
    const headers = Object.create(null);
    for (const line of ascii(headerStart, headerEnd).split('\r\n')) {
      const colon = line.indexOf(':');
      const key = line.slice(0, colon).toLowerCase();
      if (colon < 1 || !token.test(key) || Object.hasOwn(headers, key) || /[\r\n]/.test(line)) fail('DUPLICATE_OR_INVALID_HEADER');
      headers[key] = trim(line.slice(colon + 1));
    }
    const disposition = parameters(headers['content-disposition']);
    if (disposition.head.toLowerCase() !== 'form-data' || !Object.hasOwn(disposition.values, 'name')) fail('FORM_DATA_NAME_REQUIRED');
    const name = disposition.values.name;
    if (!name || /[\x00-\x1f\x7f]/.test(name)) fail('INVALID_PART_NAME');
    if (names.has(name)) fail('DUPLICATE_PART_NAME');
    names.add(name);
    if (headers['content-transfer-encoding'] && !/^(?:binary|8bit|7bit)$/i.test(headers['content-transfer-encoding'])) fail('ENCODED_BODY_UNSUPPORTED');
    const typeInferred = !Object.hasOwn(headers, 'content-type');
    let type = headers['content-type'];
    if (typeInferred) type = /\.m?js$/i.test(name) ? 'application/javascript+module'
      : /\.wasm$/i.test(name) ? 'application/wasm' : 'application/octet-stream';
    else {
      const media = parameters(type).head.split('/');
      if (media.length !== 2 || !media.every(part => token.test(part))) fail('INVALID_PART_CONTENT_TYPE');
    }
    const bodyStart = headerEnd + 4;
    const delimiter = findDelimiter(bodyStart);
    const body = bytes.subarray(bodyStart, delimiter.at);
    if (Object.hasOwn(headers, 'content-length') &&
        (!/^(?:0|[1-9][0-9]*)$/.test(headers['content-length']) || Number(headers['content-length']) !== body.byteLength)) fail('PART_LENGTH_MISMATCH');
    parts.push({ name, type, typeInferred, body, headers, headerStart, headerEnd, bodyStart, bodyEnd: delimiter.at,
      ...(Object.hasOwn(disposition.values, 'filename') ? { filename: disposition.values.filename } : {}) });
    if (delimiter.closing) {
      if (delimiter.after !== bytes.length) fail('TRAILING_BYTES_AFTER_CLOSING_BOUNDARY');
      return { boundary, parts, byteLength: bytes.byteLength };
    }
    cursor = delimiter.after;
  }
  fail('CLOSING_BOUNDARY_MISSING');
}
