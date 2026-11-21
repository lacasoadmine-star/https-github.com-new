# Fresh official reference capture

This directory provides reference-evidence orchestration and validation. It does not implement a game, select a payout, connect a wallet, launch Chromium, or activate a release. Every game requires its own freshly inspected driver; there are no shared guessed selectors or coordinates.

## Run the focused tests

```sh
node --test codex-work/new-games72-20261121/capture/evidence-capture.test.mjs
```

The test images, recording headers, identities, and observations are synthetic unit fixtures. They are created in disposable temporary directories and never qualify as official reference evidence.

## Identity allowlist

Construct the allowlist from the reviewed new-game registry, using these explicit fields:

| Field | Required meaning |
| --- | --- |
| `gameId` | New internal ID, distinct from every existing implementation |
| `officialName` | Current verified provider title |
| `providerGameName` | Exact provider launcher identity; aliases are not separate games |
| `officialPageUrl` | Current HTTPS SmartSoft product page |
| `officialLaunchUrl` | Verified, normalized public SSGPortal demo URL |
| `referenceSha256` | Hash of the reference identity source tied to this capture |

Launch validation permits the explicit SmartSoft public demo host/path and `DEMO` or `DEMO_EXH` public sample tokens. It rejects production tokens, duplicate query parameters, unrelated hosts, credentials in URLs, and unexpected query parameters. An HTTP or malformed link must be explicitly resolved from the current official source before entering the allowlist; the helper does not invent a replacement variant.

Create a coordinator with an allowlist and a `FileEvidenceStore` rooted in private evidence storage outside published frontend assets. The default concurrency is two and the maximum is four. `runMany([{ gameId, driver }])` continues other games after a blocker. Individual `run()` calls use the same concurrency guard.

## Driver contract

A driver declares `gameId`, `providerGameName`, and `inspectionSha256`. The last field ties the callbacks to actual recorded inspection of that exact variant. Each asynchronous callback receives an `AbortSignal`; it must honor that signal and use bounded browser/API waits. The default operation deadline is 30 seconds, configurable up to 60 seconds.

| Callback | Responsibility |
| --- | --- |
| `open({ identity, resumeSession, signal })` | Acquire a fresh dedicated browser session or attach to the supplied original session. This callback must **not navigate a previously held session to another game**. Return metadata only. The coordinator claims session ownership before inspection/navigation. |
| `inspect({ identity, session, signal })` | Navigate to the explicitly allowlisted official demo if needed; verify the actual game and that it has entered usable gameplay. Return the inspected control inventory. Do not classify a lobby, intro, loading animation, error or permission wall as gameplay. |
| `screenshot({ session, role, action, signal })` | Capture real current image bytes, MIME type, capture time and provenance. Roles are `before`, `afterInput` and `result`. No full-screen reference image may be substituted as a live observation. |
| `startRound({ session, action, signal })` | Perform exactly one independent normal-round input, using the exact inspected control. Disable AUTO and do not hold the control. Do not retry this callback internally. |
| `observeRound({ session, action, recovery, signal })` | Observe the same pending action through acceptance, active gameplay and a completed result. On recovery, inspect that accepted/pending round without initiating another one. |
| `captureControls({ session, controls, completedActions, signal })` | Exercise only the inventoried controls and return observed input/response records plus screenshots. Record any AUTO, HOLD or bonus rounds separately. |
| `recoverControls(...)` | Optional read-only recovery of a previous control batch whose response was lost. Without this callback, an uncertain control batch is blocked rather than repeated. |
| `finishRecording({ session, completedActions, signal })` | Retrieve the actual session recordings. Return image-independent video/audio bytes, MIME types, positive durations and the action IDs covered. It must be safe to retrieve an already completed recording again. |

The helper never guesses that every game has a button called SPIN. `startRound` can target an inspected DROP, START or other normal-play control when that is the provider's real interface. Every counted observation must still result from one deliberate independent input, rather than an unattended or held sequence.

### Session metadata

`open` must return:

```js
{
  sessionId, targetId,
  viewport: { width, height, deviceScaleFactor },
  orientation: "portrait", // or landscape, consistent with the viewport
  gameVersion: null,       // use the observed version when displayed
  gameVersionObservation: "Explain where the version was inspected if unavailable",
  captureSupport: {
    screenshot: { supported: true, methodOrReason: "Actual capture method" },
    video: { supported: false, methodOrReason: "Actual support limitation" },
    audio: { supported: false, methodOrReason: "Actual support limitation" }
  }
}
```

A capability flag does not prove a recording exists. Video is required for a complete reference capture. Audio is required when actual audio capture is supported; unsupported audio is explicitly reported. The helper never infers audible sound from a mute icon or claims sound parity.

Changing the browser session, page target, viewport or visible game version requires a new capture attempt; an existing capture is retained. Unknown versions are recorded as unknown with an inspection explanation. Do not infer a provider version from the independent engine's version.

### Gameplay inspection

`inspect` returns `gameId`, `providerGameName`, a nonempty `identityEvidence` explanation, `screen: "gameplay-ready"`, and `controls: [{ id, ...inspectionMetadata }]`. Control IDs must be distinct and originate in that inspection. Loading or permission failures should throw `CaptureError` with the observed status or return a screen state that fails the readiness check.

### Countable completed observation

