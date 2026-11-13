#!/usr/bin/env python3
"""Package immutable fresh evidence, with per-file hashes and no inferred timing."""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile
import zipfile
import zlib

README = '''# Original capture evidence

These files are the source screenshots and capture/timing notes selected by the manifest.
INDEX.json records their paths and SHA-256 hashes. Screenshot bytes are unchanged.
Selected and alternate attempts are packaged separately with their own provenance.
Repeated source paths are stored once and referenced by each applicable attempt.
SOURCE-MANIFEST.json preserves the exact manifest used to select these sources.

Sample sequences are sparse screenshot captures, not continuous screen recordings.
Wall-clock interaction windows do not establish one minute of active gameplay.
This packager does not verify active gameplay, audio, mobile input or complete captures.
Read the independent attempt records for observed coverage and limitations. Any demo
balances visible in source images are reference pixels, not imported account state.

This archive preserves source images and notes for verification or rebuilding.
Derived viewer media and interactive prototypes, if supplied, are separate artifacts.
'''

PROVENANCE_FIELDS = (
    'pass', 'attemptId', 'attemptNumber', 'recoversDirectory', 'status',
    'finishedAttempt', 'startedAt', 'endedAt', 'attemptStartedAt',
    'attemptEndedAt', 'capturedAt', 'finishedAt', 'surface',
)
METADATA_FILENAMES = ('capture.json', 'attempt.json', 'observation.json')


def contained_path(root, raw):
    """Resolve aliases before checking containment, including file symlinks."""
    if not isinstance(raw, (str, Path)) or not str(raw):
        raise ValueError('Evidence source path is missing')
    candidate = Path(raw)
    candidate = candidate if candidate.is_absolute() else root / candidate
    resolved = candidate.resolve(strict=True)
    if not resolved.is_relative_to(root):
        raise ValueError('Evidence source is outside evidence root: ' + str(candidate))
    return resolved


def provenance(data):
    return {key: data[key] for key in PROVENANCE_FIELDS if key in data}


def source_attempts(root, entry):
    """Union directory-only and full alternate records without losing either."""
    attempts = {}

    def register(raw, role, reference, data=None):
        directory = contained_path(root, raw)
        if directory == root or not directory.is_dir():
            raise ValueError('Expected an attempt directory beneath evidence root: ' + str(directory))
        record = attempts.setdefault(directory, {
            'directory': str(directory), 'roles': [], 'declaredDirectories': [],
            'manifestReferences': [], 'manifestProvenance': [],
        })
        for key, value in (('roles', role), ('declaredDirectories', str(raw)), ('manifestReferences', reference)):
            if value not in record[key]:
                record[key].append(value)
        if data is not None:
            declared = {'reference': reference, **provenance(data)}
            if declared not in record['manifestProvenance']:
                record['manifestProvenance'].append(declared)
        return record

    def visit(node, role, reference):
        if not isinstance(node, dict):
            raise ValueError('Attempt record must be an object: ' + reference)
        register(node.get('directory'), role, reference + '.directory', node)
        for field in ('alternateDirectories', 'alternateAttempts', 'supplementalAttempts'):
            values = node.get(field, [])
            if not isinstance(values, list):
                raise ValueError(field + ' must be a list')
            for number, value in enumerate(values):
                location = f'{reference}.{field}[{number}]'
                child_role = 'supplemental' if field == 'supplementalAttempts' else 'alternate'
                if isinstance(value, str):
                    register(value, child_role, location)
                else:
                    visit(value, child_role, location)

    visit(entry, 'selected', f'entries[index={entry["index"]}]')
    return list(attempts.values())


def evidence_files(root, directory):
    """Enumerate actual sources once, rejecting escapes through nested symlinks."""
    pending, visited, files = [Path(directory)], set(), set()
    while pending:
        current = contained_path(root, pending.pop())
        if current == root:
            raise ValueError('An attempt must not traverse the whole evidence root')
        if current in visited:
            continue
        visited.add(current)
        for candidate in sorted(current.iterdir()):
            path = contained_path(root, candidate)
            if path.is_dir():
                pending.append(path)
            elif path.is_file():
                files.add(path)
            else:
                raise ValueError('Unsupported non-file evidence source: ' + str(candidate))
    return sorted(files)


def byte_identity(data):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
            'crc32': f'{zlib.crc32(data) & 0xffffffff:08x}'}


def verify_archive(filename, expected):
    """Check every member against the bytes read from its source, not only ZIP CRC."""
    with zipfile.ZipFile(filename) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or set(names) != set(expected):
            raise ValueError('Archive contains duplicate, missing or unexpected members')
        for name, original in expected.items():
            digest, checksum, size = hashlib.sha256(), 0, 0
            with archive.open(name) as stream:
                for part in iter(lambda: stream.read(1024 * 1024), b''):
                    digest.update(part)
                    checksum = zlib.crc32(part, checksum)
                    size += len(part)
            info = archive.getinfo(name)
            if (size != original['bytes'] or digest.hexdigest() != original['sha256']
                    or f'{checksum & 0xffffffff:08x}' != original['crc32']
                    or info.CRC != int(original['crc32'], 16)):
                raise ValueError('Archive source hash/CRC verification failed: ' + name)


