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
  function checkpoint(data, retryQueue = null) {
    return {schemaVersion: 1, buildId: data.buildId, catalogueCapturedAt: data.catalogueCapturedAt,
      sourceUpdatedAt: data.sourceUpdatedAt, counts: data.counts, audioCaptured: false,
      retryQueue, queueDoesNotVerifyNewCaptureAttempts: true,
      entries: data.entries.map(e => ({index: e.index, name: e.name, status: e.status, attempted: e.attempted,
        finishedAttempt: e.finishedAttempt, sampledDurationSeconds: e.sampledDurationSeconds,
        completeReferenceCapture: e.completeReferenceCapture, fullMinuteGameplayVerified: e.fullMinuteGameplayVerified,
        retryable: e.completeReferenceCapture !== true}))};
  }
  const api = {seconds, clock, filterEntries, position, laterFrame, safeMedia, checkpoint};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.Fresh74 = api;
})(typeof window !== "undefined" ? window : globalThis);
