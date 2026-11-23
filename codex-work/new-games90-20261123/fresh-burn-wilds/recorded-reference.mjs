/**
 * Fresh Burn Wilds — typed *recorded* reference adapter.
 *
 * This records measurements taken from this title's own authorised capture.
 * It validates metadata, NOT whether screenshots, video or sound truly match
 * provider behaviour. Do not ship a synthetic fixture as provider evidence.
 */
import {GAME_ID, REELS, ROWS} from './contract.mjs';

const error = code => {throw Object.assign(new Error(code), {code});};
const hash = h => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h);
const pct = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
const ms = v => Number.isSafeInteger(v) && v >= 20 && v <= 15000;
const source = v => typeof v === 'string' && v.length > 2 && v.length <= 256;
const gameSymbol = v => typeof v === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(v);

export function validateBurnRecordedReference(input, assetKeys) {
  if (!input || input.schema !== 'zplay/burn-wilds-recorded-reference/v1' ||
      input.gameId !== GAME_ID || input.gameName !== 'Multi Hot 5 Burn Wilds' ||
      input.reels !== REELS || input.rows !== ROWS) error('BURN_REFERENCE_IDENTITY');
  const ev = input.evidence;
  if (!ev || !source(ev.videoFile) || !hash(ev.videoSha256) ||
      !Array.isArray(ev.screenshots) || ev.screenshots.length < 2 ||
      ev.screenshots.some(x => !source(x.file) || !hash(x.sha256)) ||
      !source(ev.audioFile) || !hash(ev.audioSha256) ||
      ev.recordedSpinObserved !== true || ev.audibleAudioObserved !== true) {
    error('BURN_REFERENCE_CAPTURE_MISSING');
  }
  const r = input.reelWindow, m = input.multiplierPosition;
  if (!r || ![r.x,r.y,r.width,r.height].every(pct) ||
      r.width < .1 || r.height < .1 || r.x + r.width > 1 ||
      r.y + r.height > 1 || !m || ![m.x,m.y].every(pct)) error('BURN_REFERENCE_LAYOUT');
  const timing = input.timing;
  if (!timing || !ms(timing.symbolFrameMs) || !ms(timing.stopDurationMs) ||
      !ms(timing.fastStopDurationMs) || timing.fastStopDurationMs > timing.stopDurationMs ||
      !Array.isArray(timing.reelStopFractions) || timing.reelStopFractions.length !== REELS ||
      timing.reelStopFractions.some((v,i,a)=>!pct(v) || v<=0 || (i>0 && v<=a[i-1])) ||
      timing.reelStopFractions.at(-1) !== 1) error('BURN_REFERENCE_TIMING');
  if (!Array.isArray(assetKeys) || assetKeys.length<2 ||
      !assetKeys.includes('wild') || assetKeys.some(x=>!gameSymbol(x))) {
    error('BURN_REFERENCE_ASSET_KEYS');
  }
  if (!Array.isArray(input.symbolCycle) || input.symbolCycle.length<2 ||
      input.symbolCycle.some(s=>!assetKeys.includes(s))) error('BURN_REFERENCE_SYMBOL_CYCLE');
  return Object.freeze({
    gameId: GAME_ID,
    evidence: Object.freeze({
      videoFile: ev.videoFile, videoSha256: ev.videoSha256,
      screenshots: Object.freeze(ev.screenshots.map(s=>Object.freeze({file:s.file,sha256:s.sha256}))),
      audioFile: ev.audioFile, audioSha256: ev.audioSha256
    }),
    reelWindow: Object.freeze({x:r.x,y:r.y,width:r.width,height:r.height}),
    multiplierPosition: Object.freeze({x:m.x,y:m.y}),
    timing: Object.freeze({
      symbolFrameMs:timing.symbolFrameMs,
      stopDurationMs:timing.stopDurationMs,
      fastStopDurationMs:timing.fastStopDurationMs,
      reelStopFractions:Object.freeze([...timing.reelStopFractions])
    }),
    symbolCycle: Object.freeze([...input.symbolCycle])
  });
}
