"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("./viewer-core.js");

test("all incomplete titles stay searchable and failed scenes remain a separate filter", () => {
  const titles = [
    {index: 68, name: "Book of Bonanza", group: "retry", clip: null},
    {index: 61, name: "Bao Slot 5X", group: "scene", clip: {url: "local"}},
    {index: 74, name: "Samurai", group: "missing", clip: null},
    {index: 62, name: "Jungle Sisters", group: "partial", sceneObserved: true, clip: null}
  ];
  assert.deepEqual(core.filterEntries(titles, "", "retry").map(e => e.index), [61, 62, 68, 74]);
  assert.deepEqual(core.filterEntries(titles, "", "failed").map(e => e.index), [68]);
  assert.equal(core.filterEntries(titles, "BONANZA")[0].index, 68);
  assert.equal(core.filterEntries(titles, "74")[0].name, "Samurai");
  assert.deepEqual(core.filterEntries(titles, "", "motion").map(e => e.index), [61]);
  assert.deepEqual(core.filterEntries(titles, "", "scene").map(e => e.index), [61, 62]);
});

test("recorded control replay excludes ambiguous, older and distant frames", () => {
  const action = {at: "2026-11-13T12:00:00.000Z"};
  const shots = [
    {at: "2026-11-13T11:59:59.999Z"},
    {at: "2026-11-13T12:00:00.050Z", timestampStatus: "ambiguous-reused-file"},
    {at: "2026-11-13T12:00:02.000Z", label: "later real frame"},
    {at: "2026-11-13T12:00:40.000Z"},
    {at: null}
  ];
  const result = core.laterFrame(action, shots);
  assert.equal(result.index, 2);
  assert.equal(result.delayMs, 2000);
  assert.equal(core.laterFrame({at: null}, shots), null);
  assert.equal(core.laterFrame(action, [shots[0], shots[1], shots[3]]), null);
});

test("media URLs cannot navigate to provider servers or arbitrary local paths", () => {
  assert.equal(core.safeMedia("https://provider.example/game.png"), "");
  assert.equal(core.safeMedia("../../private.png"), "");
  assert.equal(core.safeMedia("javascript:alert(1)"), "");
  const path = "media/" + "a".repeat(64) + ".mp4";
  assert.equal(core.safeMedia(path), path);
});

test("checkpoint keeps all partial captures retryable regardless of sample duration", () => {
  const data = {buildId: "fresh", counts: {}, entries: [
    {index: 61, name: "Bao", status: "partial", sampledDurationSeconds: 61.135, completeReferenceCapture: false},
    {index: 68, name: "Bonanza", status: "failed", completeReferenceCapture: false}
  ]};
  const checkpoint = core.checkpoint(data);
  assert.equal(checkpoint.audioCaptured, false);
  assert.ok(checkpoint.entries.every(e => e.retryable));
  assert.equal(checkpoint.entries[0].completeReferenceCapture, false);
  assert.equal(core.seconds(null), "Unavailable");
});

test("attempt checkpoint preserves a recovery and an interrupted attempt without combining duration", () => {
  const current = {index: 13, name: "Fixture", pass: 2, attemptNumber: 3, attemptId: "recovery",
    status: "partial", sampledDurationSeconds: 62.25, completeReferenceCapture: false,
    consoleEvidence: {available: true, availability: "rows-inspected", entryCount: 0},
    alternateAttempts: [{pass: 2, attemptId: "interrupted", status: "capture-interrupted",
      sampledDurationSeconds: 47.5, completeReferenceCapture: false, fullMinuteGameplayVerified: false}]};
  const exported = core.checkpoint({entries: [current]}).entries[0];
  assert.equal(core.attemptLabel(current), "Pass 2 · attempt 3");
  assert.equal(core.attemptLabel({}), "Pass unrecorded · attempt number unrecorded");
  assert.equal(exported.attemptId, "recovery");
  assert.equal(exported.sampledDurationSeconds, 62.25);
  assert.equal(exported.alternateAttempts[0].sampledDurationSeconds, 47.5);
  assert.equal(exported.alternateAttempts[0].attemptNumber, null);
  assert.equal(exported.alternateAttempts[0].fullMinuteGameplayVerified, false);
  assert.equal(exported.durationsCombinedAcrossAttempts, false);
  assert.equal(exported.retryable, true);
  assert.equal(exported.consoleEvidence.entryCount, 0);
});

test("console display distinguishes unavailable, empty scoped rows and replacement-tab-only summaries", () => {
  const missing = core.consoleSummary();
  assert.match(missing.summary, /unavailable/);
  assert.equal(missing.network, "Unavailable");
  const empty = core.consoleSummary({available: true, availability: "rows-inspected", entryCount: 0,
    networkTransportIssueObserved: false, categoryCounts: {}, endInspectionAvailable: false});
  assert.match(empty.summary, /No warn\/error rows retained in the inspected scope/);
  assert.equal(empty.network, "Not in retained rows");
  const audio = core.consoleSummary({available: true, availability: "rows-inspected", entryCount: 1,
    networkTransportIssueObserved: false, audioRuntimeIssueObserved: true, categoryCounts: {"audio-decode-error": 1}});
  assert.equal(audio.audio, "Observed");
  assert.equal(audio.network, "Not in retained rows");
  assert.ok(empty.limits.some(note => /End-of-attempt.*unavailable/.test(note)));
  const replacement = core.consoleSummary({available: true, availability: "summary-only", sourceReportedIssueCount: 58,
    scope: {originalTabConsoleAvailable: false, declaredScope: "Replacement tab only"}});
  assert.match(replacement.summary, /58 reported rows/);
  assert.match(replacement.summary, /detailed console rows are unavailable/);
  assert.ok(replacement.limits.some(note => /cannot establish its history/.test(note)));
  assert.ok(replacement.limits.some(note => /Complete console history is not verified/.test(note)));
});
