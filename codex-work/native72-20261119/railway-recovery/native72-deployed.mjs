// server-fixes/native-rules-20261107/src/native72-line-core.mjs
import { randomInt, randomUUID, createHash } from "node:crypto";

// player-machines/public/contract.mjs
var assert = (condition, code) => {
  if (!condition) throw Error(code);
};
function units(value, decimals = 4) {
  assert(typeof value === "string" && /^(0|[1-9]\d{0,12})(?:\.\d{1,4})?$/.test(value), "INVALID_MONEY");
  const [whole, fraction = ""] = value.split(".");
  assert(fraction.length <= decimals, "MONEY_PRECISION");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0"));
}
function decimal(value, places = 2) {
  value = BigInt(value);
  assert(value >= 0n, "NEGATIVE_MONEY");
  const scale = 10n ** BigInt(places);
  return `${value / scale}.${String(value % scale).padStart(places, "0")}`;
}
function gridFromStops(g, stops) {
  assert(Array.isArray(stops) && stops.length === g.reels, "INVALID_STOPS");
  stops.forEach((s, c) => assert(Number.isInteger(s) && s >= 0 && s < g.strips[c].length, "INVALID_STOP"));
  return Array.from({ length: g.rows }, (_, r) => g.strips.map((s, c) => s[(stops[c] + r - Math.floor(g.rows / 2) + s.length) % s.length]));
}
function evaluate(g, grid, bet, wheel, isFree = false) {
  assert(Array.isArray(grid) && grid.length === g.rows && grid.every((row) => Array.isArray(row) && row.length === g.reels && row.every((s) => g.symbols.includes(s))), "INVALID_GRID");
  assert(g.wheel.values.includes(wheel), "INVALID_MULTIPLIER");
  const stake = units(bet), per = stake / BigInt(g.paylines);
  assert(stake > 0n && stake % BigInt(g.paylines) === 0n, "INVALID_BET_SPLIT");
  const wins = [];
  for (let i = 0; i < g.linePaths.length; i++) {
    const rows = g.linePaths[i], sequence = rows.map((r, c) => grid[r][c]);
    let best = null;
    for (const [symbol, pay] of Object.entries(g.paytable)) {
      let count = 0;
      while (count < sequence.length && (sequence[count] === symbol || g.rules.wildSymbols.includes(sequence[count]))) count++;
      if (count < 3 || !pay[count]) continue;
      const base = per * BigInt(pay[count]), value = base * BigInt(wheel) * (isFree ? BigInt(g.features.freeSpins.winMultiplier) : 1n);
      const win = { line: i + 1, rows, symbol, count, positions: rows.slice(0, count).map((r, c) => [r, c]), wilds: sequence.slice(0, count).filter((s) => g.rules.wildSymbols.includes(s)).length, baseWin: decimal(base, 4), win: decimal(value, 4) };
      if (!best || value > units(best.win) || value === units(best.win) && count > best.count) best = win;
    }
    if (best) wins.push(best);
  }
  const scatterCount = grid.flat().filter((s) => s === "scatter").length;
  const scatterRules = g.rules.scatter, pays = scatterRules?.pays || {}, scatterPay = scatterRules && scatterCount >= scatterRules.trigger ? pays[Math.min(5, scatterCount)] || 0 : 0;
  const scatter = stake * BigInt(scatterPay) * BigInt(scatterRules?.multipliedByWheel ? wheel : 1);
  const line = wins.reduce((n, w) => n + units(w.win), 0n), total = line + scatter, cap = stake * BigInt(g.maxWinMultiplier);
  return { wins, line, scatter, total, final: total > cap ? cap : total, scatterCount, bonus: scatterCount >= g.features.freeSpins.trigger && (!isFree || g.features.freeSpins.retrigger) ? g.features.freeSpins.spins : 0 };
}

