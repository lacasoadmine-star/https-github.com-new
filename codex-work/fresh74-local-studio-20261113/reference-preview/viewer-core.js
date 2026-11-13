(function (scope) {
  "use strict";
  const seconds = value => Number.isFinite(Number(value)) && value !== null ? Number(value).toFixed(1) + " s" : "Unavailable";
  const clock = at => {
    const date = new Date(at);
    return at && Number.isFinite(date.getTime()) ? date.toISOString().slice(11, 19) + " UTC" : "Time unverified";
  };
  function filterEntries(entries, query = "", group = "all", sort = "index") {
    const needle = query.trim().toLocaleLowerCase();
    const filtered = entries.filter(e => (!needle || `${e.name} ${e.index}`.toLocaleLowerCase().includes(needle)) &&
      (group === "all" || (group === "motion" ? Boolean(e.clip) : group === "retry" ? e.completeReferenceCapture !== true : group === "failed" ? e.group === "retry" : group === "scene" ? Boolean(e.sceneObserved || e.group === "scene") : e.group === group)));
    return filtered.sort(sort === "name" ? (a, b) => a.name.localeCompare(b.name) : (a, b) => a.index - b.index);
  }
  function position(action) {
    const p = action.position || (Number.isFinite(action.x) && Number.isFinite(action.y) ? [action.x, action.y] : null);
    return Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) ? p : null;
  }
  function laterFrame(action, shots) {
    const at = Date.parse(action.at);
    if (!Number.isFinite(at)) return null;
    const eligible = shots.map((shot, index) => ({shot, index, delayMs: Date.parse(shot.at) - at}))
      .filter(item => Number.isFinite(item.delayMs) && item.delayMs >= 0 && item.delayMs <= 30000 && item.shot.timestampStatus !== "ambiguous-reused-file")
      .sort((a, b) => a.delayMs - b.delayMs);
    return eligible[0] || null;
  }
  function safeMedia(url) {
    return typeof url === "string" && /^media\/[a-f0-9]{64}\.(?:jpg|jpeg|png|webp|mp4)$/.test(url) ? url : "";
  }
  function attemptLabel(entry) {
    const pass = Number.isInteger(entry.pass) && entry.pass > 0 ? `Pass ${entry.pass}` : "Pass unrecorded";
    const number = Number.isInteger(entry.attemptNumber) && entry.attemptNumber > 0 ? `attempt ${entry.attemptNumber}` : "attempt number unrecorded";
    return `${pass} · ${number}`;
  }
  function consoleSummary(evidence = {}) {
    evidence = evidence || {};
    const scope = evidence.scope || {};
    let summary = "Console evidence unavailable for this attempt.";
    if (evidence.available === true && evidence.availability === "rows-inspected") {
      summary = evidence.entryCount === 0 ? "No warn/error rows retained in the inspected scope." : `${evidence.entryCount ?? "Uncounted"} console rows retained in the inspected scope.`;
    } else if (evidence.available === true) {
      summary = `Only a source summary is available${Number.isInteger(evidence.sourceReportedIssueCount) ? ` (${evidence.sourceReportedIssueCount} reported rows)` : ""}; detailed console rows are unavailable.`;
    }
    const limits = [];
    if (scope.declaredScope) limits.push(scope.declaredScope);
    if (scope.originalTabConsoleAvailable === false) limits.push("Original tab console unavailable; replacement-tab observations cannot establish its history.");
    if (evidence.endInspectionAvailable === false) limits.push("End-of-attempt console inspection was unavailable.");
    if (scope.unknownTimestampSourceRowsRetained) limits.push(`${scope.unknownTimestampSourceRowsRetained} source rows have unverified timestamps.`);
    if (scope.priorAttemptRowsExcluded || scope.laterRowsExcluded) limits.push(`${scope.priorAttemptRowsExcluded || 0} earlier and ${scope.laterRowsExcluded || 0} later source rows were excluded from this attempt.`);
    limits.push(...(evidence.warnings || []), "Complete console history is not verified. Empty rows do not establish error-free operation.");
    return {summary, limits, categories: Object.entries(evidence.categoryCounts || {}).map(([category, count]) => ({category, count})),
      network: evidence.networkTransportIssueObserved === true ? "Observed; root cause unverified" : evidence.networkTransportIssueObserved === false ? "Not in retained rows" : "Unavailable",
      renderer: evidence.rendererIssueObserved === true ? "Observed" : evidence.rendererIssueObserved === false ? "Not in retained rows" : "Unavailable",
      audio: evidence.audioRuntimeIssueObserved === true ? "Observed" : evidence.audioRuntimeIssueObserved === false ? "Not in retained rows" : "Unavailable"};
  }
  function attemptCheckpoint(e) {
    return {pass: e.pass ?? null, attemptNumber: e.attemptNumber ?? null, attemptId: e.attemptId ?? null,
      startedAt: e.startedAt ?? null, endedAt: e.endedAt ?? null, status: e.status, attempted: e.attempted,
      finishedAttempt: e.finishedAttempt, sampledDurationSeconds: e.sampledDurationSeconds,
      sampledFrameCount: e.sampledFrameCount, completeReferenceCapture: e.completeReferenceCapture,
      fullMinuteGameplayVerified: e.fullMinuteGameplayVerified, consoleEvidence: e.consoleEvidence || null,
      retryable: e.completeReferenceCapture !== true};
  }
  function checkpoint(data, retryQueue = null) {
    return {schemaVersion: 1, buildId: data.buildId, catalogueCapturedAt: data.catalogueCapturedAt,
      sourceUpdatedAt: data.sourceUpdatedAt, counts: data.counts, audioCaptured: false,
      retryQueue, queueDoesNotVerifyNewCaptureAttempts: true,
      entries: data.entries.map(e => ({index: e.index, name: e.name, ...attemptCheckpoint(e),
        alternateAttempts: (e.alternateAttempts || []).map(attemptCheckpoint),
        durationsCombinedAcrossAttempts: false}))};
  }
  const api = {seconds, clock, filterEntries, position, laterFrame, safeMedia, attemptLabel, consoleSummary, checkpoint};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.Fresh74 = api;
})(typeof window !== "undefined" ? window : globalThis);
