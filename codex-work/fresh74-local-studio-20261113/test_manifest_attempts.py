import json
import os
from pathlib import Path
import tempfile
import unittest

from manifest_attempts import attempt_context, candidate_sort_key, normalize_console_evidence, sanitize_console_text


class ConsoleNormalizationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.data = {'pass': 2, 'attemptNumber': 3, 'attemptId': 'fixture-attempt',
                     'startedAt': '2030-01-01T12:00:00Z', 'endedAt': '2030-01-01T12:01:00Z'}

    def tearDown(self):
        self.temp.cleanup()

    def test_absent_empty_and_summary_only_are_distinct(self):
        absent = normalize_console_evidence(self.data, self.root)
        self.assertFalse(absent['available'])
        self.assertIsNone(absent['entryCount'])
        self.assertIsNone(absent['networkTransportIssueObserved'])
        (self.root / 'console-notes.json').write_text('[]')
        empty = normalize_console_evidence(self.data, self.root)
        self.assertTrue(empty['available'])
        self.assertEqual(empty['entryCount'], 0)
        self.assertFalse(empty['completeHistoryVerified'])
        (self.root / 'console-notes.json').unlink()
        summary = normalize_console_evidence({**self.data, 'providerConsoleIssueCount': 8}, self.root)
        self.assertEqual(summary['availability'], 'summary-only')
        self.assertEqual(summary['sourceReportedIssueCount'], 8)
        self.assertIsNone(summary['entryCount'])

    def test_reused_tab_prior_and_later_errors_are_excluded(self):
        rows = [
            {'at': '2030-01-01T11:59:59Z', 'message': 'WebSocket failed'},
            {'at': '2030-01-01T12:00:12Z', 'message': 'AudioBufferSourceNode InvalidStateError'},
            {'at': '2030-01-01T12:01:01Z', 'message': 'network error'},
        ]
        result = normalize_console_evidence({**self.data, 'providerConsoleIssues': rows}, self.root)
        self.assertEqual(result['entryCount'], 1)
        self.assertEqual(result['categoryCounts'], {'audio-buffer-invalid-state': 1})
        self.assertFalse(result['networkTransportIssueObserved'])
        self.assertEqual(result['scope']['priorAttemptRowsExcluded'], 1)
        self.assertEqual(result['scope']['laterRowsExcluded'], 1)

    def test_transport_renderer_audio_and_client_issues_remain_separate(self):
        messages = ['WebSocket failed to connect', 'CanvasRenderer is not yet implemented',
                    'AudioBufferSourceNode buffer already set', 'Uncaught SyntaxError: Unexpected end of JSON input',
                    'Uncaught ReferenceError: game is not defined']
        rows = [{'at': '2030-01-01T12:00:10Z', 'message': value} for value in messages]
        result = normalize_console_evidence({**self.data, 'providerConsoleIssues': rows}, self.root)
        self.assertEqual(set(result['categoryCounts']), {'websocket-transport-error', 'renderer-canvas-not-implemented',
                                                       'audio-buffer-invalid-state', 'client-json-parse-error', 'client-reference-error'})
        self.assertTrue(result['networkTransportIssueObserved'])
        self.assertTrue(result['audioRuntimeIssueObserved'])
        self.assertTrue(result['rendererIssueObserved'])
        self.assertNotIn('proxy', result['entries'][0])

    def test_structured_error_rows_preserved_and_secret_urls_removed(self):
        rows = [{'timestamp': '2030-01-01T12:00:20Z', 'source': 'https://provider.test/lib.js',
                 'message': 'Failed to fetch https://provider.test/path?Token=PRIVATE Token=ANOTHER authorization=Bearer TOPSECRET'},
                'Page.getLayoutMetrics timed out']
        result = normalize_console_evidence({**self.data, 'errors': rows}, self.root)
        self.assertEqual(result['entryCount'], 1)
        serialized = json.dumps(result)
        for secret in ['PRIVATE', 'ANOTHER', 'TOPSECRET', 'https://provider.test']:
            self.assertNotIn(secret, serialized)
        self.assertEqual(result['entries'][0]['category'], 'network-error')

    def test_duplicate_rows_within_source_preserved_cross_source_not_doubled(self):
        row = {'at': '2030-01-01T12:00:20Z', 'message': 'ReferenceError: fixture is not defined'}
        (self.root / 'console-notes.json').write_text(json.dumps([row, row, row]))
        data = {**self.data, 'consoleCategories': [{'at': row['at'], 'category': 'client-reference-error'}] * 3}
        result = normalize_console_evidence(data, self.root)
        self.assertEqual(result['entryCount'], 3)
        self.assertEqual(result['categoryCounts']['client-reference-error'], 3)
        self.assertTrue(all(len(entry['sourceRows']) == 2 for entry in result['entries']))

    def test_unknown_timestamps_and_unavailable_end_inspection_remain_explicit(self):
        data = {**self.data, 'consoleCategories': [{'category': 'network-error'}], 'consoleEndInspectionUnavailable': True}
        result = normalize_console_evidence(data, self.root)
        self.assertEqual(result['entries'][0]['timestampScope'], 'source-scope-unverified')
        self.assertFalse(result['endInspectionAvailable'])
        self.assertFalse(result['completeHistoryVerified'])

    def test_provider_console_file_preserves_source_labels_and_classifies_actual_text(self):
        rows = [
            {'timestamp': '2030-01-01T12:00:11Z', 'category': 'renderer', 'message': 'CanvasRenderer is not yet implemented'},
            {'timestamp': '2030-01-01T12:00:12Z', 'category': 'provider-console', 'message': 'Unable to decode audio data'},
            {'timestamp': '2030-01-01T12:00:13Z', 'category': 'SignalR', 'message': 'at WebSocketTransport.start (https://fixture.test/lib.js)'},
            {'timestamp': '2030-01-01T12:00:14Z', 'category': 'signalr', 'message': 'WebSocket failed to connect'},
            {'timestamp': '2030-01-01T12:00:15Z', 'category': 'network', 'message': "Failed to start the transport 'ServerSentEvents': Failed to fetch"},
            {'timestamp': '2030-01-01T12:00:16Z', 'category': 'signalr', 'message': "Failed to start the transport 'LongPolling': Status code '404'"},
        ]
        (self.root / 'provider-console.json').write_text(json.dumps(rows))
        result = normalize_console_evidence(self.data, self.root)
        self.assertEqual(result['entryCount'], 6)
        self.assertEqual(result['entries'][0]['sourceCategory'], 'renderer')
        self.assertEqual(result['entries'][0]['category'], 'renderer-canvas-not-implemented')
        self.assertEqual(result['entries'][1]['category'], 'audio-decode-error')
        self.assertEqual(result['entries'][2]['category'], 'other-console-error')
        self.assertEqual(result['categoryCounts']['websocket-transport-error'], 1)
        self.assertEqual(result['categoryCounts']['server-sent-events-transport-error'], 1)
        self.assertEqual(result['categoryCounts']['long-polling-transport-error'], 1)
        self.assertTrue(result['networkTransportIssueObserved'])
        self.assertNotIn('https://', json.dumps(result))
        (self.root / 'provider-console.json').write_text(json.dumps([
            {'timestamp': '2030-01-01T12:00:13Z', 'category': 'javascript-stack',
             'message': 'at WebSocketTransport.start (https://fixture.test/SignalR.js)'}]))
        stack_only = normalize_console_evidence(self.data, self.root)
        self.assertFalse(stack_only['networkTransportIssueObserved'])
        self.assertEqual(stack_only['entries'][0]['sourceCategory'], 'javascript-stack')

    def test_replacement_tab_inspection_does_not_imply_original_tab_history(self):
        data = {**self.data, 'providerConsoleIssueCount': 4,
                'consoleScope': 'Replacement tab only; original tab unavailable.',
                'originalTabConsoleAvailable': False}
        result = normalize_console_evidence(data, self.root)
        self.assertEqual(result['availability'], 'summary-only')
        self.assertFalse(result['scope']['originalTabConsoleAvailable'])
        self.assertIn('Replacement tab only', result['scope']['declaredScope'])
        self.assertIsNone(result['entryCount'])
        self.assertFalse(result['completeHistoryVerified'])

    def test_extension_is_excluded_but_provider_metadata_error_is_retained(self):
        data = {**self.data, 'providerConsoleIssues': [
            {'at': '2030-01-01T12:00:11Z', 'message': 'failure', 'source': 'chrome-extension://fixture/script.js'},
            {'at': '2030-01-01T12:00:12Z', 'message': 'ReferenceError: metadata is not defined'},
        ]}
        result = normalize_console_evidence(data, self.root)
        self.assertEqual(result['entryCount'], 1)
        self.assertEqual(result['scope']['extensionRowsExcluded'], 1)

    def test_corrupt_file_is_not_treated_as_inspected_empty(self):
        (self.root / 'console-notes.json').write_text('{interrupted')
        result = normalize_console_evidence({**self.data, 'errors': None}, self.root)
        self.assertFalse(result['available'])
        self.assertIsNone(result['entryCount'])
        self.assertEqual(len(result['warnings']), 1)

    def test_recorded_attempt_time_beats_file_mtime_and_final_beats_active(self):
        candidates = []
        for number, end, status, mtime in [(1, '2030-01-01T12:01:00Z', 'partial-capture', 300),
                                            (2, '2030-01-01T13:01:00Z', 'partial-capture', 100),
                                            (3, '2030-01-01T14:01:00Z', 'in-progress', 400)]:
            p = self.root / str(number)
            p.write_text('{}')
            os.utime(p, (mtime, mtime))
            candidates.append((self.root, {**self.data, 'attemptNumber': number, 'endedAt': end, 'status': status}, p))
        ordered = sorted(candidates, key=candidate_sort_key, reverse=True)
        self.assertEqual([c[1]['attemptNumber'] for c in ordered], [2, 1, 3])

    def test_attempt_context_preserves_pass_without_inventing_missing_fields(self):
        self.assertEqual(attempt_context(self.data)['pass'], 2)
        self.assertEqual(attempt_context(self.data)['attemptNumber'], 3)
        self.assertIsNone(attempt_context({})['pass'])
        self.assertIsNone(attempt_context({'pass': True})['pass'])
        self.assertIsNone(attempt_context({'startedAt': 'not-a-time'})['startedAt'])
        self.assertEqual(sanitize_console_text('wss://example.test/?token=PRIVATE password=SECRET'), '[URL omitted] password=[redacted]')


if __name__ == '__main__':
    unittest.main()
