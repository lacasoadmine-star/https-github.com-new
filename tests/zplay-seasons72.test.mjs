// Offline-only tests: NO account access, network, real wallet or production SPIN.
import assert from "node:assert/strict";
import test from "node:test";
import {
  SEASONS, SEASONS_CATALOG, getSeason, findSeasonGame, resolvePlayerGameBinding
} from "../apps/player/src/seasons/seasons-player-registry.mjs";
import {
  executeAuthoritativeSpin, recoverSeasonSpin, validateSeasonReceipt,
  inspectPendingSeasonRound
} from "../apps/player/src/seasons/season-spin-bridge.mjs";

test("four seasons contain exactly 72 distinct numbered games", () => {
  assert.equal(SEASONS.length, 4);
  assert.deepEqual(SEASONS.map(({start,end}) => [start,end]),
    [[1,15],[16,36],[37,56],[57,72]]);
  assert.equal(SEASONS_CATALOG.length, 72);
  assert.deepEqual(SEASONS_CATALOG.map(x => x.id),
    Array.from({length:72}, (_,i) => i+1));
  assert.equal(new Set(SEASONS_CATALOG.map(x => x.slug)).size,72);
  for (const season of SEASONS) {
    const bundle = getSeason(season.number);
    assert.equal(bundle.games.length, season.end-season.start+1);
    assert.ok(bundle.games.every(g => g.season === season.number));
  }
});

test("specific queue identities preserve user ordering and independent references", () => {
  assert.equal(findSeasonGame(1).slug, "habesha-fortune-5");
  assert.equal(findSeasonGame(15).slug, "carx");
  assert.equal(findSeasonGame(16).slug, "helicopter-x");
  assert.equal(findSeasonGame(36).slug, "burning-ice");
  assert.equal(findSeasonGame(37).slug, "burning-ice-10");
  assert.equal(findSeasonGame(56).slug, "gates-of-merlyn");
  assert.equal(findSeasonGame(57).slug, "mad-slot");
  assert.equal(findSeasonGame(72).slug, "gems-crown-charging-wilds");
  assert.equal(findSeasonGame("plinko-x").referenceHint, "multi_hot_5");
  assert.equal(findSeasonGame("jetx").referenceHint, "crash_engine");
});

test("previous builds are not falsely marked as rebuilt or production ready", () => {
  assert.ok(SEASONS_CATALOG.every(g => !g.releaseApproved && !g.playableVerified));
  assert.ok(SEASONS_CATALOG.every(g => g.buildStatus === "NOT_STARTED" ||
    g.buildStatus === "IN_PROGRESS"));
  assert.equal(findSeasonGame(1).preservedExisting, true);
  assert.equal(findSeasonGame("multi-hot-20").engineGameId, "fresh_multihot20");
  assert.equal(findSeasonGame("multi-hot-20").buildStatus, "IN_PROGRESS");
});

test("safe origin parsing and no fabricated live paths", () => {
  const g = resolvePlayerGameBinding(5);
  assert.equal(g.playerPortalUrl, null);
  assert.equal(g.observedPlayerUrl,
    "https://superwin-player.apdiy61.workers.dev/new-games72/multi-hot-20/");
  assert.equal(g.plannedPlayerUrl,
    "https://superwin-player.apdiy61.workers.dev/new-games72/multi-hot-20/");
  assert.deepEqual(g.modesVerified, []);
  for (const invalid of [
    "http://superwin-player.apdiy61.workers.dev",
    "https://host.example.invalid/path",
    "https://user:pass@host.example.invalid"
  ]) assert.throws(() => resolvePlayerGameBinding(5, invalid), /INVALID_PLAYER_ORIGIN/);
  assert.throws(() => resolvePlayerGameBinding("unknown"), /GAME_NOT_IN_SEASONS_REGISTRY/);
});

test("every game refuses unverified ETB or DEMO wagers before any API request", async () => {
  let calls = 0;
  const request = async () => { calls++; throw new Error("MUST_NOT_CALL"); };
  const storage = {
    getItem() { return null; }, setItem() { throw new Error("MUST_NOT_SAVE"); },
    removeItem() { throw new Error("MUST_NOT_REMOVE"); }
  };
  for (const g of SEASONS_CATALOG) {
    await assert.rejects(
      executeAuthoritativeSpin({gameSlug:g.slug,stakeAmount:"1.00",request,storage}),
      /GAME_RELEASE_NOT_VERIFIED|DEMO_WALLET_ISOLATION_NOT_VERIFIED/
    );
  }
  await assert.rejects(executeAuthoritativeSpin({
    gameSlug:"multi-hot-20", stakeAmount:"1.00",
    walletMode:"DEMO",request,storage
  }),/DEMO_WALLET_ISOLATION_NOT_VERIFIED/);
  assert.equal(calls,0);
});

test("recovery refuses unverified games with no network or wallet action", async () => {
  let calls=0;
  await assert.rejects(recoverSeasonSpin({
    gameSlug:"multi-hot-20",request:async()=>{calls++;},
    storage:{ getItem(){throw new Error("MUST_NOT_TOUCH_STORAGE")} }
  }),/GAME_RELEASE_NOT_VERIFIED/);
  assert.equal(calls,0);
});

test("no local payout calculation; validate real-shape M20 receipts only", () => {
  const guard = "a".repeat(64), mathSha256 = "b".repeat(64);
  const action = {
    gameId:"fresh_multihot20",bet:"1.00",
    roundToken:"12345678-1234-4234-8234-123456789abc",
    sessionGuard:guard, mathVersion:"version-1",
    engineVersion:"engine-1", mathSha256
  };
  const model={symbols:["seven","orange"],...action};
  const receipt={
    gameId:action.gameId,bet:action.bet,currency:"ETB",
    roundId:"abcdefab-1234-4234-8234-0123456789ab",
    isFree:false, grid:Array.from({length:3},()=>Array(5).fill("orange")),
    wheelMultiplier:2,winLines:[],
    mathVersion:action.mathVersion,engineVersion:action.engineVersion,
    mathSha256:action.mathSha256,finalWin:"0.00",
    walletReceipt:{
      currency:"ETB", chargedStake:"1.00", finalWin:"0.00",
      balanceBefore:"100.00", balanceAfter:"99.00"
    }
  };
  assert.equal(validateSeasonReceipt("multi-hot-20",receipt,action,model),receipt);
  assert.throws(()=>validateSeasonReceipt("multi-hot-20",{
    ...receipt,walletReceipt:{...receipt.walletReceipt,balanceAfter:"100.00"}
  },action,model),/RECEIPT_WALLET_SETTLEMENT_INVALID/);
  assert.throws(()=>validateSeasonReceipt("jetx",receipt,action,model),
    /PER_GAME_RECEIPT_VALIDATOR_NOT_BUILT/);
});

test("never invent a persisted spin state", () => {
  assert.equal(inspectPendingSeasonRound("multi-hot-20", {
    getItem(){return null;}
  }),false);
  assert.equal(inspectPendingSeasonRound("multi-hot-20", {
    getItem(){return '{"roundToken":"saved"}';}
  }),true);
});
