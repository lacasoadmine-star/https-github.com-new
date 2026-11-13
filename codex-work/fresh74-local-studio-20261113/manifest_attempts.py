"""Conservative, provider-independent attempt and console metadata normalization.

This module reads local evidence only. It does not contact a provider, control a
browser, infer successful play, or combine media durations from separate attempts.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import re


def parsed_time(value):
    if not isinstance(value, str):
        return None
    try:
        result = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return result if result.tzinfo else result.replace(tzinfo=timezone.utc)
    except (ValueError, OverflowError):
        return None


def positive_integer(value):
    return value if isinstance(value, int) and not isinstance(value, bool) and value > 0 else None


def sanitize_console_text(value):
    text = str(value or '')
    text = re.sub(r'(?i)\b(?:https?|wss?)://[^\s<>"\']+', '[URL omitted]', text)
    text = re.sub(
        r'(?i)\b(access[_-]?token|refresh[_-]?token|token|api[_-]?key|authorization|cookie|password|secret|connectionid)'
        r'\s*[:=]\s*(?:bearer\s+)?[^\s,;]+',
        lambda match: match.group(1) + '=[redacted]', text)
    return text[:2000]


def attempt_context(data):
    return {
        'pass': positive_integer(data.get('pass')),
        'attemptNumber': positive_integer(data.get('attemptNumber')),
        'attemptId': sanitize_console_text(data.get('attemptId')) or None,
        'startedAt': next((data[k] for k in ('startedAt', 'attemptStartedAt') if parsed_time(data.get(k))), None),
        'endedAt': next((data[k] for k in ('endedAt', 'attemptEndedAt', 'finishedAt') if parsed_time(data.get(k))), None),
    }


def candidate_sort_key(candidate):
    """Prefer a finalized attempt, then its recorded time; mtime is a fallback."""
    _, data, source = candidate
    context = attempt_context(data)
    status = str(data.get('status') or '').lower()
    final = bool(status) and not any(s in status for s in ('in-progress', 'pending', 'paused'))
    moment = parsed_time(context['endedAt']) or parsed_time(context['startedAt'])
    timestamp = moment.timestamp() if moment else source.stat().st_mtime if source else 0
    return final, timestamp, context['pass'] or 0, context['attemptNumber'] or 0


def console_category(row):
    original = str(row.get('message', row.get('description', row.get('error', ''))))
    source = str(row.get('source', row.get('url', '')))
    if re.search(r'chrome-extension:|moz-extension:|runtime\.lastError|extension context invalidated', original + ' ' + source, re.I):
        return 'browser-extension-error'
    declared = row.get('category')
    if isinstance(declared, str) and re.fullmatch(r'[a-z][a-z0-9-]{0,79}', declared) and declared not in (
            'provider-console', 'renderer', 'audio', 'network', 'analytics', 'signalr', 'websocket',
            'websockets', 'sse', 'server-sent-events', 'serversentevents', 'longpolling', 'long-polling'):
        return declared
    for pattern, category in (
        (r'CanvasRenderer.*not.*implemented', 'renderer-canvas-not-implemented'),
        (r'WebGL not available', 'renderer-webgl-unavailable'),
        (r'AudioBufferSourceNode|AudioBuffer', 'audio-buffer-invalid-state'),
        (r'Unable to decode audio', 'audio-decode-error'),
        (r'resumeAudioContext|error.*resume.*(?:Web Audio|Audio context)', 'audio-context-runtime-error'),
        (r'WebSockets?.*(?:failed|error)|(?:failed|error).*WebSockets?', 'websocket-transport-error'),
        (r'ServerSentEvents.*(?:failed|error)|(?:failed|error).*ServerSentEvents', 'server-sent-events-transport-error'),
        (r'LongPolling.*(?:failed|error)|(?:failed|error).*LongPolling', 'long-polling-transport-error'),
        (r'Connection has not been fully initialized', 'client-connection-initialization-error'),
        (r'SyntaxError.*JSON|Unexpected end of JSON', 'client-json-parse-error'),
        (r'ReferenceError', 'client-reference-error'),
        (r'TypeError', 'client-type-error'),
        (r'CORS|Content Security Policy', 'browser-request-policy-error'),
        (r'''status (?:code )?(?:of )?["']?[45]\d\d''', 'http-resource-error'),
        (r'net::|network error|network request failed|Failed to fetch|ERR_[A-Z_]+', 'network-error'),
    ):
        if re.search(pattern, original, re.I):
            return category
    return declared if isinstance(declared, str) and re.fullmatch(r'[a-z][a-z0-9-]{0,79}', declared) else 'other-console-error'


def normalize_console_evidence(data, directory):
    """Preserve inspected-empty, unavailable, and truncated histories distinctly.

    Repeated equal rows within one source are retained. Overlapping sources use
    the maximum multiplicity for each timestamp/category/level, with every source
    row reference and differing sanitized message kept. Counts are evidence rows,
    not independently verified unique provider failures.
    """
    directory = Path(directory) if directory is not None else None
    context = attempt_context(data)
    start, end = parsed_time(context['startedAt']), parsed_time(context['endedAt'])
    sources, warnings = [], []
    for filename in ('console-notes.json', 'console-errors.json', 'provider-console.json'):
        if directory is None:
            continue
        path = directory / filename
        if not path.is_file():
            continue
        try:
            rows = json.loads(path.read_text())
        except (OSError, ValueError):
            warnings.append(filename + ' is present but unreadable or invalid JSON.')
            continue
        if isinstance(rows, list):
            sources.append((filename, rows))
        else:
            warnings.append(filename + ' is not a console row array.')
    for key in ('providerConsoleIssues', 'consoleErrors', 'consoleCategories'):
        if isinstance(data.get(key), list):
            sources.append(('metadata.' + key, data[key]))
    # Some capture clients store console rows in errors, alongside tool failures.
    # Only structured rows with a source and a timestamp qualify automatically.
    errors = data.get('errors') if isinstance(data.get('errors'), list) else []
    structured = [row for row in errors if isinstance(row, dict)
                  and isinstance(row.get('message'), str)
                  and (row.get('timestamp') or row.get('at'))
                  and (row.get('source') or row.get('url') or row.get('kind') == 'console')]
    if structured:
        sources.append(('metadata.errors.console-rows', structured))

    entries, slots, source_counts = [], {}, []
    before = after = extension = malformed = unknown_time = 0
    for source_name, rows in sources:
        occurrence = Counter()
        counts = Counter(rawRows=len(rows))
        for ordinal, row in enumerate(rows):
            if not isinstance(row, dict):
                counts['malformedRowsExcluded'] += 1
                malformed += 1
                continue
            at = row.get('at', row.get('timestamp'))
            moment = parsed_time(at)
            if start and moment and moment < start:
                before += 1
                counts['priorAttemptRowsExcluded'] += 1
                continue
            if end and moment and moment > end:
                after += 1
                counts['laterRowsExcluded'] += 1
                continue
            category = console_category(row)
            if category == 'browser-extension-error':
                extension += 1
                counts['extensionRowsExcluded'] += 1
                continue
            if not moment:
                unknown_time += 1
                counts['unknownTimestampRowsRetained'] += 1
            level = row.get('level') if row.get('level') in ('error', 'warn', 'warning', 'info', 'debug', 'log') else 'error'
            message = sanitize_console_text(row.get('message', row.get('description', row.get('error', ''))))
            timestamp = at if isinstance(at, str) else None
            signature = (timestamp, category, level)
            occurrence[signature] += 1
            key = (signature, occurrence[signature])
            source_ref = {'source': source_name, 'rowIndex': ordinal}
            if key in slots:
                existing = entries[slots[key]]
                existing['sourceRows'].append(source_ref)
                if message and message != existing.get('message'):
                    if not existing.get('message'):
                        existing['message'] = message
                    elif message not in existing.setdefault('additionalSanitizedMessages', []):
                        existing['additionalSanitizedMessages'].append(message)
            else:
                slots[key] = len(entries)
                entry = {'at': timestamp, 'category': category, 'level': level,
                         'timestampScope': 'within-recorded-boundaries' if moment and start else 'source-scope-unverified',
                         'sourceRows': [source_ref]}
                if isinstance(row.get('category'), str):
                    entry['sourceCategory'] = sanitize_console_text(row['category'])
                if message:
                    entry['message'] = message
                entries.append(entry)
            counts['retainedRows'] += 1
        source_counts.append({'source': source_name, **dict(counts)})
    inspection = data.get('consoleEvidence') if isinstance(data.get('consoleEvidence'), dict) else {}
    reported = next((data[k] for k in ('providerConsoleIssueCount', 'providerIssueCount')
                     if isinstance(data.get(k), int) and not isinstance(data[k], bool) and data[k] >= 0), None)
    available = bool(sources) or inspection.get('available') is True or reported is not None
    categories = Counter(row['category'] for row in entries)
    result = {
        'available': available,
        'availability': 'rows-inspected' if sources else 'summary-only' if available else 'not-recorded',
        'entries': entries,
        'entryCount': len(entries) if sources else None,
        'categoryCounts': dict(categories) if sources else None,
        'sourceReportedIssueCount': reported,
        'sources': source_counts,
        'scope': {
            'startedAt': context['startedAt'], 'endedAt': context['endedAt'],
            'startBoundaryAvailable': start is not None,
            'priorAttemptRowsExcluded': before, 'laterRowsExcluded': after,
            'extensionRowsExcluded': extension, 'malformedRowsExcluded': malformed,
            'unknownTimestampSourceRowsRetained': unknown_time,
            'declaredScope': sanitize_console_text(data.get('consoleScope', inspection.get('scope'))) or None,
            'originalTabConsoleAvailable': data.get('originalTabConsoleAvailable') if isinstance(data.get('originalTabConsoleAvailable'), bool) else None,
        },
        'inspectedAt': next((value for value in (data.get('consoleInspectedAt'), inspection.get('readAt')) if parsed_time(value)), None),
        'endInspectionAvailable': False if data.get('consoleEndInspectionUnavailable') is True else None,
        'requestedLimit': positive_integer(inspection.get('requestedLimit')),
        'sourceReturnedRows': inspection.get('returnedRows') if isinstance(inspection.get('returnedRows'), int) and not isinstance(inspection.get('returnedRows'), bool) and inspection.get('returnedRows') >= 0 else None,
        'completeHistoryVerified': False,
        'networkTransportIssueObserved': any(c in categories for c in (
            'websocket-transport-error', 'server-sent-events-transport-error', 'long-polling-transport-error', 'network-error')) if sources else None,
        'rendererIssueObserved': any(c.startswith('renderer-') for c in categories) if sources else None,
        'audioRuntimeIssueObserved': any(c.startswith('audio-') for c in categories) if sources else None,
        'sourceClaims': {key: data[key] for key in ('networkErrorObserved', 'rendererErrorObserved', 'audioRuntimeErrorObserved') if isinstance(data.get(key), bool)},
        'warnings': warnings,
        'interpretation': 'Only retained console evidence is described. Empty rows do not establish error-free operation; counts are not unique provider failures. Generic error text does not establish a proxy, provider, or network root cause.',
    }
    return result
