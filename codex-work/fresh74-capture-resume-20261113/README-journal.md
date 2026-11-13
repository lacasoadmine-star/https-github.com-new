# Fresh demo capture journal

This is an **offline evidence journal**, not a game engine, browser controller, or
claim that any title has been captured. It never opens a network connection,
places a wager, reads an account, or imports old gameplay/media evidence.

The initial inventory is built from the new `official-catalogue-live.json`.
Exactly 74 actual cards are required; the two `Logo` hero entries are omitted.
Observed hrefs are retained as supplied, including the Multi Hot 10 Google
redirect and the Book of Bonanza link whose provider-relative path is unusual.
The catalogue's HTTP links for Cricket X and Vampires are also retained as
observed; this offline module neither visits them nor changes their protocol.
The journal does not silently invent corrected destinations.

## Run locally

Requires Node.js 20 or newer, `ffprobe`, and `ffmpeg`. There are no package
dependencies and no installation/download step in these files.

```sh
node capture-journal.mjs init /workspace/shared/zplay-fresh74-20261113/official-catalogue-live.json /workspace/shared/zplay-capture-runs
node capture-journal.mjs status /absolute/path/from-init/journal.json
node capture-journal.mjs next /absolute/path/from-init/journal.json
node capture-journal.mjs begin /absolute/path/from-init/journal.json multi-hot-5
```

`init` creates a UUID run directory, empty attempt histories, and an atomic
checkpoint. It accepts a catalogue captured within the preceding 24 hours; that
is an inventory freshness check, not completed capture evidence. `begin` returns
an attempt UUID and the directory in which the capture adapter must write media.
Use one writer per run; do not run concurrent journal writers. A sequential
writer holding an older revision is rejected rather than overwriting a newer
checkpoint.

## Capture adapter API

```js
import {CaptureJournal} from './capture-journal.mjs';

const journal = await CaptureJournal.open(journalPath);
const attempt = await journal.begin(gameId);
const directory = journal.attemptDirectory(gameId, attempt.id);

// Record this immediately after an actually observed UI operation.
const action = await journal.recordAction(gameId, attempt.id, {
  control: 'spin', at: actualActionTimestamp, x: actualX, y: actualY
});

// The caller records the actual pixels/sound into this attempt's directory.
// A timestamp by itself does not establish that gameplay happened.
const video = await journal.recordMedia(gameId, attempt.id, {
  kind: 'video', relativePath: 'gameplay.mp4',
  captureStartedAt: actualRecordingStart,
  captureEndedAt: actualRecordingEnd
});

await journal.recordMedia(gameId, attempt.id, {
  kind: 'screenshot', relativePath: 'screen-01.png',
  captureStartedAt: actualScreenshotTimestamp
});

// Only supply a segment after reviewing actual gameplay in that interval.
// A second real control action must also be recorded for completion.
await journal.recordGameplay(gameId, attempt.id, {
  videoId: video.id, fromMs: 0, toMs: 60000,
  actionIds: [action.id, secondObservedActionId],
  observation: 'reels-moving', reviewed: true
});

const assessment = await journal.finish(gameId, attempt.id);
```

Permitted action identifiers are `spin`, `stop`, `play`, `start`, `cashout`,
`autoplay-start`, `autoplay-stop`, `tap`, `bet-open`, `bet-adjust`, `paytable-open`,
`settings-open`, `sound-toggle`, `music-toggle`, `help-open`, `fullscreen-toggle`,
and `close-panel`. These are names of UI controls only. No stake, balance,
account identity, session token, response body, or payout is accepted. Coordinates
are optional. Media registration accepts `screenshot`, `video`, or `audio`.

For a caller using separate CLI invocations, `event` accepts one small JSON
object on standard input:

```json
{"type":"action","data":{"control":"help-open","at":"ACTUAL_ISO_TIMESTAMP"}}
```

Invoke it as `node capture-journal.mjs event JOURNAL GAME_ID ATTEMPT_ID` with the
JSON supplied on stdin. Other event types are `media`, `gameplay`, `failure`, and
`finish`; their data matches the corresponding method. `finish` needs no data.
No CLI operation controls or probes a website.

## Completion gate

A title becomes `complete` only when **one attempt** has all of the following:

- At least 60,000 ms of explicitly reviewed gameplay intervals backed by decoded
  video. Overlapping intervals are counted once, using their absolute capture
  times. Merely leaving a page open for one minute contributes zero played time.
- At least two observed gameplay actions linked to those intervals. Action IDs
  and video IDs from another attempt are rejected.
- At least ten decoded PNG/JPEG/WebP screenshots with distinct file hashes.
  Empty files, renamed text files, and copies of an existing screenshot do not
  count as additional evidence.