`observeRound` returns the following factual record:

```js
{
  gameId, providerGameName, sessionId,
  actionId: action.actionId,
  initiationMode: "individual-input",
  phase: "complete",
  screen: "gameplay-result",
  inputAccepted: true,
  activePhaseObserved: true,
  completionObserved: true,
  completionEvidence: "Describe the actually inspected completion signal",
  observedRoundKey: "A distinct provider round ID or recorded observation key",
  roundKeySource: "State how the key is related to the actual observed round",
  autoWasDisabled: true,
  holdWasNotUsed: true,
  extraRounds: []
}
```

These booleans must come from inspected driver observations, not constants in a production driver. The coordinator validates their consistency; it does not independently understand arbitrary screenshots or discover a game's transition semantics. The saved evidence still needs visual/audio review. A hash proves file identity and integrity, not that an image shows a completed round, that sounds are correct, or that outcomes are fair.

Separate observations may show identical symbols and identical screenshot hashes. Distinct results are not required. Distinct initiating action IDs and observed round keys are required. Seven click records without seven valid completion observations cannot pass.

Extra rounds carry `initiationMode: "auto"`, `"hold"`, `"bonus"` or `"unattributed"`; they are kept in `extraRounds` and never fill the seven normal independent observations. Do not suppress unexpected rounds.

Each control record includes `controlId`, `actionObserved`, `responseObserved`, an `observation` explanation and `screenshots`. A screenshot input is `{ bytes: Uint8Array, mediaType, capturedAt, provenance }`. The available control inventory must be covered before capture validation succeeds. Explicit pressed/enabled/disabled/pending observations belong in the per-control record when present in the interface.

Recording inputs include `kind: "video" | "audio"`, `bytes`, `mediaType`, `actionIds`, `durationMs`, `capturedAt` and `provenance`. Media MIME/signature checks reject obvious wrong payloads, but do not substitute for playing and reviewing the recordings. Final release readiness and visual/audio comparison remain separate gates.

## Recovery and durable state

The coordinator saves an action intent before calling `startRound`. If the response disappears, the next run observes that same pending action and never automatically presses again. If the after-input screenshot was saved by the driver, return it as `recoveredAfterInputScreenshot`; otherwise that missing evidence stays missing and the capture cannot be marked complete.

Every resumed attempted action uses `observeRound({ recovery: true })`, including when its after-input screenshot already exists but its completed observation response was lost. Recovery is determined by the persisted input intent, not by the presence of a screenshot. Drivers must recover the exact `actionId` and its actual completed result without producing another input.

Before opening or interacting with a saved session, the coordinator validates the causal relationship between the input journal, completed observations and pending action. An attempted input must belong to exactly one completed observation or to the matching pending action. Duplicate, orphaned, changed or contradictory intent records fail closed with `INVALID_CAPTURE_CHECKPOINT`; the original file is retained unchanged. This consistency check is not tamper-proof storage and cannot reconstruct evidence that has been deleted. A maintainer must inspect the retained checkpoint and original session to resolve corruption; clearing the pending field is not recovery.

Round and extra-round metadata are validated before committing the completed manual observation. A control batch is validated and committed as a unit; recovery cannot duplicate partially appended control records or extra rounds. Lock release failures still free the coordinator's in-process concurrency slot; a persisted lock is never deleted without verifying its owner.

403 and 401 blockers require the authorized access/session problem to be corrected outside this helper, then an explicit `run(..., { recheckBlocked: true })`. No bypass or credential acquisition occurs. 429 persists its retry time and cannot be resumed early even with that flag. Not-ready, transient-network and timeout cases are resumable after the recorded delay, with a default maximum of three automatic resumptions. There is no busy retry loop and no new-round retry.

Capture state and blockers are saved after each step. Error messages and raw response bodies are not serialized because they can contain secrets. Metadata includes the failed stage and the pending action ID. A blocker is not a verified fix; a successful re-observation is required to move forward.

`FileEvidenceStore` uses private file permissions, atomic JSON replacement, exclusive per-game locks and permanent session-to-game claims. Two processes cannot capture the same game simultaneously. A lock left by a crashed process requires the maintainer to verify that the owner process is gone before removing it; do not delete a live lock to force progress. To start a genuinely new attempt, use a new private attempt directory and retain the previous evidence instead of overwriting it.

Artifacts are content-hashed and indexed with relative paths, media types, byte sizes, roles and covered action IDs. Every resume rechecks the stored bytes, including captures previously marked complete. The capture result always reports `releaseReady: false`, `fullRulesVerified: false` and `soundParityVerified: false`; this helper cannot certify those separate requirements.

## Cloudflare Browser Run integration

Use the authorized Cloudflare connection through driver callbacks. Current official documentation supports a new `/script` session and subsequent `/script/<sessionId>` requests tied to the same page target. The driver must retain that original session/page, pass bounded timeouts, and persist observed 403/429 failures. Session recording availability must be checked; it is not proof that an audio stream was recorded. Local Chromium is not required.

Documentation checked on 2026-11-21:

- https://developers.cloudflare.com/browser-run/script/index.md
- https://developers.cloudflare.com/api/resources/browser_rendering/subresources/script/methods/create/

No Cloudflare token, API account secret, production player session, or ETB wallet credential belongs in this directory, driver source, checkpoint export or public logs.
