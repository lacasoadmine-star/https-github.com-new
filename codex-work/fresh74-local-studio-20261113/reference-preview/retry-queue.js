(function (scope) {
  "use strict";
  const STATES = new Set(["pending", "active", "interrupted", "retry-pending", "paused", "advanced-unverified", "deferred-network-limit"]);
  const MAX_EVENTS = 1200;
  const TOP_KEYS = new Set(["schemaVersion", "runId", "sourceBuildId", "catalogueCapturedAt", "createdAt", "updatedAt", "pass", "cursor", "maxNetworkRetries", "providerRequestsMade", "verifiedNewCaptureAttempts", "bookkeepingOnly", "nextEventSequence", "olderEventsOmitted", "events", "items"]);
  const ITEM_KEYS = new Set(["index", "name", "sourceStatus", "sourceCompleteReferenceCapture", "incompleteAtQueueStart", "state", "activations", "networkFailures", "nextEligibleAt", "activatedAt", "lastEventAt", "interruptionReason", "queueOutcome"]);
  const EVENT_KEYS = new Set(["sequence", "at", "type", "inventoryCount", "incompleteCount", "index", "verifiedNewCaptureAttempt", "reason", "sourceCaptureStillIncomplete", "classification", "requestDispatched", "failureCount", "providerRequestAuthorizedByQueue"]);
  const copy = value => JSON.parse(JSON.stringify(value));
  const timestamp = value => {
    const number = value === undefined ? Date.now() : Number(value);
    if (!Number.isFinite(number) || number < 0) throw new Error("Invalid queue time");
    return number;
  };
  function inventory(entries) {
    if (!Array.isArray(entries) || entries.length !== 74) throw new Error("Retry inventory must contain all 74 catalogue titles");
    const ordered = [...entries].sort((a, b) => a.index - b.index);
    if (ordered.some((entry, i) => entry.index !== i + 1 || typeof entry.name !== "string" || !entry.name)) throw new Error("Catalogue indices must be exactly 1 through 74");
    return ordered;
  }
  function event(queue, type, now, details = {}) {
    queue.updatedAt = new Date(now).toISOString();
    queue.events.push({sequence: queue.nextEventSequence++, at: queue.updatedAt, type, ...details});
    if (queue.events.length > MAX_EVENTS) {
      queue.events.shift();
      queue.olderEventsOmitted += 1;
    }
  }
  function create(entries, options = {}) {
    const ordered = inventory(entries), now = timestamp(options.now);
    const maxNetworkRetries = options.maxNetworkRetries === undefined ? 3 : options.maxNetworkRetries;
    if (!Number.isInteger(maxNetworkRetries) || maxNetworkRetries < 0 || maxNetworkRetries > 5) throw new Error("Network retry limit must be between 0 and 5");
    const queue = {
      schemaVersion: 1, runId: options.runId || `retry-${now}-${Math.random().toString(36).slice(2, 10)}`,
      sourceBuildId: options.sourceBuildId || null, catalogueCapturedAt: options.catalogueCapturedAt || null,
      createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(),
      pass: options.pass || 1, cursor: 0, maxNetworkRetries,
      providerRequestsMade: 0, verifiedNewCaptureAttempts: 0,
      bookkeepingOnly: true, nextEventSequence: 1, olderEventsOmitted: 0, events: [],
      items: ordered.map(entry => ({index: entry.index, name: entry.name,
        sourceStatus: entry.status || "unknown", sourceCompleteReferenceCapture: entry.completeReferenceCapture === true,
        incompleteAtQueueStart: entry.completeReferenceCapture !== true,
        state: "pending", activations: 0, networkFailures: 0, nextEligibleAt: null,
        activatedAt: null, lastEventAt: null, interruptionReason: null, queueOutcome: null}))
    };
    event(queue, "queue-created", now, {inventoryCount: 74, incompleteCount: queue.items.filter(i => i.incompleteAtQueueStart).length});
    seekIncomplete(queue);
    return queue;
  }
  function seekIncomplete(queue) {
    while (queue.cursor < queue.items.length && !queue.items[queue.cursor].incompleteAtQueueStart) queue.cursor += 1;
  }
  function validate(queue) {
    if (!queue || queue.schemaVersion !== 1 || queue.bookkeepingOnly !== true || typeof queue.runId !== "string" || !queue.runId) throw new Error("Invalid retry checkpoint");
    inventory(queue.items);
    if (Object.keys(queue).some(key => !TOP_KEYS.has(key)) || !Number.isInteger(queue.pass) || queue.pass < 1) throw new Error("Unexpected retry checkpoint fields");
    if ([queue.sourceBuildId, queue.catalogueCapturedAt].some(value => value !== null && typeof value !== "string") || !Number.isFinite(Date.parse(queue.createdAt)) || !Number.isFinite(Date.parse(queue.updatedAt))) throw new Error("Invalid retry checkpoint identity");
    if (!Number.isInteger(queue.cursor) || queue.cursor < 0 || queue.cursor > 74 || !Number.isInteger(queue.maxNetworkRetries) || queue.maxNetworkRetries < 0 || queue.maxNetworkRetries > 5) throw new Error("Invalid retry checkpoint position or bounds");
    if (!Array.isArray(queue.events) || queue.events.length > MAX_EVENTS || !Number.isInteger(queue.nextEventSequence) || queue.nextEventSequence < 1 || !Number.isInteger(queue.olderEventsOmitted) || queue.olderEventsOmitted < 0) throw new Error("Invalid retry checkpoint events");
    if (queue.providerRequestsMade !== 0 || queue.verifiedNewCaptureAttempts !== 0) throw new Error("A bookkeeping checkpoint cannot claim live provider requests or verified captures");
    queue.items.forEach((item, i) => {
      if (Object.keys(item).some(key => !ITEM_KEYS.has(key)) || item.name.length > 160) throw new Error("Unexpected retry item fields");
      if (item.index !== i + 1 || !STATES.has(item.state) || !Number.isInteger(item.networkFailures) || item.networkFailures < 0 || item.networkFailures > queue.maxNetworkRetries + 1 || !Number.isInteger(item.activations) || item.activations < 0 || typeof item.incompleteAtQueueStart !== "boolean" || typeof item.sourceCompleteReferenceCapture !== "boolean" || typeof item.sourceStatus !== "string") throw new Error("Invalid retry item");
      if (item.incompleteAtQueueStart === item.sourceCompleteReferenceCapture) throw new Error("Source completion flag was changed");
      if ([item.activatedAt, item.lastEventAt, item.interruptionReason, item.queueOutcome].some(value => value !== null && typeof value !== "string")) throw new Error("Unexpected retry item payload");
      if (item.nextEligibleAt !== null && (!Number.isFinite(item.nextEligibleAt) || item.nextEligibleAt < 0)) throw new Error("Invalid retry eligibility time");
      if (["active", "interrupted", "retry-pending", "paused"].includes(item.state) && i !== queue.cursor) throw new Error("Active retry item must match the checkpoint cursor");
      if (i < queue.cursor && item.incompleteAtQueueStart && !["advanced-unverified", "deferred-network-limit"].includes(item.state)) throw new Error("Checkpoint cursor would skip an unfinished queue position");
    });
    for (const entry of queue.events) {
      if (!entry || typeof entry !== "object" || Object.keys(entry).some(key => !EVENT_KEYS.has(key)) || Object.values(entry).some(value => value !== null && !["string", "number", "boolean"].includes(typeof value))) throw new Error("Unexpected event payload; only queue-control metadata is allowed");
    }
    return queue;
  }
  function current(queue, nowValue) {
    validate(queue);
    const now = timestamp(nowValue), item = queue.items[queue.cursor];
    if (!item) return null;
    const waitMs = Math.max(0, (item.nextEligibleAt || 0) - now);
    return {...copy(item), position: queue.cursor + 1, waitMs,
      canActivate: item.state !== "paused" && item.state !== "active" && waitMs === 0};
  }
  function activate(queue, nowValue) {
    const now = timestamp(nowValue), item = current(queue, now);
    if (!item) throw new Error("This queue pass has reached the end");
    if (item.state === "active") return queue;
    if (!item.canActivate) throw new Error(item.state === "paused" ? "Manual review is required before this title can resume" : "The bounded retry delay has not elapsed");
    const target = queue.items[queue.cursor], resumed = target.state === "interrupted";
    target.state = "active";
    target.activations += 1;
    target.activatedAt = new Date(now).toISOString();
    target.lastEventAt = target.activatedAt;
    target.nextEligibleAt = null;
    event(queue, resumed ? "queue-entry-resumed" : "queue-entry-activated", now, {index: target.index, verifiedNewCaptureAttempt: false});
    return queue;
  }
  function interrupt(queue, nowValue, reason = "session-interrupted") {
    const now = timestamp(nowValue);
    validate(queue);
    const item = queue.items[queue.cursor];
    if (!item || !["active", "interrupted"].includes(item.state)) return queue;
    item.state = "interrupted";
    item.interruptionReason = ["session-interrupted", "manual-pause"].includes(reason) ? reason : "session-interrupted";
    item.lastEventAt = new Date(now).toISOString();
    event(queue, "queue-entry-interrupted", now, {index: item.index, reason: item.interruptionReason});
    return queue;
  }
  function advance(queue, nowValue, reason = "manual-next") {
    const now = timestamp(nowValue);
    validate(queue);
    const item = queue.items[queue.cursor];
    if (!item) return queue;
    if (item.state === "paused") throw new Error("Manual review is required for the paused title");
    item.state = reason === "network-limit" ? "deferred-network-limit" : "advanced-unverified";
    item.queueOutcome = reason === "network-limit" ? "bounded-network-retry-limit" : "manually-advanced-without-capture-verification";
    item.nextEligibleAt = null;
    item.lastEventAt = new Date(now).toISOString();
    event(queue, "queue-position-advanced", now, {index: item.index, reason: item.queueOutcome, sourceCaptureStillIncomplete: item.incompleteAtQueueStart});
    queue.cursor += 1;
    seekIncomplete(queue);
    return queue;
  }
  function networkFailure(queue, nowValue, classification = "transient-network") {
    const now = timestamp(nowValue);
    validate(queue);
    const item = queue.items[queue.cursor];
    if (!item || item.state !== "active") throw new Error("Activate the current queue entry before recording a network observation");
    if (classification === "access-block") {
      item.state = "paused";
      item.interruptionReason = "access-block-requires-manual-review";
      item.lastEventAt = new Date(now).toISOString();
      event(queue, "manual-review-required", now, {index: item.index, classification});
      return queue;
    }
    if (classification !== "transient-network") throw new Error("Unsupported network classification");
    item.networkFailures += 1;
    event(queue, "manual-network-observation", now, {index: item.index, failureCount: item.networkFailures, requestDispatched: false});
    if (item.networkFailures > queue.maxNetworkRetries) return advance(queue, now, "network-limit");
    const delays = [1000, 3000, 10000, 30000, 60000];
    item.state = "retry-pending";
    item.nextEligibleAt = now + delays[item.networkFailures - 1];
    item.lastEventAt = new Date(now).toISOString();
    return queue;
  }
  function acknowledgeReview(queue, nowValue) {
    const now = timestamp(nowValue);
    validate(queue);
    const item = queue.items[queue.cursor];
    if (!item || item.state !== "paused") throw new Error("No manual review is pending");
    item.state = "interrupted";
    item.interruptionReason = "manual-review-acknowledged";
    event(queue, "manual-review-acknowledged", now, {index: item.index, providerRequestAuthorizedByQueue: false});
    return queue;
  }
  function serialize(queue) { validate(queue); return JSON.stringify(queue, null, 2) + "\n"; }
  function restore(serialized, entries, nowValue, catalogueCapturedAt = null) {
    if (typeof serialized !== "string" || serialized.length > 1000000) throw new Error("Invalid retry checkpoint size");
    const queue = validate(JSON.parse(serialized)), ordered = inventory(entries), now = timestamp(nowValue);
    if (queue.items.some((item, i) => item.index !== ordered[i].index || item.name !== ordered[i].name)) throw new Error("Retry checkpoint does not match this catalogue");
    if (catalogueCapturedAt !== null && queue.catalogueCapturedAt !== catalogueCapturedAt) throw new Error("Retry checkpoint belongs to a different fresh catalogue run");
    if (queue.items.some((item, i) => ordered[i].completeReferenceCapture !== true && !item.incompleteAtQueueStart)) throw new Error("Checkpoint cannot exclude a currently incomplete title");
    // A saved active title is never silently skipped when the browser is reopened.
    if (queue.items[queue.cursor]?.state === "active") interrupt(queue, now, "session-interrupted");
    return queue;
  }
  function summary(queue) {
    validate(queue);
    return {pass: queue.pass, inventory: 74, incompleteAtQueueStart: queue.items.filter(i => i.incompleteAtQueueStart).length,
      currentCatalogueIndex: queue.items[queue.cursor]?.index || null,
      positionsAdvanced: queue.items.filter(i => ["advanced-unverified", "deferred-network-limit"].includes(i.state)).length,
      interrupted: queue.items.filter(i => i.state === "interrupted").length,
      deferredAtNetworkLimit: queue.items.filter(i => i.state === "deferred-network-limit").length,
      providerRequestsMade: 0, verifiedNewCaptureAttempts: 0, sourceCompletionFlagsChanged: false};
  }
  const api = {create, validate, current, activate, interrupt, advance, networkFailure, acknowledgeReview, serialize, restore, summary};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.Fresh74RetryQueue = api;
})(typeof window !== "undefined" ? window : globalThis);
