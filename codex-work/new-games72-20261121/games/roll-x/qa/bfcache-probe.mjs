// Proposed QA instrumentation only. Never imported by the game runtime.
// Install before first document load with Page.addScriptToEvaluateOnNewDocument.
// No synthetic lifecycle event is created or dispatched by this module.
export const recorderSource = `(() => {
  const probe = {
    schemaVersion: 1,
    documentId: crypto.randomUUID(),
    timeOrigin: performance.timeOrigin,
    events: [], afterRuntimeHandlers: [], bound: false,
    controller: null, baseline: null,
  };
  Object.defineProperty(globalThis, '__rollxBfProbe', { value: probe });
  const eventRecord = event => ({
    type: event.type, persisted: event.persisted === true,
    isTrusted: event.isTrusted === true, time: performance.now(),
  });
  for (const type of ['pagehide', 'pageshow']) addEventListener(type, event => {
    if (probe.events.length < 30) probe.events.push(eventRecord(event));
  });
  probe.read = () => {
    const fixture = globalThis.rollxTest;
    const controller = fixture?.game?.controller;
    const state = controller?.snapshot;
    const navigation = performance.getEntriesByType('navigation')[0];
    let reasons = null;
    const reasonsSupported = !!navigation && 'notRestoredReasons' in navigation;
    if (reasonsSupported && navigation.notRestoredReasons) {
      const value = navigation.notRestoredReasons;
      reasons = typeof value.toJSON === 'function' ? value.toJSON() : JSON.parse(JSON.stringify(value));
    }
    return {
      documentId: probe.documentId, timeOrigin: probe.timeOrigin,
      url: location.href, bound: probe.bound,
      sameController: probe.bound && probe.controller === controller,
      controllerDisposed: controller?.disposed ?? null,
      events: probe.events.slice(), afterRuntimeHandlers: probe.afterRuntimeHandlers.slice(),
      calls: fixture ? { spin: fixture.calls.spin.length, refresh: fixture.calls.refresh,
        dispose: fixture.calls.dispose } : null,
      state: state ? { phase: state.phase, hidden: state.hidden, busy: state.busy,
        canSpin: state.canSpin, canStop: state.canStop, autoActive: state.autoActive,
        autoRemaining: state.autoRemaining, balance: state.balance, balanceFresh: state.balanceFresh,
        receiptRoundId: state.receipt?.roundId ?? null,
        historyRoundIds: state.history.map(receipt => receipt.roundId) } : null,
      audio: fixture ? { hidden: fixture.audio.hidden, disposed: fixture.audio.disposed,
        nodeCount: fixture.audio.nodes.size, contextState: fixture.audio.context?.state ?? null } : null,
      spinDisabled: document.getElementById('spin')?.disabled ?? null,
      navigation: { type: navigation?.type ?? null, reasonsSupported, notRestoredReasons: reasons },
    };
  };
})();`;

// Evaluate once AFTER the fixture is ready and one explicitly requested receipt
// has settled. The immutable baseline is also saved in the Node runner.
export const bindSource = `(() => {
  const probe = globalThis.__rollxBfProbe;
  const fixture = globalThis.rollxTest;
  if (!probe || !fixture || fixture.game.controller.snapshot.busy) throw new Error('Fixture not ready for BFCache probe');
  if (probe.bound) throw new Error('BFCache probe already bound');
  probe.controller = fixture.game.controller;
  probe.bound = true;
  // These listeners are registered after the application lifecycle listeners,
  // so their synchronous samples observe the application's pause/resume call.
  for (const type of ['pagehide', 'pageshow']) addEventListener(type, event => {
    const current = fixture.game.controller.snapshot;
    if (probe.afterRuntimeHandlers.length < 30) probe.afterRuntimeHandlers.push({
      type: event.type, persisted: event.persisted === true,
      isTrusted: event.isTrusted === true,
      hidden: current.hidden, busy: current.busy, autoActive: current.autoActive,
      controllerDisposed: fixture.game.controller.disposed,
      spinCount: fixture.calls.spin.length, refreshCount: fixture.calls.refresh,
      disposeCount: fixture.calls.dispose, audioNodes: fixture.audio.nodes.size,
    });
  });
  probe.baseline = probe.read();
  return probe.baseline;
})()`;

// Poll through raw CDP Runtime.evaluate, not Playwright page/locator lifecycle
// waits, after Page.navigateToHistoryEntry. Bound the whole probe and each poll.
export const snapshotSource = `globalThis.__rollxBfProbe?.read() ?? null`;

export function assessRestoration(before, after, frameNavigations) {
  const subsequentEvents = after?.events?.slice(before.events.length) ?? [];
  const trustedRestore = subsequentEvents.some(event =>
    event.type === 'pageshow' && event.persisted === true && event.isTrusted === true);
  const trustedHide = subsequentEvents.some(event =>
    event.type === 'pagehide' && event.persisted === true && event.isTrusted === true);
  const nativeFrameRestore = frameNavigations.some(event => event.type === 'BackForwardCacheRestore');
  const preserved = !!after && after.documentId === before.documentId &&
    after.timeOrigin === before.timeOrigin && after.sameController === true &&
    after.controllerDisposed === false && after.calls?.dispose === before.calls.dispose;
  const noWager = after?.calls?.spin === before.calls.spin;
  const historyPreserved = JSON.stringify(after?.state?.historyRoundIds) === JSON.stringify(before.state.historyRoundIds) &&
    after?.state?.receiptRoundId === before.state.receiptRoundId;
  const refreshed = after?.calls?.refresh > before.calls.refresh && after?.state?.balanceFresh === true;
  const paused = after?.afterRuntimeHandlers?.slice(before.afterRuntimeHandlers.length).some(event =>
    event.type === 'pagehide' && event.persisted === true && event.isTrusted === true &&
    event.hidden === true && event.autoActive === false && event.controllerDisposed === false &&
    event.disposeCount === before.calls.dispose && event.spinCount === before.calls.spin && event.audioNodes === 0) === true;
  const usable = after?.state?.hidden === false && after.state.busy === false &&
    after.state.canSpin === true && after.state.autoActive === false && after.spinDisabled === false;
  return { trustedRestore, trustedHide, nativeFrameRestore, preserved, noWager,
    historyPreserved, refreshed, paused, usable,
    passed: trustedRestore && trustedHide && nativeFrameRestore && preserved &&
      noWager && historyPreserved && refreshed && paused && usable };
}
