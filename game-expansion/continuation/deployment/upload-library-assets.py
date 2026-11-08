#!/usr/bin/env python3
"""Upload the verified local media to an already-authorized Cloudflare session.

Credentials are read from a private scratch file and never logged. This script
does not deploy a Worker or modify the Player.
"""
import base64
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import subprocess
import sys
import uuid

os.umask(0o077)
session_path = Path(sys.argv[1])
inventory_path = Path(sys.argv[2])
session = json.loads(session_path.read_text())
if session['account_id'] != '288bc182291438b87a68193627f36ca0' or session['script'] != 'superwin-library-100':
    raise SystemExit('Unexpected upload target')
inventory = json.loads(inventory_path.read_text())
by_hash = {entry['md5']: entry for entry in inventory}
requested = [h for bucket in session['buckets'] for h in bucket]
if len(requested) != len(set(requested)) or any(h not in by_hash for h in requested):
    raise SystemExit('Unexpected asset upload manifest')
token = session['jwt']
if any(ch not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.=' for ch in token):
    raise SystemExit('Unexpected token encoding')
config_path = session_path.parent / 'library-upload-curl.conf'
config_path.write_text('header = "Authorization: Bearer ' + token + '"\n')
completion_path = session_path.parent / 'library-asset-completion.json'
if not session['buckets']:
    completion_path.write_text(json.dumps({'jwt':token}))
    print(json.dumps({'complete':True,'uploaded_files':0}), flush=True)
    raise SystemExit(0)
summary = []
for i, bucket in enumerate(session['buckets']):
    boundary = 'zplay-' + uuid.uuid4().hex
    multipart_path = session_path.parent / ('library-upload-' + str(i) + '.multipart')
    count_bytes = 0
    with multipart_path.open('wb') as body:
        for digest in bucket:
            entry = by_hash[digest]
            data = Path(entry['file']).read_bytes()
            if len(data) != entry['bytes'] or hashlib.md5(data).hexdigest() != digest or hashlib.sha256(data).hexdigest() != entry['sha256']:
                raise SystemExit('Local asset integrity changed')
            content_type = mimetypes.guess_type(entry['path'])[0] or 'application/octet-stream'
            body.write(('--' + boundary + '\r\nContent-Disposition: form-data; name="' + digest + '"\r\nContent-Type: ' + content_type + '\r\n\r\n').encode())
            body.write(base64.b64encode(data))
            body.write(b'\r\n')
            count_bytes += len(data)
        body.write(('--' + boundary + '--\r\n').encode())
    response_path = session_path.parent / ('library-upload-' + str(i) + '.json')
    proc = subprocess.run([
        'curl', '--silent', '--show-error', '--max-time', '120',
        '--config', str(config_path), '--request', 'POST',
        '--header', 'Content-Type: multipart/form-data; boundary=' + boundary,
        '--data-binary', '@' + str(multipart_path),
        '--output', str(response_path), '--write-out', '%{http_code}',
        'https://api.cloudflare.com/client/v4/accounts/' + session['account_id'] + '/workers/assets/upload?base64=true'
    ], text=True, capture_output=True)
    if proc.returncode:
        raise SystemExit('Asset transport failed with curl exit ' + str(proc.returncode))
    status = int(proc.stdout)
    try:
        response = json.loads(response_path.read_text())
    except json.JSONDecodeError:
        raise SystemExit('Asset API returned a non-JSON response: HTTP ' + str(status))
    if status not in (200, 201, 202) or not response.get('success'):
        errors = [{'code': e.get('code'), 'message': e.get('message')} for e in response.get('errors', [])]
        raise SystemExit(json.dumps({'status':status,'errors':errors}))
    if response.get('result', {}).get('jwt'):
        completion_path.write_text(json.dumps({'jwt':response['result']['jwt']}))
    row = {'bucket':i + 1,'files':len(bucket),'bytes':count_bytes,'status':status}
    summary.append(row)
    print(json.dumps(row), flush=True)
    multipart_path.unlink()
if not completion_path.exists():
    raise SystemExit('Assets uploaded without completion token; do not deploy')
evidence_path = session_path.parent.parent / 'library-asset-upload-summary.json'
evidence_path.write_text(json.dumps({'complete':True,'uploaded_files':len(requested),'buckets':summary}, indent=2) + '\n')
config_path.unlink()
print(json.dumps({'complete':True,'uploaded_files':len(requested),'evidence':str(evidence_path)}), flush=True)
