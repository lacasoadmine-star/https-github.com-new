(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const core = window.Fresh74;
  const retryApi = window.Fresh74RetryQueue;
  let data = window.FRESH74_DATA;
  let filter = "all", selected = null, selectedShot = -1, showingMotion = false, points = false, toastTimer;
  let retryQueue = null, retryStorageAvailable = true, queueRecoveryRequired = false, invalidCheckpoint = null;
  const queueStorageKey = () => "fresh74.retry-queue.v1:" + data.catalogueCapturedAt;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  function toast(message) {
    clearTimeout(toastTimer);
    $("toast").textContent = message;
    $("toast").hidden = false;
    toastTimer = setTimeout(() => { $("toast").hidden = true; }, 6000);
  }
  function imageFor(media, label, lazy = true) {
    const img = element("img");
    img.alt = label;
    if (lazy) img.loading = "lazy";
    img.decoding = "async";
    img.src = core.safeMedia(media?.url);
    img.addEventListener("error", () => {
      img.hidden = true;
      const fallback = element("span", "placeholder", "Image unavailable");
      fallback.style.fontSize = "11px";
      img.parentElement?.append(fallback);
    }, {once: true});
    return img;
  }
  function status(e) { return element("span", "status " + e.group, e.statusLabel); }
  function card(e) {
    const button = element("button", "card");
    button.type = "button";
    button.setAttribute("aria-label", `${e.name}: ${e.statusLabel}. Open captured reference`);
    const art = element("div", "card-art");
    if (e.poster) art.append(imageFor(e.poster, `${e.name} — ${e.posterVerification?.visualType || "saved reference"}`));
    else art.append(element("span", "placeholder", String(e.index).padStart(2, "0")));
    art.append(element("span", "card-number", "#" + String(e.index).padStart(2, "0")));
    if (e.clip) art.append(element("span", "clip-indicator", "▷ Sampled clip"));
    const content = element("div", "card-content");
    content.append(element("h3", "", e.name), status(e));
    const meta = element("div", "card-meta");
    meta.append(element("span", "", `${e.screenshots.length} saved images`), element("span", "", e.clip ? core.seconds(e.sampledDurationSeconds) + " sampled" : "No motion clip"));
    content.append(meta);
    button.append(art, content);
    button.addEventListener("click", () => openGame(e.index));
    return button;
  }
  function renderCards() {
    const entries = core.filterEntries(data.entries, $("search").value, filter, $("sort").value);
    $("cards").replaceChildren(...entries.map(card));
    $("empty").hidden = entries.length !== 0;
    $("result-count").textContent = `${entries.length} of ${data.entries.length} titles`;
    document.querySelectorAll("[data-filter]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === filter)));
  }
  function renderHeader() {
    const c = data.counts;
    [["count-titles", c.titles], ["count-attempted", c.attempted], ["count-scenes", c.sceneObserved], ["count-clips", c.silentClips],
      ["count-complete", c.completeReferenceCaptures], ["filter-all", c.titles], ["filter-scenes", c.sceneObserved],
      ["filter-motion", c.silentClips], ["filter-retry", data.entries.filter(e => e.completeReferenceCapture !== true).length],
      ["filter-failed", data.entries.filter(e => e.group === "retry").length]].forEach(([id, value]) => { $(id).textContent = value; });
    const captured = new Date(data.catalogueCapturedAt);
    $("run-date").textContent = Number.isFinite(captured.getTime()) ? captured.toISOString().slice(0, 10) : "Fresh run";
    $("source-updated").textContent = "Checkpoint " + core.clock(data.sourceUpdatedAt);
    $("footer-build").textContent = `Snapshot ${data.buildId.slice(0, 12)} · ${c.audioCaptures} audio recordings`;
    const featured = data.entries.find(e => e.index === 19 && e.poster) || data.entries.find(e => e.group === "scene" && e.poster);
    if (featured) {
      $("featured").hidden = false;
      $("featured-image").src = core.safeMedia(featured.poster.url);
      $("featured-image").alt = featured.name + " — original captured scene";
      $("featured-name").textContent = featured.name;
      $("featured").onclick = () => openGame(featured.index);
    }
    const link = data.studyLink;
    if (link === "../reel-study/index.html") {
      $("study-link").hidden = false;
      $("study-link").href = link;
    }
  }
  function coverageRow(label, value, unavailable = false) {
    const row = element("div");
    row.append(element("dt", "", label), element("dd", unavailable ? "unavailable" : "", value));
    return row;
  }
  function renderAttempt(e) {
    $("attempt-identity").replaceChildren(
      coverageRow("Pass", e.pass ?? "Unrecorded", e.pass == null),
      coverageRow("Attempt number", e.attemptNumber ?? "Unrecorded", e.attemptNumber == null),
      coverageRow("Attempt ID", e.attemptId || "Unrecorded", !e.attemptId),
      coverageRow("Started", e.startedAt || "Unrecorded", !e.startedAt),
      coverageRow("Ended", e.endedAt || "Unrecorded", !e.endedAt)
    );
    const evidence = e.consoleEvidence || {};
    const consoleView = core.consoleSummary(evidence);
    $("console-summary").textContent = consoleView.summary;
    $("console-coverage").replaceChildren(
      coverageRow("Transport error", consoleView.network),
      coverageRow("Renderer issue", consoleView.renderer),
      coverageRow("Audio runtime issue", consoleView.audio),
      ...consoleView.categories.map(row => coverageRow(row.category, row.count))
    );
    $("console-limits").replaceChildren(...consoleView.limits.map(note => element("li", "", note)));
    $("console-rows").replaceChildren(...(evidence.entries || []).map(row => {
      const item = element("div", "console-row");
      item.append(element("strong", "", `${row.level || "Console"} · ${row.category || "Unclassified"}`),
        element("small", "", `${core.clock(row.at)} · ${row.timestampScope || "Scope unverified"}`));
      if (row.sourceCategory && row.sourceCategory !== row.category) item.append(element("small", "", `Source label: ${row.sourceCategory}`));
      if (row.message) item.append(element("p", "", row.message));
      for (const message of row.additionalSanitizedMessages || []) item.append(element("p", "", message));
      return item;
    }));
    $("console-details").open = false;
    const alternatives = e.alternateAttempts || [];
    $("alternate-details").hidden = alternatives.length === 0;
    $("alternate-details").open = false;
    $("alternate-heading").textContent = `Other attempts (${alternatives.length})`;
    $("alternate-attempts").replaceChildren(...alternatives.map(attempt => {
      const item = element("div", "alternate-attempt");
      item.append(element("h4", "", core.attemptLabel(attempt)), status(attempt));
      const identity = element("dl", "coverage attempt-identity");
      identity.append(coverageRow("Attempt ID", attempt.attemptId || "Unrecorded"),
        coverageRow("Started", attempt.startedAt || "Unrecorded"), coverageRow("Ended", attempt.endedAt || "Unrecorded"),
        coverageRow("Own sample span", core.seconds(attempt.sampledDurationSeconds)), coverageRow("Own indexed samples", attempt.sampledFrameCount ?? "Unavailable"),
        coverageRow("Verified active play", attempt.verifiedPlayedSeconds ? core.seconds(attempt.verifiedPlayedSeconds) : "Not verified", true));
      const consoleView = core.consoleSummary(attempt.consoleEvidence);
      item.append(identity, element("p", "", consoleView.summary));
      const notes = [...(attempt.observations || []), ...(attempt.errors || []), ...consoleView.limits];
      const list = element("ul", "notes");
      list.append(...notes.map(note => element("li", "", note)));
      item.append(list);
      return item;
    }));
  }
  function renderCoverage(e) {
    $("coverage").replaceChildren(
      coverageRow("Saved images", e.screenshots.length),
      coverageRow("Indexed samples", e.sampledFrameCount || 0),
      coverageRow("Sampled segment span", core.seconds(e.sampledDurationSeconds)),
      coverageRow("Original audio", "Unavailable", true),
      coverageRow("Continuous video", "Unavailable", true),
      coverageRow("Verified active play", e.verifiedPlayedSeconds ? core.seconds(e.verifiedPlayedSeconds) : "Not verified", true),
      coverageRow("Complete AV capture", e.completeReferenceCapture === true ? "Verified" : "Incomplete", e.completeReferenceCapture !== true)
    );
    $("scene-review").textContent = e.posterVerification?.notes || "No scene review has been recorded for this title.";
    const notes = [...new Set([...(e.observations || []), ...(e.errors || []), ...(e.actionNotes || []), ...(e.rendererIssues || [])])];
    $("observations").replaceChildren(...(notes.length ? notes : ["No extra observations recorded."]).map(note => element("li", "", typeof note === "string" ? note : JSON.stringify(note))));
    if (e.missingMedia?.length) $("observations").append(element("li", "", `${e.missingMedia.length} source media files were missing when this bundle was built.`));
    const motion = e.sampledMotion || {};
    const segments = (motion.segments || []).map(s => {
      const item = element("div", "segment");
      item.append(element("strong", "", `Segment ${s.index} · ${core.seconds(s.frameSpanMs / 1000)}`), element("div", "", `${s.frameCount} samples · ${Number(s.sampleRateHz || 0).toFixed(2)} samples/s`), element("div", "", `${core.clock(s.sourceFirstFrameAt)} – ${core.clock(s.sourceLastFrameAt)}`));
      return item;
    });
    for (const gap of motion.discontinuities || []) segments.push(element("div", "segment", `Between segments ${gap.afterSegment} → ${gap.beforeSegment}: ${core.seconds(gap.omittedSourceGapMs / 1000)} omitted. Playback cuts to the next actual sample.`));
    if (motion.unindexedFrameCount) segments.push(element("div", "segment", `${motion.unindexedFrameCount} unindexed source frames are excluded from timed playback.`));
    $("segments").replaceChildren(...(segments.length ? segments : [element("p", "", "No verified sample timeline available.")]));
    $("timing-details").open = false;
    renderIntegrity(e.poster);
  }
  function renderIntegrity(media) {
    const nodes = [element("strong", "", "Fresh catalogue captured"), element("span", "", data.catalogueCapturedAt)];
    if (media) nodes.push(element("strong", "", "Original source"), element("span", "", media.source), element("strong", "", "SHA-256"), element("span", "", media.sha256));
    nodes.push(element("strong", "", "Interpretation"), element("span", "", "Hashes verify file identity. They do not prove one minute of active gameplay or captured sound."));
    $("integrity").replaceChildren(...nodes);
  }
  function selectShot(index) {
    if (!selected) return;
    showingMotion = false;
    selectedShot = index;
    $("stage-video").pause();
    $("stage-video").hidden = true;
    $("stage-surface").hidden = false;
    $("playback-note").hidden = true;
    $("gallery").hidden = false;
    $("view-stills").setAttribute("aria-pressed", "true");
    $("view-motion").setAttribute("aria-pressed", "false");
    const shot = selected.screenshots[index] || selected.poster;
    $("stage-empty").hidden = Boolean(shot);
    $("stage-surface").hidden = !shot;
    if (shot) {
      $("stage-image").src = core.safeMedia(shot.url);
      $("stage-image").alt = `${selected.name}: ${shot.label || "reviewed original reference"}`;
      $("frame-label").textContent = shot.label || "Reviewed original reference";
      $("frame-time").textContent = core.clock(shot.at);
      renderIntegrity(shot);
    } else { $("frame-label").textContent = "No captured image available"; $("frame-time").textContent = ""; }
    $("gallery").querySelectorAll("button").forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
    renderPoints();
  }
  function showMotion() {
    if (!selected?.clip) return;
    showingMotion = true;
    $("stage-surface").hidden = true;
    $("stage-empty").hidden = true;
    $("stage-video").hidden = false;
    $("gallery").hidden = true;
    $("playback-note").hidden = false;
    $("stage-video").src = core.safeMedia(selected.clip.url);
    $("stage-video").poster = core.safeMedia(selected.poster?.url);
    $("frame-label").textContent = `${selected.name} · ${core.seconds(selected.sampledDurationSeconds)} of sampled segment spans`;
    $("frame-time").textContent = "Silent reference playback";
    $("view-stills").setAttribute("aria-pressed", "false");
    $("view-motion").setAttribute("aria-pressed", "true");
    renderIntegrity(selected.clip);
  }
  function showAction(action) {
    const later = core.laterFrame(action, selected.screenshots);
    if (!later) { toast("No unambiguous saved frame within 30 seconds after this observation."); return; }
    points = Boolean(core.position(action));
    selectShot(later.index);
    toast(`Showing the closest later saved frame, ${(later.delayMs / 1000).toFixed(2)} s after the control observation. An exact causal response is not established.`);
  }
  function renderPoints() {
    $("hotspots").replaceChildren();
    $("show-points").setAttribute("aria-pressed", String(points));
    const shot = selected?.screenshots[selectedShot] || selected?.poster;
    if (!points || showingMotion || !shot?.width || !shot?.height) return;
    selected.actions.forEach((action, i) => {
      const p = core.position(action);
      const later = core.laterFrame(action, selected.screenshots);
      if (!later || later.index !== selectedShot) return;
      if (!p || p[0] < 0 || p[1] < 0 || p[0] > shot.width || p[1] > shot.height) return;
      const button = element("button", "hotspot", i + 1);
      button.type = "button";
      button.style.left = p[0] / shot.width * 100 + "%";
      button.style.top = p[1] / shot.height * 100 + "%";
      button.title = `${action.control || action.description || action.event || "Recorded control"} · recorded viewport coordinate`;
      button.setAttribute("aria-label", `Show recorded evidence for control ${i + 1}: ${button.title}`);
      button.addEventListener("click", () => showAction(action));
      $("hotspots").append(button);
    });
  }
  function renderControls(e) {
    const actions = e.actions || [];
    $("control-count").textContent = `${actions.length} observations`;
    const nodes = actions.map((action, i) => {
      const response = core.laterFrame(action, e.screenshots);
      const node = element("button", "action");
      node.type = "button";
      const body = element("span", "action-text");
      body.append(element("strong", "", action.control || action.description || action.event || action.type || "Recorded interaction"));
      const p = core.position(action);
      body.append(element("small", "", `${core.clock(action.at)}${p ? ` · viewport (${p[0]}, ${p[1]})` : ""} · ${response ? `later frame +${(response.delayMs / 1000).toFixed(2)} s` : "no nearby timed frame"}`));
      node.append(element("span", "action-number", i + 1), body, element("span", "action-arrow", response ? "↗" : "—"));
      node.addEventListener("click", () => showAction(action));
      return node;
    });
    $("observed-controls").replaceChildren(...(nodes.length ? nodes : [element("p", "muted", "No verified control interaction was recorded for this title.")]));
    $("show-points").disabled = !actions.some(a => core.position(a));
  }
  function openGame(index, updateHash = true) {
    selected = data.entries.find(e => e.index === Number(index));
    if (!selected) return;
    points = false;
    $("detail-title").textContent = selected.name;
    $("detail-index").textContent = `CATALOGUE ${String(selected.index).padStart(2, "0")} / 74 · ${core.attemptLabel(selected)}`;
    $("detail-status").replaceWith(Object.assign(status(selected), {id: "detail-status"}));
    $("view-motion").disabled = !selected.clip;
    $("stage-video").removeAttribute("src");
    $("gallery").replaceChildren(...selected.screenshots.map((shot, i) => {
      const button = element("button", "thumb");
      button.type = "button";
      button.setAttribute("aria-label", `Show captured image ${i + 1}: ${shot.label || "saved frame"}`);
      button.append(imageFor(shot, shot.label || "Captured frame"), element("span", "", String(i + 1).padStart(2, "0")));
      button.addEventListener("click", () => selectShot(i));
      return button;
    }));
    renderAttempt(selected);
    renderCoverage(selected);
    renderControls(selected);
    const initial = selected.screenshots.findIndex(shot => shot.url === selected.poster?.url);
    selectShot(initial);
    if (!$("detail").open) $("detail").showModal();
    $("detail").scrollTop = 0;
    if (updateHash) history.replaceState(null, "", "#game=" + selected.index);
  }
  function closeDetail() {
    $("stage-video").pause();
    $("stage-video").removeAttribute("src");
    $("detail").close();
    selected = null;
    history.replaceState(null, "", location.pathname + location.search);
  }
  async function checkProgress(manual = false) {
    if (location.protocol === "file:") {
      if (manual) toast("Offline file mode: the bundled checkpoint and all copied media remain available without a server.");
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch("/api/progress", {signal: controller.signal, cache: "no-store", credentials: "omit"});
      if (!response.ok) throw new Error("Progress endpoint unavailable");
      const progress = await response.json();
      if (progress.status !== "local-read-only" || !progress.buildId) throw new Error("Unrecognized progress endpoint");
      $("connection").classList.remove("fallback");
      $("connection").replaceChildren(element("i"), document.createTextNode("Local server connected"));
      if (manual) toast(progress.buildId === data.buildId ? "The bundled checkpoint matches the local server. All 74 cards remain available offline." : "A newer local checkpoint exists. Reload this page to use its bundled snapshot.");
    } catch {
      $("connection").classList.add("fallback");
      $("connection").replaceChildren(element("i"), document.createTextNode("Offline snapshot retained"));
      if (manual) toast("The local server could not be reached. Your current catalogue and already loaded evidence remain open. Open index.html directly for full file mode.");
    } finally { clearTimeout(timeout); }
  }
  function saveRetryQueue() {
    if (queueRecoveryRequired) return;
    try {
      localStorage.setItem(queueStorageKey(), retryApi.serialize(retryQueue));
      retryStorageAvailable = true;
    } catch { retryStorageAvailable = false; }
  }
  function renderRetryQueue() {
    const item = retryApi.current(retryQueue), summary = retryApi.summary(retryQueue);
    $("queue-count").textContent = `${summary.incompleteAtQueueStart} incomplete · ${data.entries.filter(e => e.group === "retry").length} failed scenes`;
    $("queue-position").textContent = item ? `PASS ${retryQueue.pass} · CATALOGUE ${String(item.index).padStart(2, "0")} / 74` : `PASS ${retryQueue.pass} · ALL POSITIONS ADVANCED`;
    $("queue-name").textContent = item ? item.name : "The queue pass has reached title 74";
    $("queue-progress").textContent = `${summary.positionsAdvanced} positions advanced · ${summary.deferredAtNetworkLimit} deferred at retry limit`;
    $("queue-source").textContent = "0 new captures verified by this queue";
    const wait = item?.waitMs > 0 ? ` · retry eligible in ${Math.ceil(item.waitMs / 1000)} s` : "";
    $("queue-state").textContent = item ? `${item.state.replaceAll("-", " ")}${wait} · ${item.networkFailures} recorded transient failures · source: ${item.sourceStatus}` : `${summary.incompleteAtQueueStart} source captures remain incomplete. A new pass keeps every incomplete title.`;
    $("queue-activate").disabled = queueRecoveryRequired || !item?.canActivate;
    $("queue-activate").textContent = item?.state === "interrupted" || item?.state === "retry-pending" ? "Resume current position" : "Activate current position";
    $("queue-next").disabled = queueRecoveryRequired || !item || item.state === "paused";
    $("queue-network").disabled = queueRecoveryRequired || item?.state !== "active";
    $("queue-pause").disabled = queueRecoveryRequired || item?.state !== "active";
    $("queue-review").hidden = item?.state !== "paused" || queueRecoveryRequired;
    $("queue-new").hidden = Boolean(item) && !queueRecoveryRequired;
    $("queue-new").textContent = queueRecoveryRequired ? "Preserve old checkpoint and start new" : "Start another pass";
    $("queue-storage").textContent = queueRecoveryRequired ? "The saved checkpoint could not be restored. It has not been overwritten. Restore a valid checkpoint or explicitly start a new queue." : retryStorageAvailable ? "Position saved in this browser. Save checkpoint downloads the queue; Restore checkpoint resumes it. No demo request is sent by these controls." : "Browser storage is unavailable. The queue works in memory; use Save checkpoint and Restore checkpoint to resume after closing this page.";
  }
  function initializeRetryQueue() {
    retryQueue = retryApi.create(data.entries, {sourceBuildId: data.buildId, catalogueCapturedAt: data.catalogueCapturedAt});
    let saved = null;
    try { saved = localStorage.getItem(queueStorageKey()); }
    catch { retryStorageAvailable = false; }
    if (saved) {
      try { retryQueue = retryApi.restore(saved, data.entries, Date.now(), data.catalogueCapturedAt); saveRetryQueue(); }
      catch { queueRecoveryRequired = true; invalidCheckpoint = saved; }
    } else if (retryStorageAvailable) saveRetryQueue();
    renderRetryQueue();
  }
  function queueAction(action) {
    if (queueRecoveryRequired) { toast("Restore a valid checkpoint or explicitly start a new queue first."); return; }
    try { action(); saveRetryQueue(); renderRetryQueue(); }
    catch (error) { toast(error.message); }
  }
  if (!data?.entries || data.entries.length !== 74 || !core || !retryApi) {
    $("fatal").hidden = false;
    return;
  }
  renderHeader();
  renderCards();
  initializeRetryQueue();
  $("search").addEventListener("input", renderCards);
  $("sort").addEventListener("change", renderCards);
  $("filters").addEventListener("click", event => {
    const button = event.target.closest("[data-filter]");
    if (button) { filter = button.dataset.filter; renderCards(); }
  });
  $("reset").addEventListener("click", () => { filter = "all"; $("search").value = ""; renderCards(); });
  $("close-detail").addEventListener("click", closeDetail);
  $("detail").addEventListener("cancel", event => { event.preventDefault(); closeDetail(); });
  $("view-stills").addEventListener("click", () => selectShot(selectedShot));
  $("view-motion").addEventListener("click", showMotion);
  $("show-points").addEventListener("click", () => {
    if (showingMotion) selectShot(selectedShot);
    points = !points;
    renderPoints();
    if (points && !$("hotspots").childElementCount) toast("Choose an observed control below to view its recorded coordinates on the closest later saved frame.");
  });
  $("refresh").addEventListener("click", () => checkProgress(true));
  $("download").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(core.checkpoint(data, retryQueue), null, 2) + "\n"], {type: "application/json"});
    const url = URL.createObjectURL(blob), link = element("a");
    link.href = url; link.download = "fresh74-checkpoint.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $("stage-video").addEventListener("error", () => toast("This clip could not be opened. Captured stills and source notes remain available."));
  $("stage-image").addEventListener("error", () => { $("stage-empty").textContent = "This image file could not be opened. Select another saved frame."; $("stage-empty").hidden = false; });
  const deepLink = location.hash.match(/^#game=(\d+)$/);
  if (deepLink) openGame(Number(deepLink[1]), false);
  $("queue-activate").addEventListener("click", () => queueAction(() => retryApi.activate(retryQueue)));
  $("queue-next").addEventListener("click", () => queueAction(() => retryApi.advance(retryQueue)));
  $("queue-network").addEventListener("click", () => queueAction(() => retryApi.networkFailure(retryQueue)));
  $("queue-pause").addEventListener("click", () => queueAction(() => retryApi.interrupt(retryQueue, Date.now(), "manual-pause")));
  $("queue-review").addEventListener("click", () => queueAction(() => retryApi.acknowledgeReview(retryQueue)));
  $("queue-new").addEventListener("click", () => {
    try { localStorage.setItem(queueStorageKey() + ":previous:" + retryQueue.runId, invalidCheckpoint || retryApi.serialize(retryQueue)); }
    catch { toast("The previous queue could not be archived in browser storage. Download a checkpoint if you need to retain it."); }
    retryQueue = retryApi.create(data.entries, {sourceBuildId: data.buildId, catalogueCapturedAt: data.catalogueCapturedAt, pass: retryQueue.pass + 1});
    queueRecoveryRequired = false; invalidCheckpoint = null;
    saveRetryQueue(); renderRetryQueue();
  });
  $("queue-import").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1000000) throw new Error("Checkpoint is too large");
      const parsed = JSON.parse(await file.text());
      const restored = retryApi.restore(JSON.stringify(parsed.retryQueue || parsed), data.entries, Date.now(), data.catalogueCapturedAt);
      retryQueue = restored; queueRecoveryRequired = false; invalidCheckpoint = null;
      saveRetryQueue(); renderRetryQueue();
      toast("Retry checkpoint restored. The interrupted title remains current; no new demo visit has been claimed.");
    } catch (error) { toast("Checkpoint was not imported: " + error.message); }
    event.target.value = "";
  });
  window.addEventListener("pagehide", () => {
    if (!queueRecoveryRequired) { retryApi.interrupt(retryQueue); saveRetryQueue(); }
  });
  setInterval(() => { if (retryQueue && !document.hidden) renderRetryQueue(); }, 1000);
  checkProgress();
})();