def file_digest(filename):
    digest = hashlib.sha256()
    with filename.open('rb') as stream:
        for part in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(part)
    return digest.hexdigest()


def package(root, first, last, output):
    root, output = Path(root).resolve(strict=True), Path(output).resolve()
    if first > last:
        raise ValueError('Requested catalogue range is reversed')
    manifest_path = contained_path(root, 'manifest-74.json')
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    selected = [e for e in manifest['entries'] if first <= e['index'] <= last]
    if sorted(e['index'] for e in selected) != list(range(first, last + 1)) or any(not e.get('finishedAttempt') for e in selected):
        raise ValueError('Every requested title must have a finalized capture attempt')
    summary_path = output.with_suffix('.summary.json')
    if output.exists() or summary_path.exists():
        raise FileExistsError('Existing archive or summary is preserved; choose a new output path')
    planned = []
    for entry in selected:
        attempts = source_attempts(root, entry)
        for attempt in attempts:
            directory = Path(attempt['directory'])
            if output.is_relative_to(directory) or summary_path.is_relative_to(directory):
                raise ValueError('Archive output must be outside every source attempt directory')
            attempt['_paths'] = evidence_files(root, directory)
        planned.append((entry, attempts))
    output.parent.mkdir(parents=True, exist_ok=True)
    index = {'schemaVersion':2,'captureSession':manifest.get('captureSession', manifest.get('catalogueCapturedAt')),'firstIndex':first,'lastIndex':last,
             'originalBytesUnmodified':True,'audioCaptured':False,'nativeContinuousVideo':False,
             'completeReferenceCapture':False,
             'sourceManifest':{'path':str(manifest_path),'archivePath':'SOURCE-MANIFEST.json',**byte_identity(manifest_bytes)},
             'attemptDurationsCombined':False,'entries':[]}
    expected, sources = {}, {}
    with tempfile.NamedTemporaryFile(prefix=output.name + '.', suffix='.partial', dir=output.parent, delete=False) as stream:
        pending = Path(stream.name)
    try:
        with zipfile.ZipFile(pending,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=3,allowZip64=True) as archive:
            def write(name, data):
                if name in expected:
                    raise ValueError('Duplicate archive member: ' + name)
                identity = byte_identity(data)
                archive.writestr(name, data)
                expected[name] = identity
                return {'path': name, **identity}

            write('RAW-EVIDENCE-README.md', README.encode('utf-8'))
            write('SOURCE-MANIFEST.json', manifest_bytes)
            for entry, attempts in planned:
                record = {k:entry.get(k) for k in ('index','name','status','officialDemoUrl','directory')}
                record.update({'attempts':[], 'files':[]})
                entry_files = {}
                for attempt in attempts:
                    paths = attempt.pop('_paths')
                    attempt['files'], attempt['metadataSources'] = [], []
                    for path in paths:
                        # Recheck after planning so a changed symlink cannot escape the root.
                        if contained_path(root, path) != path:
                            raise ValueError('Evidence source path changed while packaging: ' + str(path))
                        if path not in sources:
                            data = path.read_bytes()
                            sources[path] = {**write('sources/' + path.relative_to(root).as_posix(), data),
                                             'sourcePath':str(path)}
                        member = sources[path]
                        attempt['files'].append(member['path'])
                        entry_files[member['path']] = member
                        if path.parent == Path(attempt['directory']) and path.name in METADATA_FILENAMES:
                            data = path.read_bytes()
                            if byte_identity(data)['sha256'] != member['sha256']:
                                raise ValueError('Attempt metadata changed while packaging: ' + str(path))
                            decoded = json.loads(data)
                            if not isinstance(decoded, dict):
                                raise ValueError('Attempt metadata must be a JSON object: ' + str(path))
                            attempt['metadataSources'].append({**member, 'provenance':provenance(decoded)})
                    record['attempts'].append(attempt)
                record['files'] = sorted(entry_files.values(), key=lambda row: row['path'])
                index['entries'].append(record)
            write('INDEX.json', (json.dumps(index,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
        verify_archive(pending, expected)
        if output.exists() or summary_path.exists():
            raise FileExistsError('Output appeared during packaging; existing output preserved')
        pending.replace(output)
    finally:
        pending.unlink(missing_ok=True)
    summary = {'file':str(output),'games':len(selected),'sourceFiles':len(sources),
               'attemptDirectories':len({a['directory'] for _, attempts in planned for a in attempts}),
               'alternateAttemptsIncluded':sum('alternate' in a['roles'] for _, attempts in planned for a in attempts),
               'bytes':output.stat().st_size,'sha256':file_digest(output),
               'crcVerified':True,'sourceHashesVerified':True,'allArchiveMembersVerified':True,
               'sourceManifestSha256':index['sourceManifest']['sha256'],'schemaVersion':2}
    summary_path.write_text(json.dumps(summary,indent=2)+'\n')
    return summary

if __name__ == '__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--root',required=True)
    p.add_argument('--first',type=int,required=True)
    p.add_argument('--last',type=int,required=True)
    p.add_argument('--output',required=True)
    args=p.parse_args()
    print(json.dumps(package(args.root,args.first,args.last,args.output)))
