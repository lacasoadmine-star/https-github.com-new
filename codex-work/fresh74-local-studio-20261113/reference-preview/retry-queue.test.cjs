"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const retry = require("./retry-queue.js");
const core = require("./viewer-core.js");
function catalogue() {
  return Array.from({length: 74}, (_, i) => ({index: i + 1, name: `Game ${i + 1}`,
    status: i < 59 ? "partial-visual-capture" : i < 61 ? "partial-render" : "renderer-error",
    group: i < 59 ? "scene" : i < 61 ? "partial" : "retry", sceneObserved: i < 59,
    attempted: true, finishedAttempt: true, completeReferenceCapture: false}));
}

test("59 scenes plus 2 partial renders plus 13 failures all remain in the 74-title retry sequence", () => {
  const entries = catalogue(), queue = retry.create(entries, {now: 1000, runId: "fixture"});
  assert.equal(core.filterEntries(entries, "", "retry").length, 74);
  assert.equal(core.filterEntries(entries, "", "failed").length, 13);
  assert.deepEqual(queue.items.map(e => e.index), Array.from({length: 74}, (_, i) => i + 1));
  assert.equal(retry.summary(queue).incompleteAtQueueStart, 74);
  assert.ok(queue.items.every(e => e.incompleteAtQueueStart));
  assert.equal(retry.current(queue, 1000).index, 1);
});

test("next visits catalogue order through 74 without changing source capture states", () => {
  const entries = catalogue().reverse(), queue = retry.create(entries, {now: 1000});
  for (let index = 1; index <= 74; index++) {
    assert.equal(retry.current(queue, 1000 + index).index, index);
    retry.activate(queue, 1000 + index);
    retry.advance(queue, 2000 + index);
  }
  assert.equal(retry.current(queue, 4000), null);
  assert.equal(retry.summary(queue).positionsAdvanced, 74);
  assert.equal(retry.summary(queue).verifiedNewCaptureAttempts, 0);
  assert.equal(retry.summary(queue).providerRequestsMade, 0);
  for (const item of queue.items) {
    assert.equal(item.sourceStatus, entries.find(e => e.index === item.index).status);
    assert.equal(item.sourceCompleteReferenceCapture, false);
    assert.equal(item.incompleteAtQueueStart, true);
  }
});

test("a saved active or interrupted title resumes at the same catalogue entry", () => {
  const entries = catalogue(), queue = retry.create(entries, {now: 1000});
  retry.activate(queue, 1000); retry.advance(queue, 1100); retry.activate(queue, 1200);
  const restored = retry.restore(retry.serialize(queue), entries, 2000);
  assert.equal(retry.current(restored, 2000).index, 2);
  assert.equal(retry.current(restored, 2000).state, "interrupted");
  retry.activate(restored, 2000);
  assert.equal(retry.current(restored, 2000).index, 2);
  retry.interrupt(restored, 2100, "manual-pause");
  const again = retry.restore(retry.serialize(restored), entries, 3000);
  assert.equal(retry.current(again, 3000).index, 2);
  assert.equal(retry.summary(again).positionsAdvanced, 1);
});

test("transient retries are bounded per title and exhausted titles stay incomplete", () => {
  const queue = retry.create(catalogue(), {now: 0, maxNetworkRetries: 3});
  let time = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    retry.activate(queue, time);
    retry.networkFailure(queue, time + 1);
    if (attempt < 3) {
      assert.equal(retry.current(queue, time + 1).index, 1);
      assert.throws(() => retry.activate(queue, time + 1), /delay/);
      time = queue.items[0].nextEligibleAt;
    }
  }
  assert.equal(queue.items[0].networkFailures, 4);
  assert.equal(queue.items[0].state, "deferred-network-limit");
  assert.equal(queue.items[0].sourceCompleteReferenceCapture, false);
  assert.equal(retry.current(queue, time + 2).index, 2);
  assert.equal(queue.items[1].networkFailures, 0);
  assert.equal(retry.summary(queue).verifiedNewCaptureAttempts, 0);
});

test("an access-block observation pauses for manual review and cannot trigger automatic continuation", () => {
  const queue = retry.create(catalogue(), {now: 1000});
  retry.activate(queue, 1000); retry.networkFailure(queue, 1001, "access-block");
  assert.equal(retry.current(queue, 2000).state, "paused");
  assert.throws(() => retry.activate(queue, 2000), /Manual review/);
  assert.throws(() => retry.advance(queue, 2000), /Manual review/);
  retry.acknowledgeReview(queue, 2100);
  assert.equal(retry.current(queue, 2100).index, 1);
  assert.equal(queue.items[0].networkFailures, 0);
});

test("checkpoints fail closed on truncation, inventory mismatch, fabricated capture claims or wrong active cursor", () => {
  const entries = catalogue(), queue = retry.create(entries, {now: 1000});
  const valid = retry.serialize(queue);
  assert.throws(() => retry.restore(valid.slice(0, 50), entries, 2000));
  const wrong = JSON.parse(valid); wrong.verifiedNewCaptureAttempts = 74;
  assert.throws(() => retry.restore(JSON.stringify(wrong), entries, 2000), /cannot claim/);
  const moved = JSON.parse(valid); moved.items[5].state = "active";
  assert.throws(() => retry.restore(JSON.stringify(moved), entries, 2000), /cursor/);
  const renamed = catalogue(); renamed[0].name = "Another title";
  assert.throws(() => retry.restore(valid, renamed, 2000), /does not match/);
  const excluded = JSON.parse(valid); excluded.items[0].incompleteAtQueueStart = false; excluded.items[0].sourceCompleteReferenceCapture = true;
  assert.throws(() => retry.restore(JSON.stringify(excluded), entries, 2000), /cannot exclude/);
  const payload = JSON.parse(valid); payload.credentials = {token: "fixture"};
  assert.throws(() => retry.restore(JSON.stringify(payload), entries, 2000), /Unexpected/);
  const skipped = JSON.parse(valid); skipped.cursor = 5;
  assert.throws(() => retry.restore(JSON.stringify(skipped), entries, 2000), /skip/);
});