// server-fixes/native-rules-20261107/src/native72-line-core.mjs
var requireValue = (condition, code) => {
  if (!condition) throw Error(code);
};
var freeze = (value) => {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
function createNative72LineCore(definitions) {
  const games = /* @__PURE__ */ new Map();
  for (const input of definitions) {
    const model = structuredClone(input);
    requireValue(!games.has(model.id), "DUPLICATE_NATIVE_GAME");
    requireValue(model.rules.scatter === null && model.rules.wildSymbols.length === 0 && model.features.freeSpins.spins === 0 && model.features.cascadeLimit === 0 && !model.features.bonusPick && !model.features.wildStack && !model.features.maxStackMultiplier && Object.keys(model.features.jackpots).length === 0, "UNSUPPORTED_LINE_FEATURE");
    requireValue(model.linePaths.length === model.paylines && new Set(model.linePaths.map((p) => p.join(","))).size === model.paylines, "INVALID_PAYLINES");
    requireValue(model.linePaths.every((p) => p.length === model.reels && p.every((r) => Number.isInteger(r) && r >= 0 && r < model.rows)), "INVALID_PAYLINE_GEOMETRY");
    requireValue(model.strips.length === model.reels && model.strips.every((s) => s.length >= model.rows && s.every((v) => model.symbols.includes(v))), "INVALID_REEL_LAYOUT");
    requireValue(model.betLevels.every((b) => units(b) > 0n && units(b) % BigInt(model.paylines) === 0n), "INVALID_WAGER_LADDER");
    requireValue(model.wheel.values.length === model.wheel.weights.length && model.wheel.weights.every((w) => Number.isSafeInteger(w) && w > 0), "INVALID_WHEEL");
    requireValue(Number.isSafeInteger(model.wheel.weights.reduce((a, b) => a + b, 0)) && model.wheel.values.every((v) => Number.isSafeInteger(v) && v > 0), "INVALID_WHEEL");
    requireValue(Number.isSafeInteger(model.maxWinMultiplier) && model.maxWinMultiplier > 0, "INVALID_WIN_CAP");
    requireValue(Object.values(model.paytable).every((table) => Object.entries(table).every(([count, pay]) => Number.isInteger(Number(count)) && Number(count) >= 3 && Number(count) <= model.reels && Number.isSafeInteger(pay) && pay > 0)), "INVALID_PAYTABLE");
    const { enabled, ...identity } = model;
    model.mathSha256 = createHash("sha256").update(JSON.stringify(identity)).digest("hex");
    games.set(model.id, freeze(model));
  }
  const getGame = (id) => {
    requireValue(games.has(id), "UNKNOWN_GAME");
    return games.get(id);
  };
  function draw(drawer, size) {
    const value = drawer(size);
    requireValue(Number.isInteger(value) && value >= 0 && value < size, "INVALID_RANDOM_DRAW");
    return value;
  }
  function spin(id, bet, options = {}) {
    const g = getGame(id);
    requireValue(g.enabled, "GAME_UNAVAILABLE");
    requireValue(!options.isFree, "FREE_SPINS_UNSUPPORTED");
    requireValue(g.betLevels.includes(bet), "BET_LEVEL_NOT_ALLOWED");
    const drawer = options.draw || randomInt, stops = g.strips.map((s) => draw(drawer, s.length));
    let ticket = draw(drawer, g.wheel.weights.reduce((a, b) => a + b, 0)), wheel;
    for (let i = 0; i < g.wheel.weights.length; i++) {
      if (ticket < g.wheel.weights[i]) {
        wheel = g.wheel.values[i];
        break;
      }
      ticket -= g.wheel.weights[i];
    }
    const grid = gridFromStops(g, stops), value = evaluate(g, grid, bet, wheel);
    const stage = {
      grid,
      winLines: value.wins,
      lineWin: decimal(value.line, 4),
      jackpotWin: "0.0000",
      scatterWin: "0.0000",
      win: decimal(value.total, 4),
      stackMultiplier: wheel,
      cascadeMultiplier: 1
    };
    return {
      roundId: randomUUID(),
      gameId: id,
      engineVersion: g.engineVersion,
      mathVersion: g.mathVersion,
      mathSha256: g.mathSha256,
      grid,
      initialGrid: grid,
      stops,
      wheelMultiplier: wheel,
      wheelPosition: g.wheel.position,
      winLines: value.wins,
      stages: [stage],
      bet,
      chargedStake: decimal(units(bet), 4),
      isFree: false,
      finalWin: decimal(value.final, 4),
      uncappedWin: decimal(value.total, 4),
      bonusSpinsAwarded: 0,
      scatterCount: 0,
      jackpotTier: null,
      pendingBonusPick: false,
      dragonFire: false,
      maxWinCapped: value.total > value.final,
      currency: "ETB"
    };
  }
  return Object.freeze({
    getGame,
    spin,
    publicGames: () => [...games.values()].map((g) => structuredClone(g)),
    modelIdentity: (id) => {
      const g = getGame(id);
      return { mathVersion: g.mathVersion, engineVersion: g.engineVersion, mathSha256: g.mathSha256 };
    }
  });
}

// server-fixes/native-rules-20261107/src/native72-dispatch.mjs
function extendNativeCore(existing, extension) {
  const added = extension.publicGames();
  const targets = new Set(added.map((game) => game.id));
  for (const id of targets) {
    if (Object.hasOwn(existing.MATH.games, id)) throw Error("EXISTING_GAME_REPLACEMENT");
  }
  const extraGames = Object.fromEntries(added.map((game) => [game.id, extension.getGame(game.id)]));
  const identity = (id) => targets.has(id) ? extension.modelIdentity(id) : existing.modelIdentity(id);
  return Object.freeze({
    ...existing,
    MATH: Object.freeze({ ...existing.MATH, games: Object.freeze({ ...existing.MATH.games, ...extraGames }) }),
    isAdditionalGame: (id) => targets.has(id),
    modelIdentity: identity,
    getGame: (id) => targets.has(id) ? extension.getGame(id) : existing.getGame(id),
    spin: (id, bet, options = {}) => targets.has(id) ? extension.spin(id, bet, options) : existing.spin(id, bet, options),
    receiptGame(id, receipt) {
      if (!targets.has(id)) return existing.receiptGame(id, receipt);
      const expected = identity(id);
      if (receipt?.gameId !== id || !["mathVersion", "engineVersion", "mathSha256"].every((k) => receipt[k] === expected[k])) return null;
      return extension.getGame(id);
    },
    publicGames: () => [...existing.publicGames(), ...extension.publicGames()]
  });
}

// player-machines/expansion72/models/habesha_fortune_5_native.json
var habesha_fortune_5_native_default = {
  id: "habesha_fortune_5_native",
  name: "Habesha Fortune 5",
  reels: 3,
  rows: 3,
  paylines: 5,
  theme: "habesha",
  symbols: [
    "symbol_0",
    "symbol_1",
    "symbol_2",
    "symbol_3",
    "symbol_4",
    "symbol_5",
    "symbol_6",
    "symbol_7",
    "symbol_8"
  ],
  strips: [
    [
      "symbol_3",
      "symbol_6",
      "symbol_2",
      "symbol_7",
      "symbol_0",
      "symbol_1",
      "symbol_4",
      "symbol_8",
      "symbol_5"
    ],
    [
      "symbol_6",
      "symbol_8",
      "symbol_3",
      "symbol_4",
      "symbol_2",
      "symbol_1",
      "symbol_5",
      "symbol_7",
      "symbol_0"
    ],
    [
      "symbol_1",
      "symbol_5",
      "symbol_3",
      "symbol_8",
      "symbol_7",
      "symbol_2",
      "symbol_4",
      "symbol_6",
      "symbol_0"
    ]
  ],
  reelStrips: [
    [
      "symbol_3",
      "symbol_6",
      "symbol_2",
      "symbol_7",
      "symbol_0",
      "symbol_1",
      "symbol_4",
      "symbol_8",
      "symbol_5"
    ],
    [
      "symbol_6",
      "symbol_8",
      "symbol_3",
      "symbol_4",
      "symbol_2",
      "symbol_1",
      "symbol_5",
      "symbol_7",
      "symbol_0"
    ],
    [
      "symbol_1",
      "symbol_5",
      "symbol_3",
      "symbol_8",
      "symbol_7",
      "symbol_2",
      "symbol_4",
      "symbol_6",
      "symbol_0"
    ]
  ],
  linePaths: [
    [
      1,
      1,
      1
    ],
    [
      0,
      0,
      0
    ],
    [
      2,
      2,
      2
    ],
    [
      0,
      1,
      2
    ],
    [
      2,
      1,
      0
    ]
  ],
  paytable: {
    symbol_0: {
      "3": 10
    },
    symbol_1: {
      "3": 10
    },
    symbol_2: {
      "3": 10
    },
    symbol_3: {
      "3": 10
    },
    symbol_4: {
      "3": 20
    },
    symbol_5: {
      "3": 20
    },
    symbol_6: {
      "3": 25
    },
    symbol_7: {
      "3": 50
    },
    symbol_8: {
      "3": 75
    }
  },
  betLevels: [
    "0.05",
    "0.10",
    "0.20",
    "0.30",
    "0.40",
    "0.50",
    "0.60",
    "0.80",
    "1.00",
    "1.50",
    "2.00",
    "3.00",
    "4.00",
    "5.00",
    "6.00",
    "8.00",
    "10.00",
    "15.00",
    "20.00",
    "30.00",
    "40.00",
    "50.00",
    "60.00",
    "80.00",
    "100.00",
    "150.00",
    "200.00",
    "300.00",
    "400.00"
  ],
  wheel: {
    position: "side",
    values: [
      1,
      2,
      3,
      4,
      5
    ],
    weights: [
      1,
      1,
      1,
      1,
      1
    ]
  },
  maxWinMultiplier: 145,
  currency: "ETB",
  mathVersion: "2026-11-19-habesha-native-v1",
  engineVersion: "superwin-native72-line-v1",
  features: {
    freeSpins: {
      trigger: 100,
      spins: 0,
      retrigger: false,
      winMultiplier: 1
    },
    gambleRounds: 5,
    gambleMaxStake: "500.00",
    cascadeLimit: 0,
    maxStackMultiplier: 0,
    wildStack: false,
    jackpots: {},
    bonusPick: false
  },
  rules: {
    lineDirection: "left_to_right",
    minimumMatch: 3,
    betAllocation: "total_bet_divided_by_lines",
    wildSymbols: [],
    wildReplacesScatter: false,
    scatter: null,
    settlement: {
      calculationDecimals: 4,
      walletDecimals: 2,
      rounding: "floor"
    },
    gamble: {
      choices: [
        "RED",
        "BLACK"
      ],
      winProbability: 0.475,
      winMultiplier: 2,
      maxRounds: 5,
      maxStake: "500.00"
    }
  },
  probabilityProvenance: {
    kind: "local",
    reelDistribution: "uniform nine-symbol strips",
    multiplierDistribution: "uniform 1 through 5",
    gamble: "existing native local policy",
    providerCertified: false
  },
  sourceEvidence: {
    configurationSha256: "961565414944d497ce6dceb6106488b7ae5feb9509ea82cea072437af0a95451",
    observationSha256: "ac9f5a88efd334a9a614a1595c6507a92ddfea6e9be8aeb6ec982248fbd91fe9",
    observedDemoRounds: 140,
    observedPaylines: 5
  },
  enabled: false
};

// player-machines/expansion72/models/multi_hot_5_deluxe_native.json
var multi_hot_5_deluxe_native_default = {
  id: "multi_hot_5_deluxe_native",
  name: "Multi Hot 5 Deluxe",
  reels: 3,
  rows: 3,
  paylines: 5,
  theme: "mh5deluxe",
  symbols: [
    "symbol_0",
    "symbol_1",
    "symbol_2",
    "symbol_3",
    "symbol_4",
    "symbol_5",
    "symbol_6",
    "symbol_7",
    "symbol_8"
  ],
  strips: [
    [
      "symbol_3",
      "symbol_1",
      "symbol_2",
      "symbol_4",
      "symbol_8",
      "symbol_7",
      "symbol_5",
      "symbol_6",
      "symbol_0"
    ],
    [
      "symbol_3",
      "symbol_4",
      "symbol_8",
      "symbol_2",
      "symbol_7",
      "symbol_5",
      "symbol_1",
      "symbol_6",
      "symbol_0"
    ],
    [
      "symbol_7",
      "symbol_4",
      "symbol_3",
      "symbol_0",
      "symbol_5",
      "symbol_6",
      "symbol_8",
      "symbol_1",
      "symbol_2"
    ]
  ],
  reelStrips: [
    [
      "symbol_3",
      "symbol_1",
      "symbol_2",
      "symbol_4",
      "symbol_8",
      "symbol_7",
      "symbol_5",
      "symbol_6",
      "symbol_0"
    ],
    [
      "symbol_3",
      "symbol_4",
      "symbol_8",
      "symbol_2",
      "symbol_7",
      "symbol_5",
      "symbol_1",
      "symbol_6",
      "symbol_0"
    ],
    [
      "symbol_7",
      "symbol_4",
      "symbol_3",
      "symbol_0",
      "symbol_5",
      "symbol_6",
      "symbol_8",
      "symbol_1",
      "symbol_2"
    ]
  ],
  linePaths: [
    [
      1,
      1,
      1
    ],
    [
      0,
      0,
      0
    ],
    [
      2,
      2,
      2
    ],
    [
      0,
      1,
      2
    ],
    [
      2,
      1,
      0
    ]
  ],
  paytable: {
    symbol_0: {
      "3": 10
    },
    symbol_1: {
      "3": 10
    },
    symbol_2: {
      "3": 10
    },
    symbol_3: {
      "3": 10
    },
    symbol_4: {
      "3": 20
    },
    symbol_5: {
      "3": 20
    },
    symbol_6: {
      "3": 25
    },
    symbol_7: {
      "3": 50
    },
    symbol_8: {
      "3": 75
    }
  },
  betLevels: [
    "0.05",
    "0.10",
    "0.20",
    "0.30",
    "0.40",
    "0.50",
    "0.60",
    "0.80",
    "1.00",
    "1.50",
    "2.00",
    "3.00",
    "4.00",
    "5.00",
    "6.00",
    "8.00",
    "10.00",
    "15.00",
    "20.00",
    "30.00",
    "40.00",
    "50.00",
    "60.00",
    "80.00",
    "100.00",
    "150.00",
    "200.00",
    "300.00",
    "400.00"
  ],
  wheel: {
    position: "side",
    values: [
      1,
      2,
      3,
      4,
      5
    ],
    weights: [
      1,
      1,
      1,
      1,
      1
    ]
  },
  maxWinMultiplier: 145,
  currency: "ETB",
  mathVersion: "2026-11-19-mh5deluxe-native-v1",
  engineVersion: "superwin-native72-line-v1",
  features: {
    freeSpins: {
      trigger: 100,
      spins: 0,
      retrigger: false,
      winMultiplier: 1
    },
    gambleRounds: 5,
    gambleMaxStake: "500.00",
    cascadeLimit: 0,
    maxStackMultiplier: 0,
    wildStack: false,
    jackpots: {},
    bonusPick: false
  },
  rules: {
    lineDirection: "left_to_right",
    minimumMatch: 3,
    betAllocation: "total_bet_divided_by_lines",
    wildSymbols: [],
    wildReplacesScatter: false,
    scatter: null,
    settlement: {
      calculationDecimals: 4,
      walletDecimals: 2,
      rounding: "floor"
    },
    gamble: {
      choices: [
        "RED",
        "BLACK"
      ],
      winProbability: 0.475,
      winMultiplier: 2,
      maxRounds: 5,
      maxStake: "500.00"
    }
  },
  probabilityProvenance: {
    kind: "local",
    reelDistribution: "uniform nine-symbol strips",
    multiplierDistribution: "uniform 1 through 5",
    gamble: "existing native local policy",
    providerCertified: false
  },
  sourceEvidence: {
    configurationSha256: "4b4d7c2ca4d11ca6700945ba004342af26ef37363233f2eb478df3ffa090a374",
    observationSha256: "7e8dffad7bfafbf0f4f1c934492e748725e17b8b65717123e154b5314314a6a8",
    observedDemoRounds: 100,
    observedPaylines: 5
  },
  enabled: false
};

// server-fixes/native-rules-20261107/src/native72-entry.mjs
var additionalIds = Object.freeze([habesha_fortune_5_native_default.id, multi_hot_5_deluxe_native_default.id]);
function extendWithNative72(existing, { enabled = false, deluxeEnabled = false } = {}) {
  return extendNativeCore(existing, createNative72LineCore([{ ...habesha_fortune_5_native_default, enabled: enabled === true }, { ...multi_hot_5_deluxe_native_default, enabled: deluxeEnabled === true }]));
}
export {
  additionalIds,
  extendWithNative72
};