- Decoded audio covering at least 60,000 ms of the reviewed gameplay. An actual
  audio stream and measurable sound are required. Silent or video-only clips
  remain partial; an `audible: true` or `durationMs` supplied by a caller is
  rejected rather than trusted.
- All supporting files still exist with their original sizes and SHA-256 hashes.

`ffprobe` supplies durations and stream/dimension information. `ffmpeg` samples
video frames at 2 fps at 32 × 32 pixels for a conservative motion check; each
ten-second window of a claimed gameplay segment must show a frame change. This
is an integrity check, **not the saved recording's frame rate**. The original
recording is retained unchanged. `volumedetect` checks that an audio stream is
not silent (peak above −60 dB and mean above −80 dB). Recordings are limited to
ten minutes and media files to 1 GiB per file.

The journal cannot cryptographically prove that media came from the official
demo or that an observer truthfully reviewed it. The capture adapter and agent
must actually observe the demo and supply truthful timestamps/actions. These
checks reject common false-completion cases; they do not establish 100% game
parity, every bonus, every control, or provider mathematics. Long static pauses
can fail the motion gate and should be excluded from reviewed gameplay time.

## Network errors and interruption

```js
await journal.fail(gameId, attempt.id, {code: 'network-timeout'});
```

Transient codes are `network-timeout`, `connection-reset`, `dns-failure`,
`http-429`, `http-500`, `http-502`, `http-503`, and `http-504`. They remain in the
queue after cooldown, even though an earlier failure entry exists. Retry delays
start at one second and double, with an optional longer `retryAfterMs` respected.
There are at most three automatic retries after the initial failed attempt.
Exhausted titles remain visible as `retry-exhausted` and require coordinator
review; they are not silently marked finished or omitted from inventory.

Access-control codes are `access-denied`, `captcha`, `cloudflare-1010`, and
`protocol-denied`. These pause that host, including its remaining titles. The
journal never substitutes a proxy, fingerprint, client, or host. Only after
access has actually been reviewed/restored may the coordinator call
`acknowledgeHostRestored(host, {reviewed: true})` or the explicit `allow-host`
CLI action. Earlier denial records are retained.

Other partial-capture codes are `capture-interrupted`, `media-missing`,
`audio-unavailable`, and `capture-error`. Raw error/response payloads are not
stored. The journal accepts UI/motion metadata and media facts only.

If capture was interrupted, run:

```sh
node capture-journal.mjs recover /absolute/path/to/journal.json
```

This closes unfinished attempts as `interrupted`, preserves their partial
evidence, and returns the titles to the queue. Retrying creates a new attempt;
evidence from different attempts is never combined to cross the completion
threshold. `open` deliberately does not infer interruption merely because a
different CLI process is reading the journal.

Each event writes a temporary file, flushes it, atomically renames it to the
checkpoint, and flushes the directory. Leftover temporary files are ignored on
resume. A malformed canonical checkpoint fails closed. Previously completed
attempts are checked for missing/changed media when reopened and downgraded to
`partial` when their evidence no longer supports completion.

## Regression checks

```sh
node --test capture-journal.test.mjs
```

Tests generate clearly synthetic media in an operating-system temporary
directory and remove it afterward. None of those test files is gameplay
evidence, an official asset, or a production game. The tests cover retry/skip
regression, bounded retry and host pauses, interruption and checkpoint damage,
short/static/silent recordings, missing audio, duplicate screenshots, changed
files, overlap, and cross-attempt evidence mixing.

## Export existing sampled frames honestly

`assemble-sampled-clips.py` assembles already captured JPEG samples into a silent
MP4 and a detailed adjacent JSON summary. It accepts the root recorder's
`motion/segment-N.json` objects and the other observer's `motion/timestamps.json`
array or `{frames, recordedMs}` object.

```sh
python assemble-sampled-clips.py /absolute/game/directory --output-dir /absolute/export/directory
```

The encoder preserves actual millisecond sample spacing inside each segment,
does not interpolate or target a nominal 60 seconds, and does not add audio.
Inter-segment gaps are omitted from joined playback and explicitly recorded as
JSON discontinuities and MP4 chapter boundaries. For timestamp lists without
explicit segments, gaps exceeding the greater of two seconds or four times the
median sample interval infer a boundary; that inference is recorded in metadata.
`--inspect` validates inputs and reports the plan without writing an export.

Original frames are retained. Existing exports are not overwritten. The utility
verifies the encoded frame count, every presentation timestamp, chapter count,
duration, and absence of audio. A one-millisecond final packet per segment is
reported separately from observed time. Source blank/redraw frames are retained
and remain unverified. These MP4s are convenient sampled-reference playback,
not continuous native video and not evidence that a game was actively played
for its entire elapsed duration.
