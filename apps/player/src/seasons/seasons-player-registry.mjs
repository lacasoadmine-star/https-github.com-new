/**
 * ZPLAY 72-game rebuild queue. This catalog is DATA, not a game implementation.
 * Historical games and their routes stay untouched; each new game needs its own
 * renderer, rules, engine binding, receipt validator and release evidence.
 *
 * The M/F/C labels are USER-SUPPLIED REFERENCE HINTS ONLY, not interchangeable
 * slot or crash maths. In particular, Plinko/Mines/Tower/Road cannot inherit a
 * Multi Hot payouts contract by being listed next to it.
 */
export const SEASONS = Object.freeze([
  Object.freeze({ number: 1, start: 1, end: 15 }),
  Object.freeze({ number: 2, start: 16, end: 36 }),
  Object.freeze({ number: 3, start: 37, end: 56 }),
  Object.freeze({ number: 4, start: 57, end: 72 }),
]);

const REFERENCE_HINTS = Object.freeze({
  M: "multi_hot_5",
  F: "foxy_hot_20",
  C: "crash_engine",
});

const QUEUE = [
  [
    "Habesha Fortune 5",
    "habesha-fortune-5",
    "M"
  ],
  [
    "JetX",
    "jetx",
    "C"
  ],
  [
    "Multi Hot 5 Deluxe",
    "multi-hot-5-deluxe",
    "M"
  ],
  [
    "Multi Hot 10",
    "multi-hot-10",
    "M"
  ],
  [
    "Multi Hot 20",
    "multi-hot-20",
    "F"
  ],
  [
    "Multi Hot 40",
    "multi-hot-40",
    "F"
  ],
  [
    "Multi Hot 100",
    "multi-hot-100",
    "F"
  ],
  [
    "Bao Slot 5X",
    "bao-slot-5x",
    "M"
  ],
  [
    "Double X",
    "double-x",
    "M"
  ],
  [
    "Roll X",
    "roll-x",
    "M"
  ],
  [
    "Balloon",
    "balloon",
    "C"
  ],
  [
    "Plinko X Classic",
    "plinko-x-classic",
    "M"
  ],
  [
    "Plinko X",
    "plinko-x",
    "M"
  ],
  [
    "BalloonX",
    "balloonx",
    "C"
  ],
  [
    "CarX",
    "carx",
    "C"
  ],
  [
    "Helicopter X",
    "helicopter-x",
    "C"
  ],
  [
    "AviaStar",
    "aviastar",
    "C"
  ],
  [
    "Propel X",
    "propel-x",
    "C"
  ],
  [
    "PopX",
    "popx",
    "M"
  ],
  [
    "Football X",
    "football-x",
    "C"
  ],
  [
    "Cricket X",
    "cricket-x",
    "C"
  ],
  [
    "World Champion X",
    "world-champion-x",
    "C"
  ],
  [
    "Crash Duel",
    "crash-duel",
    "C"
  ],
  [
    "Mine Island",
    "mine-island",
    "M"
  ],
  [
    "Mine Island2",
    "mine-island-2",
    "M"
  ],
  [
    "Tower X",
    "tower-x",
    "M"
  ],
  [
    "Cheesy Road Classic",
    "cheesy-road-classic",
    "M"
  ],
  [
    "Cheesy Road",
    "cheesy-road",
    "M"
  ],
  [
    "Chicken Highway",
    "chicken-highway",
    "M"
  ],
  [
    "Chicken Ways",
    "chicken-ways",
    "F"
  ],
  [
    "Smash X",
    "smash-x",
    "M"
  ],
  [
    "CricketerX",
    "cricketerx",
    "C"
  ],
  [
    "Bottle Mania",
    "bottle-mania",
    "M"
  ],
  [
    "Fortune Catch",
    "fortune-catch",
    "F"
  ],
  [
    "Multi Hot Ways",
    "multi-hot-ways",
    "F"
  ],
  [
    "Burning Ice",
    "burning-ice",
    "M"
  ],
  [
    "Burning Ice 10",
    "burning-ice-10",
    "M"
  ],
  [
    "Burning Ice 40",
    "burning-ice-40",
    "F"
  ],
  [
    "Boka Jamba 10",
    "boka-jamba-10",
    "M"
  ],
  [
    "Hot Samba",
    "hot-samba",
    "F"
  ],
  [
    "Safari Simba",
    "safari-simba",
    "F"
  ],
  [
    "Power of Tiger",
    "power-of-tiger",
    "F"
  ],
  [
    "Farm’s Fortune",
    "farms-fortune",
    "F"
  ],
  [
    "Jungle Sisters",
    "jungle-sisters",
    "F"
  ],
  [
    "Jungle Sisters Deluxe",
    "jungle-sisters-deluxe",
    "F"
  ],
  [
    "Dragon’s Code",
    "dragons-code",
    "F"
  ],
  [
    "Dracula’s Fortune",
    "draculas-fortune",
    "F"
  ],
  [
    "Vampires",
    "vampires",
    "F"
  ],
  [
    "Samurai",
    "samurai",
    "F"
  ],
  [
    "Book of Futuria",
    "book-of-futuria",
    "F"
  ],
  [
    "Book of Bonanza",
    "book-of-bonanza",
    "F"
  ],
  [
    "Sugar Fiesta",
    "sugar-fiesta",
    "F"
  ],
  [
    "Mariachi Coins",
    "mariachi-coins",
    "F"
  ],
  [
    "Coins Of Atlantis",
    "coins-of-atlantis",
    "F"
  ],
  [
    "Dice Jungle",
    "dice-jungle",
    "M"
  ],
  [
    "Gates of Merlyn",
    "gates-of-merlyn",
    "F"
  ],
  [
    "Mad Slot",
    "mad-slot",
    "M"
  ],
  [
    "Jingle Bell Bonanza",
    "jingle-bell-bonanza",
    "F"
  ],
  [
    "Genie’s Bonanza",
    "genies-bonanza",
    "F"
  ],
  [
    "Bonus Time",
    "bonus-time",
    "F"
  ],
  [
    "4 Bonuses Bonanza",
    "4-bonuses-bonanza",
    "F"
  ],
  [
    "Wheel Of Destiny",
    "wheel-of-destiny",
    "M"
  ],
  [
    "Multi Hot Wheel",
    "multi-hot-wheel",
    "M"
  ],
  [
    "Cai Balao Cappadocia",
    "cai-balao-cappadocia",
    "F"
  ],
  [
    "Multi Hot 5 Wild",
    "multi-hot-5-wild",
    "M"
  ],
  [
    "Multi Hot 5 Burn Wilds",
    "multi-hot-5-burn-wilds",
    "M"
  ],
  [
    "Multi Hot 5 Super Wilds",
    "multi-hot-5-super-wilds",
    "M"
  ],
  [
    "Multi Hot Wild Ways",
    "multi-hot-wild-ways",
    "F"
  ],
  [
    "Wild Multi Stars",
    "wild-multi-stars",
    "F"
  ],
  [
    "Wilds and Gods",
    "wilds-and-gods",
    "F"
  ],
  [
    "Multi Fruits Charging Wilds",
    "multi-fruits-charging-wilds",
    "F"
  ],
  [
    "Gems Crown Charging Wilds",
    "gems-crown-charging-wilds",
    "F"
  ]
];

/** This is an observed Player route + server ID, NOT a production-ready claim. */
const OBSERVED = Object.freeze({
  "multi-hot-20": Object.freeze({
    gameId: "fresh_multihot20",
    path: "/new-games72/multi-hot-20/",
    evidence: "Cloudflare KV native72/batch01-20261121-r7/multihot20 and read-only browser check",
    state: "IN_PROGRESS",
  }),
});

export const SEASONS_CATALOG = Object.freeze(QUEUE.map(([name, slug, hint], index) => {
  const id = index + 1;
  const season = SEASONS.find((s) => id >= s.start && id <= s.end)?.number;
  if (!season || !REFERENCE_HINTS[hint]) throw new Error("INVALID_SEASONS_QUEUE");
  const observed = OBSERVED[slug];
  return Object.freeze({
    id, slug, name, season,
    referenceHint: REFERENCE_HINTS[hint],
    referenceVerified: false,
    buildStatus: observed?.state ?? "NOT_STARTED",
    engineGameId: observed?.gameId ?? null,
    observedPath: observed?.path ?? null,
    evidence: observed?.evidence ?? null,
    releaseApproved: false,
    playableVerified: false,
    preservedExisting: id === 1, // Do not overwrite the working Habesha game.
  });
}));

export function getSeason(number) {
  const season = SEASONS.find((s) => s.number === Number(number));
  if (!season) throw new Error("UNKNOWN_SEASON");
  return Object.freeze({
    ...season,
    games: Object.freeze(SEASONS_CATALOG.filter((g) => g.season === season.number)),
  });
}

export function findSeasonGame(slugOrId) {
  const term = String(slugOrId).trim().toLowerCase();
  const game = SEASONS_CATALOG.find((g) => g.slug === term || String(g.id) === term);
  if (!game) throw new Error("GAME_NOT_IN_SEASONS_REGISTRY");
  return game;
}

export function resolvePlayerGameBinding(slugOrId, playerOrigin = "https://superwin-player.apdiy61.workers.dev") {
  const game = findSeasonGame(slugOrId);
  const origin = new URL(playerOrigin);
  if (origin.protocol !== "https:" || origin.username || origin.password ||
      origin.search || origin.hash || (origin.pathname !== "/" && origin.pathname !== "")) {
    throw new Error("INVALID_PLAYER_ORIGIN");
  }
  const plannedPath = `/new-games72/${game.slug}/`;
  const observedUrl = game.observedPath ? new URL(game.observedPath, origin).href : null;
  return Object.freeze({
    ...game,
    playerPortalUrl: game.releaseApproved && game.playableVerified ? observedUrl : null,
    plannedPlayerUrl: new URL(plannedPath, origin).href,
    observedPlayerUrl: observedUrl,
    spinEndpoint: game.engineGameId ? "/api/slots/spin" : null,
    freshStateEndpoint: game.engineGameId ? "/api/slots/fresh-state" : null,
    settlement: "SERVER_RECEIPT_REQUIRED",
    modesVerified: Object.freeze([]),
    // Never claim DEMO/ETB parity or turn on Play Now based on a catalog entry.
  });
}
