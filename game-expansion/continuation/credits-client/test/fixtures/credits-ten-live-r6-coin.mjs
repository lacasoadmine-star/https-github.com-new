var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/credits-object-ten.mjs
import { DurableObject } from "cloudflare:workers";

// src/demo-store-ten.mjs
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";

// src/ten-title-models.mjs
var ten_title_models_exports = {};
__export(ten_title_models_exports, {
  act: () => act2,
  definitions: () => definitions5,
  evaluateDraftRound: () => evaluateDraftRound2,
  expire: () => expire2,
  publicGameConfigs: () => publicGameConfigs4,
  publicState: () => publicState2
});

// src/frozen/remaining20/models/smartsoft-slots.data.json
var smartsoft_slots_data_default = [
  {
    id: "multihot40_native",
    name: "Multi Hot 40",
    version: "superwin-multihot40-1",
    launchable: false,
    columns: 5,
    rows: 4,
    paths: [
      [
        0,
        0,
        0,
        0,
        0
      ],
      [
        1,
        1,
        1,
        1,
        1
      ],
      [
        2,
        2,
        2,
        2,
        2
      ],
      [
        3,
        3,
        3,
        3,
        3
      ],
      [
        1,
        0,
        0,
        0,
        1
      ],
      [
        2,
        1,
        1,
        1,
        2
      ],
      [
        3,
        2,
        2,
        2,
        3
      ],
      [
        2,
        3,
        3,
        3,
        2
      ],
      [
        1,
        2,
        2,
        2,
        1
      ],
      [
        0,
        1,
        1,
        1,
        0
      ],
      [
        0,
        1,
        0,
        1,
        0
      ],
      [
        1,
        2,
        1,
        2,
        1
      ],
      [
        2,
        3,
        2,
        3,
        2
      ],
      [
        3,
        2,
        3,
        2,
        3
      ],
      [
        2,
        1,
        2,
        1,
        2
      ],
      [
        1,
        0,
        1,
        0,
        1
      ],
      [
        0,
        0,
        1,
        0,
        0
      ],
      [
        1,
        1,
        2,
        1,
        1
      ],
      [
        2,
        2,
        3,
        2,
        2
      ],
      [
        3,
        3,
        2,
        3,
        3
      ],
      [
        2,
        2,
        1,
        2,
        2
      ],
      [
        1,
        1,
        0,
        1,
        1
      ],
      [
        1,
        0,
        0,
        0,
        0
      ],
      [
        2,
        1,
        1,
        1,
        1
      ],
      [
        3,
        2,
        2,
        2,
        2
      ],
      [
        0,
        1,
        1,
        1,
        1
      ],
      [
        1,
        2,
        2,
        2,
        2
      ],
      [
        2,
        3,
        3,
        3,
        3
      ],
      [
        0,
        0,
        1,
        1,
        1
      ],
      [
        1,
        1,
        2,
        2,
        2
      ],
      [
        2,
        2,
        3,
        3,
        3
      ],
      [
        1,
        1,
        0,
        0,
        0
      ],
      [
        2,
        2,
        1,
        1,
        1
      ],
      [
        3,
        3,
        2,
        2,
        2
      ],
      [
        0,
        0,
        0,
        1,
        1
      ],
      [
        3,
        3,
        3,
        2,
        2
      ],
      [
        0,
        0,
        0,
        0,
        1
      ],
      [
        3,
        3,
        3,
        3,
        2
      ],
      [
        0,
        1,
        2,
        1,
        0
      ],
      [
        3,
        2,
        1,
        2,
        3
      ]
    ],
    ways: 0,
    lineStakeDivisor: 40,
    coefficients: [
      [
        0,
        0,
        0,
        200,
        2e3,
        5e3
      ],
      [
        0,
        0,
        0,
        150,
        1e3,
        2e3
      ],
      [
        0,
        0,
        0,
        100,
        500,
        1e3
      ],
      [
        0,
        0,
        0,
        100,
        500,
        1e3
      ],
      [
        0,
        0,
        0,
        50,
        100,
        500
      ],
      [
        0,
        0,
        0,
        50,
        100,
        500
      ],
      [
        0,
        0,
        0,
        50,
        100,
        500
      ],
      [
        0,
        0,
        0,
        50,
        100,
        500
      ]
    ],
    symbols: [
      {
        id: "0",
        label: "Seven",
        mark: "7",
        color: "#fdd24a"
      },
      {
        id: "1",
        label: "Bell",
        mark: "\u265F",
        color: "#f28c28"
      },
      {
        id: "2",
        label: "Grapes",
        mark: "\u{1F347}",
        color: "#fdd24a"
      },
      {
        id: "3",
        label: "Watermelon",
        mark: "\u{1F349}",
        color: "#f28c28"
      },
      {
        id: "4",
        label: "Cherries",
        mark: "\u{1F352}",
        color: "#fdd24a"
      },
      {
        id: "5",
        label: "Orange",
        mark: "\u{1F34A}",
        color: "#f28c28"
      },
      {
        id: "6",
        label: "Plum",
        mark: "\u{1F7E3}",
        color: "#fdd24a"
      },
      {
        id: "7",
        label: "Lemon",
        mark: "\u{1F34B}",
        color: "#f28c28"
      }
    ],
    theme: {
      bg: "#151307",
      accent: "#fdd24a",
      secondary: "#f28c28"
    },
    wildSymbols: [],
    wildExclusions: [],
    sampling: [
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ]
    ],
    mechanic: "multiplier",
    expandingReels: [],
    coinChanceDenominator: 0,
    coinWildSymbol: null,
    addWildChanceDenominator: 0,
    maxFrames: 1,
    scale: {
      numerator: "1",
      denominator: "1"
    },
    officialReference: "https://www.smartsoftgaming.com/games/multi-hot-40",
    featureDescription: "40 fixed lines with an independent 1\xD7\u20135\xD7 multiplier.",
    referenceNotes: [
      "Public coefficient values are now preserved exactly; no payout calibration multiplier is applied. Independent probabilities and public-rule fidelity are under review; launching is disabled.",
      "Only listed fixed demo stake amounts are accepted. Demo currency is DMO; no claim is made that its numerical limits are a provider-approved ETB profile.",
      "Removed the invented global10,000 ceiling and Burning100\xD7cap. Uses the title-specific reference maximum numerically; any displayed multiplier maximum remains a conservative draft ceiling, with exact truncation-versus-outcome-support semantics unverified."
    ],
    rules: [
      "Fixed demo-derived stake schedule 0.40\u2013100.00 and numerical maximum payout 250000.00. Source currency is DMO; isolated draft maps the numbers1:1 into ETB. Production remains disabled.",
      "Highest eligible left-to-right award per line; simultaneous line wins add. The public reference maximum is used as a draft payout ceiling. Whether the source enforces that maximum by truncation or by restricting reachable outcomes remains under review.",
      "All results resolve on the server in one accepted round. Automatic features never require an extra debit.",
      "Every symbol is equally likely in each independent grid cell. The independent 1\xD7, 2\xD7, 3\xD7, 4\xD7 and 5\xD7 multipliers are equally likely.",
      "Fractional santim are rounded once for the total win without bias: the same committed server RNG pays either the lower or upper whole santim in proportion to the fractional part. The difference is at most one santim, and every result stays within the cap.",
      "This model is disabled pending official-demo public-rule parity and independent sampling calibration. Prior adaptation features and limits are not an approved faithful release.",
      "Official help states a maximum of 2500\xD7 the stake. The disabled draft uses that numerical ceiling; the private outcome restrictions that produce the source maximum are not known."
    ],
    math: {
      description: "Raw public coefficients and exact numerical demo stakes are preserved. This disabled draft uses an independent, uncalibrated outcome distribution. Exact uncapped enumeration and a50,000-round seeded pilot are recorded as diagnostics, not provider RTP or a release guarantee. Displayed numerical reference maxima are used as draft ceilings; source truncation-versus-reachable-outcome semantics remain unverified where they matter.",
      publicPayoutCoefficientsScaled: false,
      officialPrivateMathVerified: false,
      calibrationStatus: "pending_faithful_model",
      previousAdaptationEvidence: "references/independent-adaptation-superseded.json",
      rounding: {
        method: "unbiased total-santim rounding",
        rng: "Same committed server RNG stream, after every outcome/feature draw. No global randomness.",
        rule: "For exact fractional payout n+r santim, pay n+1 with probability r and n otherwise. Exact integers and already capped payouts require no rounding draw.",
        reserve: "Outcome-independent maximum is rounded UP before applying the published caps.",
        scope: "Applied once to the whole round; credited line/frame payouts sum exactly to that result."
      },
      targetReturn: null,
      measuredReturn: null,
      diagnosticEvidence: "references/first11-raw-prize-diagnostic.json",
      independentDraftDiagnostic: {
        analyticBeforeReferenceMaximum: {
          method: "Exact enumeration of every symbol sequence on one path; linearity across actual lines/ways and independent mean multiplier3. No cap or outcome-support claim.",
          sequences: 32768,
          effectiveSymbolWeights: [
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1
          ],
          returnFraction: {
            numerator: "6285",
            denominator: "8192"
          },
          expectedReturn: 0.7672119140625
        },
        pilot: {
          sampleCount: 5e4,
          seed: 1705836544,
          prng: "SFC32 with20 warmup outputs",
          meanBeforeCeiling: 0.760805,
          meanAfterDraftReferenceCeiling: 0.760805,
          confidence99NormalApproximation: [
            0.7186218565725172,
            0.8029881434274827
          ],
          sampleMaximumReturn: 140,
          sourceCeilingEvents: 0,
          stakeMaximumMinor: "10000",
          reserveAtMaximumMinor: "25000000",
          scope: "Uncalibrated disabled draft; confidence approximation is diagnostic, not certification. Same return applies to every listed stake because raw payouts are integral and maxima scale proportionally or remain above the raw model bound."
        },
        releaseReady: false
      }
    },
    scatters: [],
    releaseGate: {
      status: "blocked_by_a_to_z_reference_requirement",
      productionLaunchable: false,
      required: [
        "presentation_audio",
        "gamble_collect",
        "source_maximum_semantics",
        "independent_probability_calibration",
        "currency_profile"
      ],
      manifest: "references/first11-release-divergences.json",
      reason: "Raw coefficients, exact schedules and numerical reference maxima are aligned. Public controls/presentation, source maximum semantics and Burning respin rules remain incomplete; independent probabilities are uncalibrated."
    },
    previousAdaptationScale: {
      numerator: "198656",
      denominator: "157125"
    },
    stakeMinorValues: [
      "40",
      "80",
      "120",
      "160",
      "200",
      "400",
      "600",
      "800",
      "1000",
      "1200",
      "1600",
      "2000",
      "3000",
      "4000",
      "5000",
      "6000",
      "8000",
      "10000"
    ],
    minStake: "0.40",
    maxStake: "100.00",
    referenceStakeSchedule: {
      currency: "DMO",
      lines: 40,
      chipCoefficient: "0.01",
      perLineValues: [
        1,
        2,
        3,
        4,
        5,
        10,
        15,
        20,
        25,
        30,
        40,
        50,
        75,
        100,
        125,
        150,
        200,
        250
      ],
      minimum: "0.40",
      maximum: "100.00",
      source: "references/public-models/multihot40_native.json",
      status: "verified_demo_values; production_currency_profile_requires_review"
    },
    referenceLimits: {
      currency: "DMO",
      maximumWin: "250000.00",
      maximumWinMultiplier: 2500,
      DoublingMaxCount: "5.0",
      DoublingMaxWin: "500.00",
      doublingLimitMeaningVerified: false
    },
    maxWin: "250000.00",
    winMultiplierCap: 2500,
    currencyAdaptation: {
      source: "DMO",
      draft: "ETB",
      method: "Numerical 1:1 mapping of demo values only; not an exchange rate or provider-approved ETB profile.",
      productionLaunchable: false
    }
  },
  {
    id: "multihot100_native",
    name: "Multi Hot 100",
    version: "superwin-multihot100-1",
    launchable: false,
    columns: 5,
    rows: 4,
    paths: [
      [
        0,
        0,
        0,
        0,
        0
      ],
      [
        1,
        1,
        1,
        1,
        1
      ],
      [
        2,
        2,
        2,
        2,
        2
      ],
      [
        3,
        3,
        3,
        3,
        3
      ],
      [
        1,
        0,
        0,
        0,
        1
      ],
      [
        2,
        1,
        1,
        1,
        2
      ],
      [
        3,
        2,
        2,
        2,
        3
      ],
      [
        2,
        3,
        3,
        3,
        2
      ],
      [
        1,
        2,
        2,
        2,
        1
      ],
      [
        0,
        1,
        1,
        1,
        0
      ],
      [
        0,
        1,
        0,
        1,
        0
      ],
      [
        1,
        2,
        1,
        2,
        1
      ],
      [
        2,
        3,
        2,
        3,
        2
      ],
      [
        3,
        2,
        3,
        2,
        3
      ],
      [
        2,
        1,
        2,
        1,
        2
      ],
      [
        1,
        0,
        1,
        0,
        1
      ],
      [
        0,
        0,
        1,
        0,
        0
      ],
      [
        1,
        1,
        2,
        1,
        1
      ],
      [
        2,
        2,
        3,
        2,
        2
      ],
      [
        3,
        3,
        2,
        3,
        3
      ],
      [
        2,
        2,
        1,
        2,
        2
      ],
      [
        1,
        1,
        0,
        1,
        1
      ],
      [
        1,
        0,
        0,
        0,
        0
      ],
      [
        2,
        1,
        1,
        1,
        1
      ],
      [
        3,
        2,
        2,
        2,
        2
      ],
      [
        0,
        1,
        1,
        1,
        1
      ],
      [
        1,
        2,
        2,
        2,
        2
      ],
      [
        2,
        3,
        3,
        3,
        3
      ],
      [
        0,
        0,
        1,
        1,
        1
      ],
      [
        1,
        1,
        2,
        2,
        2
      ],
      [
        2,
        2,
        3,
        3,
        3
      ],
      [
        1,
        1,
        0,
        0,
        0
      ],
      [
        2,
        2,
        1,
        1,
        1
      ],
      [
        3,
        3,
        2,
        2,
        2
      ],
      [
        0,
        0,
        0,
        1,
        1
      ],
      [
        3,
        3,
        3,
        2,
        2
      ],
      [
        0,
        0,
        0,
        0,
        1
      ],
      [
        3,
        3,
        3,
        3,
        2
      ],
      [
        0,
        1,
        2,
        1,
        0
      ],
      [
        3,
        2,
        1,
        2,
        3
      ],
      [
        1,
        2,
        3,
        2,
        1
      ],
      [
        2,
        1,
        0,
        1,
        2
      ],
      [
        1,
        1,
        1,
        2,
        2
      ],
      [
        2,
        2,
        2,
        3,
        3
      ],
      [
        2,
        2,
        2,
        1,
        1
      ],
      [
        1,
        1,
        1,
        0,
        0
      ],
      [
        1,
        1,
        1,
        1,
        2
      ],
      [
        2,
        2,
        2,
        2,
        3
      ],
      [
        2,
        2,
        2,
        2,
        1
      ],
      [
        1,
        1,
        1,
        1,
        0
      ],
      [
        0,
        0,
        0,
        1,
        0
      ],
      [
        1,
        1,
        1,
        2,
        1
      ],
      [
        2,
        2,
        2,
        3,
        2
      ],
      [
        3,
        3,
        3,
        2,
        3
      ],
      [
        2,
        2,
        2,
        1,
        2
      ],
      [
        1,
        1,
        1,
        0,
        1
      ],
      [
        0,
        0,
        1,
        1,
        0
      ],
      [
        1,
        1,
        2,
        2,
        1
      ],
      [
        2,
        2,
        3,
        3,
        2
      ],
      [
        3,
        3,
        2,
        2,
        3
      ],
      [
        2,
        2,
        1,
        1,
        2
      ],
      [
        1,
        1,
        0,
        0,
        1
      ],
      [
        0,
        1,
        0,
        0,
        0
      ],
      [
        1,
        2,
        1,
        1,
        1
      ],
      [
        2,
        3,
        2,
        2,
        2
      ],
      [
        3,
        2,
        3,
        3,
        3
      ],
      [
        2,
        1,
        2,
        2,
        2
      ],
      [
        1,
        0,
        1,
        1,
        1
      ],
      [
        0,
        1,
        1,
        0,
        0
      ],
      [
        1,
        2,
        2,
        1,
        1
      ],
      [
        2,
        3,
        3,
        2,
        2
      ],
      [
        3,
        2,
        2,
        3,
        3
      ],
      [
        2,
        1,
        1,
        2,
        2
      ],
      [
        1,
        0,
        0,
        1,
        1
      ],
      [
        0,
        1,
        0,
        1,
        1
      ],
      [
        1,
        2,
        1,
        2,
        2
      ],
      [
        2,
        3,
        2,
        3,
        3
      ],
      [
        3,
        2,
        3,
        2,
        2
      ],
      [
        2,
        1,
        2,
        1,
        1
      ],
      [
        1,
        0,
        1,
        0,
        0
      ],
      [
        0,
        0,
        1,
        0,
        1
      ],
      [
        1,
        1,
        2,
        1,
        2
      ],
      [
        2,
        2,
        3,
        2,
        3
      ],
      [
        3,
        3,
        2,
        3,
        2
      ],
      [
        2,
        2,
        1,
        2,
        1
      ],
      [
        1,
        1,
        0,
        1,
        0
      ],
      [
        0,
        0,
        1,
        1,
        2
      ],
      [
        3,
        3,
        2,
        2,
        1
      ],
      [
        0,
        0,
        1,
        2,
        2
      ],
      [
        3,
        3,
        2,
        1,
        1
      ],
      [
        0,
        1,
        1,
        1,
        2
      ],
      [
        3,
        2,
        2,
        2,
        1
      ],
      [
        0,
        1,
        1,
        2,
        2
      ],
      [
        3,
        2,
        2,
        1,
        1
      ],
      [
        0,
        0,
        0,
        1,
        2
      ],
      [
        3,
        3,
        3,
        2,
        1
      ],
      [
        0,
        1,
        2,
        2,
        2
      ],
      [
        3,
        2,
        1,
        1,
        1
      ],
      [
        2,
        2,
        1,
        0,
        0
      ],
      [
        1,
        1,
        2,
        3,
        3
      ]
    ],
    ways: 0,
    lineStakeDivisor: 100,
    coefficients: [
      [
        0,
        0,
        0,
        200,
        2e3,
        5e3
      ],
      [
        0,
        0,
        0,
        150,
        1e3,
        2e3
      ],
      [
        0,
        0,
        0,
        100,
        500,
        1e3
      ],
      [
        0,
        0,
        0,
        100,
        500,
        1e3
      ],
      [
        0,
        0,
        0,
        50,
        100,
        500
      ],
      [
        0,
        0,
        0,
        50,
        100,
        500
      ],
      [
        0,
        0,
        0,
        50,
        100,
        500
      ],
      [
        0,
        0,
        0,
        50,
        100,
        500
      ]
    ],
    symbols: [
      {
        id: "0",
        label: "Seven",
        mark: "7",
        color: "#e2b1ff"
      },
      {
        id: "1",
        label: "Bell",
        mark: "\u265F",
        color: "#fa4cba"
      },
      {
        id: "2",
        label: "Grapes",
        mark: "\u{1F347}",
        color: "#e2b1ff"
      },
      {
        id: "3",
        label: "Watermelon",
        mark: "\u{1F349}",
        color: "#fa4cba"
      },
      {
        id: "4",
        label: "Cherries",
        mark: "\u{1F352}",
        color: "#e2b1ff"
      },
      {
        id: "5",
        label: "Orange",
        mark: "\u{1F34A}",
        color: "#fa4cba"
      },
      {
        id: "6",
        label: "Plum",
        mark: "\u{1F7E3}",
        color: "#e2b1ff"
      },
      {
        id: "7",
        label: "Lemon",
        mark: "\u{1F34B}",
        color: "#fa4cba"
      }
    ],
    theme: {
      bg: "#171026",
      accent: "#e2b1ff",
      secondary: "#fa4cba"
    },
    wildSymbols: [],
    wildExclusions: [],
    sampling: [
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ]
    ],
    mechanic: "multiplier",
    expandingReels: [],
    coinChanceDenominator: 0,
    coinWildSymbol: null,
    addWildChanceDenominator: 0,
    maxFrames: 1,
    scale: {
      numerator: "1",
      denominator: "1"
    },
    officialReference: "https://www.smartsoftgaming.com/games/multi-hot-100",
    featureDescription: "100 fixed lines with an independent 1\xD7\u20135\xD7 multiplier.",
    referenceNotes: [
      "Public coefficient values are now preserved exactly; no payout calibration multiplier is applied. Independent probabilities and public-rule fidelity are under review; launching is disabled.",
      "Only listed fixed demo stake amounts are accepted. Demo currency is DMO; no claim is made that its numerical limits are a provider-approved ETB profile.",
      "Removed the invented global10,000 ceiling and Burning100\xD7cap. Uses the title-specific reference maximum numerically; any displayed multiplier maximum remains a conservative draft ceiling, with exact truncation-versus-outcome-support semantics unverified."
    ],
    rules: [
      "Fixed demo-derived stake schedule 1.00\u2013100.00 and numerical maximum payout 250000.00. Source currency is DMO; isolated draft maps the numbers1:1 into ETB. Production remains disabled.",
      "Highest eligible left-to-right award per line; simultaneous line wins add. The public reference maximum is used as a draft payout ceiling. Whether the source enforces that maximum by truncation or by restricting reachable outcomes remains under review.",
      "All results resolve on the server in one accepted round. Automatic features never require an extra debit.",
      "Every symbol is equally likely in each independent grid cell. The independent 1\xD7, 2\xD7, 3\xD7, 4\xD7 and 5\xD7 multipliers are equally likely.",
      "Fractional santim are rounded once for the total win without bias: the same committed server RNG pays either the lower or upper whole santim in proportion to the fractional part. The difference is at most one santim, and every result stays within the cap.",
      "This model is disabled pending official-demo public-rule parity and independent sampling calibration. Prior adaptation features and limits are not an approved faithful release.",
      "Official help states a maximum of 2500\xD7 the stake. The disabled draft uses that numerical ceiling; the private outcome restrictions that produce the source maximum are not known."
    ],
    math: {
      description: "Raw public coefficients and exact numerical demo stakes are preserved. This disabled draft uses an independent, uncalibrated outcome distribution. Exact uncapped enumeration and a50,000-round seeded pilot are recorded as diagnostics, not provider RTP or a release guarantee. Displayed numerical reference maxima are used as draft ceilings; source truncation-versus-reachable-outcome semantics remain unverified where they matter.",
      publicPayoutCoefficientsScaled: false,
      officialPrivateMathVerified: false,
      calibrationStatus: "pending_faithful_model",
      previousAdaptationEvidence: "references/independent-adaptation-superseded.json",
      rounding: {
        method: "unbiased total-santim rounding",
        rng: "Same committed server RNG stream, after every outcome/feature draw. No global randomness.",
        rule: "For exact fractional payout n+r santim, pay n+1 with probability r and n otherwise. Exact integers and already capped payouts require no rounding draw.",
        reserve: "Outcome-independent maximum is rounded UP before applying the published caps.",
        scope: "Applied once to the whole round; credited line/frame payouts sum exactly to that result."
      },
      targetReturn: null,
      measuredReturn: null,
      diagnosticEvidence: "references/first11-raw-prize-diagnostic.json",
      independentDraftDiagnostic: {
        analyticBeforeReferenceMaximum: {
          method: "Exact enumeration of every symbol sequence on one path; linearity across actual lines/ways and independent mean multiplier3. No cap or outcome-support claim.",
          sequences: 32768,
          effectiveSymbolWeights: [
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1
          ],
          returnFraction: {
            numerator: "6285",
            denominator: "8192"
          },
          expectedReturn: 0.7672119140625
        },
        pilot: {
          sampleCount: 5e4,
          seed: 1705846517,
          prng: "SFC32 with20 warmup outputs",
          meanBeforeCeiling: 0.7563140000000028,
          meanAfterDraftReferenceCeiling: 0.7563140000000028,
          confidence99NormalApproximation: [
            0.719265090553128,
            0.7933629094468776
          ],
          sampleMaximumReturn: 146,
          sourceCeilingEvents: 0,
          stakeMaximumMinor: "10000",
          reserveAtMaximumMinor: "25000000",
          scope: "Uncalibrated disabled draft; confidence approximation is diagnostic, not certification. Same return applies to every listed stake because raw payouts are integral and maxima scale proportionally or remain above the raw model bound."
        },
        releaseReady: false
      }
    },
    scatters: [],
    releaseGate: {
      status: "blocked_by_a_to_z_reference_requirement",
      productionLaunchable: false,
      required: [
        "presentation_audio",
        "gamble_collect",
        "source_maximum_semantics",
        "independent_probability_calibration",
        "currency_profile"
      ],
      manifest: "references/first11-release-divergences.json",
      reason: "Raw coefficients, exact schedules and numerical reference maxima are aligned. Public controls/presentation, source maximum semantics and Burning respin rules remain incomplete; independent probabilities are uncalibrated."
    },
    previousAdaptationScale: {
      numerator: "198656",
      denominator: "157125"
    },
    stakeMinorValues: [
      "100",
      "200",
      "300",
      "400",
      "500",
      "600",
      "700",
      "800",
      "1000",
      "1500",
      "2000",
      "2500",
      "3000",
      "4000",
      "5000",
      "6000",
      "7000",
      "8000",
      "10000"
    ],
    minStake: "1.00",
    maxStake: "100.00",
    referenceStakeSchedule: {
      currency: "DMO",
      lines: 100,
      chipCoefficient: "0.01",
      perLineValues: [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        10,
        15,
        20,
        25,
        30,
        40,
        50,
        60,
        70,
        80,
        100
      ],
      minimum: "1.00",
      maximum: "100.00",
      source: "references/public-models/multihot100_native.json",
      status: "verified_demo_values; production_currency_profile_requires_review"
    },
    referenceLimits: {
      currency: "DMO",
      maximumWin: "250000.00",
      maximumWinMultiplier: 2500,
      DoublingMaxCount: "5.0",
      DoublingMaxWin: "500.00",
      doublingLimitMeaningVerified: false
    },
    maxWin: "250000.00",
    winMultiplierCap: 2500,
    currencyAdaptation: {
      source: "DMO",
      draft: "ETB",
      method: "Numerical 1:1 mapping of demo values only; not an exchange rate or provider-approved ETB profile.",
      productionLaunchable: false
    }
  },
  {
    id: "multihotwildways_native",
    name: "Multi Hot Wild Ways",
    version: "superwin-multihotwildways-1",
    launchable: false,
    columns: 3,
    rows: 3,
    paths: [
      [
        0,
        0,
        0
      ],
      [
        0,
        0,
        1
      ],
      [
        0,
        0,
        2
      ],
      [
        0,
        1,
        0
      ],
      [
        0,
        1,
        1
      ],
      [
        0,
        1,
        2
      ],
      [
        0,
        2,
        0
      ],
      [
        0,
        2,
        1
      ],
      [
        0,
        2,
        2
      ],
      [
        1,
        0,
        0
      ],
      [
        1,
        0,
        1
      ],
      [
        1,
        0,
        2
      ],
      [
        1,
        1,
        0
      ],
      [
        1,
        1,
        1
      ],
      [
        1,
        1,
        2
      ],
      [
        1,
        2,
        0
      ],
      [
        1,
        2,
        1
      ],
      [
        1,
        2,
        2
      ],
      [
        2,
        0,
        0
      ],
      [
        2,
        0,
        1
      ],
      [
        2,
        0,
        2
      ],
      [
        2,
        1,
        0
      ],
      [
        2,
        1,
        1
      ],
      [
        2,
        1,
        2
      ],
      [
        2,
        2,
        0
      ],
      [
        2,
        2,
        1
      ],
      [
        2,
        2,
        2
      ]
    ],
    ways: 27,
    lineStakeDivisor: 1,
    coefficients: [
      [
        0,
        0,
        0,
        50
      ],
      [
        0,
        0,
        0,
        1
      ],
      [
        0,
        0,
        0,
        1
      ],
      [
        0,
        0,
        0,
        1
      ],
      [
        0,
        0,
        0,
        1
      ],
      [
        0,
        0,
        0,
        4
      ],
      [
        0,
        0,
        0,
        4
      ],
      [
        0,
        0,
        0,
        10
      ],
      [
        0,
        0,
        0,
        15
      ],
      [
        0,
        0,
        0,
        20
      ]
    ],
    symbols: [
      {
        id: "0",
        label: "Wild",
        mark: "W",
        color: "#26ebae"
      },
      {
        id: "1",
        label: "Orange",
        mark: "\u{1F34A}",
        color: "#f9d255"
      },
      {
        id: "2",
        label: "Cherries",
        mark: "\u{1F352}",
        color: "#26ebae"
      },
      {
        id: "3",
        label: "Plum",
        mark: "\u{1F7E3}",
        color: "#f9d255"
      },
      {
        id: "4",
        label: "Lemon",
        mark: "\u{1F34B}",
        color: "#26ebae"
      },
      {
        id: "5",
        label: "Watermelon",
        mark: "\u{1F349}",
        color: "#f9d255"
      },
      {
        id: "6",
        label: "Grapes",
        mark: "\u{1F347}",
        color: "#26ebae"
      },
      {
        id: "7",
        label: "Bells",
        mark: "\u265F",
        color: "#f9d255"
      },
      {
        id: "8",
        label: "Dollar",
        mark: "$",
        color: "#26ebae"
      },
      {
        id: "9",
        label: "Sevens",
        mark: "77",
        color: "#f9d255"
      }
    ],
    theme: {
      bg: "#071e1c",
      accent: "#26ebae",
      secondary: "#f9d255"
    },
    wildSymbols: [
      0
    ],
    wildExclusions: [],
    sampling: [
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9
      ]
    ],
    mechanic: "ways-multiplier",
    expandingReels: [],
    coinChanceDenominator: 0,
    coinWildSymbol: null,
    addWildChanceDenominator: 0,
    maxFrames: 1,
    scale: {
      numerator: "1",
      denominator: "1"
    },
    officialReference: "https://www.smartsoftgaming.com/games/multi-hot-wild-ways",
    featureDescription: "27 ways to pay with an independent 1\xD7\u20135\xD7 multiplier.",
    referenceNotes: [
      "Public coefficient values are now preserved exactly; no payout calibration multiplier is applied. Independent probabilities and public-rule fidelity are under review; launching is disabled.",
      "Runtime maps Box0 to Wild and Box1..Box9 to nine paying icons; blur-animation count9 is not the outcome alphabet size10.",
      "Only listed fixed demo stake amounts are accepted. Demo currency is DMO; no claim is made that its numerical limits are a provider-approved ETB profile.",
      "Removed the invented global10,000 ceiling and Burning100\xD7cap. Uses the title-specific reference maximum numerically; any displayed multiplier maximum remains a conservative draft ceiling, with exact truncation-versus-outcome-support semantics unverified."
    ],
    rules: [
      "Fixed demo-derived stake schedule 0.20\u2013300.00 and numerical maximum payout 88500.00. Source currency is DMO; isolated draft maps the numbers1:1 into ETB. Production remains disabled.",
      "Highest eligible left-to-right award per line; simultaneous line wins add. The public reference maximum is used as a draft payout ceiling. Whether the source enforces that maximum by truncation or by restricting reachable outcomes remains under review.",
      "All results resolve on the server in one accepted round. Automatic features never require an extra debit.",
      "Every symbol is equally likely in each independent grid cell. The independent 1\xD7, 2\xD7, 3\xD7, 4\xD7 and 5\xD7 multipliers are equally likely.",
      "Wild substitutes for any regular symbol; each line receives only its highest eligible award.",
      "Fractional santim are rounded once for the total win without bias: the same committed server RNG pays either the lower or upper whole santim in proportion to the fractional part. The difference is at most one santim, and every result stays within the cap.",
      "This model is disabled pending official-demo public-rule parity and independent sampling calibration. Prior adaptation features and limits are not an approved faithful release.",
      "Official help states a maximum of 295\xD7 the stake. The disabled draft uses that numerical ceiling; the private outcome restrictions that produce the source maximum are not known."
    ],
    math: {
      description: "Raw public coefficients and exact numerical demo stakes are preserved. This disabled draft uses an independent, uncalibrated outcome distribution. Exact uncapped enumeration and a50,000-round seeded pilot are recorded as diagnostics, not provider RTP or a release guarantee. Displayed numerical reference maxima are used as draft ceilings; source truncation-versus-reachable-outcome semantics remain unverified where they matter.",
      publicPayoutCoefficientsScaled: false,
      officialPrivateMathVerified: false,
      calibrationStatus: "pending_faithful_model",
      previousAdaptationEvidence: "references/independent-adaptation-superseded.json",
      rounding: {
        method: "unbiased total-santim rounding",
        rng: "Same committed server RNG stream, after every outcome/feature draw. No global randomness.",
        rule: "For exact fractional payout n+r santim, pay n+1 with probability r and n otherwise. Exact integers and already capped payouts require no rounding draw.",
        reserve: "Outcome-independent maximum is rounded UP before applying the published caps.",
        scope: "Applied once to the whole round; credited line/frame payouts sum exactly to that result."
      },
      targetReturn: null,
      measuredReturn: null,
      diagnosticEvidence: "references/first11-raw-prize-diagnostic.json",
      independentDraftDiagnostic: {
        analyticBeforeReferenceMaximum: {
          method: "Exact enumeration of every symbol sequence on one path; linearity across actual lines/ways and independent mean multiplier3. No cap or outcome-support claim.",
          sequences: 1e3,
          effectiveSymbolWeights: [
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1
          ],
          returnFraction: {
            numerator: "36369",
            denominator: "10000"
          },
          expectedReturn: 3.6369
        },
        pilot: {
          sampleCount: 5e4,
          seed: 1705856490,
          prng: "SFC32 with20 warmup outputs",
          meanBeforeCeiling: 3.6572440000000173,
          meanAfterDraftReferenceCeiling: 3.6572440000000173,
          confidence99NormalApproximation: [
            3.5587716385277868,
            3.7557163614722477
          ],
          sampleMaximumReturn: 192,
          sourceCeilingEvents: 0,
          stakeMaximumMinor: "30000",
          reserveAtMaximumMinor: "8850000",
          scope: "Uncalibrated disabled draft; confidence approximation is diagnostic, not certification. Same return applies to every listed stake because raw payouts are integral and maxima scale proportionally or remain above the raw model bound."
        },
        releaseReady: false
      }
    },
    scatters: [],
    releaseGate: {
      status: "blocked_by_a_to_z_reference_requirement",
      productionLaunchable: false,
      required: [
        "presentation_audio",
        "gamble_collect",
        "source_maximum_semantics",
        "independent_probability_calibration",
        "currency_profile"
      ],
      manifest: "references/first11-release-divergences.json",
      reason: "Raw coefficients, exact schedules and numerical reference maxima are aligned. Public controls/presentation, source maximum semantics and Burning respin rules remain incomplete; independent probabilities are uncalibrated."
    },
    previousAdaptationScale: {
      numerator: "9700",
      denominator: "36369"
    },
    stakeMinorValues: [
      "20",
      "40",
      "60",
      "80",
      "100",
      "200",
      "300",
      "400",
      "500",
      "600",
      "800",
      "1000",
      "1500",
      "2000",
      "3000",
      "4000",
      "5000",
      "6000",
      "8000",
      "10000",
      "15000",
      "20000",
      "30000"
    ],
    minStake: "0.20",
    maxStake: "300.00",
    referenceStakeSchedule: {
      currency: "DMO",
      lines: 1,
      chipCoefficient: "0.01",
      perLineValues: [
        20,
        40,
        60,
        80,
        100,
        200,
        300,
        400,
        500,
        600,
        800,
        1e3,
        1500,
        2e3,
        3e3,
        4e3,
        5e3,
        6e3,
        8e3,
        1e4,
        15e3,
        2e4,
        3e4
      ],
      minimum: "0.20",
      maximum: "300.00",
      source: "references/public-models/multihotwildways_native.json",
      status: "verified_demo_values; production_currency_profile_requires_review"
    },
    referenceLimits: {
      currency: "DMO",
      maximumWin: "88500.00",
      maximumWinMultiplier: 295,
      DoublingMaxCount: "5.0",
      DoublingMaxWin: "500.00",
      doublingLimitMeaningVerified: false
    },
    maxWin: "88500.00",
    winMultiplierCap: 295,
    currencyAdaptation: {
      source: "DMO",
      draft: "ETB",
      method: "Numerical 1:1 mapping of demo values only; not an exchange rate or provider-approved ETB profile.",
      productionLaunchable: false
    }
  },
  {
    id: "multihot5wild_native",
    name: "Multi Hot 5 Wild",
    version: "superwin-multihot5wild-1",
    launchable: false,
    columns: 3,
    rows: 3,
    paths: [
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
    ways: 0,
    lineStakeDivisor: 5,
    coefficients: [
      [
        0,
        0,
        0,
        1e3
      ],
      [
        0,
        0,
        0,
        50
      ],
      [
        0,
        0,
        0,
        50
      ],
      [
        0,
        0,
        0,
        50
      ],
      [
        0,
        0,
        0,
        50
      ],
      [
        0,
        0,
        0,
        150
      ],
      [
        0,
        0,
        0,
        150
      ],
      [
        0,
        0,
        0,
        250
      ],
      [
        0,
        0,
        0,
        500
      ],
      [
        0,
        0,
        0,
        750
      ]
    ],
    symbols: [
      {
        id: "0",
        label: "Wild",
        mark: "W",
        color: "#ffae40"
      },
      {
        id: "1",
        label: "Orange",
        mark: "\u{1F34A}",
        color: "#e34674"
      },
      {
        id: "2",
        label: "Cherries",
        mark: "\u{1F352}",
        color: "#ffae40"
      },
      {
        id: "3",
        label: "Plum",
        mark: "\u{1F7E3}",
        color: "#e34674"
      },
      {
        id: "4",
        label: "Lemon",
        mark: "\u{1F34B}",
        color: "#ffae40"
      },
      {
        id: "5",
        label: "Watermelon",
        mark: "\u{1F349}",
        color: "#e34674"
      },
      {
        id: "6",
        label: "Grapes",
        mark: "\u{1F347}",
        color: "#ffae40"
      },
      {
        id: "7",
        label: "Bells",
        mark: "\u265F",
        color: "#e34674"
      },
      {
        id: "8",
        label: "Dollar",
        mark: "$",
        color: "#ffae40"
      },
      {
        id: "9",
        label: "Sevens",
        mark: "77",
        color: "#e34674"
      }
    ],
    theme: {
      bg: "#20120a",
      accent: "#ffae40",
      secondary: "#e34674"
    },
    wildSymbols: [
      0
    ],
    wildExclusions: [],
    sampling: [
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9
      ]
    ],
    mechanic: "multiplier",
    expandingReels: [],
    coinChanceDenominator: 0,
    coinWildSymbol: null,
    addWildChanceDenominator: 0,
    maxFrames: 1,
    scale: {
      numerator: "1",
      denominator: "1"
    },
    officialReference: "https://www.smartsoftgaming.com/games/multi-hot-5-wild",
    featureDescription: "5 fixed lines with an independent 1\xD7\u20135\xD7 multiplier.",
    referenceNotes: [
      "Public coefficient values are now preserved exactly; no payout calibration multiplier is applied. Independent probabilities and public-rule fidelity are under review; launching is disabled.",
      "Runtime maps Box0 to Wild and Box1..Box9 to nine paying icons; blur-animation count9 is not the outcome alphabet size10.",
      "Only listed fixed demo stake amounts are accepted. Demo currency is DMO; no claim is made that its numerical limits are a provider-approved ETB profile.",
      "Exact five numbered lines verified visually against the title-specific official b15 help chart; no longer inferred from another three-reel title.",
      "Removed the invented global10,000 ceiling and Burning100\xD7cap. Uses the title-specific reference maximum numerically; any displayed multiplier maximum remains a conservative draft ceiling, with exact truncation-versus-outcome-support semantics unverified."
    ],
    rules: [
      "Fixed demo-derived stake schedule 0.05\u2013400.00 and numerical maximum payout 150000.00. Source currency is DMO; isolated draft maps the numbers1:1 into ETB. Production remains disabled.",
      "Highest eligible left-to-right award per line; simultaneous line wins add. The public reference maximum is used as a draft payout ceiling. Whether the source enforces that maximum by truncation or by restricting reachable outcomes remains under review.",
      "All results resolve on the server in one accepted round. Automatic features never require an extra debit.",
      "Every symbol is equally likely in each independent grid cell. The independent 1\xD7, 2\xD7, 3\xD7, 4\xD7 and 5\xD7 multipliers are equally likely.",
      "Wild substitutes for any regular symbol; each line receives only its highest eligible award.",
      "Fractional santim are rounded once for the total win without bias: the same committed server RNG pays either the lower or upper whole santim in proportion to the fractional part. The difference is at most one santim, and every result stays within the cap.",
      "This model is disabled pending official-demo public-rule parity and independent sampling calibration. Prior adaptation features and limits are not an approved faithful release.",
      "Official help states a maximum of 375\xD7 the stake. The disabled draft uses that numerical ceiling; the private outcome restrictions that produce the source maximum are not known."
    ],
    math: {
      description: "Raw public coefficients and exact numerical demo stakes are preserved. This disabled draft uses an independent, uncalibrated outcome distribution. Exact uncapped enumeration and a50,000-round seeded pilot are recorded as diagnostics, not provider RTP or a release guarantee. Displayed numerical reference maxima are used as draft ceilings; source truncation-versus-reachable-outcome semantics remain unverified where they matter.",
      publicPayoutCoefficientsScaled: false,
      officialPrivateMathVerified: false,
      calibrationStatus: "pending_faithful_model",
      previousAdaptationEvidence: "references/independent-adaptation-superseded.json",
      rounding: {
        method: "unbiased total-santim rounding",
        rng: "Same committed server RNG stream, after every outcome/feature draw. No global randomness.",
        rule: "For exact fractional payout n+r santim, pay n+1 with probability r and n otherwise. Exact integers and already capped payouts require no rounding draw.",
        reserve: "Outcome-independent maximum is rounded UP before applying the published caps.",
        scope: "Applied once to the whole round; credited line/frame payouts sum exactly to that result."
      },
      targetReturn: null,
      measuredReturn: null,
      diagnosticEvidence: "references/first11-raw-prize-diagnostic.json",
      independentDraftDiagnostic: {
        analyticBeforeReferenceMaximum: {
          method: "Exact enumeration of every symbol sequence on one path; linearity across actual lines/ways and independent mean multiplier3. No cap or outcome-support claim.",
          sequences: 1e3,
          effectiveSymbolWeights: [
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1
          ],
          returnFraction: {
            numerator: "9",
            denominator: "2"
          },
          expectedReturn: 4.5
        },
        pilot: {
          sampleCount: 5e4,
          seed: 1705866463,
          prng: "SFC32 with20 warmup outputs",
          meanBeforeCeiling: 4.46974,
          meanAfterDraftReferenceCeiling: 4.46974,
          confidence99NormalApproximation: [
            4.308560696854999,
            4.630919303145
          ],
          sampleMaximumReturn: 340,
          sourceCeilingEvents: 0,
          stakeMaximumMinor: "40000",
          reserveAtMaximumMinor: "15000000",
          scope: "Uncalibrated disabled draft; confidence approximation is diagnostic, not certification. Same return applies to every listed stake because raw payouts are integral and maxima scale proportionally or remain above the raw model bound."
        },
        releaseReady: false
      }
    },
    scatters: [],
    releaseGate: {
      status: "blocked_by_a_to_z_reference_requirement",
      productionLaunchable: false,
      required: [
        "presentation_audio",
        "gamble_collect",
        "source_maximum_semantics",
        "independent_probability_calibration",
        "currency_profile"
      ],
      manifest: "references/first11-release-divergences.json",
      reason: "Raw coefficients, exact schedules and numerical reference maxima are aligned. Public controls/presentation, source maximum semantics and Burning respin rules remain incomplete; independent probabilities are uncalibrated."
    },
    previousAdaptationScale: {
      numerator: "97",
      denominator: "450"
    },
    stakeMinorValues: [
      "5",
      "10",
      "20",
      "30",
      "40",
      "50",
      "60",
      "80",
      "100",
      "150",
      "200",
      "300",
      "400",
      "500",
      "600",
      "800",
      "1000",
      "1500",
      "2000",
      "3000",
      "4000",
      "5000",
      "6000",
      "8000",
      "10000",
      "15000",
      "20000",
      "30000",
      "40000"
    ],
    minStake: "0.05",
    maxStake: "400.00",
    referenceStakeSchedule: {
      currency: "DMO",
      lines: 5,
      chipCoefficient: "0.01",
      perLineValues: [
        1,
        2,
        4,
        6,
        8,
        10,
        12,
        16,
        20,
        30,
        40,
        60,
        80,
        100,
        120,
        160,
        200,
        300,
        400,
        600,
        800,
        1e3,
        1200,
        1600,
        2e3,
        3e3,
        4e3,
        6e3,
        8e3
      ],
      minimum: "0.05",
      maximum: "400.00",
      source: "references/public-models/multihot5wild_native.json",
      status: "verified_demo_values; production_currency_profile_requires_review"
    },
    referenceLimits: {
      currency: "DMO",
      maximumWin: "150000.00",
      maximumWinMultiplier: 375,
      DoublingMaxCount: "5.0",
      DoublingMaxWin: "500.00",
      doublingLimitMeaningVerified: false
    },
    maxWin: "150000.00",
    winMultiplierCap: 375,
    currencyAdaptation: {
      source: "DMO",
      draft: "ETB",
      method: "Numerical 1:1 mapping of demo values only; not an exchange rate or provider-approved ETB profile.",
      productionLaunchable: false
    }
  },
  {
    id: "multihot5superwilds_native",
    name: "Multi Hot 5 Super Wilds",
    version: "superwin-multihot5superwilds-1",
    launchable: false,
    columns: 5,
    rows: 3,
    paths: [
      [
        0,
        0,
        0,
        0,
        0
      ],
      [
        1,
        1,
        1,
        1,
        1
      ],
      [
        2,
        2,
        2,
        2,
        2
      ],
      [
        0,
        1,
        2,
        1,
        0
      ],
      [
        2,
        1,
        0,
        1,
        2
      ]
    ],
    ways: 0,
    lineStakeDivisor: 5,
    coefficients: [
      [
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        50,
        100,
        500
      ],
      [
        0,
        0,
        0,
        50,
        100,
        500
      ],
      [
        0,
        0,
        0,
        50,
        100,
        500
      ],
      [
        0,
        0,
        0,
        50,
        100,
        500
      ],
      [
        0,
        0,
        0,
        100,
        200,
        1e3
      ],
      [
        0,
        0,
        0,
        100,
        200,
        1e3
      ],
      [
        0,
        0,
        0,
        200,
        400,
        2e3
      ],
      [
        0,
        0,
        0,
        300,
        1e3,
        4e3
      ]
    ],
    symbols: [
      {
        id: "0",
        label: "Wild",
        mark: "W",
        color: "#ffba38"
      },
      {
        id: "1",
        label: "Cherries",
        mark: "\u{1F352}",
        color: "#e42fff"
      },
      {
        id: "2",
        label: "Lemon",
        mark: "\u{1F34B}",
        color: "#ffba38"
      },
      {
        id: "3",
        label: "Orange",
        mark: "\u{1F34A}",
        color: "#e42fff"
      },
      {
        id: "4",
        label: "Plum",
        mark: "\u{1F7E3}",
        color: "#ffba38"
      },
      {
        id: "5",
        label: "Bell",
        mark: "\u265F",
        color: "#e42fff"
      },
      {
        id: "6",
        label: "Watermelon",
        mark: "\u{1F349}",
        color: "#ffba38"
      },
      {
        id: "7",
        label: "Grapes",
        mark: "\u{1F347}",
        color: "#e42fff"
      },
      {
        id: "8",
        label: "Seven",
        mark: "7",
        color: "#ffba38"
      }
    ],
    theme: {
      bg: "#1e0b24",
      accent: "#ffba38",
      secondary: "#e42fff"
    },
    wildSymbols: [
      0
    ],
    wildExclusions: [],
    sampling: [
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ]
    ],
    mechanic: "super-wild",
    expandingReels: [],
    coinChanceDenominator: 0,
    coinWildSymbol: null,
    addWildChanceDenominator: 64,
    maxFrames: 2,
    scale: {
      numerator: "1",
      denominator: "1"
    },
    officialReference: "https://www.smartsoftgaming.com/games/multi-hot-5-super-wilds",
    featureDescription: "5 fixed lines, a1\xD7\u20135\xD7 multiplier, and one or more added wilds shown after the initial grid. Draft probabilities are independent and uncalibrated.",
    referenceNotes: [
      "Public coefficient values are now preserved exactly; no payout calibration multiplier is applied. Independent probabilities and public-rule fidelity are under review; launching is disabled.",
      "Only listed fixed demo stake amounts are accepted. Demo currency is DMO; no claim is made that its numerical limits are a provider-approved ETB profile.",
      "Public Components/box.js wildAddLoad compares every Baraban cell with BarabanExpanded; multiple added wild cells are supported. The draft one-cell-only assumption was removed. Independent per-cell wild-mask probability1/64 is a draft sampling choice, not a provider rule.",
      "Removed the invented global10,000 ceiling and Burning100\xD7cap. Uses the title-specific reference maximum numerically; any displayed multiplier maximum remains a conservative draft ceiling, with exact truncation-versus-outcome-support semantics unverified."
    ],
    rules: [
      "Fixed demo-derived stake schedule 0.10\u2013200.00 and numerical maximum payout 200000.00. Source currency is DMO; isolated draft maps the numbers1:1 into ETB. Production remains disabled.",
      "Highest eligible left-to-right award per line; simultaneous line wins add. The public reference maximum is used as a draft payout ceiling. Whether the source enforces that maximum by truncation or by restricting reachable outcomes remains under review.",
      "All results resolve on the server in one accepted round. Automatic features never require an extra debit.",
      "Every symbol is equally likely in each independent grid cell. The independent 1\xD7, 2\xD7, 3\xD7, 4\xD7 and 5\xD7 multipliers are equally likely.",
      "Wild substitutes for any regular symbol; each line receives only its highest eligible award.",
      "Fractional santim are rounded once for the total win without bias: the same committed server RNG pays either the lower or upper whole santim in proportion to the fractional part. The difference is at most one santim, and every result stays within the cap.",
      "This model is disabled pending official-demo public-rule parity and independent sampling calibration. Prior adaptation features and limits are not an approved faithful release.",
      "The isolated Super Wild draft independently selects each grid cell with probability 1/64 for conversion to Wild, then pays the final grid. This is not a verified provider trigger distribution; publication remains blocked.",
      "Official help states a maximum of 1000\xD7 the stake. The disabled draft uses that numerical ceiling; the private outcome restrictions that produce the source maximum are not known."
    ],
    math: {
      description: "Raw public coefficients and exact numerical demo stakes are preserved. This disabled draft uses an independent, uncalibrated outcome distribution. Exact uncapped enumeration and a50,000-round seeded pilot are recorded as diagnostics, not provider RTP or a release guarantee. Displayed numerical reference maxima are used as draft ceilings; source truncation-versus-reachable-outcome semantics remain unverified where they matter.",
      publicPayoutCoefficientsScaled: false,
      officialPrivateMathVerified: false,
      calibrationStatus: "pending_faithful_model",
      previousAdaptationEvidence: "references/independent-adaptation-superseded.json",
      rounding: {
        method: "unbiased total-santim rounding",
        rng: "Same committed server RNG stream, after every outcome/feature draw. No global randomness.",
        rule: "For exact fractional payout n+r santim, pay n+1 with probability r and n otherwise. Exact integers and already capped payouts require no rounding draw.",
        reserve: "Outcome-independent maximum is rounded UP before applying the published caps.",
        scope: "Applied once to the whole round; credited line/frame payouts sum exactly to that result."
      },
      targetReturn: null,
      measuredReturn: null,
      diagnosticEvidence: "references/first11-raw-prize-diagnostic.json",
      independentDraftDiagnostic: {
        analyticBeforeReferenceMaximum: {
          method: "Exact enumeration of every symbol sequence on one path; linearity across actual lines/ways and independent mean multiplier3. No cap or outcome-support claim.",
          sequences: 59049,
          effectiveSymbolWeights: [
            8,
            7,
            7,
            7,
            7,
            7,
            7,
            7,
            7
          ],
          returnFraction: {
            numerator: "1554484455",
            denominator: "268435456"
          },
          expectedReturn: 5.790905859321356
        },
        pilot: {
          sampleCount: 5e4,
          seed: 1705876436,
          prng: "SFC32 with20 warmup outputs",
          meanBeforeCeiling: 5.83674,
          meanAfterDraftReferenceCeiling: 5.83674,
          confidence99NormalApproximation: [
            5.572433088265716,
            6.101046911734284
          ],
          sampleMaximumReturn: 805,
          sourceCeilingEvents: 0,
          stakeMaximumMinor: "20000",
          reserveAtMaximumMinor: "20000000",
          scope: "Uncalibrated disabled draft; confidence approximation is diagnostic, not certification. Same return applies to every listed stake because raw payouts are integral and maxima scale proportionally or remain above the raw model bound."
        },
        releaseReady: false
      }
    },
    scatters: [],
    releaseGate: {
      status: "blocked_by_a_to_z_reference_requirement",
      productionLaunchable: false,
      required: [
        "presentation_audio",
        "gamble_collect",
        "source_maximum_semantics",
        "independent_probability_calibration",
        "currency_profile",
        "super_wild_trigger"
      ],
      manifest: "references/first11-release-divergences.json",
      reason: "Raw coefficients, exact schedules and numerical reference maxima are aligned. Public controls/presentation, source maximum semantics and Burning respin rules remain incomplete; independent probabilities are uncalibrated."
    },
    previousAdaptationScale: {
      numerator: "5727753",
      denominator: "31353725"
    },
    stakeMinorValues: [
      "10",
      "20",
      "30",
      "40",
      "50",
      "60",
      "80",
      "100",
      "150",
      "200",
      "300",
      "400",
      "500",
      "600",
      "800",
      "1000",
      "1500",
      "2000",
      "3000",
      "4000",
      "5000",
      "6000",
      "8000",
      "10000",
      "15000",
      "20000"
    ],
    minStake: "0.10",
    maxStake: "200.00",
    referenceStakeSchedule: {
      currency: "DMO",
      lines: 5,
      chipCoefficient: "0.01",
      perLineValues: [
        2,
        4,
        6,
        8,
        10,
        12,
        16,
        20,
        30,
        40,
        60,
        80,
        100,
        120,
        160,
        200,
        300,
        400,
        600,
        800,
        1e3,
        1200,
        1600,
        2e3,
        3e3,
        4e3
      ],
      minimum: "0.10",
      maximum: "200.00",
      source: "references/public-models/multihot5superwilds_native.json",
      status: "verified_demo_values; production_currency_profile_requires_review"
    },
    referenceLimits: {
      currency: "DMO",
      maximumWin: "200000.00",
      maximumWinMultiplier: 1e3,
      DoublingMaxCount: "5.0",
      DoublingMaxWin: "500.00",
      doublingLimitMeaningVerified: false
    },
    maxWin: "200000.00",
    winMultiplierCap: 1e3,
    currencyAdaptation: {
      source: "DMO",
      draft: "ETB",
      method: "Numerical 1:1 mapping of demo values only; not an exchange rate or provider-approved ETB profile.",
      productionLaunchable: false
    }
  },
  {
    id: "multihotdeluxe_native",
    name: "Multi Hot Deluxe",
    version: "superwin-multihotdeluxe-1",
    launchable: false,
    columns: 3,
    rows: 3,
    paths: [
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
    ways: 0,
    lineStakeDivisor: 5,
    coefficients: [
      [
        0,
        0,
        0,
        100
      ],
      [
        0,
        0,
        0,
        100
      ],
      [
        0,
        0,
        0,
        100
      ],
      [
        0,
        0,
        0,
        100
      ],
      [
        0,
        0,
        0,
        200
      ],
      [
        0,
        0,
        0,
        200
      ],
      [
        0,
        0,
        0,
        250
      ],
      [
        0,
        0,
        0,
        500
      ],
      [
        0,
        0,
        0,
        750
      ]
    ],
    symbols: [
      {
        id: "0",
        label: "Cherries",
        mark: "\u{1F352}",
        color: "#e1a7ff"
      },
      {
        id: "1",
        label: "Plum",
        mark: "\u{1F7E3}",
        color: "#f6c75e"
      },
      {
        id: "2",
        label: "Orange",
        mark: "\u{1F34A}",
        color: "#e1a7ff"
      },
      {
        id: "3",
        label: "Lemon",
        mark: "\u{1F34B}",
        color: "#f6c75e"
      },
      {
        id: "4",
        label: "Grapes",
        mark: "\u{1F347}",
        color: "#e1a7ff"
      },
      {
        id: "5",
        label: "Watermelon",
        mark: "\u{1F349}",
        color: "#f6c75e"
      },
      {
        id: "6",
        label: "Bell",
        mark: "\u265F",
        color: "#e1a7ff"
      },
      {
        id: "7",
        label: "Dollar",
        mark: "$",
        color: "#f6c75e"
      },
      {
        id: "8",
        label: "Seven",
        mark: "7",
        color: "#e1a7ff"
      }
    ],
    theme: {
      bg: "#190d21",
      accent: "#e1a7ff",
      secondary: "#f6c75e"
    },
    wildSymbols: [],
    wildExclusions: [],
    sampling: [
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ]
    ],
    mechanic: "multiplier",
    expandingReels: [],
    coinChanceDenominator: 0,
    coinWildSymbol: null,
    addWildChanceDenominator: 0,
    maxFrames: 1,
    scale: {
      numerator: "1",
      denominator: "1"
    },
    officialReference: "https://www.smartsoftgaming.com/games/multi-hot-5-deluxe",
    featureDescription: "5 fixed lines with an independent 1\xD7\u20135\xD7 multiplier.",
    referenceNotes: [
      "Public coefficient values are now preserved exactly; no payout calibration multiplier is applied. Independent probabilities and public-rule fidelity are under review; launching is disabled.",
      "Runtime win display multiplies coefficients by betPerLine; line-stake basis follows this display and public rules despite WinsOnLine:false in the bootstrap.",
      "Requested MultiHotDeluxe is mapped to the official nearest title MultiHot5Deluxe.",
      "Only listed fixed demo stake amounts are accepted. Demo currency is DMO; no claim is made that its numerical limits are a provider-approved ETB profile.",
      "Removed the invented global10,000 ceiling and Burning100\xD7cap. Uses the title-specific reference maximum numerically; any displayed multiplier maximum remains a conservative draft ceiling, with exact truncation-versus-outcome-support semantics unverified.",
      "Deluxe145\xD7maximum is explicit in official locale key help.slots.multihot5deluxe.xxxxx.win, not merely calculated from two monetary limits."
    ],
    rules: [
      "Fixed demo-derived stake schedule 0.05\u2013400.00 and numerical maximum payout 58000.00. Source currency is DMO; isolated draft maps the numbers1:1 into ETB. Production remains disabled.",
      "Highest eligible left-to-right award per line; simultaneous line wins add. The public reference maximum is used as a draft payout ceiling. Whether the source enforces that maximum by truncation or by restricting reachable outcomes remains under review.",
      "All results resolve on the server in one accepted round. Automatic features never require an extra debit.",
      "Every symbol is equally likely in each independent grid cell. The independent 1\xD7, 2\xD7, 3\xD7, 4\xD7 and 5\xD7 multipliers are equally likely.",
      "Fractional santim are rounded once for the total win without bias: the same committed server RNG pays either the lower or upper whole santim in proportion to the fractional part. The difference is at most one santim, and every result stays within the cap.",
      "This model is disabled pending official-demo public-rule parity and independent sampling calibration. Prior adaptation features and limits are not an approved faithful release.",
      "Official Deluxe help states145\xD7maximum. This is a numerical draft ceiling; the source may enforce it through reachable outcomes rather than truncation."
    ],
    math: {
      description: "Raw public coefficients and exact numerical demo stakes are preserved. This disabled draft uses an independent, uncalibrated outcome distribution. Exact uncapped enumeration and a50,000-round seeded pilot are recorded as diagnostics, not provider RTP or a release guarantee. Displayed numerical reference maxima are used as draft ceilings; source truncation-versus-reachable-outcome semantics remain unverified where they matter.",
      publicPayoutCoefficientsScaled: false,
      officialPrivateMathVerified: false,
      calibrationStatus: "pending_faithful_model",
      previousAdaptationEvidence: "references/independent-adaptation-superseded.json",
      rounding: {
        method: "unbiased total-santim rounding",
        rng: "Same committed server RNG stream, after every outcome/feature draw. No global randomness.",
        rule: "For exact fractional payout n+r santim, pay n+1 with probability r and n otherwise. Exact integers and already capped payouts require no rounding draw.",
        reserve: "Outcome-independent maximum is rounded UP before applying the published caps.",
        scope: "Applied once to the whole round; credited line/frame payouts sum exactly to that result."
      },
      targetReturn: null,
      measuredReturn: null,
      diagnosticEvidence: "references/first11-raw-prize-diagnostic.json",
      independentDraftDiagnostic: {
        analyticBeforeReferenceMaximum: {
          method: "Exact enumeration of every symbol sequence on one path; linearity across actual lines/ways and independent mean multiplier3. No cap or outcome-support claim.",
          sequences: 729,
          effectiveSymbolWeights: [
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1
          ],
          returnFraction: {
            numerator: "230",
            denominator: "243"
          },
          expectedReturn: 0.9465020576131687
        },
        pilot: {
          sampleCount: 5e4,
          seed: 1705886409,
          prng: "SFC32 with20 warmup outputs",
          meanBeforeCeiling: 0.9621,
          meanAfterDraftReferenceCeiling: 0.962,
          confidence99NormalApproximation: [
            0.897522199595166,
            1.0264778004048338
          ],
          sampleMaximumReturn: 145,
          sourceCeilingEvents: 1,
          stakeMaximumMinor: "40000",
          reserveAtMaximumMinor: "5800000",
          scope: "Uncalibrated disabled draft; confidence approximation is diagnostic, not certification. Same return applies to every listed stake because raw payouts are integral and maxima scale proportionally or remain above the raw model bound."
        },
        releaseReady: false
      }
    },
    scatters: [],
    releaseGate: {
      status: "blocked_by_a_to_z_reference_requirement",
      productionLaunchable: false,
      required: [
        "presentation_audio",
        "gamble_collect",
        "source_maximum_semantics",
        "independent_probability_calibration",
        "currency_profile",
        "title_mapping"
      ],
      manifest: "references/first11-release-divergences.json",
      reason: "Raw coefficients, exact schedules and numerical reference maxima are aligned. Public controls/presentation, source maximum semantics and Burning respin rules remain incomplete; independent probabilities are uncalibrated."
    },
    previousAdaptationScale: {
      numerator: "23571",
      denominator: "23000"
    },
    stakeMinorValues: [
      "5",
      "10",
      "20",
      "30",
      "40",
      "50",
      "60",
      "80",
      "100",
      "150",
      "200",
      "300",
      "400",
      "500",
      "600",
      "800",
      "1000",
      "1500",
      "2000",
      "3000",
      "4000",
      "5000",
      "6000",
      "8000",
      "10000",
      "15000",
      "20000",
      "30000",
      "40000"
    ],
    minStake: "0.05",
    maxStake: "400.00",
    referenceStakeSchedule: {
      currency: "DMO",
      lines: 5,
      chipCoefficient: "0.01",
      perLineValues: [
        1,
        2,
        4,
        6,
        8,
        10,
        12,
        16,
        20,
        30,
        40,
        60,
        80,
        100,
        120,
        160,
        200,
        300,
        400,
        600,
        800,
        1e3,
        1200,
        1600,
        2e3,
        3e3,
        4e3,
        6e3,
        8e3
      ],
      minimum: "0.05",
      maximum: "400.00",
      source: "references/public-models/multihotdeluxe_native.bootstrap.json",
      status: "verified_demo_values; production_currency_profile_requires_review"
    },
    referenceLimits: {
      currency: "DMO",
      maximumWin: "58000.00",
      DoublingMaxCount: "5.0",
      DoublingMaxWin: "500.0",
      doublingLimitMeaningVerified: false,
      maximumWinMultiplier: 145
    },
    maxWin: "58000.00",
    currencyAdaptation: {
      source: "DMO",
      draft: "ETB",
      method: "Numerical 1:1 mapping of demo values only; not an exchange rate or provider-approved ETB profile.",
      productionLaunchable: false
    },
    winMultiplierCap: 145
  },
  {
    id: "burningice_native",
    name: "Burning Ice",
    version: "superwin-burningice-1",
    launchable: false,
    columns: 5,
    rows: 3,
    paths: [
      [
        1,
        1,
        1,
        1,
        1
      ],
      [
        2,
        2,
        2,
        2,
        2
      ],
      [
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        1,
        0,
        1,
        2
      ],
      [
        0,
        1,
        2,
        1,
        0
      ]
    ],
    ways: 0,
    lineStakeDivisor: 5,
    coefficients: [
      [
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        100,
        300,
        500
      ],
      [
        0,
        0,
        0,
        100,
        300,
        500
      ],
      [
        0,
        0,
        0,
        100,
        300,
        500
      ],
      [
        0,
        0,
        0,
        100,
        300,
        500
      ],
      [
        0,
        0,
        0,
        200,
        500,
        1e3
      ],
      [
        0,
        0,
        0,
        400,
        1e3,
        5e3
      ],
      [
        0,
        0,
        0,
        400,
        1e3,
        5e3
      ],
      [
        0,
        0,
        0,
        150,
        1e3,
        3e3
      ],
      [
        0,
        0,
        0,
        1e3,
        0,
        0
      ],
      [
        0,
        0,
        100,
        500,
        2e3,
        3e4
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ],
    symbols: [
      {
        id: "0",
        label: "Clover wild",
        mark: "\u2618",
        color: "#6adeff"
      },
      {
        id: "1",
        label: "Plum",
        mark: "\u{1F7E3}",
        color: "#ff783e"
      },
      {
        id: "2",
        label: "Orange",
        mark: "\u{1F34A}",
        color: "#6adeff"
      },
      {
        id: "3",
        label: "Lemon",
        mark: "\u{1F34B}",
        color: "#ff783e"
      },
      {
        id: "4",
        label: "Cherries",
        mark: "\u{1F352}",
        color: "#6adeff"
      },
      {
        id: "5",
        label: "Bell",
        mark: "\u265F",
        color: "#ff783e"
      },
      {
        id: "6",
        label: "Watermelon",
        mark: "\u{1F349}",
        color: "#6adeff"
      },
      {
        id: "7",
        label: "Grapes",
        mark: "\u{1F347}",
        color: "#ff783e"
      },
      {
        id: "8",
        label: "Dollar scatter",
        mark: "$",
        color: "#6adeff"
      },
      {
        id: "9",
        label: "Pot scatter",
        mark: "\u25C9",
        color: "#ff783e"
      },
      {
        id: "10",
        label: "Seven",
        mark: "7",
        color: "#6adeff"
      },
      {
        id: "11",
        label: "Coin wild",
        mark: "W",
        color: "#ff783e"
      }
    ],
    theme: {
      bg: "#051923",
      accent: "#6adeff",
      secondary: "#ff783e"
    },
    wildSymbols: [
      0,
      11
    ],
    wildExclusions: [
      8,
      9
    ],
    sampling: [
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        10,
        10,
        8,
        9
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        10,
        10,
        8,
        0
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        10,
        10,
        8,
        0,
        9
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        10,
        10,
        8,
        0
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        10,
        10,
        8,
        9,
        0
      ]
    ],
    mechanic: "freeze-respin",
    expandingReels: [
      1,
      2,
      3,
      4
    ],
    coinChanceDenominator: 16,
    coinWildSymbol: 11,
    addWildChanceDenominator: 0,
    maxFrames: 5,
    scale: {
      numerator: "1",
      denominator: "1"
    },
    officialReference: "https://www.smartsoftgaming.com/games/burning-ice-41",
    featureDescription: "5 fixed lines, dollar scatters, expanding and coin wilds, and frozen winning reels with automatic respins.",
    referenceNotes: [
      "Public coefficient values are now preserved exactly; no payout calibration multiplier is applied. Independent probabilities and public-rule fidelity are under review; launching is disabled.",
      "Official help artwork identifies Dollar(8) as a scatter in every variant; Pot(9) is a second scatter only in5/10. Both are excluded from wild substitution. Seven is9 in40 and10 in5/10.",
      "Only listed fixed demo stake amounts are accepted. Demo currency is DMO; no claim is made that its numerical limits are a provider-approved ETB profile.",
      "Current official base Burning Ice help says clover expands on every reel except the first. This differs from10/40, whose current help restricts expansion to reels2\u20134. Lucky-coin positions remain reels2\u20134.",
      "Removed the invented global10,000 ceiling and Burning100\xD7cap. Uses the title-specific reference maximum numerically; any displayed multiplier maximum remains a conservative draft ceiling, with exact truncation-versus-outcome-support semantics unverified."
    ],
    rules: [
      "Fixed demo-derived stake schedule 0.05\u2013100.00 and numerical maximum payout 15000000.00. Source currency is DMO; isolated draft maps the numbers1:1 into ETB. Production remains disabled.",
      "Highest left-to-right regular award per line. Dollar scatters pay on three or more cells anywhere; five or more uses the five-symbol coefficient. Scatter awards use total stake and add to line awards.",
      "Clover expands on reels2\u20135, preserving Dollar/Pot scatters. The draft coin sampler independently picks one of reels2\u20134 with1/16 initial-spin probability; that probability and restriction are not verified provider behavior.",
      "Unverified draft respin rule: each new or improved combination freezes participating reels; respin the remainder until no improvement, full freeze, or five total frames. This stopping rule is not established by official public help.",
      "Unverified draft payment rule: only the increase above each line/scatter prior maximum is paid. Official public client passes a backend TotalWin value and does not establish this recurrence.",
      "Independent draft reel tickets: each regular fruit/Bell has eight tickets, Seven has two and Dollar has one; each eligible Clover and Pot has one. These are not provider reel strips.",
      "Pot additionally pays for a pot on each of reels 1, 3, 5, using its raw public three-pot coefficient against total stake. Multiple pots on one reel do not replace another required reel.",
      "Fractional santim are rounded once for the total win without bias: the same committed server RNG pays either the lower or upper whole santim in proportion to the fractional part. The difference is at most one santim, and every result stays within the cap.",
      "This model is disabled pending official-demo public-rule parity and independent sampling calibration. Prior adaptation features and limits are not an approved faithful release."
    ],
    math: {
      description: "Raw public coefficients and exact numerical demo stakes are preserved. This disabled draft uses an independent, uncalibrated outcome distribution. Exact uncapped enumeration and a50,000-round seeded pilot are recorded as diagnostics, not provider RTP or a release guarantee. Displayed numerical reference maxima are used as draft ceilings; source truncation-versus-reachable-outcome semantics remain unverified where they matter.",
      publicPayoutCoefficientsScaled: false,
      officialPrivateMathVerified: false,
      calibrationStatus: "pending_faithful_model",
      previousAdaptationEvidence: "references/independent-adaptation-superseded.json",
      rounding: {
        method: "unbiased total-santim rounding",
        rng: "Same committed server RNG stream, after every outcome/feature draw. No global randomness.",
        rule: "For exact fractional payout n+r santim, pay n+1 with probability r and n otherwise. Exact integers and already capped payouts require no rounding draw.",
        reserve: "Outcome-independent maximum is rounded UP before applying the published caps.",
        scope: "Applied once to the whole round; credited line/frame payouts sum exactly to that result."
      },
      targetReturn: null,
      measuredReturn: null,
      diagnosticEvidence: "references/first11-raw-prize-diagnostic.json",
      independentDraftDiagnostic: {
        analyticBeforeReferenceMaximum: null,
        pilot: {
          sampleCount: 5e4,
          seed: 1705896382,
          prng: "SFC32 with20 warmup outputs",
          meanBeforeCeiling: 1.698,
          meanAfterDraftReferenceCeiling: 1.698,
          confidence99NormalApproximation: [
            1.5867719679892944,
            1.8092280320107055
          ],
          sampleMaximumReturn: 612,
          sourceCeilingEvents: 0,
          stakeMaximumMinor: "10000",
          reserveAtMaximumMinor: "34000000",
          scope: "Uncalibrated disabled draft; confidence approximation is diagnostic, not certification. Same return applies to every listed stake because raw payouts are integral and maxima scale proportionally or remain above the raw model bound."
        },
        releaseReady: false
      }
    },
    scatters: [
      {
        symbol: 8,
        reels: [
          0,
          1,
          2,
          3,
          4
        ],
        mode: "symbols",
        minCount: 3
      },
      {
        symbol: 9,
        reels: [
          0,
          2,
          4
        ],
        mode: "reels",
        minCount: 3
      }
    ],
    releaseGate: {
      status: "blocked_by_a_to_z_reference_requirement",
      productionLaunchable: false,
      required: [
        "presentation_audio",
        "gamble_collect",
        "source_maximum_semantics",
        "independent_probability_calibration",
        "currency_profile",
        "respin_payment",
        "lucky_coin_trigger"
      ],
      manifest: "references/first11-release-divergences.json",
      reason: "Raw coefficients, exact schedules and numerical reference maxima are aligned. Public controls/presentation, source maximum semantics and Burning respin rules remain incomplete; independent probabilities are uncalibrated."
    },
    previousAdaptationScale: {
      numerator: "310913432789",
      denominator: "500000000000"
    },
    stakeMinorValues: [
      "5",
      "10",
      "20",
      "30",
      "40",
      "50",
      "60",
      "80",
      "100",
      "150",
      "200",
      "300",
      "400",
      "500",
      "600",
      "800",
      "1000",
      "1500",
      "2000",
      "3000",
      "4000",
      "5000",
      "6000",
      "8000",
      "10000"
    ],
    minStake: "0.05",
    maxStake: "100.00",
    referenceStakeSchedule: {
      currency: "DMO",
      lines: 5,
      chipCoefficient: "0.01",
      perLineValues: [
        1,
        2,
        4,
        6,
        8,
        10,
        12,
        16,
        20,
        30,
        40,
        60,
        80,
        100,
        120,
        160,
        200,
        300,
        400,
        600,
        800,
        1e3,
        1200,
        1600,
        2e3
      ],
      minimum: "0.05",
      maximum: "100.00",
      source: "references/public-models/burningice_native.bootstrap.json",
      status: "verified_demo_values; production_currency_profile_requires_review"
    },
    referenceLimits: {
      currency: "DMO",
      maximumWin: "15000000.00",
      DoublingMaxCount: "5.0",
      DoublingMaxWin: "500.0",
      doublingLimitMeaningVerified: false
    },
    coinReels: [
      1,
      2,
      3
    ],
    maxWin: "15000000.00",
    currencyAdaptation: {
      source: "DMO",
      draft: "ETB",
      method: "Numerical 1:1 mapping of demo values only; not an exchange rate or provider-approved ETB profile.",
      productionLaunchable: false
    }
  },
  {
    id: "burningice10_native",
    name: "Burning Ice 10",
    version: "superwin-burningice10-1",
    launchable: false,
    columns: 5,
    rows: 3,
    paths: [
      [
        1,
        1,
        1,
        1,
        1
      ],
      [
        2,
        2,
        2,
        2,
        2
      ],
      [
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        1,
        0,
        1,
        2
      ],
      [
        0,
        1,
        2,
        1,
        0
      ],
      [
        2,
        2,
        1,
        0,
        0
      ],
      [
        0,
        0,
        1,
        2,
        2
      ],
      [
        1,
        0,
        0,
        0,
        1
      ],
      [
        1,
        2,
        2,
        2,
        1
      ],
      [
        2,
        1,
        1,
        1,
        2
      ]
    ],
    ways: 0,
    lineStakeDivisor: 10,
    coefficients: [
      [
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        100,
        300,
        1e3
      ],
      [
        0,
        0,
        0,
        100,
        300,
        1e3
      ],
      [
        0,
        0,
        0,
        100,
        300,
        1e3
      ],
      [
        0,
        0,
        0,
        100,
        300,
        1e3
      ],
      [
        0,
        0,
        0,
        200,
        500,
        2e3
      ],
      [
        0,
        0,
        0,
        400,
        1500,
        7500
      ],
      [
        0,
        0,
        0,
        400,
        1500,
        7500
      ],
      [
        0,
        0,
        0,
        300,
        2e3,
        6e3
      ],
      [
        0,
        0,
        0,
        2e3,
        0,
        0
      ],
      [
        0,
        0,
        100,
        500,
        2500,
        5e4
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ],
    symbols: [
      {
        id: "0",
        label: "Clover wild",
        mark: "\u2618",
        color: "#8bb7ff"
      },
      {
        id: "1",
        label: "Plum",
        mark: "\u{1F7E3}",
        color: "#ff543e"
      },
      {
        id: "2",
        label: "Orange",
        mark: "\u{1F34A}",
        color: "#8bb7ff"
      },
      {
        id: "3",
        label: "Lemon",
        mark: "\u{1F34B}",
        color: "#ff543e"
      },
      {
        id: "4",
        label: "Cherries",
        mark: "\u{1F352}",
        color: "#8bb7ff"
      },
      {
        id: "5",
        label: "Bell",
        mark: "\u265F",
        color: "#ff543e"
      },
      {
        id: "6",
        label: "Watermelon",
        mark: "\u{1F349}",
        color: "#8bb7ff"
      },
      {
        id: "7",
        label: "Grapes",
        mark: "\u{1F347}",
        color: "#ff543e"
      },
      {
        id: "8",
        label: "Dollar scatter",
        mark: "$",
        color: "#8bb7ff"
      },
      {
        id: "9",
        label: "Pot scatter",
        mark: "\u25C9",
        color: "#ff543e"
      },
      {
        id: "10",
        label: "Seven",
        mark: "7",
        color: "#8bb7ff"
      },
      {
        id: "11",
        label: "Coin wild",
        mark: "W",
        color: "#ff543e"
      }
    ],
    theme: {
      bg: "#111023",
      accent: "#8bb7ff",
      secondary: "#ff543e"
    },
    wildSymbols: [
      0,
      11
    ],
    wildExclusions: [
      8,
      9
    ],
    sampling: [
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        10,
        10,
        8,
        9
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        10,
        10,
        8,
        0
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        10,
        10,
        8,
        0,
        9
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        10,
        10,
        8,
        0
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        10,
        10,
        8,
        9
      ]
    ],
    mechanic: "freeze-respin",
    expandingReels: [
      1,
      2,
      3
    ],
    coinChanceDenominator: 16,
    coinWildSymbol: 11,
    addWildChanceDenominator: 0,
    maxFrames: 5,
    scale: {
      numerator: "1",
      denominator: "1"
    },
    officialReference: "https://www.smartsoftgaming.com/games/blazing-hot-10",
    featureDescription: "10 fixed lines, dollar scatters, expanding and coin wilds, and frozen winning reels with automatic respins.",
    referenceNotes: [
      "Public coefficient values are now preserved exactly; no payout calibration multiplier is applied. Independent probabilities and public-rule fidelity are under review; launching is disabled.",
      "Official help artwork identifies Dollar(8) as a scatter in every variant; Pot(9) is a second scatter only in5/10. Both are excluded from wild substitution. Seven is9 in40 and10 in5/10.",
      "Only listed fixed demo stake amounts are accepted. Demo currency is DMO; no claim is made that its numerical limits are a provider-approved ETB profile.",
      "Removed the invented global10,000 ceiling and Burning100\xD7cap. Uses the title-specific reference maximum numerically; any displayed multiplier maximum remains a conservative draft ceiling, with exact truncation-versus-outcome-support semantics unverified."
    ],
    rules: [
      "Fixed demo-derived stake schedule 0.10\u2013100.00 and numerical maximum payout 15000000.00. Source currency is DMO; isolated draft maps the numbers1:1 into ETB. Production remains disabled.",
      "Highest left-to-right regular award per line. Dollar scatters pay on three or more cells anywhere; five or more uses the five-symbol coefficient. Scatter awards use total stake and add to line awards.",
      "Clover expands on reels2\u20134, preserving Dollar/Pot scatters. The draft coin sampler independently picks one of reels2\u20134 with1/16 initial-spin probability; that probability and restriction are not verified provider behavior.",
      "Unverified draft respin rule: each new or improved combination freezes participating reels; respin the remainder until no improvement, full freeze, or five total frames. This stopping rule is not established by official public help.",
      "Unverified draft payment rule: only the increase above each line/scatter prior maximum is paid. Official public client passes a backend TotalWin value and does not establish this recurrence.",
      "Independent draft reel tickets: each regular fruit/Bell has eight tickets, Seven has two and Dollar has one; each eligible Clover and Pot has one. These are not provider reel strips.",
      "Pot additionally pays for a pot on each of reels 1, 3, 5, using its raw public three-pot coefficient against total stake. Multiple pots on one reel do not replace another required reel.",
      "Fractional santim are rounded once for the total win without bias: the same committed server RNG pays either the lower or upper whole santim in proportion to the fractional part. The difference is at most one santim, and every result stays within the cap.",
      "This model is disabled pending official-demo public-rule parity and independent sampling calibration. Prior adaptation features and limits are not an approved faithful release."
    ],
    math: {
      description: "Raw public coefficients and exact numerical demo stakes are preserved. This disabled draft uses an independent, uncalibrated outcome distribution. Exact uncapped enumeration and a50,000-round seeded pilot are recorded as diagnostics, not provider RTP or a release guarantee. Displayed numerical reference maxima are used as draft ceilings; source truncation-versus-reachable-outcome semantics remain unverified where they matter.",
      publicPayoutCoefficientsScaled: false,
      officialPrivateMathVerified: false,
      calibrationStatus: "pending_faithful_model",
      previousAdaptationEvidence: "references/independent-adaptation-superseded.json",
      rounding: {
        method: "unbiased total-santim rounding",
        rng: "Same committed server RNG stream, after every outcome/feature draw. No global randomness.",
        rule: "For exact fractional payout n+r santim, pay n+1 with probability r and n otherwise. Exact integers and already capped payouts require no rounding draw.",
        reserve: "Outcome-independent maximum is rounded UP before applying the published caps.",
        scope: "Applied once to the whole round; credited line/frame payouts sum exactly to that result."
      },
      targetReturn: null,
      measuredReturn: null,
      diagnosticEvidence: "references/first11-raw-prize-diagnostic.json",
      independentDraftDiagnostic: {
        analyticBeforeReferenceMaximum: null,
        pilot: {
          sampleCount: 5e4,
          seed: 1705906355,
          prng: "SFC32 with20 warmup outputs",
          meanBeforeCeiling: 2.05076,
          meanAfterDraftReferenceCeiling: 2.05076,
          confidence99NormalApproximation: [
            1.9218542352771482,
            2.1796657647228517
          ],
          sampleMaximumReturn: 600,
          sourceCeilingEvents: 0,
          stakeMaximumMinor: "10000",
          reserveAtMaximumMinor: "58000000",
          scope: "Uncalibrated disabled draft; confidence approximation is diagnostic, not certification. Same return applies to every listed stake because raw payouts are integral and maxima scale proportionally or remain above the raw model bound."
        },
        releaseReady: false
      }
    },
    scatters: [
      {
        symbol: 8,
        reels: [
          0,
          1,
          2,
          3,
          4
        ],
        mode: "symbols",
        minCount: 3
      },
      {
        symbol: 9,
        reels: [
          0,
          2,
          4
        ],
        mode: "reels",
        minCount: 3
      }
    ],
    releaseGate: {
      status: "blocked_by_a_to_z_reference_requirement",
      productionLaunchable: false,
      required: [
        "presentation_audio",
        "gamble_collect",
        "source_maximum_semantics",
        "independent_probability_calibration",
        "currency_profile",
        "respin_payment",
        "lucky_coin_trigger"
      ],
      manifest: "references/first11-release-divergences.json",
      reason: "Raw coefficients, exact schedules and numerical reference maxima are aligned. Public controls/presentation, source maximum semantics and Burning respin rules remain incomplete; independent probabilities are uncalibrated."
    },
    previousAdaptationScale: {
      numerator: "29991552809",
      denominator: "62500000000"
    },
    stakeMinorValues: [
      "10",
      "20",
      "30",
      "40",
      "50",
      "60",
      "80",
      "100",
      "150",
      "200",
      "300",
      "400",
      "500",
      "600",
      "800",
      "1000",
      "1500",
      "2000",
      "3000",
      "4000",
      "5000",
      "6000",
      "8000",
      "10000"
    ],
    minStake: "0.10",
    maxStake: "100.00",
    referenceStakeSchedule: {
      currency: "DMO",
      lines: 10,
      chipCoefficient: "0.01",
      perLineValues: [
        1,
        2,
        3,
        4,
        5,
        6,
        8,
        10,
        15,
        20,
        30,
        40,
        50,
        60,
        80,
        100,
        150,
        200,
        300,
        400,
        500,
        600,
        800,
        1e3
      ],
      minimum: "0.10",
      maximum: "100.00",
      source: "references/public-models/burningice10_native.bootstrap.json",
      status: "verified_demo_values; production_currency_profile_requires_review"
    },
    referenceLimits: {
      currency: "DMO",
      maximumWin: "15000000.00",
      DoublingMaxCount: "5.0",
      DoublingMaxWin: "500.0",
      doublingLimitMeaningVerified: false
    },
    coinReels: [
      1,
      2,
      3
    ],
    maxWin: "15000000.00",
    currencyAdaptation: {
      source: "DMO",
      draft: "ETB",
      method: "Numerical 1:1 mapping of demo values only; not an exchange rate or provider-approved ETB profile.",
      productionLaunchable: false
    }
  },
  {
    id: "burningice40_native",
    name: "Burning Ice 40",
    version: "superwin-burningice40-1",
    launchable: false,
    columns: 5,
    rows: 4,
    paths: [
      [
        2,
        2,
        2,
        2,
        2
      ],
      [
        1,
        1,
        1,
        1,
        1
      ],
      [
        3,
        3,
        3,
        3,
        3
      ],
      [
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        1,
        0,
        1,
        2
      ],
      [
        1,
        2,
        3,
        2,
        1
      ],
      [
        3,
        3,
        2,
        1,
        0
      ],
      [
        0,
        0,
        1,
        2,
        3
      ],
      [
        2,
        3,
        3,
        3,
        2
      ],
      [
        1,
        0,
        0,
        0,
        1
      ],
      [
        3,
        2,
        1,
        0,
        0
      ],
      [
        0,
        1,
        2,
        3,
        3
      ],
      [
        2,
        3,
        2,
        1,
        2
      ],
      [
        1,
        0,
        1,
        2,
        1
      ],
      [
        3,
        2,
        3,
        2,
        3
      ],
      [
        0,
        1,
        0,
        1,
        0
      ],
      [
        2,
        1,
        2,
        3,
        2
      ],
      [
        1,
        2,
        1,
        0,
        1
      ],
      [
        3,
        2,
        2,
        2,
        3
      ],
      [
        0,
        1,
        1,
        1,
        0
      ],
      [
        2,
        2,
        1,
        0,
        0
      ],
      [
        1,
        1,
        2,
        3,
        3
      ],
      [
        3,
        2,
        1,
        1,
        0
      ],
      [
        0,
        1,
        2,
        2,
        3
      ],
      [
        2,
        1,
        1,
        1,
        0
      ],
      [
        1,
        2,
        2,
        2,
        3
      ],
      [
        3,
        3,
        2,
        3,
        3
      ],
      [
        0,
        0,
        1,
        0,
        0
      ],
      [
        2,
        2,
        3,
        2,
        2
      ],
      [
        1,
        1,
        0,
        1,
        1
      ],
      [
        3,
        3,
        3,
        2,
        1
      ],
      [
        0,
        0,
        0,
        1,
        2
      ],
      [
        2,
        3,
        3,
        2,
        1
      ],
      [
        1,
        0,
        0,
        1,
        2
      ],
      [
        3,
        2,
        2,
        1,
        0
      ],
      [
        0,
        1,
        1,
        2,
        3
      ],
      [
        2,
        3,
        2,
        1,
        0
      ],
      [
        1,
        0,
        1,
        2,
        3
      ],
      [
        3,
        2,
        1,
        0,
        1
      ],
      [
        0,
        1,
        2,
        3,
        2
      ]
    ],
    ways: 0,
    lineStakeDivisor: 40,
    coefficients: [
      [
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        100,
        400,
        1e3
      ],
      [
        0,
        0,
        0,
        100,
        400,
        1e3
      ],
      [
        0,
        0,
        0,
        100,
        400,
        1e3
      ],
      [
        0,
        0,
        0,
        100,
        400,
        1e3
      ],
      [
        0,
        0,
        0,
        200,
        800,
        2e3
      ],
      [
        0,
        0,
        0,
        400,
        1e3,
        3e3
      ],
      [
        0,
        0,
        0,
        400,
        1e3,
        3e3
      ],
      [
        0,
        0,
        0,
        1200,
        8e3,
        4e4
      ],
      [
        0,
        0,
        50,
        600,
        2e3,
        1e4
      ]
    ],
    symbols: [
      {
        id: "0",
        label: "Clover wild",
        mark: "\u2618",
        color: "#65f5df"
      },
      {
        id: "1",
        label: "Plum",
        mark: "\u{1F7E3}",
        color: "#ffb341"
      },
      {
        id: "2",
        label: "Orange",
        mark: "\u{1F34A}",
        color: "#65f5df"
      },
      {
        id: "3",
        label: "Lemon",
        mark: "\u{1F34B}",
        color: "#ffb341"
      },
      {
        id: "4",
        label: "Cherries",
        mark: "\u{1F352}",
        color: "#65f5df"
      },
      {
        id: "5",
        label: "Bell",
        mark: "\u265F",
        color: "#ffb341"
      },
      {
        id: "6",
        label: "Watermelon",
        mark: "\u{1F349}",
        color: "#65f5df"
      },
      {
        id: "7",
        label: "Grapes",
        mark: "\u{1F347}",
        color: "#ffb341"
      },
      {
        id: "8",
        label: "Dollar scatter",
        mark: "$",
        color: "#65f5df"
      },
      {
        id: "9",
        label: "Seven",
        mark: "7",
        color: "#ffb341"
      }
    ],
    theme: {
      bg: "#051b20",
      accent: "#65f5df",
      secondary: "#ffb341"
    },
    wildSymbols: [
      0
    ],
    wildExclusions: [
      8
    ],
    sampling: [
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        9,
        9,
        8
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        9,
        9,
        8,
        0
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        9,
        9,
        8,
        0
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        9,
        9,
        8,
        0
      ],
      [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        7,
        9,
        9,
        8
      ]
    ],
    mechanic: "freeze-respin",
    expandingReels: [
      1,
      2,
      3
    ],
    coinChanceDenominator: 0,
    coinWildSymbol: null,
    addWildChanceDenominator: 0,
    maxFrames: 5,
    scale: {
      numerator: "1",
      denominator: "1"
    },
    officialReference: "https://www.smartsoftgaming.com/games/burning-ice-40",
    featureDescription: "40 fixed lines, dollar scatters, expanding clover wilds, and frozen winning reels with automatic respins. Exact respin settlement fidelity remains under review.",
    referenceNotes: [
      "Public coefficient values are now preserved exactly; no payout calibration multiplier is applied. Independent probabilities and public-rule fidelity are under review; launching is disabled.",
      "Official help artwork identifies Dollar(8) as a scatter in every variant; Pot(9) is a second scatter only in5/10. Both are excluded from wild substitution. Seven is9 in40 and10 in5/10.",
      "Only listed fixed demo stake amounts are accepted. Demo currency is DMO; no claim is made that its numerical limits are a provider-approved ETB profile.",
      "Removed the unverified lucky-coin effect. The40-line help has a Dollar-scatter third section instead of the coin section used by5/10, and its count10 runtime does not instantiate the i===10 coin-symbol branch. Provider response observation is still needed to settle residual inherited-client ambiguity.",
      "Removed the invented global10,000 ceiling and Burning100\xD7cap. Uses the title-specific reference maximum numerically; any displayed multiplier maximum remains a conservative draft ceiling, with exact truncation-versus-outcome-support semantics unverified."
    ],
    rules: [
      "Fixed demo-derived stake schedule 0.40\u2013100.00 and numerical maximum payout 15000000.00. Source currency is DMO; isolated draft maps the numbers1:1 into ETB. Production remains disabled.",
      "Highest left-to-right regular award per line. Dollar scatters pay on three or more cells anywhere; five or more uses the five-symbol coefficient. Scatter awards use total stake and add to line awards.",
      "Clover expands on reels2\u20134, preserving Dollar scatters. No lucky-coin effect is assumed for40; current help differs from5/10 and inherited runtime code is inconclusive.",
      "Unverified draft respin rule: each new or improved combination freezes participating reels; respin the remainder until no improvement, full freeze, or five total frames. This stopping rule is not established by official public help.",
      "Unverified draft payment rule: only the increase above each line/scatter prior maximum is paid. Official public client passes a backend TotalWin value and does not establish this recurrence.",
      "Independent draft reel tickets: each regular fruit/Bell has eight tickets, Seven has two and Dollar has one; each eligible Clover and Pot has one. These are not provider reel strips.",
      "Fractional santim are rounded once for the total win without bias: the same committed server RNG pays either the lower or upper whole santim in proportion to the fractional part. The difference is at most one santim, and every result stays within the cap.",
      "This model is disabled pending official-demo public-rule parity and independent sampling calibration. Prior adaptation features and limits are not an approved faithful release."
    ],
    math: {
      description: "Raw public coefficients and exact numerical demo stakes are preserved. This disabled draft uses an independent, uncalibrated outcome distribution. Exact uncapped enumeration and a50,000-round seeded pilot are recorded as diagnostics, not provider RTP or a release guarantee. Displayed numerical reference maxima are used as draft ceilings; source truncation-versus-reachable-outcome semantics remain unverified where they matter.",
      publicPayoutCoefficientsScaled: false,
      officialPrivateMathVerified: false,
      calibrationStatus: "pending_faithful_model",
      previousAdaptationEvidence: "references/independent-adaptation-superseded.json",
      rounding: {
        method: "unbiased total-santim rounding",
        rng: "Same committed server RNG stream, after every outcome/feature draw. No global randomness.",
        rule: "For exact fractional payout n+r santim, pay n+1 with probability r and n otherwise. Exact integers and already capped payouts require no rounding draw.",
        reserve: "Outcome-independent maximum is rounded UP before applying the published caps.",
        scope: "Applied once to the whole round; credited line/frame payouts sum exactly to that result."
      },
      targetReturn: null,
      measuredReturn: null,
      diagnosticEvidence: "references/first11-raw-prize-diagnostic.json",
      independentDraftDiagnostic: {
        analyticBeforeReferenceMaximum: null,
        pilot: {
          sampleCount: 5e4,
          seed: 1705916328,
          prng: "SFC32 with20 warmup outputs",
          meanBeforeCeiling: 3.0279375,
          meanAfterDraftReferenceCeiling: 3.0279375,
          confidence99NormalApproximation: [
            2.3959553637327513,
            3.659919636267249
          ],
          sampleMaximumReturn: 4000.5,
          sourceCeilingEvents: 0,
          stakeMaximumMinor: "10000",
          reserveAtMaximumMinor: "50000000",
          scope: "Uncalibrated disabled draft; confidence approximation is diagnostic, not certification. Same return applies to every listed stake because raw payouts are integral and maxima scale proportionally or remain above the raw model bound."
        },
        releaseReady: false
      }
    },
    scatters: [
      {
        symbol: 8,
        reels: [
          0,
          1,
          2,
          3,
          4
        ],
        mode: "symbols",
        minCount: 3
      }
    ],
    releaseGate: {
      status: "blocked_by_a_to_z_reference_requirement",
      productionLaunchable: false,
      required: [
        "presentation_audio",
        "gamble_collect",
        "source_maximum_semantics",
        "independent_probability_calibration",
        "currency_profile",
        "respin_payment",
        "coin_feature_ambiguity"
      ],
      manifest: "references/first11-release-divergences.json",
      reason: "Raw coefficients, exact schedules and numerical reference maxima are aligned. Public controls/presentation, source maximum semantics and Burning respin rules remain incomplete; independent probabilities are uncalibrated."
    },
    previousAdaptationScale: {
      numerator: "196759573083",
      denominator: "500000000000"
    },
    stakeMinorValues: [
      "40",
      "80",
      "120",
      "160",
      "200",
      "400",
      "600",
      "800",
      "1000",
      "1200",
      "1600",
      "2000",
      "3000",
      "4000",
      "5000",
      "6000",
      "8000",
      "10000"
    ],
    minStake: "0.40",
    maxStake: "100.00",
    referenceStakeSchedule: {
      currency: "DMO",
      lines: 40,
      chipCoefficient: "0.01",
      perLineValues: [
        1,
        2,
        3,
        4,
        5,
        10,
        15,
        20,
        25,
        30,
        40,
        50,
        75,
        100,
        125,
        150,
        200,
        250
      ],
      minimum: "0.40",
      maximum: "100.00",
      source: "references/public-models/burningice40_native.bootstrap.json",
      status: "verified_demo_values; production_currency_profile_requires_review"
    },
    referenceLimits: {
      currency: "DMO",
      maximumWin: "15000000.00",
      DoublingMaxCount: "5.0",
      DoublingMaxWin: "500.0",
      doublingLimitMeaningVerified: false
    },
    coinReels: [],
    maxWin: "15000000.00",
    currencyAdaptation: {
      source: "DMO",
      draft: "ETB",
      method: "Numerical 1:1 mapping of demo values only; not an exchange rate or provider-approved ETB profile.",
      productionLaunchable: false
    }
  },
  {
    id: "safarisimba_native",
    name: "Safari Simba",
    version: "superwin-safarisimba-1",
    launchable: false,
    columns: 3,
    rows: 3,
    paths: [
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
    ways: 0,
    lineStakeDivisor: 5,
    coefficients: [
      [
        0,
        0,
        0,
        100
      ],
      [
        0,
        0,
        0,
        100
      ],
      [
        0,
        0,
        0,
        100
      ],
      [
        0,
        0,
        0,
        100
      ],
      [
        0,
        0,
        0,
        200
      ],
      [
        0,
        0,
        0,
        200
      ],
      [
        0,
        0,
        0,
        250
      ],
      [
        0,
        0,
        0,
        500
      ],
      [
        0,
        0,
        0,
        750
      ]
    ],
    symbols: [
      {
        id: "0",
        label: "Jack",
        mark: "J",
        color: "#f1bb57"
      },
      {
        id: "1",
        label: "Queen",
        mark: "Q",
        color: "#65d0a1"
      },
      {
        id: "2",
        label: "King",
        mark: "K",
        color: "#f1bb57"
      },
      {
        id: "3",
        label: "Ace",
        mark: "A",
        color: "#65d0a1"
      },
      {
        id: "4",
        label: "Zebra",
        mark: "\u{1F993}",
        color: "#f1bb57"
      },
      {
        id: "5",
        label: "Elephant",
        mark: "\u{1F418}",
        color: "#65d0a1"
      },
      {
        id: "6",
        label: "Tiger",
        mark: "\u{1F405}",
        color: "#f1bb57"
      },
      {
        id: "7",
        label: "Lion",
        mark: "\u{1F981}",
        color: "#65d0a1"
      },
      {
        id: "8",
        label: "Emblem",
        mark: "S",
        color: "#f1bb57"
      }
    ],
    theme: {
      bg: "#132017",
      accent: "#f1bb57",
      secondary: "#65d0a1"
    },
    wildSymbols: [],
    wildExclusions: [],
    sampling: [
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ]
    ],
    mechanic: "safari-multiplier",
    expandingReels: [],
    coinChanceDenominator: 0,
    coinWildSymbol: null,
    addWildChanceDenominator: 0,
    maxFrames: 1,
    scale: {
      numerator: "1",
      denominator: "1"
    },
    officialReference: "https://www.smartsoftgaming.com/games/safari-simba-2",
    featureDescription: "5 fixed lines with an independent 1\xD7\u20135\xD7 multiplier. Matching full zebra, elephant or tiger reels expand visually.",
    referenceNotes: [
      "Public coefficient values are now preserved exactly; no payout calibration multiplier is applied. Independent probabilities and public-rule fidelity are under review; launching is disabled.",
      "Runtime win display multiplies coefficients by betPerLine; line-stake basis follows this display and public rules despite WinsOnLine:false in the bootstrap.",
      "Only listed fixed demo stake amounts are accepted. Demo currency is DMO; no claim is made that its numerical limits are a provider-approved ETB profile.",
      "Removed the invented global10,000 ceiling and Burning100\xD7cap. Uses the title-specific reference maximum numerically; any displayed multiplier maximum remains a conservative draft ceiling, with exact truncation-versus-outcome-support semantics unverified."
    ],
    rules: [
      "Fixed demo-derived stake schedule 0.05\u2013400.00 and numerical maximum payout 58000.00. Source currency is DMO; isolated draft maps the numbers1:1 into ETB. Production remains disabled.",
      "Highest eligible left-to-right award per line; simultaneous line wins add. The public reference maximum is used as a draft payout ceiling. Whether the source enforces that maximum by truncation or by restricting reachable outcomes remains under review.",
      "All results resolve on the server in one accepted round. Automatic features never require an extra debit.",
      "Every symbol is equally likely in each independent grid cell. The independent 1\xD7, 2\xD7, 3\xD7, 4\xD7 and 5\xD7 multipliers are equally likely.",
      "Safari expansion is visual: a full zebra, elephant or tiger first reel and matching subsequent full reels expand without adding payouts.",
      "Fractional santim are rounded once for the total win without bias: the same committed server RNG pays either the lower or upper whole santim in proportion to the fractional part. The difference is at most one santim, and every result stays within the cap.",
      "This model is disabled pending official-demo public-rule parity and independent sampling calibration. Prior adaptation features and limits are not an approved faithful release.",
      "Official help states a maximum of 145\xD7 the stake. The disabled draft uses that numerical ceiling; the private outcome restrictions that produce the source maximum are not known."
    ],
    math: {
      description: "Raw public coefficients and exact numerical demo stakes are preserved. This disabled draft uses an independent, uncalibrated outcome distribution. Exact uncapped enumeration and a50,000-round seeded pilot are recorded as diagnostics, not provider RTP or a release guarantee. Displayed numerical reference maxima are used as draft ceilings; source truncation-versus-reachable-outcome semantics remain unverified where they matter.",
      publicPayoutCoefficientsScaled: false,
      officialPrivateMathVerified: false,
      calibrationStatus: "pending_faithful_model",
      previousAdaptationEvidence: "references/independent-adaptation-superseded.json",
      rounding: {
        method: "unbiased total-santim rounding",
        rng: "Same committed server RNG stream, after every outcome/feature draw. No global randomness.",
        rule: "For exact fractional payout n+r santim, pay n+1 with probability r and n otherwise. Exact integers and already capped payouts require no rounding draw.",
        reserve: "Outcome-independent maximum is rounded UP before applying the published caps.",
        scope: "Applied once to the whole round; credited line/frame payouts sum exactly to that result."
      },
      targetReturn: null,
      measuredReturn: null,
      diagnosticEvidence: "references/first11-raw-prize-diagnostic.json",
      independentDraftDiagnostic: {
        analyticBeforeReferenceMaximum: {
          method: "Exact enumeration of every symbol sequence on one path; linearity across actual lines/ways and independent mean multiplier3. No cap or outcome-support claim.",
          sequences: 729,
          effectiveSymbolWeights: [
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1
          ],
          returnFraction: {
            numerator: "230",
            denominator: "243"
          },
          expectedReturn: 0.9465020576131687
        },
        pilot: {
          sampleCount: 5e4,
          seed: 1705926301,
          prng: "SFC32 with20 warmup outputs",
          meanBeforeCeiling: 0.9384,
          meanAfterDraftReferenceCeiling: 0.9384,
          confidence99NormalApproximation: [
            0.8755612510932274,
            1.0012387489067727
          ],
          sampleMaximumReturn: 120,
          sourceCeilingEvents: 0,
          stakeMaximumMinor: "40000",
          reserveAtMaximumMinor: "5800000",
          scope: "Uncalibrated disabled draft; confidence approximation is diagnostic, not certification. Same return applies to every listed stake because raw payouts are integral and maxima scale proportionally or remain above the raw model bound."
        },
        releaseReady: false
      }
    },
    scatters: [],
    releaseGate: {
      status: "blocked_by_a_to_z_reference_requirement",
      productionLaunchable: false,
      required: [
        "presentation_audio",
        "gamble_collect",
        "source_maximum_semantics",
        "independent_probability_calibration",
        "currency_profile"
      ],
      manifest: "references/first11-release-divergences.json",
      reason: "Raw coefficients, exact schedules and numerical reference maxima are aligned. Public controls/presentation, source maximum semantics and Burning respin rules remain incomplete; independent probabilities are uncalibrated."
    },
    previousAdaptationScale: {
      numerator: "23571",
      denominator: "23000"
    },
    stakeMinorValues: [
      "5",
      "10",
      "20",
      "30",
      "40",
      "50",
      "60",
      "80",
      "100",
      "150",
      "200",
      "300",
      "400",
      "500",
      "600",
      "800",
      "1000",
      "1500",
      "2000",
      "3000",
      "4000",
      "5000",
      "6000",
      "8000",
      "10000",
      "15000",
      "20000",
      "30000",
      "40000"
    ],
    minStake: "0.05",
    maxStake: "400.00",
    referenceStakeSchedule: {
      currency: "DMO",
      lines: 5,
      chipCoefficient: "0.01",
      perLineValues: [
        1,
        2,
        4,
        6,
        8,
        10,
        12,
        16,
        20,
        30,
        40,
        60,
        80,
        100,
        120,
        160,
        200,
        300,
        400,
        600,
        800,
        1e3,
        1200,
        1600,
        2e3,
        3e3,
        4e3,
        6e3,
        8e3
      ],
      minimum: "0.05",
      maximum: "400.00",
      source: "references/public-models/safarisimba_native.json",
      status: "verified_demo_values; production_currency_profile_requires_review"
    },
    referenceLimits: {
      currency: "DMO",
      maximumWin: "58000.00",
      maximumWinMultiplier: 145,
      DoublingMaxCount: "5.0",
      DoublingMaxWin: "500.00",
      doublingLimitMeaningVerified: false
    },
    maxWin: "58000.00",
    winMultiplierCap: 145,
    currencyAdaptation: {
      source: "DMO",
      draft: "ETB",
      method: "Numerical 1:1 mapping of demo values only; not an exchange rate or provider-approved ETB profile.",
      productionLaunchable: false
    }
  },
  {
    id: "habeshafortune5_native",
    name: "Habesha Fortune 5",
    version: "superwin-habeshafortune5-1",
    launchable: false,
    columns: 3,
    rows: 3,
    paths: [
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
    ways: 0,
    lineStakeDivisor: 5,
    coefficients: [
      [
        0,
        0,
        0,
        100
      ],
      [
        0,
        0,
        0,
        100
      ],
      [
        0,
        0,
        0,
        100
      ],
      [
        0,
        0,
        0,
        100
      ],
      [
        0,
        0,
        0,
        200
      ],
      [
        0,
        0,
        0,
        200
      ],
      [
        0,
        0,
        0,
        250
      ],
      [
        0,
        0,
        0,
        500
      ],
      [
        0,
        0,
        0,
        750
      ]
    ],
    symbols: [
      {
        id: "0",
        label: "Coffee",
        mark: "\u2615",
        color: "#f2ce6d"
      },
      {
        id: "1",
        label: "Honey drink",
        mark: "\u{1F36F}",
        color: "#57b87c"
      },
      {
        id: "2",
        label: "Coffee pot",
        mark: "\u265F",
        color: "#f2ce6d"
      },
      {
        id: "3",
        label: "Woven hat",
        mark: "\u25ED",
        color: "#57b87c"
      },
      {
        id: "4",
        label: "Masenqo",
        mark: "\u266B",
        color: "#f2ce6d"
      },
      {
        id: "5",
        label: "Bus",
        mark: "\u{1F68C}",
        color: "#57b87c"
      },
      {
        id: "6",
        label: "Woman",
        mark: "\u265B",
        color: "#f2ce6d"
      },
      {
        id: "7",
        label: "Ibex",
        mark: "\u2648",
        color: "#57b87c"
      },
      {
        id: "8",
        label: "Obelisk",
        mark: "\u25A5",
        color: "#f2ce6d"
      }
    ],
    theme: {
      bg: "#28150c",
      accent: "#f2ce6d",
      secondary: "#57b87c"
    },
    wildSymbols: [],
    wildExclusions: [],
    sampling: [
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ],
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
      ]
    ],
    mechanic: "multiplier",
    expandingReels: [],
    coinChanceDenominator: 0,
    coinWildSymbol: null,
    addWildChanceDenominator: 0,
    maxFrames: 1,
    scale: {
      numerator: "1",
      denominator: "1"
    },
    officialReference: "https://www.smartsoftgaming.com/games/hab",
    featureDescription: "5 fixed lines with an independent 1\xD7\u20135\xD7 multiplier.",
    referenceNotes: [
      "Public coefficient values are now preserved exactly; no payout calibration multiplier is applied. Independent probabilities and public-rule fidelity are under review; launching is disabled.",
      "Runtime win display multiplies coefficients by betPerLine; line-stake basis follows this display and public rules despite WinsOnLine:false in the bootstrap.",
      "Official symbol atlas visually matched: coffee, honey drink, coffee pot, woven hat, masenqo, bus, woman, ibex and obelisk.",
      "Only listed fixed demo stake amounts are accepted. Demo currency is DMO; no claim is made that its numerical limits are a provider-approved ETB profile.",
      "Removed the invented global10,000 ceiling and Burning100\xD7cap. Uses the title-specific reference maximum numerically; any displayed multiplier maximum remains a conservative draft ceiling, with exact truncation-versus-outcome-support semantics unverified."
    ],
    rules: [
      "Fixed demo-derived stake schedule 0.05\u2013400.00 and numerical maximum payout 58000.00. Source currency is DMO; isolated draft maps the numbers1:1 into ETB. Production remains disabled.",
      "Highest eligible left-to-right award per line; simultaneous line wins add. The public reference maximum is used as a draft payout ceiling. Whether the source enforces that maximum by truncation or by restricting reachable outcomes remains under review.",
      "All results resolve on the server in one accepted round. Automatic features never require an extra debit.",
      "Every symbol is equally likely in each independent grid cell. The independent 1\xD7, 2\xD7, 3\xD7, 4\xD7 and 5\xD7 multipliers are equally likely.",
      "Fractional santim are rounded once for the total win without bias: the same committed server RNG pays either the lower or upper whole santim in proportion to the fractional part. The difference is at most one santim, and every result stays within the cap.",
      "This model is disabled pending official-demo public-rule parity and independent sampling calibration. Prior adaptation features and limits are not an approved faithful release.",
      "Official help states a maximum of 145\xD7 the stake. The disabled draft uses that numerical ceiling; the private outcome restrictions that produce the source maximum are not known."
    ],
    math: {
      description: "Raw public coefficients and exact numerical demo stakes are preserved. This disabled draft uses an independent, uncalibrated outcome distribution. Exact uncapped enumeration and a50,000-round seeded pilot are recorded as diagnostics, not provider RTP or a release guarantee. Displayed numerical reference maxima are used as draft ceilings; source truncation-versus-reachable-outcome semantics remain unverified where they matter.",
      publicPayoutCoefficientsScaled: false,
      officialPrivateMathVerified: false,
      calibrationStatus: "pending_faithful_model",
      previousAdaptationEvidence: "references/independent-adaptation-superseded.json",
      rounding: {
        method: "unbiased total-santim rounding",
        rng: "Same committed server RNG stream, after every outcome/feature draw. No global randomness.",
        rule: "For exact fractional payout n+r santim, pay n+1 with probability r and n otherwise. Exact integers and already capped payouts require no rounding draw.",
        reserve: "Outcome-independent maximum is rounded UP before applying the published caps.",
        scope: "Applied once to the whole round; credited line/frame payouts sum exactly to that result."
      },
      targetReturn: null,
      measuredReturn: null,
      diagnosticEvidence: "references/first11-raw-prize-diagnostic.json",
      independentDraftDiagnostic: {
        analyticBeforeReferenceMaximum: {
          method: "Exact enumeration of every symbol sequence on one path; linearity across actual lines/ways and independent mean multiplier3. No cap or outcome-support claim.",
          sequences: 729,
          effectiveSymbolWeights: [
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1
          ],
          returnFraction: {
            numerator: "230",
            denominator: "243"
          },
          expectedReturn: 0.9465020576131687
        },
        pilot: {
          sampleCount: 5e4,
          seed: 1705936274,
          prng: "SFC32 with20 warmup outputs",
          meanBeforeCeiling: 0.95468,
          meanAfterDraftReferenceCeiling: 0.95458,
          confidence99NormalApproximation: [
            0.8918286210282668,
            1.017331378971733
          ],
          sampleMaximumReturn: 145,
          sourceCeilingEvents: 1,
          stakeMaximumMinor: "40000",
          reserveAtMaximumMinor: "5800000",
          scope: "Uncalibrated disabled draft; confidence approximation is diagnostic, not certification. Same return applies to every listed stake because raw payouts are integral and maxima scale proportionally or remain above the raw model bound."
        },
        releaseReady: false
      }
    },
    scatters: [],
    releaseGate: {
      status: "blocked_by_a_to_z_reference_requirement",
      productionLaunchable: false,
      required: [
        "presentation_audio",
        "gamble_collect",
        "source_maximum_semantics",
        "independent_probability_calibration",
        "currency_profile"
      ],
      manifest: "references/first11-release-divergences.json",
      reason: "Raw coefficients, exact schedules and numerical reference maxima are aligned. Public controls/presentation, source maximum semantics and Burning respin rules remain incomplete; independent probabilities are uncalibrated."
    },
    previousAdaptationScale: {
      numerator: "23571",
      denominator: "23000"
    },
    stakeMinorValues: [
      "5",
      "10",
      "20",
      "30",
      "40",
      "50",
      "60",
      "80",
      "100",
      "150",
      "200",
      "300",
      "400",
      "500",
      "600",
      "800",
      "1000",
      "1500",
      "2000",
      "3000",
      "4000",
      "5000",
      "6000",
      "8000",
      "10000",
      "15000",
      "20000",
      "30000",
      "40000"
    ],
    minStake: "0.05",
    maxStake: "400.00",
    referenceStakeSchedule: {
      currency: "DMO",
      lines: 5,
      chipCoefficient: "0.01",
      perLineValues: [
        1,
        2,
        4,
        6,
        8,
        10,
        12,
        16,
        20,
        30,
        40,
        60,
        80,
        100,
        120,
        160,
        200,
        300,
        400,
        600,
        800,
        1e3,
        1200,
        1600,
        2e3,
        3e3,
        4e3,
        6e3,
        8e3
      ],
      minimum: "0.05",
      maximum: "400.00",
      source: "references/public-models/habeshafortune5_native.json",
      status: "verified_demo_values; production_currency_profile_requires_review"
    },
    referenceLimits: {
      currency: "DMO",
      maximumWin: "58000.00",
      maximumWinMultiplier: 145,
      DoublingMaxCount: "5.0",
      DoublingMaxWin: "500.00",
      doublingLimitMeaningVerified: false
    },
    maxWin: "58000.00",
    winMultiplierCap: 145,
    currencyAdaptation: {
      source: "DMO",
      draft: "ETB",
      method: "Numerical 1:1 mapping of demo values only; not an exchange rate or provider-approved ETB profile.",
      productionLaunchable: false
    }
  }
];

// src/frozen/remaining20/models/smartsoft-slot-profiles.mjs
var clone = (value) => structuredClone(value);
var freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
var gcd = (a, b) => b ? gcd(b, a % b) : a;
var fraction = (n, d) => {
  const divisor = gcd(n, d);
  return { numerator: String(n / divisor), denominator: String(d / divisor), value: Number(n) / Number(d) };
};
var rotate = ([a, b, c]) => [[a, b, c], [b, c, a], [c, a, b]];
var repeat = (value, count) => Array.from({ length: count }, () => clone(value));
var tickets = (weights) => weights.flatMap((weight, index) => Array(weight).fill(index + 1));
function wildWindows({ ways = false } = {}) {
  const windows = [];
  for (let symbol = 1; symbol <= 9; symbol++) windows.push({ symbols: [symbol, symbol % 9 + 1, (symbol + 1) % 9 + 1], weight: 26 });
  for (let symbol = 1; symbol <= 9; symbol++) windows.push({ symbols: [symbol, symbol, symbol], weight: symbol === 1 ? ways ? 7 : 8 : 1 });
  for (const triple of [[0, 1, 2], [0, 3, 4]]) for (const symbols of rotate(triple)) windows.push({ symbols, weight: 1 });
  if (ways) windows.push({ symbols: [0, 0, 7], weight: 1 });
  return windows;
}
function classicWindows() {
  const triples = [[0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6], [5, 6, 0], [6, 0, 1], [8, 7, 4], [8, 0, 2], [7, 1, 3]], windows = [];
  for (let index = 0; index < triples.length; index++) for (const symbols of rotate(triples[index])) windows.push({ symbols, weight: index === 7 ? 13 : 7 });
  for (let symbol = 0; symbol <= 6; symbol++) windows.push({ symbols: [symbol, symbol, symbol], weight: 4 });
  return windows;
}
function burningWindows(model, bias = 0, { aligned = false, extraBias = 0 } = {}) {
  if (!Number.isInteger(bias) || bias < 0 || bias > 32) throw Error("INVALID_BURNING_WINDOW_BIAS");
  if (!Number.isInteger(extraBias) || extraBias < 0 || extraBias > 5) throw Error("INVALID_BURNING_EXTRA_BIAS");
  const seven = model.id === "burningice40_native" ? 9 : 10;
  const build = (values) => Array.from({ length: model.rows }, (_, row) => values[row % values.length]);
  return Array.from({ length: 5 }, (_, column) => {
    const windows = [];
    for (let symbol = 1; symbol <= 7; symbol++) windows.push({ symbols: build([symbol, symbol % 7 + 1, (symbol + 1) % 7 + 1, (symbol + 2) % 7 + 1]), weight: 0 });
    windows.push({ symbols: build([seven, 1, 3, 5]), weight: 2 });
    windows.push({ symbols: build([8, 2, 4, 6]), weight: 2 });
    if (model.expandingReels.includes(column)) {
      windows.push({ symbols: build([0, 3, 5, 7]), weight: 1 });
      windows.push({ symbols: build([0, 8, 2, 4]), weight: 1 });
    }
    if (model.scatters.some((scatter) => scatter.symbol === 9 && scatter.reels.includes(column))) {
      windows.push({ symbols: build([9, 4, 6, 1]), weight: 1 });
      if (model.expandingReels.includes(column)) windows.push({ symbols: build([0, 9, 3, 5]), weight: 1 });
    }
    const available = 256 - windows.reduce((sum, window) => sum + window.weight, 0), favorite = aligned ? 0 : column % 7;
    const regular = Math.floor(available / 7) - bias;
    for (let index = 0; index < 7; index++) windows[index].weight = index === favorite ? available - regular * 6 : regular;
    for (let index = 0, left = extraBias; index < 7 && left; index++) if (index !== favorite) {
      windows[index].weight--;
      windows[favorite].weight++;
      left--;
    }
    return windows;
  });
}
function highest(sequence, model) {
  let best = 0;
  for (let symbol = 0; symbol < model.coefficients.length; symbol++) {
    if (model.scatters.some((scatter) => scatter.symbol === symbol)) continue;
    let count = 0;
    for (const actual of sequence) {
      if (actual !== symbol && !(model.wildSymbols.includes(actual) && !model.wildExclusions.includes(symbol))) break;
      count++;
    }
    for (let match = 2; match <= count; match++) best = Math.max(best, model.coefficients[symbol][match] ?? 0);
  }
  return best;
}
function exactMarginalReturn(model, profile) {
  const count = model.symbols.length;
  let marginals, total;
  if (profile.reelWindows) {
    total = 256n;
    marginals = profile.reelWindows.map((windows) => Array.from({ length: model.rows }, (_, row) => {
      const weights = Array(count).fill(0n);
      for (const window of windows) weights[window.symbols[row]] += BigInt(window.weight);
      return weights;
    }));
  } else {
    const base = profile.sampling[0].reduce((values, symbol) => (values[symbol]++, values), Array(count).fill(0));
    const trigger = profile.addWildChanceDenominator, totalBase = base.reduce((sum, value) => sum + value, 0);
    const effective = base.map((weight, symbol) => BigInt(symbol === 0 ? weight * trigger + totalBase - weight : weight * (trigger - 1)));
    total = BigInt(totalBase * trigger);
    marginals = Array.from({ length: model.columns }, () => repeat(effective, model.rows));
  }
  let numerator = 0n;
  const sequence = Array(model.columns);
  for (const path of model.paths) {
    for (let code = 0; code < count ** model.columns; code++) {
      let number = code, weight = 1n;
      for (let column = 0; column < model.columns; column++) {
        sequence[column] = number % count;
        number = Math.floor(number / count);
        weight *= marginals[column][path[column]][sequence[column]];
      }
      numerator += BigInt(highest(sequence, model)) * weight;
    }
  }
  const wheelSum = BigInt(profile.multiplierTickets.reduce((sum, value) => sum + value, 0));
  const denominator = total ** BigInt(model.columns) * BigInt(profile.multiplierTickets.length) * 10n * BigInt(profile.payoutStakeDivisor ?? model.lineStakeDivisor);
  return fraction(numerator * wheelSum, denominator);
}
var wildWays = wildWindows({ ways: true });
var wildFive = wildWindows();
var classic = classicWindows();
var initial = {
  multihotwildways_native: { reelWindows: repeat(wildWays, 3), multiplierTickets: tickets([1, 1, 5, 56, 1]), attainedMaximumStakeMultiplier: 295 },
  multihot5wild_native: { reelWindows: repeat(wildFive, 3), multiplierTickets: tickets([1, 1, 50, 11, 1]), attainedMaximumStakeMultiplier: 375 },
  multihot5superwilds_native: { sampling: repeat([0, 0, 0, 0, 0, 0, 0, 0, ...Array.from({ length: 8 }, (_, index) => Array(31).fill(index + 1)).flat()], 5), addWildChanceDenominator: 256, multiplierTickets: tickets([1, 1, 2, 6, 6]), payoutStakeDivisor: 10, attainedMaximumStakeMultiplier: 1e3 },
  multihotdeluxe_native: { reelWindows: repeat(classic, 3), multiplierTickets: tickets([1, 1, 4, 57, 1]), attainedMaximumStakeMultiplier: 145 },
  safarisimba_native: { reelWindows: repeat(classic, 3), multiplierTickets: tickets([1, 1, 5, 56, 1]), attainedMaximumStakeMultiplier: 145 },
  habeshafortune5_native: { reelWindows: repeat(classic, 3), multiplierTickets: tickets([1, 1, 3, 58, 1]), attainedMaximumStakeMultiplier: 145 }
};
var frozenProofs = {
  burningice_native: { bias: 6, extraBias: 1, aligned: true, numerator: "4710564116199635057506328463", denominator: "4951760157141521099596496896", maximumStakeMultiplierBound: 3080 },
  burningice10_native: { bias: 4, extraBias: 0, aligned: false, numerator: "4683140856253802169874115779", denominator: "4951760157141521099596496896", maximumStakeMultiplierBound: 5080 },
  burningice40_native: { bias: 10, extraBias: 0, aligned: true, numerator: "36840430807585190720444581", denominator: "38685626227668133590597632", maximumStakeMultiplierBound: 1100 }
};
for (const [id, proof] of Object.entries(frozenProofs)) {
  const model = smartsoft_slots_data_default.find((value) => value.id === id);
  initial[id] = {
    reelWindows: burningWindows(model, proof.bias, { aligned: proof.aligned, extraBias: proof.extraBias }),
    ...model.coinChanceDenominator ? { coinTickets: [...Array(256 - model.coinReels.length).fill(null), ...model.coinReels] } : {},
    scatterCoefficientBasis: "line-stake",
    maximumStakeMultiplierBound: proof.maximumStakeMultiplierBound,
    nativeReturn: fraction(BigInt(proof.numerator), BigInt(proof.denominator)),
    frozenProof: {
      bias: proof.bias,
      extraBias: proof.extraBias,
      aligned: proof.aligned,
      source: "test/smartsoft-freeze-math.cpp",
      method: "Exact integer weighted enumeration of every initial reel-window combination and every reachable frozen-reel state. A fresh prize freezes at least one additional reel, so this is a finite acyclic recurrence. The state retains prior line/scatter maxima; future increments pay only once. Lucky coins are separate initial256-way tickets on5/10;40 has no coin draw.",
      distinction: "The public freeze/respin pattern and cash prizes are confirmed. The incremental-prize recurrence and fixed native probability weights are independently specified; this does not claim the provider-private recurrence or RNG."
    }
  };
}
for (const [id, profile] of Object.entries(initial)) {
  const model = smartsoft_slots_data_default.find((value) => value.id === id);
  if (profile.reelWindows?.some((windows) => windows.reduce((sum, window) => sum + window.weight, 0) !== 256)) throw Error("INVALID_NATIVE_REEL_WEIGHT_TOTAL");
  profile.nativeReturn ??= exactMarginalReturn(model, profile);
  profile.kind = "independent-zplay";
  profile.version = model.version.replace(/-1$/, "-2");
  profile.officialPrivateMathVerified = false;
  profile.publicPayoutCoefficientsScaled = false;
  profile.rejectCeilingOverflow = true;
  profile.method = profile.frozenProof?.method ?? "Exact rational marginal enumeration on each public path, followed by linearity and the independent weighted wheel. The complete finite reel support is exhaustively checked against the public maximum; the supported payouts are never clipped.";
  profile.randomness = "Every reel-stop, weighted cell, added-Wild, initial coin and wheel draw uses a power-of-two ticket count (256 or64, or16 for the SuperWild wheel), exactly dividing the canonical53-bit RNG space.";
  if (!(profile.nativeReturn.value >= 0.94 && profile.nativeReturn.value <= 0.96)) throw Error(`NATIVE_RETURN_OUTSIDE_REVIEW_RANGE:${id}:${profile.nativeReturn.value}`);
}
var NATIVE_PROFILES = freeze(initial);

// src/frozen/remaining20/remaining20-scope.json
var remaining20_scope_default = {
  schemaVersion: 1,
  targetCount: 20,
  sourceQueue: "requested-list.json",
  instruction: "Add new individual games; preserve every already existing live game.",
  candidateIds: [
    "multihot100_native",
    "multihotwildways_native",
    "multihot5wild_native",
    "multihot5superwilds_native",
    "multihotdeluxe_native",
    "burningice_native",
    "burningice10_native",
    "burningice40_native",
    "habeshafortune5_native",
    "moonstone_native",
    "magicgarden_native",
    "bookofmagic_native",
    "samurai_native",
    "vegasnights_native",
    "towerx_native",
    "towerrush_native",
    "egyptianlegends_native",
    "olympianlegends_native",
    "coinminer_native"
  ],
  candidates: [
    {
      id: "multihot100_native",
      name: "MultiHot100"
    },
    {
      id: "multihotwildways_native",
      name: "MultiHotWildWays"
    },
    {
      id: "multihot5wild_native",
      name: "MultiHot5Wild"
    },
    {
      id: "multihot5superwilds_native",
      name: "MultiHot5SuperWilds"
    },
    {
      id: "multihotdeluxe_native",
      name: "MultiHotDeluxe"
    },
    {
      id: "burningice_native",
      name: "BurningIce"
    },
    {
      id: "burningice10_native",
      name: "BurningIce10"
    },
    {
      id: "burningice40_native",
      name: "BurningIce40"
    },
    {
      id: "habeshafortune5_native",
      name: "HabeshaFortune5"
    },
    {
      id: "moonstone_native",
      name: "Moonstone"
    },
    {
      id: "magicgarden_native",
      name: "MagicGarden"
    },
    {
      id: "bookofmagic_native",
      name: "BookOfMagic"
    },
    {
      id: "samurai_native",
      name: "Samurai"
    },
    {
      id: "vegasnights_native",
      name: "VegasNights"
    },
    {
      id: "towerx_native",
      name: "TowerX"
    },
    {
      id: "towerrush_native",
      name: "TowerRush"
    },
    {
      id: "egyptianlegends_native",
      name: "EgyptianLegends"
    },
    {
      id: "olympianlegends_native",
      name: "OlympianLegends"
    },
    {
      id: "coinminer_native",
      name: "Coin Miner"
    }
  ],
  excludedExistingTitles: [
    {
      requestedId: "multihot40_native",
      liveIds: [
        "multihot40_native",
        "multihot40_new"
      ]
    },
    {
      requestedId: "safarisimba_native",
      liveIds: [
        "safarisimba_fresh"
      ]
    }
  ],
  unresolvedIdentities: [
    {
      id: "darkhorus_native",
      name: "DarkHorus"
    },
    {
      id: "assassins_native",
      name: "Assassins"
    }
  ],
  scopeNote: "The historical23-title queue contains19 identified unpublished titles after excluding2 already live titles and2 unresolved identities. No arbitrary replacement is invented to claim20.",
  baseline: {
    playerVersion: "2c05c57b-8332-41db-9801-b7c5ebc3be39",
    playerNumber: 330,
    playerDeployment: "137718d2-c522-4625-86e1-f2f8db6c304e",
    familyDeployment: "bf7b48a3-1471-412d-8b53-2fa818a93a9f"
  },
  financialActionsWithoutReleaseEvidence: false
};

// src/frozen/remaining20/models/operator-wager-profile.mjs
var freeze2 = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze2);
    Object.freeze(value);
  }
  return value;
};
var fail = (code, status = 422) => {
  throw Object.assign(new Error(code), { status });
};
var OPERATOR_WAGER_PROFILE_ID = "remaining20-etb1-40000-v1";
var OPERATOR_VERSION_SUFFIX = "-etb1-40000-v1";
var OPERATOR_GAME_IDS = freeze2([...remaining20_scope_default.candidateIds]);
var OPERATOR_STAKE_VALUES = freeze2(["1.00", "2.00", "5.00", "10.00", "20.00", "50.00", "100.00", "200.00", "500.00", "1000.00", "2000.00", "5000.00", "10000.00", "20000.00", "40000.00"]);
var OPERATOR_STAKE_MINOR_VALUES = freeze2(OPERATOR_STAKE_VALUES.map((value) => value.replace(".", "")));
var OPERATOR_WAGER_PROFILE = freeze2({
  id: OPERATOR_WAGER_PROFILE_ID,
  currency: "ETB",
  minStakeMinor: "100",
  maxStakeMinor: "4000000",
  stepMinor: "100",
  selection: "preset-ladder",
  stakeValues: OPERATOR_STAKE_VALUES,
  stakeMinorValues: OPERATOR_STAKE_MINOR_VALUES,
  source: "User-requested independent operator wager range; not a provider currency conversion."
});
function operatorModelVersion(version) {
  if (typeof version !== "string" || !version.startsWith("superwin-") || version.endsWith(OPERATOR_VERSION_SUFFIX) || version.length + OPERATOR_VERSION_SUFFIX.length > 100) fail("INVALID_OPERATOR_BASE_VERSION", 500);
  return version + OPERATOR_VERSION_SUFFIX;
}
function operatorMoney(value) {
  const amount = BigInt(value);
  if (amount < 0n || amount > 999999999999999n) fail("INVALID_OPERATOR_MONEY", 500);
  return `${amount / 100n}.${String(amount % 100n).padStart(2, "0")}`;
}
function operatorDefinition(base, maxWinMinor) {
  if (!OPERATOR_GAME_IDS.includes(base?.id)) fail("OPERATOR_GAME_OUTSIDE_NEW_SCOPE", 500);
  const result = {
    ...structuredClone(base),
    version: operatorModelVersion(base.version),
    minStake: "1.00",
    maxStake: "40000.00",
    currency: "ETB",
    stakeValues: [...OPERATOR_STAKE_VALUES],
    stakeMinorValues: [...OPERATOR_STAKE_MINOR_VALUES],
    operatorWagerProfile: structuredClone(OPERATOR_WAGER_PROFILE),
    ...maxWinMinor === void 0 ? {} : { maxWin: operatorMoney(maxWinMinor) }
  };
  result.stakeLimits = { ...result.stakeLimits ?? {}, min: result.minStake, max: result.maxStake, maxWin: result.maxWin, currency: "ETB" };
  return freeze2(result);
}

// src/frozen/remaining20/models/smartsoft-slots.mjs
var fail2 = (code, status = 422) => {
  throw Object.assign(new Error(code), { status });
};
var clone2 = (value) => structuredClone(value);
var freeze3 = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze3);
    Object.freeze(value);
  }
  return value;
};
var integer = (value) => typeof value === "string" && /^(0|[1-9]\d*)$/.test(value);
var decimalMinor = (value) => {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)\.\d{2}$/.test(value)) fail2("INVALID_MODEL_MONEY", 500);
  return BigInt(value.replace(".", ""));
};
var random = (rng) => {
  const x = rng();
  if (!Number.isFinite(x) || x < 0 || x >= 1) fail2("INVALID_SERVER_RANDOM", 500);
  return x;
};
var pick = (rng, n) => Math.floor(random(rng) * n);
var byId = Object.fromEntries(smartsoft_slots_data_default.map((model) => [model.id, freeze3(model)]));
var lookups = /* @__PURE__ */ new WeakMap();
function payoutCeiling(model, stake2) {
  const absolute = decimalMinor(model.maxWin);
  if (model.winMultiplierCap === void 0) return absolute;
  if (!integer(String(model.winMultiplierCap))) fail2("INVALID_MODEL_WIN_MULTIPLIER", 500);
  const relative = stake2 * BigInt(model.winMultiplierCap);
  return relative < absolute ? relative : absolute;
}
function roundPayoutMinor(numerator, denominator, cap, rng) {
  if (typeof numerator !== "bigint" || typeof denominator !== "bigint" || typeof cap !== "bigint" || numerator < 0n || denominator <= 0n || cap < 0n) fail2("INVALID_PAYOUT_RATIO", 500);
  if (numerator >= cap * denominator) return cap;
  let total = numerator / denominator;
  if (numerator % denominator > 0n && random(rng) < Number(numerator % denominator) / Number(denominator)) total++;
  return total;
}
function evaluateSequence(sequence, modelOrId) {
  const model = typeof modelOrId === "string" ? byId[modelOrId] : modelOrId;
  if (!model) fail2("GAME_NOT_FOUND", 404);
  let best = { units: 0, symbol: -1, count: 0 };
  for (let symbol = 0; symbol < model.coefficients.length; symbol++) {
    if (model.scatters.some((scatter) => scatter.symbol === symbol)) continue;
    const coeff = model.coefficients[symbol];
    let count = 0;
    for (const value of sequence) {
      const substitutes = model.wildSymbols.includes(value) && !model.wildExclusions.includes(symbol);
      if (value !== symbol && !substitutes) break;
      count++;
    }
    for (let n = 2; n <= count; n++) {
      const units = coeff[n] ?? 0;
      if (units > best.units) best = { units, symbol, count: n };
    }
  }
  return best;
}
function lookup(model) {
  if (lookups.has(model)) return lookups.get(model);
  const n = model.symbols.length, total = n ** model.columns, units = new Uint32Array(total), symbols = new Uint8Array(total), counts = new Uint8Array(total);
  const seq = new Array(model.columns);
  for (let code = 0; code < total; code++) {
    let k = code;
    for (let c = 0; c < model.columns; c++) {
      seq[c] = k % n;
      k = Math.floor(k / n);
    }
    const a = evaluateSequence(seq, model);
    units[code] = a.units;
    symbols[code] = a.symbol < 0 ? 255 : a.symbol;
    counts[code] = a.count;
  }
  const result = { units, symbols, counts, n };
  lookups.set(model, result);
  return result;
}
function evaluateLines(grid, model) {
  const table = lookup(model), wins = [];
  for (let line = 0; line < model.paths.length; line++) {
    const path = model.paths[line];
    let code = 0, power = 1;
    for (let c = 0; c < model.columns; c++) {
      code += grid[c][path[c]] * power;
      power *= table.n;
    }
    if (table.units[code]) wins.push({ line: line + 1, symbol: table.symbols[code], count: table.counts[code], units: table.units[code], cells: path.slice(0, table.counts[code]).map((row, c) => [c, row]) });
  }
  return wins;
}
function sampleGrid(model, rng, frozen, previous) {
  return Array.from({ length: model.columns }, (_, c) => frozen?.has(c) ? previous[c].slice() : model.reelWindows ? model.reelWindows[c][model.reelWindowTickets[c][pick(rng, model.reelWindowTickets[c].length)]].symbols.slice() : Array.from({ length: model.rows }, () => {
    const pool = model.sampling[c];
    return pool[pick(rng, pool.length)];
  }));
}
function applyAddedWilds(grid, cells, wildSymbol = 0) {
  const result = clone2(grid), added = [];
  for (const cell of cells) {
    if (!Array.isArray(cell) || cell.length !== 2 || !cell.every(Number.isInteger)) fail2("INVALID_ADDED_WILD_CELL", 500);
    const [reel, row] = cell;
    if (!Array.isArray(result[reel]) || row < 0 || row >= result[reel].length) fail2("INVALID_ADDED_WILD_CELL", 500);
    if (result[reel][row] !== wildSymbol) {
      result[reel][row] = wildSymbol;
      added.push([reel, row]);
    }
  }
  return { grid: result, addedWilds: added };
}
function burningExpand(grid, model, rng, initial2, frozen) {
  const expandedReels = [], coinReels = [];
  const isScatter = (s) => model.scatters.some((scatter) => scatter.symbol === s);
  for (const c of model.expandingReels) {
    if (frozen?.has(c)) continue;
    if (grid[c].includes(0)) {
      grid[c] = grid[c].map((s) => isScatter(s) ? s : 0);
      expandedReels.push(c);
    }
  }
  let coin2 = null;
  if (initial2 && model.coinTickets) coin2 = model.coinTickets[pick(rng, model.coinTickets.length)];
  else if (initial2 && model.coinChanceDenominator && pick(rng, model.coinChanceDenominator) === 0) coin2 = model.coinReels[pick(rng, model.coinReels.length)];
  if (coin2 !== null) {
    const c = coin2;
    grid[c] = grid[c].map((s) => isScatter(s) ? s : model.coinWildSymbol);
    coinReels.push(c);
  }
  return { expandedReels, coinReels };
}
function scatterAwards(grid, model) {
  return model.scatters.flatMap((scatter) => {
    const cells = [];
    for (const c of scatter.reels) {
      for (let row = 0; row < model.rows; row++) if (grid[c][row] === scatter.symbol) {
        cells.push([c, row]);
        if (scatter.mode === "reels") break;
      }
    }
    const actualCount = cells.length, count = Math.min(actualCount, model.coefficients[scatter.symbol].length - 1);
    const coefficient = count >= scatter.minCount ? model.coefficients[scatter.symbol][count] ?? 0 : 0;
    const basis = Object.hasOwn(scatter, "coefficientBasis") ? scatter.coefficientBasis : "total-stake";
    return coefficient ? [{ symbol: scatter.symbol, count, actualCount, cells, units: coefficient * (basis === "line-stake" ? 1 : model.lineStakeDivisor), scatter: true }] : [];
  });
}
function sampleModelOutcome(model, rng, { trace = true } = {}) {
  let grid = sampleGrid(model, rng), rawUnits = 0;
  const frames = [], awards = [];
  if (model.mechanic === "freeze-respin") {
    const frozen = /* @__PURE__ */ new Set(), paidLines = new Array(model.paths.length).fill(0), paidScatters = /* @__PURE__ */ new Map();
    for (let frame = 0; frame < model.maxFrames; frame++) {
      const effect = burningExpand(grid, model, rng, frame === 0, frozen);
      const current = evaluateLines(grid, model), fresh = [];
      for (const win of current) {
        const previous = paidLines[win.line - 1];
        if (win.units <= previous) continue;
        paidLines[win.line - 1] = win.units;
        const delta = { ...win, units: win.units - previous, frame };
        fresh.push(delta);
        for (const [c] of win.cells) frozen.add(c);
      }
      for (const scatter of scatterAwards(grid, model)) {
        const previous = paidScatters.get(scatter.symbol) ?? 0;
        if (scatter.units <= previous) continue;
        fresh.push({ ...scatter, units: scatter.units - previous, frame });
        paidScatters.set(scatter.symbol, scatter.units);
        for (const [c] of scatter.cells) frozen.add(c);
      }
      const frameUnits = fresh.reduce((sum, w) => sum + w.units, 0);
      rawUnits += frameUnits;
      awards.push(...fresh);
      const feature2 = { type: "freeze-respin", step: frame, frozenReels: [...frozen].sort(), ...effect };
      if (trace) frames.push({ grid: clone2(grid), awards: clone2(fresh), feature: feature2, rawUnits: frameUnits });
      if (!fresh.length || frozen.size === model.columns || frame + 1 === model.maxFrames) break;
      grid = sampleGrid(model, rng, frozen, grid);
    }
    return { grid, awards, frames, rawUnits, feature: trace ? frames.at(-1).feature : { type: "freeze-respin" } };
  }
  const multiplier = model.multiplierTickets ? model.multiplierTickets[pick(rng, model.multiplierTickets.length)] : 1 + pick(rng, 5);
  let addedWilds = [], beforeWildGrid = null;
  if (model.mechanic === "super-wild") {
    const mask = [];
    beforeWildGrid = clone2(grid);
    for (let c = 0; c < model.columns; c++) for (let r = 0; r < model.rows; r++) {
      if (pick(rng, model.addWildChanceDenominator) === 0) mask.push([c, r]);
    }
    const transformed = applyAddedWilds(grid, mask);
    grid = transformed.grid;
    addedWilds = transformed.addedWilds;
  }
  const feature = { type: model.mechanic, multiplier };
  if (model.mechanic === "super-wild") {
    feature.addedWilds = addedWilds;
    if (trace && addedWilds.length) frames.push({ grid: beforeWildGrid, awards: [], feature: { type: "super-wild-before", multiplier }, rawUnits: 0 });
  }
  if (model.mechanic === "safari-multiplier") {
    const symbol = grid[0][0], expandedReels = [];
    if ([4, 5, 6].includes(symbol)) for (let c = 0; c < model.columns; c++) {
      if (grid[c].every((s) => s === symbol)) expandedReels.push(c);
      else break;
    }
    feature.expandedReels = expandedReels;
  }
  for (const win of evaluateLines(grid, model)) awards.push({ ...win, units: win.units * multiplier, frame: trace ? frames.length : 0 });
  rawUnits = awards.reduce((sum, w) => sum + w.units, 0);
  if (trace) frames.push({ grid: clone2(grid), awards: clone2(awards), feature, rawUnits });
  return { grid, awards, frames, rawUnits, feature };
}
function paidOutcome(model, outcome, stake2, rng) {
  const scaleN = BigInt(model.scale.numerator), scaleD = BigInt(model.scale.denominator), denominator = 10n * BigInt(model.lineStakeDivisor) * scaleD;
  const amounts = outcome.awards.map((w) => ({ win: w, numerator: stake2 * BigInt(w.units) * scaleN }));
  const cap = payoutCeiling(model, stake2);
  const raw = amounts.reduce((sum, a) => sum + a.numerator, 0n), capped = raw > cap * denominator;
  if (capped && model.rejectCeilingOverflow) fail2("NATIVE_SLOT_SUPPORT_EXCEEDS_PUBLISHED_MAXIMUM", 500);
  const total = model.payoutRounding === "floor-total" ? raw / denominator : roundPayoutMinor(raw, denominator, cap, rng);
  const allocation = amounts.map((a) => raw ? { ...a, paid: a.numerator * total / raw, remainder: a.numerator * total % raw } : { ...a, paid: 0n, remainder: 0n });
  let remaining = total - allocation.reduce((sum, a) => sum + a.paid, 0n);
  for (const a of allocation.slice().sort((a2, b) => a2.remainder > b.remainder ? -1 : a2.remainder < b.remainder ? 1 : 0)) {
    if (remaining === 0n) break;
    a.paid++;
    remaining--;
  }
  const wins = allocation.filter((a) => a.paid > 0n).map(({ win, paid }) => ({ symbol: String(win.symbol), count: win.count, cells: clone2(win.cells), ...win.line ? { line: win.line } : {}, ...win.scatter ? { scatter: true } : {}, frame: win.frame, payoutMinor: String(paid) }));
  const frames = outcome.frames.map((frame, i) => ({ grid: frame.grid.map((reel) => reel.map(String)), wins: wins.filter((w) => w.frame === i), feature: clone2(frame.feature), payoutMinor: String(wins.filter((w) => w.frame === i).reduce((sum, w) => sum + BigInt(w.payoutMinor), 0n)) }));
  return { payoutMinor: String(total), grid: outcome.grid.map((reel) => reel.map(String)), wins, frames, feature: { ...clone2(outcome.feature), capped } };
}
function reserveFor(model, stake2) {
  const lineMax = Math.max(0, ...model.coefficients.flatMap((row, symbol) => model.scatters.some((s) => s.symbol === symbol) ? [] : row));
  const scatterMax = model.scatters.reduce((sum, scatter) => sum + Math.max(...model.coefficients[scatter.symbol]) * (scatter.coefficientBasis === "line-stake" ? 1 : model.lineStakeDivisor), 0);
  const multiplier = model.mechanic === "freeze-respin" ? 1 : 5;
  const rawMax = BigInt(lineMax * model.paths.length * multiplier + scatterMax);
  const numerator = stake2 * rawMax * BigInt(model.scale.numerator), denominator = 10n * BigInt(model.lineStakeDivisor) * BigInt(model.scale.denominator);
  const maximum = (numerator + denominator - 1n) / denominator;
  const cap = payoutCeiling(model, stake2);
  return String(maximum > cap ? cap : maximum);
}
function verifyModelReceipt(model, stakeMinor, receipt) {
  const invalid = () => fail2("INVALID_SLOT_RECEIPT", 500);
  const object5 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const canonical2 = (value) => Array.isArray(value) ? value.map(canonical2) : object5(value) ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical2(value[key])])) : value;
  const same = (a, b) => JSON.stringify(canonical2(a)) === JSON.stringify(canonical2(b));
  const gridOf = (value) => {
    if (!Array.isArray(value) || value.length !== model.columns || value.some((reel) => !Array.isArray(reel) || reel.length !== model.rows || reel.some((symbol) => !integer(symbol) || Number(symbol) >= model.symbols.length))) invalid();
    return value.map((reel) => reel.map(Number));
  };
  if (!object5(receipt) || !integer(receipt.payoutMinor) || !Array.isArray(receipt.frames) || !receipt.frames.length || receipt.frames.length > model.maxFrames) invalid();
  const grid = gridOf(receipt.grid), frames = [], awards = [];
  const inputFrames = receipt.frames.map((frame) => {
    if (!object5(frame) || !object5(frame.feature)) invalid();
    return { grid: gridOf(frame.grid), feature: clone2(frame.feature) };
  });
  const inNativeSupport = (frame, index, frozen = /* @__PURE__ */ new Set()) => {
    if (!model.reelWindows) return;
    const isScatter = (symbol) => model.scatters.some((scatter) => scatter.symbol === symbol);
    for (let column = 0; column < model.columns; column++) {
      if (frozen.has(column)) continue;
      const expanded = frame.feature.expandedReels?.includes(column) ?? false, coin2 = frame.feature.coinReels?.includes(column) ?? false;
      if (coin2 && (index !== 0 || !model.coinTickets?.includes(column))) invalid();
      const found = model.reelWindows[column].some((window) => {
        let expected2 = window.symbols.slice(), didExpand = false;
        if (model.mechanic === "freeze-respin" && model.expandingReels.includes(column) && expected2.includes(0)) {
          expected2 = expected2.map((symbol) => isScatter(symbol) ? symbol : 0);
          didExpand = true;
        }
        if (model.mechanic === "freeze-respin" && didExpand !== expanded) return false;
        if (coin2) expected2 = expected2.map((symbol) => isScatter(symbol) ? symbol : model.coinWildSymbol);
        return same(expected2, frame.grid[column]);
      });
      if (!found) invalid();
    }
  };
  if (!same(grid, inputFrames.at(-1).grid)) invalid();
  if (model.mechanic === "freeze-respin") {
    const frozen = /* @__PURE__ */ new Set(), paidLines = new Array(model.paths.length).fill(0), paidScatters = /* @__PURE__ */ new Map();
    for (let index = 0; index < inputFrames.length; index++) {
      const frame = inputFrames[index], feature = frame.feature, fresh = [];
      if (feature.type !== "freeze-respin" || feature.step !== index || !Array.isArray(feature.expandedReels) || !Array.isArray(feature.coinReels)) invalid();
      if (feature.expandedReels.some((reel) => !model.expandingReels.includes(reel) || frozen.has(reel)) || new Set(feature.expandedReels).size !== feature.expandedReels.length) invalid();
      if (feature.coinReels.some((reel) => index !== 0 || !model.coinReels?.includes(reel)) || feature.coinReels.length > 1) invalid();
      if (index) {
        for (const reel of frozen) if (!same(frame.grid[reel], inputFrames[index - 1].grid[reel])) invalid();
      }
      inNativeSupport(frame, index, frozen);
      for (const win of evaluateLines(frame.grid, model)) {
        const previous = paidLines[win.line - 1];
        if (win.units <= previous) continue;
        paidLines[win.line - 1] = win.units;
        fresh.push({ ...win, units: win.units - previous, frame: index });
        for (const [reel] of win.cells) frozen.add(reel);
      }
      for (const scatter of scatterAwards(frame.grid, model)) {
        const previous = paidScatters.get(scatter.symbol) ?? 0;
        if (scatter.units <= previous) continue;
        paidScatters.set(scatter.symbol, scatter.units);
        fresh.push({ ...scatter, units: scatter.units - previous, frame: index });
        for (const [reel] of scatter.cells) frozen.add(reel);
      }
      if (!same(feature.frozenReels, [...frozen].sort())) invalid();
      if (index + 1 < inputFrames.length && (!fresh.length || frozen.size === model.columns)) invalid();
      if (index === inputFrames.length - 1 && fresh.length && frozen.size < model.columns && inputFrames.length < model.maxFrames) invalid();
      awards.push(...fresh);
      frames.push({ grid: frame.grid, awards: fresh, feature, rawUnits: fresh.reduce((sum, win) => sum + win.units, 0) });
    }
  } else {
    const final = inputFrames.at(-1), feature = final.feature;
    inNativeSupport(final, inputFrames.length - 1);
    if (feature.type !== model.mechanic || !Number.isInteger(feature.multiplier) || feature.multiplier < 1 || feature.multiplier > 5) invalid();
    if (model.mechanic === "super-wild") {
      if (!Array.isArray(feature.addedWilds)) invalid();
      if (inputFrames.length === 2) {
        const before = inputFrames[0];
        if (before.feature.type !== "super-wild-before" || before.feature.multiplier !== feature.multiplier || !feature.addedWilds.length) invalid();
        let transformed;
        try {
          transformed = applyAddedWilds(before.grid, feature.addedWilds);
        } catch {
          invalid();
        }
        if (!same(transformed.grid, grid) || !same(transformed.addedWilds, feature.addedWilds)) invalid();
        frames.push({ grid: before.grid, awards: [], feature: before.feature, rawUnits: 0 });
      } else if (feature.addedWilds.length) invalid();
    } else if (inputFrames.length !== 1) invalid();
    if (model.mechanic === "safari-multiplier") {
      const symbol = grid[0][0], expanded = [];
      if ([4, 5, 6].includes(symbol)) for (let reel = 0; reel < model.columns; reel++) {
        if (grid[reel].every((value) => value === symbol)) expanded.push(reel);
        else break;
      }
      if (!same(expanded, feature.expandedReels)) invalid();
    }
    const fresh = evaluateLines(grid, model).map((win) => ({ ...win, units: win.units * feature.multiplier, frame: frames.length }));
    awards.push(...fresh);
    frames.push({ grid, awards: fresh, feature, rawUnits: fresh.reduce((sum, win) => sum + win.units, 0) });
  }
  const outcome = { grid, awards, frames, rawUnits: awards.reduce((sum, win) => sum + win.units, 0), feature: clone2(frames.at(-1).feature) };
  const expected = paidOutcome(model, outcome, BigInt(stakeMinor), () => fail2("NONINTEGRAL_PERSISTED_SLOT_PRIZE", 500));
  if (!same(expected, receipt)) invalid();
  return expected;
}
function publicConfig(model) {
  const scaleN = BigInt(model.scale.numerator), scaleD = BigInt(model.scale.denominator);
  return { id: model.id, name: model.name, type: "slots", launchable: model.launchable, columns: model.columns, rows: model.rows, paylines: model.ways ? 0 : model.paths.length, ...model.ways ? { ways: model.ways } : {}, ...model.winMultiplierCap ? { maxWinMultiplier: model.winMultiplierCap } : {}, paylinePaths: clone2(model.paths), symbols: clone2(model.symbols), theme: clone2(model.theme), featureDescription: model.featureDescription, version: model.version, actions: [], minStake: model.minStake, maxStake: model.maxStake, stakeValues: model.stakeMinorValues.map((value) => `${BigInt(value) / 100n}.${String(BigInt(value) % 100n).padStart(2, "0")}`), stakeMinorValues: clone2(model.stakeMinorValues), referenceStakeSchedule: clone2(model.referenceStakeSchedule), referenceLimits: clone2(model.referenceLimits), currencyAdaptation: clone2(model.currencyAdaptation), maxWin: model.maxWin, officialReference: model.officialReference, officialPrivateMathVerified: false, releaseGate: clone2(model.releaseGate), referenceNotes: clone2(model.referenceNotes), math: clone2(model.math), paytable: model.coefficients.map((counts, symbol) => ({ symbol: String(symbol), basis: model.scatters.some((s) => s.symbol === symbol) ? "total stake" : model.ways ? "total stake per winning way" : "stake divided by " + model.lineStakeDivisor, counts: Object.fromEntries(counts.flatMap((value, count) => value ? [[count, { numerator: String(BigInt(value) * scaleN), denominator: String(10n * scaleD), value: Number(BigInt(value) * scaleN) / Number(10n * scaleD) }]] : [])) })), rules: clone2(model.rules) };
}
var publicGames = freeze3(smartsoft_slots_data_default.map(publicConfig));
var publicGameConfigs = freeze3(Object.fromEntries(publicGames.map((game) => [game.id, game])));
var definitions = freeze3(Object.fromEntries(publicGames.map((game) => [game.id, { ...game, math: game.math.description }])));
function evaluateModelRound(model, options, rng, now) {
  if (!options || typeof options !== "object" || Array.isArray(options) || Object.keys(options).some((k) => k !== "stakeMinor") || !integer(options.stakeMinor)) fail2("INVALID_SLOT_OPTIONS");
  const stake2 = BigInt(options.stakeMinor);
  if (!model.stakeMinorValues.includes(options.stakeMinor)) fail2("STAKE_NOT_IN_REFERENCE_SCHEDULE");
  if (!Number.isSafeInteger(now) || now < 0) fail2("INVALID_SERVER_TIME", 500);
  const paid = paidOutcome(model, sampleModelOutcome(model, rng), stake2, rng);
  const liabilityMinor = reserveFor(model, stake2);
  const state = { gameId: model.id, modelVersion: model.version, family: "slots", status: "settled", stakeMinor: String(stake2), startedAt: now, settledAt: now, expiresAt: now, liabilityMinor, ...paid };
  return { state, debitMinor: String(stake2), maxPayoutMinor: liabilityMinor, payoutMinor: paid.payoutMinor };
}
function createReferenceSlotKernel(gameId, { version, scatterCoefficientBasis, payoutStakeDivisor, nativeProfile, operatorWagerProfile } = {}) {
  const original = byId[gameId];
  if (!original) fail2("GAME_NOT_FOUND", 404);
  if (typeof version !== "string" || version === original.version || !version.startsWith("superwin-")) fail2("INVALID_DERIVED_SLOT_VERSION", 500);
  if (scatterCoefficientBasis !== void 0 && !["line-stake", "total-stake"].includes(scatterCoefficientBasis)) fail2("INVALID_SCATTER_COEFFICIENT_BASIS", 500);
  if (payoutStakeDivisor !== void 0 && (!Number.isSafeInteger(payoutStakeDivisor) || payoutStakeDivisor < 1)) fail2("INVALID_PAYOUT_STAKE_DIVISOR", 500);
  const distribution = {};
  if (nativeProfile) {
    if (nativeProfile.version !== version || nativeProfile.publicPayoutCoefficientsScaled !== false || nativeProfile.officialPrivateMathVerified !== false) fail2("INVALID_NATIVE_SLOT_PROFILE", 500);
    for (const key of ["sampling", "reelWindows", "multiplierTickets", "addWildChanceDenominator", "coinTickets", "rejectCeilingOverflow"]) if (Object.hasOwn(nativeProfile, key)) distribution[key] = clone2(nativeProfile[key]);
    if (distribution.reelWindows) distribution.reelWindowTickets = distribution.reelWindows.map((windows) => windows.flatMap((window, index) => Array(window.weight).fill(index)));
  }
  let wager = {};
  if (operatorWagerProfile !== void 0) {
    if (operatorWagerProfile !== OPERATOR_WAGER_PROFILE || !OPERATOR_GAME_IDS.includes(gameId) || version !== operatorModelVersion(original.version.replace(/-1$/, "-2"))) fail2("INVALID_OPERATOR_SLOT_PROFILE", 500);
    wager = { stakeMinorValues: [...OPERATOR_WAGER_PROFILE.stakeMinorValues], minStake: "1.00", maxStake: "40000.00", maxWin: "400000000.00", payoutRounding: "floor-total", rejectCeilingOverflow: true, operatorWagerProfileId: OPERATOR_WAGER_PROFILE.id };
  }
  const model = freeze3({ ...clone2(original), ...distribution, ...wager, version, ...payoutStakeDivisor ? { lineStakeDivisor: payoutStakeDivisor } : {}, scatters: original.scatters.map((scatter) => ({ ...clone2(scatter), ...scatterCoefficientBasis ? { coefficientBasis: scatterCoefficientBasis } : {} })) });
  const checkedStake2 = (stake2) => {
    if (!integer(stake2) || !model.stakeMinorValues.includes(stake2)) fail2("STAKE_NOT_IN_REFERENCE_SCHEDULE");
  };
  return freeze3({
    model,
    evaluateDraftRound: (options, rng, now) => evaluateModelRound(model, options, rng, now),
    sampleOutcome: (rng, options) => sampleModelOutcome(model, rng, options),
    maximumPayoutMinor: (stake2) => {
      checkedStake2(stake2);
      return reserveFor(model, BigInt(stake2));
    },
    verifyReceipt: (stake2, receipt) => {
      checkedStake2(stake2);
      return verifyModelReceipt(model, stake2, receipt);
    }
  });
}

// src/frozen/remaining20/models/smartsoft-slot-rounds.mjs
var clone3 = (value) => structuredClone(value);
var freeze4 = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze4);
    Object.freeze(value);
  }
  return value;
};
var fail3 = (code, status = 422) => {
  throw Object.assign(new Error(code), { status });
};
var decimalMinor2 = (value) => {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)\.\d{1,2}$/.test(value)) fail3("INVALID_MODEL_MONEY", 500);
  const [whole, fraction2] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction2.padEnd(2, "0"));
};
var byId2 = freeze4(Object.fromEntries(smartsoft_slots_data_default.filter((model) => model.id !== "multihot40_native").map((model) => [model.id, clone3(model)])));
var GAME_IDS = freeze4(Object.keys(byId2));
var COLLECTION_MS = 30 * 60 * 1e3;
var MULTIHOT100_MULTIPLIER_TICKETS = freeze4([1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5]);
var SUITS = freeze4([{ suit: "clubs", color: "black" }, { suit: "diamonds", color: "red" }, { suit: "hearts", color: "red" }, { suit: "spades", color: "black" }]);
var getModel = (id) => byId2[id] ?? fail3("GAME_NOT_FOUND", 404);
var versionOf = (model) => model.version.replace(/-1$/, "-2");
var SCATTER_REVIEWS = freeze4({
  burningice_native: { divisor: 5, sourceStake: "0.05", cashDollar: "0.15/1.00/3.00", normalizedDollar: "3/20/60", pot: "Pot on reels1,3,5 pays20 times total stake (1.00 DMO at0.05)." },
  burningice10_native: { divisor: 10, sourceStake: "0.10", cashDollar: "0.30/2.00/6.00", normalizedDollar: "3/20/60", pot: "Pot on reels1,3,5 pays20 times total stake (2.00 DMO at0.10)." },
  burningice40_native: { divisor: 40, sourceStake: "0.40", cashDollar: "1.20/8.00/40.00", normalizedDollar: "3/20/100", pot: "" }
});
var kernels = Object.fromEntries(Object.values(byId2).map((model) => [model.id, createReferenceSlotKernel(model.id, {
  version: versionOf(model),
  ...NATIVE_PROFILES[model.id] ? { nativeProfile: NATIVE_PROFILES[model.id] } : {},
  ...SCATTER_REVIEWS[model.id] ? { scatterCoefficientBasis: "line-stake" } : {},
  ...model.id === "multihot5superwilds_native" ? { payoutStakeDivisor: 10 } : {}
})]));
var limitsOf = (model) => ({ attempts: Number(model.referenceLimits.DoublingMaxCount), maximumCurrentWin: decimalMinor2(model.referenceLimits.DoublingMaxWin), absolute: decimalMinor2(model.maxWin) });
for (const model of Object.values(byId2)) {
  const limits = limitsOf(model);
  if (!Number.isInteger(limits.attempts) || limits.attempts !== 5 || limits.maximumCurrentWin !== 50000n || versionOf(model) === model.version) throw Error("UNREVIEWED_SMARTSOFT_INTERACTIVE_REFERENCE");
}
var hundred = getModel("multihot100_native");
if (hundred.columns !== 5 || hundred.rows !== 4 || hundred.paths.length !== 100 || hundred.symbols.length !== 8 || hundred.wildSymbols.length || hundred.scatters.length || hundred.mechanic !== "multiplier" || hundred.sampling.some((reel) => JSON.stringify(reel) !== "[0,1,2,3,4,5,6,7]")) throw Error("MULTIHOT100_REFERENCE_CONTRACT_CHANGED");
var MULTIHOT100_MATH = freeze4({
  kind: "independent-zplay",
  version: "superwin-multihot100-2",
  officialPrivateMathVerified: false,
  publicPayoutCoefficientsScaled: false,
  symbolWeights: [1, 1, 1, 1, 1, 1, 1, 1],
  multiplierWeights: [1, 2, 3, 4, 6],
  multiplierWeightTotal: 16,
  nativeReturn: { numerator: "31425", denominator: "32768", value: 31425 / 32768, percent: "95.9014892578125", method: "Exact enumeration of the 8^5 symbol sequences on each public line, linearity over the 100 fixed paths, and independent wheel mean 15/4." },
  maximum: "2500 times total stake, attained by five sevens on all100 lines and5x. No coefficient scaling or payout clipping is required by this model.",
  randomness: "Eight symbol buckets and sixteen wheel tickets exactly divide the canonical53-bit uniform RNG space. The fixed profile does not depend on player, stake, balance or history.",
  rounding: "Every allowed reference stake gives exact whole-santim prizes.",
  description: "Independent ZPLAY probability law: exact theoretical RTP95.9014892578125%; raw public prizes and100-line geometry are retained. This is not the provider-private RNG."
});
function configFor(model) {
  const prior = clone3(publicGameConfigs[model.id]), limits = limitsOf(model);
  const profile = NATIVE_PROFILES[model.id];
  const math = model.id === "multihot100_native" ? clone3(MULTIHOT100_MATH) : profile ? {
    kind: profile.kind,
    version: profile.version,
    officialPrivateMathVerified: false,
    publicPayoutCoefficientsScaled: false,
    nativeReturn: clone3(profile.nativeReturn),
    ...profile.attainedMaximumStakeMultiplier ? { attainedMaximumStakeMultiplier: profile.attainedMaximumStakeMultiplier } : { maximumStakeMultiplierBound: profile.maximumStakeMultiplierBound },
    probabilityEvidence: "models/smartsoft-slot-profiles.mjs",
    diagnosticEvidence: "models/smartsoft-slots.v2-audit.json",
    method: profile.method,
    randomness: profile.randomness,
    ...profile.reelWindows ? { reelWindows: clone3(profile.reelWindows) } : { symbolWeights: [8, ...Array(8).fill(31)], addedWildProbability: { numerator: "1", denominator: String(profile.addWildChanceDenominator) } },
    ...profile.multiplierTickets ? { multiplierWeights: [1, 2, 3, 4, 5].map((value) => profile.multiplierTickets.filter((ticket) => ticket === value).length), multiplierWeightTotal: profile.multiplierTickets.length } : {},
    ...profile.frozenProof ? { frozenProof: clone3(profile.frozenProof), coinProbability: profile.coinTickets ? { numerator: String(profile.coinTickets.filter((value) => value !== null).length), denominator: String(profile.coinTickets.length) } : { numerator: "0", denominator: "1" } } : {},
    description: `Independent ZPLAY distribution: exact theoretical return ${(profile.nativeReturn.value * 100).toFixed(9)}%. Public coefficients stay unchanged; the fixed native support pays every accepted prize in full ${profile.attainedMaximumStakeMultiplier ? `and attains the published ${profile.attainedMaximumStakeMultiplier}x maximum` : `within a ${profile.maximumStakeMultiplierBound}x mathematical bound`} without clipping. This is not the provider's private probability law.`
  } : clone3(prior.math);
  const scatterReview = SCATTER_REVIEWS[model.id], correctedScatter = Boolean(scatterReview);
  const correctedSuperWild = model.id === "multihot5superwilds_native";
  if (correctedScatter && !profile) {
    delete math.independentDraftDiagnostic;
    math.calibrationStatus = "pending_corrected_scatter_profile";
    math.description = `Raw public prizes are preserved. Dollar3/4/5 pays${scatterReview.normalizedDollar} times total stake, confirmed by official live help at${scatterReview.sourceStake} DMO. ${scatterReview.pot} Historical raw-field interpretation multiplied scatter by${scatterReview.divisor} incorrectly; those diagnostics do not apply to this version. Independent sampling and respin recurrence remain under review.`;
  }
  if (correctedSuperWild && !profile) {
    delete math.independentDraftDiagnostic;
    math.calibrationStatus = "pending_corrected_public_prize_profile";
    math.description = "Raw public coefficients are preserved against one tenth of total stake. Official live help at0.10 DMO shows Seven/Wild3/4/5 prizes0.30/1.00/4.00. There are five fixed paths, but the source coefficient basis is total stake divided by10. Historical diagnostics that divided by5 do not apply. Independent sampling and added-Wild probabilities remain under review.";
  }
  const paytable = clone3(prior.paytable).map((entry) => correctedScatter && model.scatters.some((scatter) => String(scatter.symbol) === entry.symbol) ? {
    ...entry,
    basis: "total stake",
    rawReferenceBasis: `total stake divided by${scatterReview.divisor}`,
    rawReferenceCounts: clone3(entry.counts),
    counts: Object.fromEntries(Object.entries(entry.counts).map(([count, value]) => [count, { numerator: value.numerator, denominator: String(BigInt(value.denominator) * BigInt(scatterReview.divisor)), value: value.value / scatterReview.divisor }]))
  } : correctedSuperWild ? { ...entry, basis: "stake divided by 10" } : entry);
  return {
    ...prior,
    version: versionOf(model),
    launchable: false,
    actions: ["collect", "gamble"],
    math,
    paytable,
    controls: { manualCollection: true, automaticCollectionOption: "autoCollect", gambleColors: ["red", "black"] },
    gamble: {
      maximumAttempts: limits.attempts,
      maximumCurrentWinMinor: String(limits.maximumCurrentWin),
      maximumPossibleWinMinor: String(limits.maximumCurrentWin * 2n),
      chance: { numerator: "1", denominator: "2" },
      payoffMultiplier: 2,
      referenceLimitSemanticsVerified: false,
      limitMeaning: "Independent ETB rule: a current win up to500.00 may be doubled, up to five attempts, within the reserved liability. A larger current win is collection-only. The raw public500 DMO field does not verify the provider pre/post-double eligibility boundary."
    },
    collection: { expiresAfterMs: COLLECTION_MS, expiryReturnsCurrentWin: true, policy: "ZPLAY30-minute disconnect safeguard; not a claim about the provider timeout." },
    releaseGate: { ...clone3(prior.releaseGate), status: "interactive_draft_pending_individual_release", productionLaunchable: false, referenceParityClaim: false },
    currencyAdaptation: { ...clone3(prior.currencyAdaptation), productionLaunchable: false },
    referenceNotes: [...prior.referenceNotes, "Take Win, red/black doubling and the public five-attempt/500 fields are recorded in first11-optional-controls.json. The ETB boundary is an explicit independent rule, not a verified provider boundary.", ...correctedScatter ? [`Official live demo help, 2026-11-09: at${scatterReview.sourceStake} DMO total stake, Dollar3/4/5 displays${scatterReview.cashDollar}. Normalized total-stake coefficients are${scatterReview.normalizedDollar}; raw fields are retained as reference metadata. ${scatterReview.pot}`] : [], ...correctedSuperWild ? ["Official live demo help, 2026-11-09, spin1961125852.1: the actual spin debits0.10 DMO and the help selector remains0.10. Seven/Wild3/4/5 cash prizes0.30/1.00/4.00 establish a coefficient basis of one tenth of total stake, despite five fixed paths."] : []],
    rules: [
      ...prior.rules.filter((rule) => !rule.includes("All results resolve on the server in one accepted round.") && !((model.id === "multihot100_native" || profile) && (rule.includes("equally likely") || rule.includes("draft payout ceiling") || rule.includes("disabled pending") || rule.includes("Official help states a maximum") || rule.includes("Prior adaptation") || rule.startsWith("Unverified draft") || rule.startsWith("Independent draft reel tickets") || rule.startsWith("The isolated Super Wild draft") || rule.startsWith("Fractional santim") || rule.startsWith("Clover expands"))) && !(correctedScatter && (rule.startsWith("Highest left-to-right regular") || rule.startsWith("Pot additionally")))),
      ...profile ? [
        `This independent native probability profile has an exact theoretical return of ${(profile.nativeReturn.value * 100).toFixed(9)}%. Its fixed weighted reel windows or cells and feature probabilities do not depend on the player, balance, stake or history. They are not the provider's private probabilities.`,
        `The complete native outcome support pays the public coefficients in full ${profile.attainedMaximumStakeMultiplier ? `and attains ${profile.attainedMaximumStakeMultiplier} times total stake` : `within a proved bound of ${profile.maximumStakeMultiplierBound} times total stake`}. No supported win is reduced by a payout ceiling.`
      ] : [],
      ...profile?.frozenProof ? [
        "A newly paid or improved winning combination freezes the participating reels; only the remaining reels respin. Previously paid line/scatter amounts are retained, and only increases are added. The native sequence ends when there is no improvement or all reels are frozen. Each continuation adds a frozen reel, making the existing five-frame bound redundant. This payment recurrence is an explicit independent native rule.",
        `Clover expands on reels ${model.expandingReels.map((reel) => reel + 1).join(", ")}, preserving every Dollar${model.scatters.some((scatter) => scatter.symbol === 9) ? " and Pot" : ""} scatter.`,
        ...profile.coinTickets ? ["Each of the three eligible coin reels has one initial trigger ticket out of256. A lit coin replaces every non-scatter symbol on its reel with Wilds; no coin draw occurs during respins."] : ["This40-line variant has no assumed lucky-coin effect."]
      ] : [],
      ...correctedSuperWild ? ["After the initial grid, every cell has an independent one-in-256 chance to become Wild. The presentation shows the initial grid before applying every added Wild and evaluating the final prize. These are fixed native probabilities, not provider trigger odds."] : [],
      "Every supported stake and public prize is an exact whole-santim amount. Payouts are neither scaled nor clipped.",
      ...correctedScatter ? [`Highest left-to-right regular award per line. Dollar scatter pays${scatterReview.normalizedDollar} times total stake for3/4/5 or more symbols anywhere; one highest scatter award adds to line wins. ${scatterReview.pot} The raw reference scatter coefficients multiply total stake divided by${scatterReview.divisor}.`] : [],
      ...correctedSuperWild ? ["This title has five fixed paths. Its public prize coefficients multiply one tenth of total stake, as confirmed by live cash prizes at the selected stake; they do not multiply one fifth. All-Wild lines take the highest eligible substituted Seven prize. Five full Seven lines with a5x wheel attain the published1000x maximum without truncation."] : [],
      "The complete slot outcome and automatic respin/extra-Wild sequence are resolved by the server from one stake. A manual winning round waits for Take Win; paid autoplay may request autoCollect when the round starts.",
      "The next paid Spin first collects an accepted pending win. Collection and optional red/black doubling never debit a second stake.",
      "A current win of at most500.00 ETB may be risked on red or black up to five times. A fair independent attempt doubles it or loses it. No successful doubled win is clipped. Availability also respects the fixed round liability reserved before the outcome.",
      "A disconnected pending win is automatically collected after30 minutes. Reloading restores the same accepted round and does not draw again.",
      ...model.id === "multihot100_native" ? ["Each symbol is equally likely. Wheel weights for1x\u20135x are1,2,3,4,6 out of16; the exact independent theoretical return is95.9014892578125%."] : []
    ]
  };
}
var publicGames2 = freeze4(Object.values(byId2).map(configFor));
var publicGameConfigs2 = freeze4(Object.fromEntries(publicGames2.map((game) => [game.id, game])));
var definitions2 = freeze4(Object.fromEntries(publicGames2.map((game) => [game.id, { ...game, math: game.math.description }])));

// src/frozen/remaining20/models/smartsoft-operator-rounds.mjs
var clone4 = (value) => structuredClone(value);
var freeze5 = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze5);
    Object.freeze(value);
  }
  return value;
};
var fail4 = (code, status = 422) => {
  throw Object.assign(new Error(code), { status });
};
var object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var money = (value) => typeof value === "string" && /^(0|[1-9]\d{0,14})$/.test(value);
var time = (value) => Number.isSafeInteger(value) && value >= 0;
var decimalMinor3 = (value) => {
  const [whole, fraction2] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction2.padEnd(2, "0"));
};
var byId3 = freeze5(Object.fromEntries(smartsoft_slots_data_default.filter((model) => OPERATOR_GAME_IDS.includes(model.id)).map((model) => [model.id, {
  ...clone4(model),
  stakeMinorValues: [...OPERATOR_WAGER_PROFILE.stakeMinorValues],
  maxWin: "400000000.00"
}])));
var GAME_IDS2 = freeze5(Object.keys(byId3));
var SUITS2 = freeze5([{ suit: "clubs", color: "black" }, { suit: "diamonds", color: "red" }, { suit: "hearts", color: "red" }, { suit: "spades", color: "black" }]);
var getModel2 = (id) => byId3[id] ?? fail4("GAME_NOT_FOUND", 404);
var versionOf2 = (model) => operatorModelVersion(model.version.replace(/-1$/, "-2"));
var kernels2 = Object.fromEntries(Object.values(byId3).map((model) => [model.id, createReferenceSlotKernel(model.id, {
  version: versionOf2(model),
  operatorWagerProfile: OPERATOR_WAGER_PROFILE,
  ...NATIVE_PROFILES[model.id] ? { nativeProfile: { ...NATIVE_PROFILES[model.id], version: versionOf2(model) } } : {},
  ...model.id.startsWith("burningice") ? { scatterCoefficientBasis: "line-stake" } : {},
  ...model.id === "multihot5superwilds_native" ? { payoutStakeDivisor: 10 } : {}
})]));
var limitsOf2 = (model) => ({ attempts: Number(model.referenceLimits.DoublingMaxCount), maximumCurrentWin: decimalMinor3(model.referenceLimits.DoublingMaxWin), absolute: decimalMinor3(model.maxWin) });
var publicGames3 = freeze5(GAME_IDS2.map((id) => {
  const prior = clone4(publicGameConfigs2[id]), profile = operatorDefinition(prior, maximumPayoutMinor(id, OPERATOR_WAGER_PROFILE.maxStakeMinor));
  return {
    ...profile,
    math: {
      ...prior.math,
      version: profile.version,
      coefficientProfileVersion: prior.version,
      rounding: "Exact BigInt coefficient total is floored once to santim; per-line largest remainders conserve the settled total. No extra RNG draw or payout clipping.",
      returnQualification: "The inherited coefficient-profile return precedes currency flooring. Newly allowed wagers with fractional santim may have a rounding difference; no provider-private RTP is claimed.",
      description: "Independent fixed native distribution, unchanged public coefficients, and the user-requested whole-ETB operator wager ladder. Exact total prizes are floored once to santim; no supported award is clipped."
    },
    currencyAdaptation: { ...prior.currencyAdaptation, method: "User-requested whole-ETB wager presets from1.00 through40000.00. Public coefficients are retained; these amounts are an independent operator choice, not a conversion of demo currency.", operatorWagerProfileId: OPERATOR_WAGER_PROFILE.id, currency: "ETB", productionLaunchable: false },
    referenceNotes: prior.referenceNotes.filter((note) => !note.startsWith("Removed the invented global10,000 ceiling and Burning100\xD7cap.")),
    rules: [
      "This operator profile accepts the displayed whole-ETB presets from1.00 through40000.00 ETB. These amounts are a local operator choice, not conversion of the demo currency.",
      ...prior.rules.filter((rule) => !rule.startsWith("Fixed demo-derived stake schedule ") && rule !== "Every supported stake and public prize is an exact whole-santim amount. Payouts are neither scaled nor clipped." && !rule.startsWith("Official Deluxe help states145\xD7maximum. This is a numerical draft ceiling;")),
      "The exact sum of all public coefficient awards is calculated before a single floor to santim. Increasing the wager scales the exact award ratio; displayed and settled minor-unit amounts account for that final rounding.",
      "The full potential liability is reserved before sampling. Insufficient house reserve rejects before debit. High wagers never invoke the former absolute monetary payout ceiling."
    ]
  };
}));
var publicGameConfigs3 = freeze5(Object.fromEntries(publicGames3.map((game) => [game.id, game])));
var definitions3 = freeze5(Object.fromEntries(publicGames3.map((game) => [game.id, { ...game, math: game.math.description }])));
function random2(rng) {
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) fail4("INVALID_SERVER_RANDOM", 500);
  return value;
}
function stakeAmount(model, value) {
  if (!money(value) || !model.stakeMinorValues.includes(value)) fail4("STAKE_NOT_IN_REFERENCE_SCHEDULE");
  return BigInt(value);
}
function maximumPayoutMinor(gameId, stakeMinor) {
  const model = getModel2(gameId);
  stakeAmount(model, stakeMinor);
  const slot = BigInt(kernels2[gameId].maximumPayoutMinor(stakeMinor)), limits = limitsOf2(model);
  let doubled = slot * 2n ** BigInt(limits.attempts);
  if (doubled > limits.maximumCurrentWin * 2n) doubled = limits.maximumCurrentWin * 2n;
  let bound = slot > doubled ? slot : doubled;
  if (bound > limits.absolute) bound = limits.absolute;
  return String(bound);
}
function canGamble(state) {
  const limits = limitsOf2(getModel2(state.gameId)), current = BigInt(state.currentCashoutMinor);
  return state.status === "active" && state.gambleAttempts < limits.attempts && current > 0n && current <= limits.maximumCurrentWin && current * 2n <= BigInt(state.liabilityMinor);
}
var transition = (state, debitMinor = "0") => ({ state, debitMinor, maxPayoutMinor: state.liabilityMinor, payoutMinor: state.status === "settled" ? state.payoutMinor : null });
var settle = (state, now, reason) => transition({ ...clone4(state), status: "settled", settledAt: now, expiresAt: now, payoutMinor: state.currentCashoutMinor, reason });
function checkedState(state, now) {
  if (!object(state) || !Object.hasOwn(byId3, state.gameId)) fail4("INVALID_SMARTSOFT_ROUND_STATE", 500);
  const model = getModel2(state.gameId), limits = limitsOf2(model);
  if (state.operatorWagerProfileId !== OPERATOR_WAGER_PROFILE.id || state.modelVersion !== versionOf2(model) || state.family !== "slots" || !["active", "settled"].includes(state.status) || !time(now) || !time(state.startedAt) || now < state.startedAt || !time(state.startedAt + COLLECTION_MS) || !time(state.expiresAt) || !money(state.stakeMinor) || !model.stakeMinorValues.includes(state.stakeMinor) || state.liabilityMinor !== maximumPayoutMinor(model.id, state.stakeMinor) || !money(state.baseWinMinor) || !money(state.currentCashoutMinor) || BigInt(state.currentCashoutMinor) > BigInt(state.liabilityMinor) || !Number.isInteger(state.gambleAttempts) || state.gambleAttempts < 0 || state.gambleAttempts > limits.attempts || !Array.isArray(state.gambleHistory) || state.gambleHistory.length !== state.gambleAttempts) fail4("INVALID_SMARTSOFT_ROUND_STATE", 500);
  kernels2[model.id].verifyReceipt(state.stakeMinor, { payoutMinor: state.baseWinMinor, grid: state.grid, wins: state.wins, frames: state.frames, feature: state.feature });
  let current = BigInt(state.baseWinMinor), lastAt = state.startedAt;
  for (let index = 0; index < state.gambleHistory.length; index++) {
    const item = state.gambleHistory[index], card = object(item) ? SUITS2.find((value) => value.suit === item.suit) : null;
    if (!card || item.attempt !== index + 1 || !["red", "black"].includes(item.selection) || item.rank !== "A" || item.color !== card.color || item.won !== (item.selection === card.color) || item.amountBeforeMinor !== String(current) || current <= 0n || current > limits.maximumCurrentWin || current * 2n > BigInt(state.liabilityMinor) || !time(item.at) || item.at < lastAt || item.at >= state.startedAt + COLLECTION_MS || item.at > now) fail4("INVALID_SMARTSOFT_ROUND_STATE", 500);
    current = item.won ? current * 2n : 0n;
    lastAt = item.at;
    if (item.amountAfterMinor !== String(current)) fail4("INVALID_SMARTSOFT_ROUND_STATE", 500);
  }
  if (state.currentCashoutMinor !== String(current)) fail4("INVALID_SMARTSOFT_ROUND_STATE", 500);
  if (state.status === "active" && (state.payoutMinor !== null || state.expiresAt !== state.startedAt + COLLECTION_MS || current === 0n || state.settledAt !== void 0)) fail4("INVALID_SMARTSOFT_ROUND_STATE", 500);
  if (state.status === "settled" && (!time(state.settledAt) || state.settledAt < lastAt || state.settledAt > now || state.expiresAt !== state.settledAt || state.payoutMinor !== state.currentCashoutMinor)) fail4("INVALID_SMARTSOFT_ROUND_STATE", 500);
  return state;
}
function samplerFor(gameId, rng) {
  let draws = 0;
  return gameId === "multihot100_native" ? () => {
    const value = random2(rng), index = draws++;
    if (index === 20) return (MULTIHOT100_MULTIPLIER_TICKETS[Math.floor(value * 16)] - 1 + 0.25) / 5;
    return value;
  } : rng;
}
function evaluateDraftRound(gameId, options, rng, now) {
  const model = getModel2(gameId);
  if (!object(options) || Object.keys(options).some((key) => !["stakeMinor", "autoCollect"].includes(key)) || options.autoCollect !== void 0 && typeof options.autoCollect !== "boolean") fail4("INVALID_SMARTSOFT_ROUND_OPTIONS");
  stakeAmount(model, options.stakeMinor);
  if (!time(now) || !time(now + COLLECTION_MS)) fail4("INVALID_SERVER_TIME", 500);
  const liabilityMinor = maximumPayoutMinor(gameId, options.stakeMinor);
  const original = kernels2[gameId].evaluateDraftRound({ stakeMinor: options.stakeMinor }, samplerFor(gameId, rng), now);
  const { grid, wins, frames, feature } = original.state;
  const state = {
    gameId,
    modelVersion: versionOf2(model),
    operatorWagerProfileId: OPERATOR_WAGER_PROFILE.id,
    family: "slots",
    status: "active",
    stakeMinor: options.stakeMinor,
    startedAt: now,
    expiresAt: now + COLLECTION_MS,
    liabilityMinor,
    grid,
    wins,
    frames,
    feature,
    baseWinMinor: original.payoutMinor,
    currentCashoutMinor: original.payoutMinor,
    payoutMinor: null,
    gambleAttempts: 0,
    gambleHistory: [],
    reason: "PENDING_COLLECTION"
  };
  const result = state.baseWinMinor === "0" ? settle(state, now, "NO_WIN") : options.autoCollect ? settle(state, now, "AUTO_COLLECTED") : transition(state);
  result.debitMinor = options.stakeMinor;
  return result;
}
function act(raw, input, rng, now) {
  const state = checkedState(raw, now);
  if (state.status !== "active") fail4("ROUND_ALREADY_SETTLED", 409);
  if (!object(input) || !["collect", "gamble"].includes(input.type) || Object.keys(input).some((key) => !["type", ...input.type === "gamble" ? ["color"] : []].includes(key)) || input.type === "gamble" && !["red", "black"].includes(input.color)) fail4("INVALID_SMARTSOFT_ROUND_ACTION");
  if (now >= state.expiresAt) return expire(state, rng, now);
  if (input.type === "collect") return settle(state, now, "COLLECTED");
  if (!canGamble(state)) fail4("GAMBLE_NOT_AVAILABLE", 409);
  const card = SUITS2[Math.floor(random2(rng) * 4)], won = card.color === input.color, attempt = state.gambleAttempts + 1;
  const amount = won ? String(BigInt(state.currentCashoutMinor) * 2n) : "0";
  const entry = { attempt, selection: input.color, rank: "A", suit: card.suit, color: card.color, won, amountBeforeMinor: state.currentCashoutMinor, amountAfterMinor: amount, at: now };
  const next = { ...clone4(state), currentCashoutMinor: amount, gambleAttempts: attempt, gambleHistory: [...clone4(state.gambleHistory), entry], reason: won ? "GAMBLE_WON" : "GAMBLE_LOST" };
  return won ? transition(next) : settle(next, now, "GAMBLE_LOST");
}
function expire(raw, rng, now) {
  const state = checkedState(raw, now);
  if (state.status === "settled") return transition(clone4(state));
  if (now < state.expiresAt) fail4("ROUND_NOT_EXPIRED", 409);
  return settle(state, state.expiresAt, "DISCONNECTED_COLLECT");
}
function publicState(raw, now) {
  const state = checkedState(raw, now), limits = limitsOf2(getModel2(state.gameId));
  const { gameId, modelVersion, family, status, stakeMinor, startedAt, expiresAt, settledAt, payoutMinor, baseWinMinor, currentCashoutMinor, grid, wins, frames, feature, gambleAttempts, gambleHistory, reason } = state;
  const view = {
    gameId,
    modelVersion,
    operatorWagerProfileId: OPERATOR_WAGER_PROFILE.id,
    family,
    status,
    stakeMinor,
    startedAt,
    expiresAt,
    payoutMinor,
    baseWinMinor,
    currentCashoutMinor,
    grid,
    wins,
    frames,
    feature,
    gambleAttempts,
    gambleHistory,
    reason,
    actions: status === "active" ? ["collect", ...canGamble(state) ? ["gamble"] : []] : [],
    gambleAvailable: canGamble(state),
    gambleAttemptsRemaining: limits.attempts - gambleAttempts
  };
  if (status === "settled") view.settledAt = settledAt;
  return clone4(view);
}

// src/coin-frozen/models/remaining-reference-data.mjs
var bookPaylinePaths = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 2, 2, 2, 1], [1, 0, 0, 0, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [1, 2, 1, 0, 1], [1, 0, 1, 2, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 2, 1, 1], [1, 1, 0, 1, 1], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [1, 0, 2, 0, 1]];
var vegasPaylinePaths = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 2, 1, 0, 1], [1, 0, 1, 2, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 2, 2, 0], [2, 0, 0, 0, 2], [1, 2, 0, 2, 1], [1, 0, 2, 0, 1], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2]];
var vegasLinePaytable = { "0": {}, "1": {}, "2": {}, "3": { "5": 150, "4": 75, "3": 10 }, "4": { "5": 125, "4": 50, "3": 5 }, "5": { "5": 100, "4": 25, "3": 5 }, "6": { "5": 100, "4": 25, "3": 5 }, "7": { "5": 75, "4": 20, "3": 5 }, "8": { "5": 50, "4": 20, "3": 5 }, "9": { "5": 50, "4": 10, "3": 5 }, "10": { "5": 50, "4": 10, "3": 5 }, "11": { "5": 50, "4": 10, "3": 5 }, "12": {}, "13": {} };
var vegasVisibleReels = { "reel_set0": [[8, 6, 10, 9, 6, 5, 11, 6, 4, 9, 10, 11, 10, 5, 11, 7, 11, 5, 3], [7, 8, 4, 1, 11, 10, 7, 4, 9, 8, 2, 2, 2, 2, 2, 5, 7, 3, 5, 1, 6, 9, 2, 11, 4, 8, 8], [8, 3, 7, 9, 7, 6, 1, 7, 8, 7, 10, 3, 1, 4, 11, 2, 2, 2, 2, 2, 2, 2, 4, 11, 5, 4], [8, 1, 11, 7, 11, 1, 5, 10, 2, 2, 2, 2, 3, 9, 4, 2, 9, 3, 6, 7, 2], [7, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 7, 4, 5, 7, 4, 3, 9, 6, 2, 2, 3, 11, 11, 13, 2, 2, 8, 4, 6, 9, 3, 10, 8, 10, 11, 6, 7, 5, 5, 8, 8, 9, 5, 10, 7, 4, 6, 4, 10, 9]], "reel_set1": [[6, 3, 9, 5, 6, 10, 4, 7, 11, 8, 6, 9, 5, 3, 11, 11, 9, 10, 5, 5], [12, 12, 3, 6, 5, 2, 2, 2, 2, 2, 12, 12, 4, 12, 5, 6, 12, 7, 4, 12, 7], [4, 3, 12, 12, 6, 12, 7, 12, 12, 7, 2, 2, 2, 2, 2, 2, 4, 2, 3, 7, 12, 3, 7, 4, 5], [4, 6, 2, 2, 2, 2, 7, 3, 5, 12, 7, 6, 12, 2, 12, 12, 4, 2], [12, 12, 6, 4, 6, 5, 6, 2, 2, 2, 2, 2, 2, 12, 12, 2, 4, 7, 3, 2, 12, 12, 7, 2, 3, 2, 5, 7, 5, 3, 7, 5, 7, 2, 12, 12]], "reel_set2": [[8, 9, 6, 10, 9, 4, 10, 7, 5, 5, 11, 7, 3, 8, 8, 4, 6, 9, 9, 6, 11, 10], [11, 1, 7, 5, 4, 11, 4, 11, 8, 4, 7, 11, 2, 2, 1, 9, 3, 3, 10, 9, 6, 2, 2, 5], [7, 3, 5, 2, 2, 11, 2, 2, 11, 9, 10, 4, 4, 6, 3, 3, 8, 1, 11, 5, 7, 1, 7], [2, 11, 5, 6, 8, 9, 3, 7, 3, 7, 6, 11, 10, 8, 10, 2, 2, 4, 9, 1], [9, 4, 4, 2, 2, 7, 10, 2, 2, 4, 10, 10, 11, 5, 7, 8, 4, 7, 9, 3, 11, 5, 13, 8, 9, 9, 6, 10, 7, 6, 7, 8, 7, 6, 3, 11, 11, 2, 2, 5, 3]], "reel_set3": [[11, 9, 7, 8, 6, 10, 10, 8, 7, 9, 5, 6, 3, 5, 9, 3, 11, 4, 4, 9], [12, 7, 12, 5, 5, 2, 2, 6, 12, 12, 3, 2, 2, 4, 7, 7, 4, 12], [2, 12, 4, 4, 2, 2, 12, 5, 7, 12, 12, 6, 7, 12, 4, 7, 2, 2, 3, 5, 3], [4, 6, 12, 12, 2, 2, 12, 3, 7, 12, 5, 7, 4, 2, 3, 12, 2, 12], [7, 12, 2, 12, 12, 2, 2, 4, 2, 7, 3, 12, 4, 7, 12, 3, 7, 12, 6, 12, 12, 3, 12, 5, 12, 2, 4, 4, 7, 2, 12, 12, 3, 6, 5, 7, 6, 12, 5]] };
var legendThresholds = [20, 40, 60, 85, 110];
var coin94MultipliersHundredths = { "1": [98, 102, 107, 112, 118, 124, 131, 138, 147, 157, 168, 181, 196, 214, 235, 261, 294, 336, 392, 470, 588, 783, 1175, 2350], "2": [102, 111, 122, 134, 148, 165, 184, 207, 235, 269, 310, 362, 427, 513, 627, 783, 1007, 1343, 1880, 2820, 4700, 9400, 28200], "3": [107, 122, 140, 163, 190, 223, 265, 318, 386, 475, 594, 756, 983, 1310, 1802, 2574, 3861, 6177, 10295, 18719, 37437, 98519], "5": [118, 145, 181, 227, 287, 365, 469, 605, 806, 1104, 1534, 2160, 3086, 4538, 6774, 10421, 16283, 26263, 46898, 99782], "7": [131, 147, 169, 194, 223, 256, 294, 359, 438, 534, 651, 794, 1323, 2205, 3675, 6125, 17501, 97229], "10": [146, 228, 356, 556, 869, 1357, 2121, 3366, 5343, 8481, 13463, 21369, 33919, 53840, 99704], "17": [171, 342, 760, 1767, 4309, 10509, 28402, 97937], "20": [269, 895, 2984, 9947, 99471], "24": [2350] };

// src/coin-frozen/models/remaining-controls.mjs
var BOOK_LINE_CHOICES = Object.freeze([1, 5, 10, 15, 20]);
var MAGIC_RISK_MAX_ATTEMPTS = 5;
var EGYPTIAN_FEATURE_COSTS = Object.freeze({ Bastet: 10, Sobek: 15, Isis: 20, Anubis: 40, Horus: 50 });
var fail5 = (message) => {
  throw Object.assign(new Error(message), { status: 422 });
};
var isLegend = (id) => id === "egyptianlegends_native" || id === "olympianlegends_native";
function remainingSlotOptionKeys(id) {
  if (id === "bookofmagic_native") return ["lines"];
  if (id === "magicgarden_native") return ["risk"];
  if (isLegend(id)) return ["mode", "feature"];
  return [];
}
function remainingSlotOptions(id, options = {}) {
  const result = { mode: "base", cost: 1, pointsPerStake: 1e4 };
  if (id === "bookofmagic_native") {
    const lines = options.lines === void 0 ? 20 : options.lines;
    if (!BOOK_LINE_CHOICES.includes(lines)) fail5("INVALID_PAYLINE_COUNT");
    return { ...result, lines, pointsPerStake: lines === 15 ? 3e4 : 1e4 };
  }
  if (id === "magicgarden_native") {
    if (options.risk !== void 0 && typeof options.risk !== "boolean") fail5("INVALID_RISK_OPTION");
    return { ...result, risk: options.risk === true };
  }
  if (!isLegend(id)) return result;
  const mode = options.mode === void 0 ? "base" : options.mode;
  if (!["base", "bonus-buy", ...id === "egyptianlegends_native" ? ["super-bonus", "feature"] : []].includes(mode)) fail5("GAME_MODE_UNVERIFIED");
  if (mode !== "feature" && options.feature !== void 0) fail5("FEATURE_MODE_REQUIRED");
  if (mode === "feature") {
    if (!Object.hasOwn(EGYPTIAN_FEATURE_COSTS, options.feature)) fail5("INVALID_EGYPTIAN_FEATURE");
    return { ...result, mode, cost: EGYPTIAN_FEATURE_COSTS[options.feature], selectedFeature: options.feature };
  }
  return { ...result, mode, cost: mode === "bonus-buy" ? 100 : mode === "super-bonus" ? 500 : 1 };
}
function remainingBaseStake(stake2, controls) {
  const cost = BigInt(controls.cost);
  if (stake2 % cost !== 0n) fail5("MODE_TOTAL_MUST_MATCH_BASE_BET");
  const base = stake2 / cost;
  if (base < 10n) fail5("MODE_BASE_BET_OUT_OF_RANGE");
  return base;
}
function remainingSlotCap(id, stake2, controls, globalCap) {
  let amount = id === "bookofmagic_native" ? stake2 * 10000n / BigInt(controls.lines) : stake2 * 100n;
  if (id === "magicgarden_native" && controls.risk) amount *= 2n ** BigInt(MAGIC_RISK_MAX_ATTEMPTS);
  return amount > globalCap ? globalCap : amount;
}
function remainingRiskStart(state, maximumPayoutMinor2, now, deadlineMs) {
  const amount = BigInt(state.payoutMinor), maximum = BigInt(maximumPayoutMinor2);
  const risk = { enabled: true, maximumAttempts: MAGIC_RISK_MAX_ATTEMPTS, attempts: 0, initialWinMinor: String(amount), currentWinMinor: String(amount), adjustmentMinor: "0", history: [] };
  const accounting = { baseGamePayoutMinor: String(amount), baseGameMaxWinMultiplier: state.maxWinMultiplier, maxWinMultiplier: Number(maximum) / Number(state.stakeMinor), riskMaximumPayoutMinor: String(maximum) };
  if (amount === 0n || amount * 2n > maximum) return { ...state, ...accounting, risk };
  return { ...state, ...accounting, status: "active", expiresAt: now + deadlineMs, payoutMinor: null, currentCashoutMinor: String(amount), risk, actions: ["gamble", "cashout"] };
}
function remainingRiskAction(state, input, roll, maximumPayoutMinor2) {
  const current = BigInt(state.currentCashoutMinor), maximum = BigInt(maximumPayoutMinor2);
  const finish2 = (amount2, reason, risk2 = state.risk) => ({ ...state, risk: risk2, status: "settled", payoutMinor: String(amount2), currentCashoutMinor: String(amount2), reason, actions: [] });
  if (input.type === "cashout") return finish2(current, "risk-collected");
  if (input.type !== "gamble" || !["red", "black"].includes(input.color)) fail5("INVALID_RISK_ACTION");
  if (state.risk.attempts >= MAGIC_RISK_MAX_ATTEMPTS || current * 2n > maximum) fail5("RISK_LIMIT_REACHED");
  const card = roll() < 0.5 ? "red" : "black", won = card === input.color;
  const amount = won ? current * 2n : 0n;
  const risk = { ...state.risk, attempts: state.risk.attempts + 1, currentWinMinor: String(amount), adjustmentMinor: String(amount - BigInt(state.risk.initialWinMinor)), history: [...state.risk.history, { choice: input.color, card, won, amountBeforeMinor: String(current), amountAfterMinor: String(amount) }] };
  if (!won) return finish2(0n, "risk-lost", risk);
  if (risk.attempts >= MAGIC_RISK_MAX_ATTEMPTS || amount * 2n > maximum) return finish2(amount, "risk-limit-collected", risk);
  return { ...state, currentCashoutMinor: String(amount), risk };
}

// src/coin-frozen/models/vegas-native-stops.mjs
var VEGAS_NATIVE_STOP_VERSION = "zplay-vegas-weighted-stops-v3";
function createVegasStopWeights(wildWeight, featureWeight = 100) {
  if (!Number.isInteger(wildWeight) || wildWeight < 1 || wildWeight > 1e3 || !Number.isInteger(featureWeight) || featureWeight < 1 || featureWeight > 1e3) throw new Error("INVALID_VEGAS_STOP_WEIGHT");
  const symbolWeight = (symbol) => symbol === 1 || symbol === 13 ? featureWeight : symbol === 2 || symbol === 12 ? wildWeight : 1e3;
  return Object.fromEntries(Object.entries(vegasVisibleReels).map(([name, reels]) => [name, reels.map((reel) => reel.map((_, stop) => [0, 1, 2].reduce((weight, row) => weight * symbolWeight(reel[(stop + row) % reel.length]), 1)))]));
}
var VEGAS_NATIVE_WILD_WEIGHT = 689;
var VEGAS_NATIVE_FEATURE_WEIGHT = 100;
var vegasNativeStopWeights = createVegasStopWeights(VEGAS_NATIVE_WILD_WEIGHT, VEGAS_NATIVE_FEATURE_WEIGHT);
for (const reels of Object.values(vegasNativeStopWeights)) {
  for (const weights of reels) Object.freeze(weights);
  Object.freeze(reels);
}
Object.freeze(vegasNativeStopWeights);
function unbiasedBelow(bound, rng) {
  const limit = BigInt(bound), space = 1n << 64n, accepted = space - space % limit;
  for (let attempt = 0; attempt < 32; attempt++) {
    const high = rng(), low = rng();
    if (!Number.isFinite(high) || high < 0 || high >= 1 || !Number.isFinite(low) || low < 0 || low >= 1) throw new Error("INVALID_ENGINE_RANDOM");
    const value = BigInt(Math.floor(high * 4294967296)) << 32n | BigInt(Math.floor(low * 4294967296));
    if (value < accepted) return Number(value % limit);
  }
  throw new Error("INVALID_ENGINE_RANDOM");
}
function sampleNativeVegasStop(set, column, rng) {
  const weights = vegasNativeStopWeights[`reel_set${set}`]?.[column];
  if (!weights) throw new Error("INVALID_VEGAS_REEL");
  let choice = unbiasedBelow(weights.reduce((sum, weight) => sum + weight, 0), rng);
  for (let stop = 0; stop < weights.length; stop++) {
    choice -= weights[stop];
    if (choice < 0) return stop;
  }
  throw new Error("INVALID_VEGAS_WEIGHT_TOTAL");
}
function sampleNativeVegasWildFactor(rng) {
  return unbiasedBelow(3, rng) < 2 ? 2 : 3;
}

// src/coin-frozen/remaining20-scope.json
var remaining20_scope_default2 = {
  schemaVersion: 1,
  targetCount: 20,
  sourceQueue: "requested-list.json",
  instruction: "Add new individual games; preserve every already existing live game.",
  candidateIds: [
    "multihot100_native",
    "multihotwildways_native",
    "multihot5wild_native",
    "multihot5superwilds_native",
    "multihotdeluxe_native",
    "burningice_native",
    "burningice10_native",
    "burningice40_native",
    "habeshafortune5_native",
    "moonstone_native",
    "magicgarden_native",
    "bookofmagic_native",
    "samurai_native",
    "vegasnights_native",
    "towerx_native",
    "towerrush_native",
    "egyptianlegends_native",
    "olympianlegends_native",
    "coinminer_native"
  ],
  candidates: [
    {
      id: "multihot100_native",
      name: "MultiHot100"
    },
    {
      id: "multihotwildways_native",
      name: "MultiHotWildWays"
    },
    {
      id: "multihot5wild_native",
      name: "MultiHot5Wild"
    },
    {
      id: "multihot5superwilds_native",
      name: "MultiHot5SuperWilds"
    },
    {
      id: "multihotdeluxe_native",
      name: "MultiHotDeluxe"
    },
    {
      id: "burningice_native",
      name: "BurningIce"
    },
    {
      id: "burningice10_native",
      name: "BurningIce10"
    },
    {
      id: "burningice40_native",
      name: "BurningIce40"
    },
    {
      id: "habeshafortune5_native",
      name: "HabeshaFortune5"
    },
    {
      id: "moonstone_native",
      name: "Moonstone"
    },
    {
      id: "magicgarden_native",
      name: "MagicGarden"
    },
    {
      id: "bookofmagic_native",
      name: "BookOfMagic"
    },
    {
      id: "samurai_native",
      name: "Samurai"
    },
    {
      id: "vegasnights_native",
      name: "VegasNights"
    },
    {
      id: "towerx_native",
      name: "TowerX"
    },
    {
      id: "towerrush_native",
      name: "TowerRush"
    },
    {
      id: "egyptianlegends_native",
      name: "EgyptianLegends"
    },
    {
      id: "olympianlegends_native",
      name: "OlympianLegends"
    },
    {
      id: "coinminer_native",
      name: "Coin Miner"
    }
  ],
  excludedExistingTitles: [
    {
      requestedId: "multihot40_native",
      liveIds: [
        "multihot40_native",
        "multihot40_new"
      ]
    },
    {
      requestedId: "safarisimba_native",
      liveIds: [
        "safarisimba_fresh"
      ]
    }
  ],
  unresolvedIdentities: [
    {
      id: "darkhorus_native",
      name: "DarkHorus"
    },
    {
      id: "assassins_native",
      name: "Assassins"
    }
  ],
  scopeNote: "The historical23-title queue contains19 identified unpublished titles after excluding2 already live titles and2 unresolved identities. No arbitrary replacement is invented to claim20.",
  baseline: {
    playerVersion: "2c05c57b-8332-41db-9801-b7c5ebc3be39",
    playerNumber: 330,
    playerDeployment: "137718d2-c522-4625-86e1-f2f8db6c304e",
    familyDeployment: "bf7b48a3-1471-412d-8b53-2fa818a93a9f"
  },
  financialActionsWithoutReleaseEvidence: false
};

// src/coin-frozen/models/operator-wager-profile.mjs
var freeze6 = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze6);
    Object.freeze(value);
  }
  return value;
};
var fail6 = (code, status = 422) => {
  throw Object.assign(new Error(code), { status });
};
var OPERATOR_WAGER_PROFILE_ID2 = "remaining20-etb1-40000-v1";
var OPERATOR_VERSION_SUFFIX2 = "-etb1-40000-v1";
var OPERATOR_GAME_IDS2 = freeze6([...remaining20_scope_default2.candidateIds]);
var OPERATOR_STAKE_VALUES2 = freeze6(["1.00", "2.00", "5.00", "10.00", "20.00", "50.00", "100.00", "200.00", "500.00", "1000.00", "2000.00", "5000.00", "10000.00", "20000.00", "40000.00"]);
var OPERATOR_STAKE_MINOR_VALUES2 = freeze6(OPERATOR_STAKE_VALUES2.map((value) => value.replace(".", "")));
var OPERATOR_WAGER_PROFILE2 = freeze6({
  id: OPERATOR_WAGER_PROFILE_ID2,
  currency: "ETB",
  minStakeMinor: "100",
  maxStakeMinor: "4000000",
  stepMinor: "100",
  selection: "preset-ladder",
  stakeValues: OPERATOR_STAKE_VALUES2,
  stakeMinorValues: OPERATOR_STAKE_MINOR_VALUES2,
  source: "User-requested independent operator wager range; not a provider currency conversion."
});
function operatorModelVersion2(version) {
  if (typeof version !== "string" || !version.startsWith("superwin-") || version.endsWith(OPERATOR_VERSION_SUFFIX2) || version.length + OPERATOR_VERSION_SUFFIX2.length > 100) fail6("INVALID_OPERATOR_BASE_VERSION", 500);
  return version + OPERATOR_VERSION_SUFFIX2;
}
function operatorStakeMinor(value) {
  if (typeof value !== "string" || !/^[1-9]\d{0,14}$/.test(value) || !OPERATOR_STAKE_MINOR_VALUES2.includes(value)) fail6("STAKE_NOT_IN_OPERATOR_SCHEDULE");
  const amount = BigInt(value);
  if (amount < 100n || amount > 4000000n || amount % 100n !== 0n) fail6("STAKE_NOT_IN_OPERATOR_SCHEDULE");
  return amount;
}
function operatorMoney2(value) {
  const amount = BigInt(value);
  if (amount < 0n || amount > 999999999999999n) fail6("INVALID_OPERATOR_MONEY", 500);
  return `${amount / 100n}.${String(amount % 100n).padStart(2, "0")}`;
}
function operatorDefinition2(base, maxWinMinor) {
  if (!OPERATOR_GAME_IDS2.includes(base?.id)) fail6("OPERATOR_GAME_OUTSIDE_NEW_SCOPE", 500);
  const result = {
    ...structuredClone(base),
    version: operatorModelVersion2(base.version),
    minStake: "1.00",
    maxStake: "40000.00",
    currency: "ETB",
    stakeValues: [...OPERATOR_STAKE_VALUES2],
    stakeMinorValues: [...OPERATOR_STAKE_MINOR_VALUES2],
    operatorWagerProfile: structuredClone(OPERATOR_WAGER_PROFILE2),
    ...maxWinMinor === void 0 ? {} : { maxWin: operatorMoney2(maxWinMinor) }
  };
  result.stakeLimits = { ...result.stakeLimits ?? {}, min: result.minStake, max: result.maxStake, maxWin: result.maxWin, currency: "ETB" };
  return freeze6(result);
}

// src/coin-frozen/models/remaining-engine.mjs
var CAP = 1000000n;
var DEADLINE_MS = 18e5;
var MAX_FRAMES = 24;
var RAW_REVIEW_CAP = 1e7;
var clone5 = (value) => structuredClone(value);
var fail7 = (message, status = 422) => {
  throw Object.assign(new Error(message), { status });
};
var object2 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var clock = (value) => {
  if (!Number.isSafeInteger(value) || value < 0) fail7("INVALID_ENGINE_TIME", 500);
  return value;
};
var money2 = (value) => {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,14})$/.test(value)) fail7("INVALID_ENGINE_MONEY", 500);
  return BigInt(value);
};
var checkedStake = (value) => {
  const amount = money2(value);
  if (amount < 10n || amount > 10000n) fail7("STAKE_OUT_OF_RANGE");
  return amount;
};
var draw = (rng) => {
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value >= 1) fail7("INVALID_ENGINE_RANDOM", 500);
  return value;
};
var integer2 = (rng, max) => Math.floor(draw(rng) * max);
var limited = (value, cap = CAP) => value > cap ? cap : value;
var ratio = (numerator, denominator, places = 2) => {
  const scale = 10n ** BigInt(places), scaled = numerator * scale / denominator;
  return `${scaled / scale}.${String(scaled % scale).padStart(places, "0")}`;
};
var weighted = (rng, entries) => {
  let selected = draw(rng) * entries.reduce((sum, item) => sum + item[1], 0);
  for (const [value, weight] of entries) {
    selected -= weight;
    if (selected < 0) return value;
  }
  return entries.at(-1)[0];
};
var choose = (rng, values, count) => {
  const remaining = [...values], output = [];
  while (output.length < count && remaining.length) output.push(remaining.splice(integer2(rng, remaining.length), 1)[0]);
  return output;
};
var positions = (columns, rows) => Array.from({ length: columns * rows }, (_, index) => [Math.floor(index / rows), index % rows]);
var cellsOf = (grid, id) => grid.flatMap((column, c) => column.flatMap((value, r) => value === id ? [[c, r]] : []));
var cellKey = ([c, r]) => `${c}:${r}`;
var wild = (value) => value === "wild" || value === "royal-wild" || value === "gold";
var EXCLUDED = /* @__PURE__ */ new Set(["wild", "royal-wild", "scatter", "magic", "gold", "multiplier"]);
var normals = (config) => config.symbols.filter((symbol) => !EXCLUDED.has(symbol.id)).map((symbol) => symbol.id);
var isWays = (id) => id === "moonstone_native" || id === "samurai_native";
var isLegend2 = (id) => id === "egyptianlegends_native" || id === "olympianlegends_native";
var slotScales = Object.fromEntries([
  "moonstone_native",
  "magicgarden_native",
  "bookofmagic_native",
  "samurai_native",
  "vegasnights_native",
  "egyptianlegends_native",
  "olympianlegends_native"
].map((id) => [id, { numerator: 1, denominator: 1 }]));
var linePaths = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [0, 2, 2, 2, 0]
];
var REVIEW_PAY = [[50, 250, 1e3], [25, 150, 600], [20, 100, 400], [15, 75, 300], [10, 50, 200], [8, 35, 150], [6, 25, 100], [5, 20, 80], [4, 15, 60], [3, 12, 50], [2, 10, 40]];
var EGYPT_MULTIPLIERS = [2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 50, 100, 250, 500];
var EGYPT_GODS = ["Bastet", "Sobek", "Isis", "Anubis", "Horus"];
var OLYMPUS_GODS = ["Poseidon", "Hecate", "Atlas", "Hephaestus", "Zeus"];
function reviewSymbol(config, rng, column, { normalOnly = false, scatterAllowed = true, free = false } = {}) {
  const entries = normals(config).map((id, index) => [id, isLegend2(config.id) ? 7 + index * 1.6 : (4 + index * 1.3) * (free && config.id === "bookofmagic_native" ? 1 + index % 3 * 0.05 : 1)]);
  if (!normalOnly) {
    if (!isLegend2(config.id)) {
      const allowed = config.id === "magicgarden_native" ? column >= 1 && column <= 3 : isWays(config.id) ? column >= 2 : true;
      if (allowed) entries.push(["wild", 1.3]);
    }
    if (scatterAllowed && (config.id !== "magicgarden_native" || [0, 2, 4].includes(column))) entries.push(["scatter", isLegend2(config.id) ? 1.25 : 1.1]);
    if (config.id === "magicgarden_native" && column === 4) entries.push(["magic", 0.5]);
  }
  return weighted(rng, entries);
}
function gridFor(config, rng, job, stopDistribution = "legacy-uniform-v2") {
  if (config.id === "vegasnights_native") {
    const set = job.mode === "extra" ? job.free ? 3 : 1 : job.free ? 2 : 0;
    const ids = normals(config);
    const convert = (value) => value === 1 ? "scatter" : value === 2 ? "wild" : value === 12 ? "royal-wild" : value === 13 ? "gold" : ids[value - 3];
    return vegasVisibleReels[`reel_set${set}`].map((reel, column) => {
      const stop = stopDistribution === VEGAS_NATIVE_STOP_VERSION ? sampleNativeVegasStop(set, column, () => draw(rng)) : integer2(rng, reel.length);
      return Array.from({ length: 3 }, (_, row) => convert(reel[(stop + row) % reel.length]));
    });
  }
  return Array.from({ length: config.columns }, (_, column) => {
    let hasScatter = false;
    return Array.from({ length: config.rows }, () => {
      const value = reviewSymbol(config, rng, column, { scatterAllowed: !hasScatter, free: job.free });
      hasScatter ||= value === "scatter";
      return value;
    });
  });
}
function publicLinePay(config, id, count) {
  if (config.id === "vegasnights_native") return vegasLinePaytable[String(normals(config).indexOf(id) + 3)]?.[count] || 0;
  if (count < 3) return 0;
  return id === "wild" ? [100, 500, 2e3][count - 3] : (REVIEW_PAY[normals(config).indexOf(id)] || REVIEW_PAY.at(-1))[count - 3];
}
function lineWins(config, grid, boxMultipliers = null, wildMultipliers = null) {
  const paths = config.id === "vegasnights_native" ? vegasPaylinePaths : config.id === "bookofmagic_native" ? bookPaylinePaths : linePaths;
  const wins = [];
  for (const [line, path] of paths.slice(0, config.paylines).entries()) {
    let best = null;
    for (const id of [...normals(config), ...config.id === "vegasnights_native" ? [] : ["wild"]]) {
      let count = 0;
      for (let c = 0; c < config.columns; c++) {
        const value = grid[c][path[c]];
        if (value === id || wild(value) && id !== "wild") count++;
        else break;
      }
      if (count < 3) continue;
      const cells = path.slice(0, count).map((row, c) => [c, row]);
      let factor = 1;
      if (boxMultipliers) factor = Math.max(1, ...cells.map((cell) => boxMultipliers.get(cellKey(cell)) || 1));
      if (wildMultipliers) for (const cell of cells) factor *= wildMultipliers.get(cellKey(cell)) || 1;
      if (config.id === "bookofmagic_native" && id !== "wild" && cells.some(([c, r]) => grid[c][r] === id) && cells.some(([c, r]) => grid[c][r] === "wild")) factor *= 2;
      const points = publicLinePay(config, id, count) * (config.pointsPerStake || 1e4) / config.paylines * factor;
      if (!Number.isSafeInteger(points)) fail7("INVALID_LINE_POINT_PRECISION", 500);
      if (points > 0 && (!best || points > best.points)) best = { symbol: id, count, cells, points, line, factor };
    }
    if (best) wins.push(best);
  }
  return wins;
}
function wayWins(config, grid) {
  const wins = [];
  for (const id of normals(config)) {
    let ways = 1, count = 0, cells = [];
    for (let c = 0; c < config.columns; c++) {
      const found = grid[c].flatMap((value, r) => value === id || value === "wild" ? [[c, r]] : []);
      if (!found.length) break;
      count++;
      ways *= found.length;
      cells.push(...found);
    }
    if (count >= 3) wins.push({ symbol: id, count, ways, cells, points: publicLinePay(config, id, count) * ways * 100 });
  }
  return wins;
}
function anyWhereWins(config, grid) {
  const wins = [], wildCells = cellsOf(grid, "wild");
  for (const [rank, id] of normals(config).entries()) {
    const ordinary = cellsOf(grid, id);
    if (!ordinary.length) continue;
    const cells = [...ordinary, ...wildCells], count = cells.length;
    if (count >= 8) {
      const band = count >= 12 ? 4 : count >= 10 ? 2 : 1;
      wins.push({ symbol: id, count, cells, points: (12 - rank) * band * 1e3 });
    }
  }
  return wins;
}
function collapse(config, grid, wins, rng, options = {}) {
  const removed = new Set(wins.flatMap((win) => win.cells.map(cellKey)));
  return grid.map((column, c) => {
    const locked = new Map(column.flatMap((value, r) => options.stickyMultipliers && value === "multiplier" ? [[r, value]] : []));
    const kept = column.filter((_, r) => !locked.has(r) && !removed.has(`${c}:${r}`));
    let hasScatter = kept.includes("scatter");
    const replacement = Array.from({ length: config.rows - locked.size - kept.length }, () => {
      const value = reviewSymbol(config, rng, c, { ...options, scatterAllowed: !hasScatter });
      hasScatter ||= value === "scatter";
      return value;
    });
    const moving = [...replacement, ...kept];
    return Array.from({ length: config.rows }, (_, r) => locked.has(r) ? locked.get(r) : moving.shift());
  });
}
function attachMoney(raw, payout) {
  const total = BigInt(raw.totalPoints), convert = (frame) => {
    const framePayout = total > 0n ? payout * BigInt(frame.points) / total : 0n;
    let assigned = 0n;
    const wins = frame.wins.map((win, index) => {
      const amount = index === frame.wins.length - 1 ? framePayout - assigned : frame.points > 0 ? framePayout * BigInt(win.points) / BigInt(frame.points) : 0n;
      assigned += amount;
      const { points: points2, ...details2 } = win;
      return { ...details2, payoutMinor: String(amount) };
    });
    const { points, ...details } = frame;
    return { ...details, wins, payoutMinor: String(framePayout) };
  }, frames = raw.frames.map(convert);
  let shown = frames.reduce((sum, frame) => sum + money2(frame.payoutMinor), 0n);
  if (raw.totalFrames === frames.length && frames.length && shown < payout) {
    const frame = frames.findLast((item) => item.wins.length) || frames.at(-1), difference = payout - shown;
    frame.payoutMinor = String(money2(frame.payoutMinor) + difference);
    if (frame.wins.length) frame.wins.at(-1).payoutMinor = String(money2(frame.wins.at(-1).payoutMinor) + difference);
    shown = payout;
  }
  const finalFrame = raw.totalFrames === frames.length ? frames.at(-1) : raw.finalFrame ? convert(raw.finalFrame) : null;
  return { frames, finalFrame, omittedFrames: raw.totalFrames - frames.length, omittedPayoutMinor: String(payout - shown) };
}
var towerXDistribution = [
  { threshold: 544250, sum: 0 },
  { threshold: 694250, sum: 25 },
  { threshold: 794250, sum: 50 },
  { threshold: 874250, sum: 100 },
  { threshold: 934250, sum: 200 },
  { threshold: 969250, sum: 500 },
  { threshold: 995e3, sum: 1e3 },
  { threshold: 1e6, sum: 5e3 }
];
var BUILDING_TYPES = [{ type: "suburb", min: 1, max: 5 }, { type: "city", min: 6, max: 10 }, { type: "green", min: 15, max: 40 }, { type: "elite", min: 50, max: 90 }, { type: "neon", min: 100, max: 1e3 }];
function towerXStart(id, stake2, rng, now, cap = CAP) {
  const roll = integer2(rng, 1e6), sum = towerXDistribution.find((outcome) => roll < outcome.threshold).sum, floors = [];
  let remaining = sum;
  while (remaining > 0) {
    const type = BUILDING_TYPES.filter((type2) => type2.min <= remaining).at(-1), upper = Math.min(type.max, remaining);
    const value = floors.length > 16 ? upper : type.min + integer2(rng, upper - type.min + 1);
    floors.push({ level: floors.length + 1, type: type.type, multiplier: value });
    remaining -= value;
  }
  const payout = limited(stake2 * BigInt(sum) / 100n, cap);
  return { gameId: id, stakeMinor: String(stake2), status: "settled", expiresAt: now, payoutMinor: String(payout), family: "tower", floors, frames: floors.map((floor) => ({ floor, kind: "building", multiplier: floor.multiplier })), totalBuildingMultiplier: sum, baseUnitsPerStake: 100, feature: "Umbrella jump", actions: [] };
}
function finish(state, payout, reason, cap = CAP) {
  return { ...state, status: "settled", payoutMinor: String(limited(payout, cap)), currentCashoutMinor: String(limited(payout, cap)), actions: [], reason };
}
function towerFrozenValue(current, bank) {
  if (!Number.isSafeInteger(current) || !Number.isSafeInteger(bank) || current < bank || bank < 0 || current > 1e6) fail7("INVALID_TOWER_VALUE", 500);
  const next = Math.min(1e6, Math.floor(current * 1.5));
  if (next <= current || current >= bank * 2 || bank === 0) return current;
  return Math.max(current, 0.5 * towerFrozenValue(next, bank) + 0.5 * bank);
}
function towerRushStart(id, stake2, now) {
  return { gameId: id, stakeMinor: String(stake2), status: "active", expiresAt: now + DEADLINE_MS, family: "tower", level: 0, floors: [], currentCashoutMinor: String(stake2), lockedPayoutMinor: "0", frozen: false, actions: ["step", "cashout"], feature: "Build a floor or collect the unused stake." };
}
function towerRushAction(state, input, rng) {
  if (input.type === "cashout") return finish(state, money2(state.currentCashoutMinor), "collected");
  if (input.type !== "step") fail7("INVALID_TOWER_ACTION");
  const current = money2(state.currentCashoutMinor), bank = money2(state.lockedPayoutMinor);
  let kind = "normal", multiplier = 1.5, next = limited(current * 3n / 2n), section = null, extraFloors = [];
  if (!state.frozen) {
    kind = weighted(rng, [["normal", 88], ["frozen", 4], ["temple", 4], ["triple", 4]]);
    multiplier = 1.25;
    next = limited(current * 5n / 4n);
    if (kind === "temple") {
      section = [1.5, 1.5, 2, 2, 3, 3, 5, 5, 7, "freeze"][integer2(rng, 10)];
      if (section !== "freeze") {
        next = limited(next * BigInt(Math.round(section * 100)) / 100n);
        multiplier *= section;
      }
    }
    if (kind === "triple") {
      extraFloors = [1.25, 1.25, 1.25];
      for (const factor of extraFloors) {
        next = limited(next * 5n / 4n);
        multiplier *= factor;
      }
    }
  }
  const freezes = kind === "frozen" || section === "freeze";
  const nextValue = freezes ? towerFrozenValue(Number(next), Number(next)) : Number(next);
  const probability = state.frozen ? 0.5 : (state.level === 0 ? Number(current) * 0.97 : Number(current)) / nextValue;
  if (draw(rng) >= probability) return finish({ ...state, feature: "Floor collapsed" }, bank, "collapsed");
  const nextBank = freezes ? next : bank, level = state.level + 1 + extraFloors.length;
  const floors = [...state.floors, { level: state.level + 1, type: kind, multiplier: state.frozen ? 1.5 : 1.25, ...section !== null ? { wheelSection: section } : {} }];
  for (const [index, factor] of extraFloors.entries()) floors.push({ level: state.level + 2 + index, type: "triple-additional", multiplier: factor });
  const updated = { ...state, level, floors, currentCashoutMinor: String(next), lockedPayoutMinor: String(nextBank), frozen: state.frozen || freezes, feature: freezes ? "Frozen Floor: the full current win is protected" : kind === "temple" ? `Temple Floor: ${section}\xD7` : kind === "triple" ? "Triple Build: three additional floors" : "New floor" };
  return next >= CAP ? finish(updated, next, "limit-collected") : updated;
}
var mineChoices = Object.keys(coin94MultipliersHundredths).map(Number);
function mineBoostActive(mines, opened) {
  return mines === 3 ? opened >= 18 : mines === 5 ? opened >= 1 : [7, 10, 17, 20].includes(mines);
}
function minesPayout(stake2, mines, safeCount, cap = CAP) {
  const table = coin94MultipliersHundredths[String(mines)];
  if (!table || !Number.isInteger(safeCount) || safeCount < 0 || safeCount > table.length) fail7("INVALID_MINES_STATE", 500);
  return safeCount === 0 ? stake2 : limited(stake2 * BigInt(table[safeCount - 1]) / 100n, cap);
}
function mineSafeProbability(mines, opened) {
  const table = coin94MultipliersHundredths[String(mines)];
  if (!table || !Number.isInteger(opened) || opened < 0 || opened >= table.length) fail7("INVALID_MINES_STATE", 500);
  const baseline = (25 - mines - opened) / (25 - opened);
  if (!mineBoostActive(mines, opened)) return { baseline, probability: baseline, boostActive: false };
  let survival = 1;
  for (let k = 0; k < opened; k++) {
    const base = (25 - mines - k) / (25 - k);
    const chance = mineBoostActive(mines, k) ? Math.max(base, Math.min(1, 94 / table[k] / survival)) : base;
    survival *= chance;
  }
  const probability = Math.max(baseline, Math.min(1, 94 / table[opened] / survival));
  return { baseline, probability, boostActive: true };
}
function minesStart(id, stake2, options, now) {
  const count = options.mines === void 0 ? 3 : options.mines;
  if (!Number.isInteger(count) || !mineChoices.includes(count)) fail7("INVALID_MINE_COUNT");
  return { gameId: id, stakeMinor: String(stake2), status: "active", expiresAt: now + DEADLINE_MS, family: "mines", columns: 5, rows: 5, mines: count, picks: [], currentCashoutMinor: String(stake2), boardPredetermined: false, treasureBoost: { active: mineBoostActive(count, 0), rescuedPicks: 0 }, actions: ["pick", "cashout"] };
}
function minesAction(state, input, rng, cap = CAP) {
  if (input.type === "cashout") return finish(state, money2(state.currentCashoutMinor), "collected", cap);
  if (input.type !== "pick" || !Number.isInteger(input.index) || input.index < 0 || input.index > 24) fail7("INVALID_MINE_PICK");
  if (state.picks.some((pick2) => pick2.index === input.index)) fail7("TILE_ALREADY_REVEALED", 409);
  const odds = mineSafeProbability(state.mines, state.picks.length), roll = draw(rng), safe = roll < odds.probability;
  const rescued = safe && odds.boostActive && roll >= odds.baseline;
  const picks = [...state.picks, { index: input.index, safe, ...rescued ? { treasureBoost: true } : {} }];
  if (!safe) return finish({ ...state, picks }, 0n, "mine", cap);
  const payout = minesPayout(money2(state.stakeMinor), state.mines, picks.length, cap);
  const next = { ...state, picks, currentCashoutMinor: String(payout), treasureBoost: { active: mineBoostActive(state.mines, picks.length), rescuedPicks: state.treasureBoost.rescuedPicks + (rescued ? 1 : 0) } };
  return picks.length === coin94MultipliersHundredths[String(state.mines)].length || payout >= cap ? finish(next, payout, "all-safe", cap) : next;
}
function createRemainingEngine(configs2, { operatorWagerProfile } = {}) {
  const operator = operatorWagerProfile !== void 0;
  if (operator && (operatorWagerProfile !== OPERATOR_WAGER_PROFILE2 || configs2.some((config) => !OPERATOR_GAME_IDS2.includes(config.id)))) fail7("INVALID_OPERATOR_ENGINE_PROFILE", 500);
  const configById = Object.fromEntries(configs2.map((config) => [config.id, config]));
  const known = configs2.filter((config) => !["darkhorus_native", "assassins_native"].includes(config.id));
  const capFor = (stake2) => operator ? stake2 * 10000n : CAP;
  const profileVersion = (id) => operatorDefinition2(configById[id]).version;
  const canonical2 = (value) => Array.isArray(value) ? value.map(canonical2) : object2(value) ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical2(value[key])])) : value;
  function operatorTowerState(unit, stake2) {
    const factor = stake2 / 100n;
    const scale = (value) => Array.isArray(value) ? value.map(scale) : object2(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key.endsWith("Minor") && typeof item === "string" ? String(money2(item) * factor) : scale(item)])) : value;
    if (!object2(unit) || unit.gameId !== "towerrush_native" || unit.stakeMinor !== "100") fail7("INVALID_OPERATOR_UNIT_STATE", 500);
    return { ...scale(unit), operatorUnitState: clone5(unit) };
  }
  function checkedProfileState(state) {
    if (!operator) return state;
    if (!object2(state) || !Object.hasOwn(configById, state.gameId) || state.modelVersion !== profileVersion(state.gameId) || state.operatorWagerProfileId !== OPERATOR_WAGER_PROFILE2.id) fail7("INVALID_OPERATOR_ROUND_STATE", 500);
    const stake2 = operatorStakeMinor(state.stakeMinor);
    if (state.gameId === "towerrush_native") {
      const expected = { ...operatorTowerState(state.operatorUnitState, stake2), modelVersion: state.modelVersion, operatorWagerProfileId: OPERATOR_WAGER_PROFILE2.id };
      if (JSON.stringify(canonical2(expected)) !== JSON.stringify(canonical2(state))) fail7("INVALID_OPERATOR_ROUND_STATE", 500);
    }
    return state;
  }
  function sampleRawSlot2(id, rng, { record = true, maxRawPoints = RAW_REVIEW_CAP, lines, mode, feature: selectedFeature, stopDistribution = "legacy-uniform-v2" } = {}) {
    const originalConfig = configById[id], controls = remainingSlotOptions(id, { lines, mode, feature: selectedFeature });
    const config = { ...originalConfig, pointsPerStake: controls.pointsPerStake, ...controls.lines ? { paylines: controls.lines } : {} };
    if (!slotScales[id] || !Number.isSafeInteger(maxRawPoints) || maxRawPoints < 1) fail7("UNSUPPORTED_SLOT");
    if (id === "vegasnights_native" && !["legacy-uniform-v2", VEGAS_NATIVE_STOP_VERSION].includes(stopDistribution)) fail7("INVALID_VEGAS_DISTRIBUTION");
    let totalPoints = 0, totalFrames = 0, bonusSpins = 0, feature = "", finalGrid = [], finalFrame = null, progress = 0, bonusProgress = 0;
    const featureEvents = [];
    const frames = [], queue = controls.mode === "super-bonus" ? EGYPT_GODS.map((god, stage) => ({ kind: "super-bonus-spin", mode: "base", free: true, super: true, forcedStage: stage, guaranteedFeatureWin: true })) : controls.mode === "bonus-buy" ? Array.from({ length: id === "egyptianlegends_native" ? 10 : 12 }, () => ({ kind: "free-spin", mode: "base", free: true })) : [{ kind: "base", mode: "base", free: false }];
    if (controls.mode === "bonus-buy" || controls.mode === "super-bonus") {
      bonusSpins = queue.length;
      feature = controls.mode === "super-bonus" ? "Super Bonus: five guaranteed feature spins" : `${bonusSpins} purchased free spins`;
    }
    const capped = () => totalPoints >= maxRawPoints;
    const addFrame = (grid, wins, details = {}) => {
      const points = wins.reduce((sum, win) => sum + win.points, 0);
      totalPoints += points;
      totalFrames++;
      finalGrid = clone5(grid);
      const frame = { grid: clone5(grid), wins: clone5(wins), points, multiplier: 1, ...details };
      finalFrame = frame;
      if (record && frames.length < MAX_FRAMES) frames.push(frame);
      return frame;
    };
    const addSpins = (count, free = true) => {
      bonusSpins += count;
      for (let n = 0; n < count; n++) queue.push({ kind: "free-spin", mode: "base", free });
      feature = `${bonusSpins} free spins awarded`;
    };
    for (let spin = 0; spin < queue.length && !capped(); spin++) {
      const job = queue[spin];
      let grid = gridFor(config, rng, job, stopDistribution);
      if (isLegend2(id)) {
        const forcedStage = job.forcedStage ?? (controls.mode === "feature" ? EGYPT_GODS.indexOf(controls.selectedFeature) : null);
        const progressEnabled = forcedStage === null;
        let currentProgress = progressEnabled && job.free ? bonusProgress : 0, earnedIndex = 0;
        while (legendThresholds[earnedIndex % 5] + 110 * Math.floor(earnedIndex / 5) <= currentProgress) earnedIndex++;
        const earned = forcedStage === null ? [] : [forcedStage];
        const updateProgress = (wins) => {
          currentProgress += new Set(wins.flatMap((win) => win.cells.map(cellKey))).size;
          while (legendThresholds[earnedIndex % 5] + 110 * Math.floor(earnedIndex / 5) <= currentProgress) {
            earned.push(earnedIndex % 5);
            earnedIndex++;
          }
        };
        const cascade2 = (kind, modify = null, { trackProgress = false, normalOnly = false, stickyMultipliers = false, detail = {} } = {}) => {
          let index = 0;
          while (!capped()) {
            const before = modify?.before?.(grid, index) || {};
            if (kind === "mythic-feature" && job.guaranteedFeatureWin && index === 0 && !anyWhereWins(config, grid).length) {
              const ids = normals(config), chosen = ids[integer2(rng, ids.length)], ordinary = cellsOf(grid, chosen).length;
              const needed = Math.max(1, 8 - cellsOf(grid, "wild").length) - ordinary;
              const eligible = positions(6, 5).filter(([c, r]) => !["scatter", "multiplier", chosen].includes(grid[c][r]));
              const plain = eligible.filter(([c, r]) => grid[c][r] !== "wild");
              for (const [c, r] of choose(rng, plain.length >= needed ? plain : eligible, needed)) grid[c][r] = chosen;
              if (!anyWhereWins(config, grid).length) fail7("GUARANTEED_FEATURE_BOARD_INVALID", 500);
            }
            let wins = anyWhereWins(config, grid);
            if (modify?.wins) wins = modify.wins(wins, grid, index);
            addFrame(grid, wins, { kind, cascade: index, feature: detail.god || feature, ...detail, ...before });
            if (!wins.length) break;
            if (trackProgress) updateProgress(wins);
            modify?.after?.(wins, grid, index);
            if (capped()) break;
            grid = collapse(config, grid, wins, rng, { normalOnly, stickyMultipliers });
            index++;
          }
        };
        cascade2(job.kind, null, { trackProgress: progressEnabled });
        const featureNormalPositions = () => positions(6, 5).filter(([c, r]) => grid[c][r] !== "scatter");
        for (const stage of earned) {
          if (capped()) break;
          const god = (id === "egyptianlegends_native" ? EGYPT_GODS : OLYMPUS_GODS)[stage];
          feature = god;
          featureEvents.push({ god, stage: stage + 1, progress: currentProgress, spin: job.kind, trigger: job.super ? "super-bonus" : controls.mode === "feature" ? "selected-feature" : "progress", ...job.guaranteedFeatureWin ? { guaranteedWin: true } : {} });
          if (id === "olympianlegends_native") {
            const ids = normals(config), factor = weighted(rng, (job.free ? [2, 3, 5, 7, 10, 20, 50] : [1, 2, 3, 5, 7, 10, 20]).map((v, i) => [v, [60, 20, 10, 5, 3, 1, 1][i]]));
            if (stage === 0) {
              const low = new Set(ids.slice(4));
              grid = collapse(config, grid, [{ cells: positions(6, 5).filter(([c, r]) => low.has(grid[c][r])) }], rng, { normalOnly: true });
            }
            if (stage === 1) for (const [c, r] of choose(rng, featureNormalPositions(), 2 + integer2(rng, 4))) grid[c][r] = "wild";
            if (stage === 2) {
              const chosen = ids[integer2(rng, ids.length)], left = integer2(rng, 4), top = integer2(rng, 3);
              for (let c = left; c < left + 3; c++) for (let r = top; r < top + 3; r++) if (grid[c][r] !== "scatter") grid[c][r] = chosen;
            }
            if (stage === 3) for (const c of choose(rng, [0, 1, 2, 3, 4, 5], 3 + integer2(rng, 4))) {
              const kept = grid[c].filter((value) => value === "wild" || value === "scatter");
              grid[c] = [...Array.from({ length: 5 - kept.length }, () => reviewSymbol(config, rng, c, { normalOnly: true })), ...kept];
            }
            if (stage === 4) {
              const visible = [...new Set(grid.flat().filter((value) => ids.includes(value)))];
              if (visible.length) {
                const chosen = visible[integer2(rng, visible.length)];
                grid = grid.map((col) => col.map((value) => value === chosen ? "wild" : value));
              }
            }
            cascade2("mythic-feature", { wins: (wins) => wins.map((win) => ({ ...win, points: win.points * factor })) }, { detail: { god, stage: stage + 1, multiplier: factor, progress: currentProgress } });
          } else {
            const orbValues = /* @__PURE__ */ new Map(), cellMultipliers = /* @__PURE__ */ new Map();
            let bar = stage === 4 ? weighted(rng, [1, 2, 3, 4, 5, 6, 7, 8, 10, 50, 100, 250, 500].map((value, index) => [value, Math.max(1, 45 - index * 4)])) : 1;
            const placeOrbs = () => {
              for (const [c, r] of choose(rng, featureNormalPositions().filter(([c2, r2]) => grid[c2][r2] !== "multiplier"), 1 + integer2(rng, 3))) {
                grid[c][r] = "multiplier";
                orbValues.set(`${c}:${r}`, weighted(rng, EGYPT_MULTIPLIERS.map((v, i) => [v, Math.max(1, 40 - i * 3)])));
              }
            };
            if (stage === 3) for (const cell of choose(rng, featureNormalPositions(), 2 + integer2(rng, 5))) cellMultipliers.set(cellKey(cell), 2);
            if (stage === 4) {
              const ids = normals(config), visible = [...new Set(grid.flat().filter((value) => ids.includes(value)))];
              if (visible.length) {
                const chosen = visible[integer2(rng, visible.length)];
                grid = grid.map((col) => col.map((value) => value === chosen ? "wild" : value));
              }
            }
            const startPoints = totalPoints, startFrame = frames.length;
            const modifier = {
              before: () => {
                if (stage <= 2) {
                  if (stage !== 1) {
                    grid = grid.map((col) => col.map((value) => value === "multiplier" ? normals(config)[integer2(rng, normals(config).length)] : value));
                    orbValues.clear();
                  }
                  placeOrbs();
                  if (stage === 0) bar += Array.from(orbValues.values()).reduce((a, b) => a + b, 0);
                }
                return { multiplier: bar, multiplierSymbols: Object.fromEntries(orbValues), ...stage === 3 ? { cellMultipliers: Object.fromEntries(cellMultipliers) } : {} };
              },
              wins: (wins) => wins.map((win) => {
                const factor = stage === 0 || stage === 4 ? bar : stage === 2 ? Math.max(1, Array.from(orbValues.values()).reduce((a, b) => a + b, 0)) : stage === 3 ? Math.max(1, win.cells.reduce((sum, cell) => sum + (cellMultipliers.get(cellKey(cell)) || 0), 0)) : 1;
                return { ...win, points: win.points * factor, factor };
              }),
              after: (wins) => {
                if (stage === 3) {
                  for (const key of new Set(wins.flatMap((win) => win.cells.map(cellKey)))) if (cellMultipliers.has(key)) cellMultipliers.set(key, cellMultipliers.get(key) + 1);
                }
              }
            };
            cascade2("mythic-feature", modifier, { stickyMultipliers: stage === 1, detail: { god, stage: stage + 1, progress: currentProgress } });
            if (stage === 1) {
              const factor = Math.max(1, Array.from(orbValues.values()).reduce((a, b) => a + b, 0));
              totalPoints += (totalPoints - startPoints) * (factor - 1);
              for (const frame of frames.slice(startFrame)) {
                frame.points *= factor;
                frame.multiplier = factor;
                for (const win of frame.wins) win.points *= factor;
              }
              if (finalFrame && !frames.includes(finalFrame)) {
                finalFrame.points *= factor;
                finalFrame.multiplier = factor;
                for (const win of finalFrame.wins) win.points *= factor;
              }
            }
          }
        }
        if (job.free && progressEnabled) bonusProgress = currentProgress;
        progress = currentProgress;
        const scatters = cellsOf(grid, "scatter").length;
        if (id === "egyptianlegends_native" && !job.super) {
          const count = Math.min(scatters, 6), scatterPoints = job.free ? ({ 4: 3, 5: 5, 6: 100 }[count] || 0) * controls.pointsPerStake : 0;
          if (scatterPoints) addFrame(grid, [{ symbol: "scatter", count, cells: cellsOf(grid, "scatter"), points: scatterPoints }], { kind: "scatter-award" });
          if (job.free && scatters >= 3) addSpins({ 3: 2, 4: 3, 5: 5, 6: 10 }[count]);
          else if (!job.free && scatters >= 4) addSpins(10);
        } else if (id === "olympianlegends_native" && !job.free && scatters >= 4) addSpins(12);
        continue;
      }
      let boxMultipliers = null, luckyBoxes = [];
      if (id === "magicgarden_native") {
        boxMultipliers = /* @__PURE__ */ new Map();
        for (const [c, r] of choose(rng, positions(5, 3), 3)) {
          const multiplier = weighted(rng, [[2, 7], [3, 2], [5, 1]]);
          boxMultipliers.set(`${c}:${r}`, multiplier);
          luckyBoxes.push({ column: c, row: r, multiplier });
        }
        if (grid[4].includes("magic")) {
          for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) if (grid[c][r] === "magic" || c > 0 && draw(rng) < 0.12) grid[c][r] = "wild";
          feature = "Magic wild conversion";
        }
      }
      let cascade = 0;
      while (!capped()) {
        let wildMultipliers = null;
        if (id === "vegasnights_native" && job.free) wildMultipliers = new Map(positions(5, 3).filter(([c, r]) => grid[c][r] === "wild" || grid[c][r] === "gold").map((cell) => [cellKey(cell), stopDistribution === VEGAS_NATIVE_STOP_VERSION ? sampleNativeVegasWildFactor(() => draw(rng)) : weighted(rng, [[2, 2], [3, 1]])]));
        let wins = isWays(id) ? wayWins(config, grid) : lineWins(config, grid, boxMultipliers, wildMultipliers);
        const multiplier = isWays(id) && job.free ? Math.min(cascade + 1, 10) : id === "bookofmagic_native" && job.free ? 3 : 1;
        if (multiplier !== 1) wins = wins.map((win) => ({ ...win, points: win.points * multiplier }));
        const scatters = cellsOf(grid, "scatter").length;
        if (cascade === 0) {
          if (isWays(id) && !job.free && scatters >= 3) addSpins(scatters >= 5 ? 25 : scatters === 4 ? 20 : 15);
          if (id === "bookofmagic_native" && scatters >= 3) addSpins(15);
          if (id === "vegasnights_native" && scatters === 3) addSpins(5);
          if (id === "vegasnights_native" && job.mode !== "extra" && grid[4][1] === "gold") {
            queue.splice(spin + 1, 0, ...Array.from({ length: 3 }, () => ({ kind: "extra-wild-respin", mode: "extra", free: job.free })));
            feature = "Three extra wild respins";
          }
          if (scatters >= 3) {
            const points = (id === "vegasnights_native" ? 2 : [0, 0, 0, 2, 10, 50][Math.min(scatters, 5)] || 0) * controls.pointsPerStake * (id === "bookofmagic_native" && job.free ? 3 : 1);
            wins.push({ symbol: "scatter", count: scatters, cells: cellsOf(grid, "scatter"), points });
          }
        }
        addFrame(grid, wins, { kind: job.kind, cascade, multiplier, feature, ...luckyBoxes.length ? { luckyBoxes } : {}, ...wildMultipliers ? { wildMultipliers: Object.fromEntries(wildMultipliers) } : {} });
        const lineOrWayWins = wins.filter((win) => win.symbol !== "scatter");
        if (!isWays(id) || !lineOrWayWins.length || capped()) break;
        grid = collapse(config, grid, lineOrWayWins, rng);
        cascade++;
      }
    }
    if (!Number.isSafeInteger(totalPoints) || totalPoints < 0) fail7("INVALID_RAW_PAYOUT", 500);
    return { totalPoints, pointsPerStake: controls.pointsPerStake, mode: controls.mode, ...id === "vegasnights_native" ? { stopDistribution } : {}, ...controls.lines ? { lines: controls.lines } : {}, frames, totalFrames, bonusSpins, feature, finalGrid, finalFrame, progress, featureEvents, stoppedAtPayoutCap: capped() };
  }
  function slotStart(id, stake2, options, rng, now) {
    const controls = remainingSlotOptions(id, options), baseStake = remainingBaseStake(stake2, controls), scale = slotScales[id];
    const roundCap = remainingSlotCap(id, stake2, { ...controls, risk: false }, capFor(stake2));
    const numerator = roundCap * BigInt(controls.pointsPerStake) * BigInt(scale.denominator), denominator = baseStake * BigInt(scale.numerator);
    const rawLimit = Number((numerator + denominator - 1n) / denominator);
    const raw = sampleRawSlot2(id, rng, { maxRawPoints: rawLimit, lines: controls.lines, mode: controls.mode, feature: controls.selectedFeature, ...id === "vegasnights_native" ? { stopDistribution: VEGAS_NATIVE_STOP_VERSION } : {} });
    const uncapped = baseStake * BigInt(raw.totalPoints) * BigInt(scale.numerator) / (BigInt(raw.pointsPerStake) * BigInt(scale.denominator));
    const payout = uncapped > roundCap ? roundCap : uncapped, presentation = attachMoney(raw, payout);
    const state = { gameId: id, stakeMinor: String(stake2), baseStakeMinor: String(baseStake), controls, status: "settled", expiresAt: now, payoutMinor: String(payout), family: configById[id].family, grid: raw.finalGrid, wins: presentation.finalFrame?.wins || [], ...presentation, feature: raw.feature, bonusSpins: raw.bonusSpins, freeSpinsRemaining: 0, progress: raw.progress, featureEvents: raw.featureEvents, maxWinMultiplier: id === "bookofmagic_native" ? 1e4 / controls.lines : 100, roundCapMinor: String(roundCap), capped: uncapped >= roundCap, actions: [], ...id === "vegasnights_native" ? { stopDistribution: VEGAS_NATIVE_STOP_VERSION } : {}, ...controls.lines ? { lines: controls.lines, lineBetMinor: { numerator: String(stake2), denominator: String(controls.lines) } } : {} };
    return controls.risk ? remainingRiskStart(state, remainingSlotCap(id, stake2, controls, capFor(stake2)), now, DEADLINE_MS) : state;
  }
  function transition2(state, debit = 0n) {
    const stake2 = money2(state.stakeMinor);
    const cap = capFor(stake2);
    const liability = state.gameId === "towerx_native" ? limited(stake2 * 50n, cap) : state.gameId === "coinminer_native" ? minesPayout(stake2, state.mines, coin94MultipliersHundredths[String(state.mines)].length, cap) : slotScales[state.gameId] ? remainingSlotCap(state.gameId, stake2, state.controls || remainingSlotOptions(state.gameId), cap) : cap;
    if (operator) state = { ...state, modelVersion: profileVersion(state.gameId), operatorWagerProfileId: OPERATOR_WAGER_PROFILE2.id };
    return { state, debitMinor: String(debit), maxPayoutMinor: String(liability), payoutMinor: state.status === "settled" ? state.payoutMinor : null };
  }
  function createAdapter(includeDrafts = false) {
    const definitions6 = Object.fromEntries(known.filter((config) => includeDrafts || config.launchable === true).map((config) => {
      const legacy2 = {
        id: config.id,
        name: config.name,
        version: config.version,
        type: config.type,
        launchable: config.launchable === true,
        minStake: "0.10",
        maxStake: "100.00",
        maxWin: "10000.00",
        currency: "ETB",
        officialPrivateMathVerified: false,
        publicConfig: config,
        model: config.math
      };
      if (!operator) return [config.id, legacy2];
      const maxStake = BigInt(OPERATOR_WAGER_PROFILE2.maxStakeMinor), max = capFor(maxStake);
      const liability = config.id === "towerx_native" ? maxStake * 50n : config.id === "coinminer_native" ? maxStake * BigInt(Math.max(...Object.values(coin94MultipliersHundredths).flat())) / 100n : config.id === "bookofmagic_native" || config.id === "towerrush_native" ? max : config.id === "magicgarden_native" ? maxStake * 3200n : maxStake * 100n;
      const adapted = operatorDefinition2({ ...config, ...legacy2 }, liability);
      const rounding = config.id === "towerrush_native" ? "The independent progression resolves at a fixed1.00ETB unit; every accepted rounded unit amount scales by the selected whole-ETB wager. No additional absolute monetary ceiling applies." : "Compute exact BigInt coefficient totals at the selected wager, then floor the final total to santim. No additional absolute monetary ceiling applies.";
      const maximumMeaning = config.id === "coinminer_native" ? "The greatest public94 table return at the maximum supported wager; every table award is paid without clipping." : config.id === "towerx_native" ? "The greatest supported building sum at the maximum supported wager; every supported sum is paid without clipping." : config.id === "towerrush_native" ? "The canonical1.00ETB progression retains its10000\xD7 ceiling, scaled by the selected whole-ETB wager." : config.id === "bookofmagic_native" ? "The public10000\xD7 line-bet bound scales with the selected total wager and selected line count." : config.id === "magicgarden_native" ? "The existing independent100\xD7 total-stake base-game bound scales with the wager; optional risk can double a collected win up to five times within3200\xD7." : "The existing independent100\xD7 total-stake review bound scales with the selected wager.";
      const math = { ...clone5(config.math), version: adapted.version, coefficientProfileVersion: config.version, maximumPayoutMinor: String(liability), maximumPayoutScope: "Maximum reserved payout bound at40000.00ETB across supported options; the liability for each round is calculated separately.", maximumWinDescription: maximumMeaning, rounding, operatorWagerProfileId: OPERATOR_WAGER_PROFILE2.id };
      if (config.id === "coinminer_native") math.targetReturn = "Independent conditional model targets94% on boost steps before currency flooring; baseline/table rounding can yield up to94.40%. No public94 table award is clipped.";
      if (config.id === "towerrush_native") math.targetReturn = "The historical independent continuation law is evaluated at a fixed1.00ETB unit with its original rounding and ceiling, then scales by the whole-ETB wager. This profile does not claim provider-private return.";
      const paytable = config.id === "coinminer_native" ? { ...clone5(config.paytable), basis: "Multiply the total stake by the public94 entry for the accepted number of safe picks, then floor once to santim. No table award is clipped." } : clone5(config.paytable);
      const metadata = { stakeLimits: adapted.stakeLimits, math, model: math, paytable, operatorRounding: rounding, rules: [...config.rules ?? [], "Choose a displayed whole-ETB preset from1.00 through40000.00 ETB. This is an independent operator range, not a conversion of demo currency.", rounding, maximumMeaning, "The full potential liability is reserved before accepting a new wager. Insufficient house reserve rejects before debit."] };
      return [config.id, { ...adapted, ...metadata, publicConfig: { ...config, ...adapted, ...metadata, publicConfig: void 0 } }];
    }));
    return {
      definitions: definitions6,
      start(id, options, rng, now) {
        clock(now);
        if (!Object.hasOwn(definitions6, id)) fail7("GAME_REFERENCE_UNRESOLVED", 409);
        if (!object2(options) || Object.keys(options).some((key) => !["stakeMinor", ...id === "coinminer_native" ? ["mines"] : remainingSlotOptionKeys(id)].includes(key))) fail7("INVALID_GAME_OPTIONS");
        const stake2 = operator ? operatorStakeMinor(options.stakeMinor) : checkedStake(options.stakeMinor);
        const state = id === "towerx_native" ? towerXStart(id, stake2, rng, now, capFor(stake2)) : id === "towerrush_native" ? operator ? operatorTowerState(towerRushStart(id, 100n, now), stake2) : towerRushStart(id, stake2, now) : id === "coinminer_native" ? minesStart(id, stake2, options, now) : slotStart(id, stake2, options, rng, now);
        return transition2(state, stake2);
      },
      act(state, input, rng, now) {
        checkedProfileState(state);
        clock(now);
        if (!object2(state) || state.status !== "active" || !Object.hasOwn(definitions6, state.gameId)) fail7("ROUND_NOT_ACTIVE", 409);
        if (!object2(input) || Object.keys(input).some((key) => !["type", ...state.gameId === "coinminer_native" ? ["index"] : state.gameId === "magicgarden_native" && input.type === "gamble" ? ["color"] : []].includes(key))) fail7("INVALID_GAME_ACTION");
        if (now >= state.expiresAt) return this.expire(state, rng, now);
        const stake2 = money2(state.stakeMinor), cap = capFor(stake2);
        return transition2(state.gameId === "coinminer_native" ? minesAction(clone5(state), input, rng, cap) : state.gameId === "towerrush_native" ? operator ? operatorTowerState(towerRushAction(clone5(state.operatorUnitState), input, rng), stake2) : towerRushAction(clone5(state), input, rng) : state.gameId === "magicgarden_native" && state.risk?.enabled ? remainingRiskAction(clone5(state), input, () => draw(rng), remainingSlotCap(state.gameId, stake2, state.controls, cap)) : fail7("INVALID_GAME_ACTION"));
      },
      expire(state, _rng, now) {
        checkedProfileState(state);
        clock(now);
        if (!object2(state) || !Object.hasOwn(definitions6, state.gameId)) fail7("GAME_MODEL_UNAVAILABLE", 409);
        if (state.status === "settled") return transition2(clone5(state));
        if (!["coinminer_native", "towerrush_native"].includes(state.gameId) && !(state.gameId === "magicgarden_native" && state.risk?.enabled)) fail7("INVALID_ACTIVE_MODEL", 500);
        if (operator && state.gameId === "towerrush_native") return transition2(operatorTowerState(finish(clone5(state.operatorUnitState), money2(state.operatorUnitState.currentCashoutMinor), "expired-collected"), money2(state.stakeMinor)));
        return transition2(finish(clone5(state), money2(state.currentCashoutMinor), "expired-collected", capFor(money2(state.stakeMinor))));
      },
      publicState(state, now) {
        checkedProfileState(state);
        clock(now);
        const output = clone5(state);
        if (operator) delete output.operatorUnitState;
        if (state.currentCashoutMinor !== void 0) output.multiplier = ratio(money2(state.currentCashoutMinor), money2(state.stakeMinor));
        if (state.gameId === "coinminer_native") {
          const table = coin94MultipliersHundredths[String(state.mines)], safeCount = state.picks.filter((pick2) => pick2.safe).length;
          output.safePicks = safeCount;
          output.safeTilesRemaining = table.length - safeCount;
          output.hiddenTilesRemaining = 25 - state.picks.length;
          output.multiplierLadder = table.map((value) => ratio(BigInt(value), 100n));
          if (safeCount > 0 && money2(state.currentCashoutMinor) > 0n) output.multiplier = output.multiplierLadder[safeCount - 1];
          output.nextMultiplier = state.status === "active" ? output.multiplierLadder[safeCount] : null;
          output.nextPayoutMinor = state.status === "active" ? String(minesPayout(money2(state.stakeMinor), state.mines, safeCount + 1, capFor(money2(state.stakeMinor)))) : null;
        }
        return { ...output, serverNow: now };
      }
    };
  }
  function evaluateDraftGrid3(id, grid, { free = false, wildMultipliers = {}, lines } = {}) {
    const originalConfig = configById[id], controls = remainingSlotOptions(id, { lines });
    const config = originalConfig ? { ...originalConfig, pointsPerStake: controls.pointsPerStake, ...controls.lines ? { paylines: controls.lines } : {} } : null;
    if (!config || !slotScales[id] || !Array.isArray(grid) || grid.length !== config.columns || grid.some((col) => !Array.isArray(col) || col.length !== config.rows)) fail7("INVALID_REVIEW_GRID");
    const allowed = new Set(config.symbols.map((symbol) => symbol.id));
    if (grid.flat().some((symbol) => !allowed.has(symbol))) fail7("INVALID_REVIEW_SYMBOL");
    let wins = isLegend2(id) ? anyWhereWins(config, grid) : isWays(id) ? wayWins(config, grid) : lineWins(config, grid, null, new Map(Object.entries(wildMultipliers)));
    if (id === "bookofmagic_native" && free) wins = wins.map((win) => ({ ...win, points: win.points * 3 }));
    return { wins, totalPoints: wins.reduce((sum, win) => sum + win.points, 0), pointsPerStake: controls.pointsPerStake, ...controls.lines ? { lines: controls.lines } : {} };
  }
  const adapter = createAdapter();
  const createRecoveryAdapter2 = () => ({ ...createAdapter(true), start: (...args) => adapter.start(...args) });
  return { adapter, createRecoveryAdapter: createRecoveryAdapter2, createIsolatedDraftAdapter: () => createAdapter(true), sampleRawSlot: sampleRawSlot2, evaluateDraftGrid: evaluateDraftGrid3 };
}

// src/coin-frozen/models/remaining-games.mjs
var remainingPublicConfigs = [
  {
    "id": "moonstone_native",
    "name": "Moonstone",
    "type": "slots",
    "family": "cascade",
    "columns": 5,
    "rows": 3,
    "paylines": 0,
    "symbols": [
      {
        "id": "moon",
        "label": "Moon",
        "mark": "\u263E",
        "color": "#d6e9ff"
      },
      {
        "id": "wolf",
        "label": "Wolf",
        "mark": "\u2660",
        "color": "#c9d5ef"
      },
      {
        "id": "owl",
        "label": "Owl",
        "mark": "\u25C9",
        "color": "#b5a4ef"
      },
      {
        "id": "gem",
        "label": "Moonstone",
        "mark": "\u25C6",
        "color": "#6fddff"
      },
      {
        "id": "candle",
        "label": "Candle",
        "mark": "\u265C",
        "color": "#eeb28b"
      },
      {
        "id": "a",
        "label": "Ace",
        "mark": "A",
        "color": "#ce9fff"
      },
      {
        "id": "k",
        "label": "King",
        "mark": "K",
        "color": "#9bc9ff"
      },
      {
        "id": "q",
        "label": "Queen",
        "mark": "Q",
        "color": "#83d8d1"
      },
      {
        "id": "j",
        "label": "Jack",
        "mark": "J",
        "color": "#b8ce8d"
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#f3d5ff"
      },
      {
        "id": "scatter",
        "label": "Bonus",
        "mark": "\u263D",
        "color": "#c1f1ff"
      }
    ],
    "theme": {
      "bg": "#100e2b",
      "accent": "#b99cff",
      "secondary": "#73d8ff"
    },
    "featureDescription": "243 ways, rolling reels, 15/20/25 free spins and a rolling multiplier up to 10\xD7 during free spins.",
    "version": "superwin-moonstone-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Exact public symbol paytable and symbol mapping",
        "Optional buy bonus and complete demo controls",
        "Official presentation and audio"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100
    },
    "ways": 243,
    "paytable": {
      "verifiedPublicTable": false,
      "status": "Unpublished review coefficients; exact official numeric table unresolved.",
      "pointsPerStake": 1e4,
      "capTimesTotalStake": 100
    }
  },
  {
    "id": "magicgarden_native",
    "name": "Magic Garden",
    "type": "slots",
    "family": "slots",
    "columns": 5,
    "rows": 3,
    "paylines": 20,
    "symbols": [
      {
        "id": "seven",
        "label": "Seven",
        "mark": "7",
        "color": "#ff465f"
      },
      {
        "id": "bell",
        "label": "Bell",
        "mark": "\u2667",
        "color": "#ffc74a"
      },
      {
        "id": "grape",
        "label": "Grapes",
        "mark": "\u25CF",
        "color": "#a984ff"
      },
      {
        "id": "melon",
        "label": "Melon",
        "mark": "\u25D2",
        "color": "#ff6a7e"
      },
      {
        "id": "orange",
        "label": "Orange",
        "mark": "\u25CF",
        "color": "#ffad41"
      },
      {
        "id": "lemon",
        "label": "Lemon",
        "mark": "\u25C6",
        "color": "#ffe869"
      },
      {
        "id": "cherry",
        "label": "Cherries",
        "mark": "\u25CF",
        "color": "#ff4669"
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#eaff78"
      },
      {
        "id": "scatter",
        "label": "Scatter",
        "mark": "S",
        "color": "#6beaff"
      },
      {
        "id": "magic",
        "label": "Magic",
        "mark": "\u2727",
        "color": "#bafc8e"
      }
    ],
    "theme": {
      "bg": "#102c25",
      "accent": "#9bdf54",
      "secondary": "#dc9dff"
    },
    "featureDescription": "Three lucky boxes multiply qualifying lines. A magic symbol on reel five changes symbols to wilds.",
    "version": "superwin-magicgarden-3",
    "controls": {
      "stakeLabel": "Total stake (ETB)",
      "risk": {
        "label": "Offer red/black gamble after a win",
        "supported": true,
        "default": false,
        "maximumAttempts": 5
      }
    },
    "actions": [
      "gamble",
      "cashout"
    ],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Exact base-game payline geometry and numeric public paytable",
        "Official gamble presentation and audio",
        "Official presentation and audio"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100,
      "riskModel": {
        "colors": [
          "red",
          "black"
        ],
        "successProbability": "1/2",
        "winMultiplier": 2,
        "maximumAttempts": 5,
        "automaticCollection": "After five wins or before a further double exceeds the reserved maximum",
        "timeout": "Collect current earned win",
        "newDebits": false,
        "providerProbabilityClaim": false
      }
    },
    "paytable": {
      "verifiedPublicTable": false,
      "status": "Unpublished review coefficients; exact official numeric table unresolved.",
      "pointsPerStake": 1e4,
      "capTimesTotalStake": 100
    }
  },
  {
    "id": "bookofmagic_native",
    "name": "Book of Magic",
    "type": "slots",
    "family": "slots",
    "columns": 5,
    "rows": 3,
    "paylines": 20,
    "symbols": [
      {
        "id": "wizard",
        "label": "Wizard",
        "mark": "\u2654",
        "color": "#eaf3ff",
        "providerSymbolId": 10
      },
      {
        "id": "princess",
        "label": "Sorceress",
        "mark": "\u265B",
        "color": "#f0a7d9",
        "providerSymbolId": 9
      },
      {
        "id": "chest",
        "label": "Treasure chest",
        "mark": "\u25A3",
        "color": "#ffc867",
        "providerSymbolId": 8
      },
      {
        "id": "sceptre",
        "label": "Sceptre",
        "mark": "\u2727",
        "color": "#9bdc63",
        "providerSymbolId": 7
      },
      {
        "id": "amulet",
        "label": "Amulet",
        "mark": "\u25C7",
        "color": "#d794ff",
        "providerSymbolId": 6
      },
      {
        "id": "a",
        "label": "Ace",
        "mark": "A",
        "color": "#ffc879",
        "providerSymbolId": 5
      },
      {
        "id": "k",
        "label": "King",
        "mark": "K",
        "color": "#ff9b70",
        "providerSymbolId": 4
      },
      {
        "id": "q",
        "label": "Queen",
        "mark": "Q",
        "color": "#80d991",
        "providerSymbolId": 3
      },
      {
        "id": "j",
        "label": "Jack",
        "mark": "J",
        "color": "#76beef",
        "providerSymbolId": 2
      },
      {
        "id": "ten",
        "label": "Ten",
        "mark": "10",
        "color": "#ba99ef",
        "providerSymbolId": 1
      },
      {
        "id": "nine",
        "label": "Nine",
        "mark": "9",
        "color": "#f39fdf",
        "providerSymbolId": 0
      },
      {
        "id": "wild",
        "label": "Book Wild",
        "mark": "W",
        "color": "#f8d883",
        "providerSymbolId": 11
      },
      {
        "id": "scatter",
        "label": "Crystal ball Scatter",
        "mark": "S",
        "color": "#ea94ee",
        "providerSymbolId": 12
      }
    ],
    "theme": {
      "bg": "#17132d",
      "accent": "#e1b85c",
      "secondary": "#a38afa"
    },
    "featureDescription": "Three or more Scatters award15 free spins at3\xD7; retriggers add15. Substituting Book Wilds double a line once. The20 verified paths are used.",
    "version": "superwin-bookofmagic-3",
    "controls": {
      "stakeLabel": "Total stake (ETB)",
      "lines": {
        "label": "Active paylines",
        "values": [
          1,
          5,
          10,
          15,
          20
        ],
        "default": 20
      }
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Numeric symbol and two-scatter paytable injected by public demo startup",
        "Gamble and Jackpot Cards",
        "Official presentation and audio"
      ]
    },
    "maxWinMultiplier": 500,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Use exact rational line-bet units; floor only the final monetary settlement, with the platform maximum also applied.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesLineBet": 1e4,
      "pointsPerStakeByLineCount": {
        "1": 1e4,
        "5": 1e4,
        "10": 1e4,
        "15": 3e4,
        "20": 1e4
      }
    },
    "paytable": {
      "verifiedPublicTable": false,
      "status": "Unpublished review coefficients; exact official numeric table unresolved.",
      "pointsPerStake": 1e4,
      "verifiedPaths": [
        [
          1,
          1,
          1,
          1,
          1
        ],
        [
          0,
          0,
          0,
          0,
          0
        ],
        [
          2,
          2,
          2,
          2,
          2
        ],
        [
          0,
          1,
          2,
          1,
          0
        ],
        [
          2,
          1,
          0,
          1,
          2
        ],
        [
          0,
          0,
          1,
          2,
          2
        ],
        [
          2,
          2,
          1,
          0,
          0
        ],
        [
          1,
          2,
          2,
          2,
          1
        ],
        [
          1,
          0,
          0,
          0,
          1
        ],
        [
          0,
          1,
          1,
          1,
          0
        ],
        [
          2,
          1,
          1,
          1,
          2
        ],
        [
          1,
          2,
          1,
          0,
          1
        ],
        [
          1,
          0,
          1,
          2,
          1
        ],
        [
          0,
          1,
          0,
          1,
          0
        ],
        [
          2,
          1,
          2,
          1,
          2
        ],
        [
          1,
          1,
          2,
          1,
          1
        ],
        [
          1,
          1,
          0,
          1,
          1
        ],
        [
          0,
          2,
          0,
          2,
          0
        ],
        [
          2,
          0,
          2,
          0,
          2
        ],
        [
          1,
          0,
          2,
          0,
          1
        ]
      ],
      "capTimesLineBet": 1e4,
      "maxWinSource": "https://amusnet.com/games/online-casino/book-of-magic"
    }
  },
  {
    "id": "darkhorus_native",
    "name": "Dark Horus",
    "type": "slots",
    "family": "slots",
    "columns": 5,
    "rows": 3,
    "paylines": 20,
    "symbols": [
      {
        "id": "crown",
        "label": "Crown",
        "mark": "\u265B",
        "color": "#f5ce65"
      },
      {
        "id": "chalice",
        "label": "Chalice",
        "mark": "\u265C",
        "color": "#e6bf79"
      },
      {
        "id": "ring",
        "label": "Ring",
        "mark": "\u25CE",
        "color": "#f5d990"
      },
      {
        "id": "hourglass",
        "label": "Hourglass",
        "mark": "\u231B",
        "color": "#8be8f7"
      },
      {
        "id": "ruby",
        "label": "Ruby",
        "mark": "\u25C6",
        "color": "#ff6488"
      },
      {
        "id": "emerald",
        "label": "Emerald",
        "mark": "\u25C6",
        "color": "#49d9a3"
      },
      {
        "id": "sapphire",
        "label": "Sapphire",
        "mark": "\u25C6",
        "color": "#65a7ff"
      },
      {
        "id": "amethyst",
        "label": "Amethyst",
        "mark": "\u25C6",
        "color": "#cc82ff"
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#ffef97"
      },
      {
        "id": "scatter",
        "label": "Temple",
        "mark": "\u03A9",
        "color": "#ffed9b"
      },
      {
        "id": "multiplier",
        "label": "Multiplier",
        "mark": "\xD7",
        "color": "#ffe48a"
      }
    ],
    "theme": {
      "bg": "#131820",
      "accent": "#e2bd64",
      "secondary": "#56d8cf"
    },
    "featureDescription": "Unpublished design study: exact official title and reference remain unresolved.",
    "version": "superwin-darkhorus-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": false,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100
    }
  },
  {
    "id": "samurai_native",
    "name": "Samurai",
    "type": "slots",
    "family": "cascade",
    "columns": 5,
    "rows": 3,
    "paylines": 0,
    "symbols": [
      {
        "id": "samurai",
        "label": "Samurai",
        "mark": "\u4F8D",
        "color": "#f1c4b6"
      },
      {
        "id": "katana",
        "label": "Katana",
        "mark": "\u2694",
        "color": "#e7efff"
      },
      {
        "id": "helmet",
        "label": "Helmet",
        "mark": "\u515C",
        "color": "#f2bf62"
      },
      {
        "id": "fan",
        "label": "Fan",
        "mark": "\u25D2",
        "color": "#ef9ac1"
      },
      {
        "id": "pagoda",
        "label": "Pagoda",
        "mark": "\u5854",
        "color": "#d6a479"
      },
      {
        "id": "a",
        "label": "Ace",
        "mark": "A",
        "color": "#fe8585"
      },
      {
        "id": "k",
        "label": "King",
        "mark": "K",
        "color": "#f6bc77"
      },
      {
        "id": "q",
        "label": "Queen",
        "mark": "Q",
        "color": "#beb1ed"
      },
      {
        "id": "j",
        "label": "Jack",
        "mark": "J",
        "color": "#96bfdb"
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#fff0a9"
      },
      {
        "id": "scatter",
        "label": "Bonus",
        "mark": "\u7D0B",
        "color": "#e1a5ff"
      }
    ],
    "theme": {
      "bg": "#24111a",
      "accent": "#f17361",
      "secondary": "#eec976"
    },
    "featureDescription": "243 ways with rolling reels; 15/20/25 free spins and rolling multipliers up to 10\xD7.",
    "version": "superwin-samurai-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Exact public symbol paytable and symbol mapping",
        "Optional buy bonus and complete demo controls",
        "Official presentation and audio"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100
    },
    "ways": 243,
    "paytable": {
      "verifiedPublicTable": false,
      "status": "Unpublished review coefficients; exact official numeric table unresolved.",
      "pointsPerStake": 1e4,
      "capTimesTotalStake": 100
    }
  },
  {
    "id": "vegasnights_native",
    "name": "Vegas Nights",
    "type": "slots",
    "family": "slots",
    "columns": 5,
    "rows": 3,
    "paylines": 25,
    "symbols": [
      {
        "id": "vegas3",
        "label": "Reference symbol 3",
        "mark": "3",
        "color": "#cfc4ff",
        "providerSymbolId": 3
      },
      {
        "id": "vegas4",
        "label": "Reference symbol 4",
        "mark": "4",
        "color": "#cfc4ff",
        "providerSymbolId": 4
      },
      {
        "id": "vegas5",
        "label": "Reference symbol 5",
        "mark": "5",
        "color": "#cfc4ff",
        "providerSymbolId": 5
      },
      {
        "id": "vegas6",
        "label": "Reference symbol 6",
        "mark": "6",
        "color": "#cfc4ff",
        "providerSymbolId": 6
      },
      {
        "id": "vegas7",
        "label": "Reference symbol 7",
        "mark": "7",
        "color": "#cfc4ff",
        "providerSymbolId": 7
      },
      {
        "id": "vegas8",
        "label": "Reference symbol 8",
        "mark": "8",
        "color": "#cfc4ff",
        "providerSymbolId": 8
      },
      {
        "id": "vegas9",
        "label": "Reference symbol 9",
        "mark": "9",
        "color": "#cfc4ff",
        "providerSymbolId": 9
      },
      {
        "id": "vegas10",
        "label": "Reference symbol 10",
        "mark": "10",
        "color": "#cfc4ff",
        "providerSymbolId": 10
      },
      {
        "id": "vegas11",
        "label": "Reference symbol 11",
        "mark": "11",
        "color": "#cfc4ff",
        "providerSymbolId": 11
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#fff1b4",
        "providerSymbolId": 2
      },
      {
        "id": "scatter",
        "label": "Scatter",
        "mark": "S",
        "color": "#ff9dce",
        "providerSymbolId": 1
      },
      {
        "id": "gold",
        "label": "Super Wild",
        "mark": "\u2605",
        "color": "#ffd24e",
        "providerSymbolId": 13
      },
      {
        "id": "royal-wild",
        "label": "Converted royal Wild",
        "mark": "W",
        "color": "#b997f5",
        "providerSymbolId": 12
      }
    ],
    "theme": {
      "bg": "#210f35",
      "accent": "#ef73dc",
      "secondary": "#70e8f3"
    },
    "featureDescription": "Three Scatters on reels2\u20134 award5 free spins and2\xD7 total stake; retriggers add5. A middle Super Wild on reel5 adds3 extra-wild respins. Free-spin Wild and Super Wild factors are2\xD7/3\xD7; converted royals have no factor.",
    "version": "superwin-vegasnights-3",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Exact symbol artwork mapping and full presentation/audio",
        "All official menu/optional controls",
        "Independent external math review and explicit disclosure of capped, rounded return"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "independent-weighted-stops-v3",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Exact uncapped full-feature expectation is95.25380191203804%; the payout cap and minor-unit flooring can only reduce it. No claim of certified or provider-matching return.",
      "payoutCapTimesTotalStake": 100,
      "paytableStatus": "Exact public numeric line table and25paths; no prize scaling.",
      "rng": "Fixed integer stop weights over the public presentation strips. Each visible window has product weights: normal1000, Wild/royal-Wild689, Scatter/Super-Wild100. Each reel samples independently. This is an explicit ZPLAY model, not provider probabilities.",
      "freeSpinWildFactors": {
        "wild": [
          2,
          3
        ],
        "superWild": [
          2,
          3
        ],
        "convertedRoyal": 1,
        "combination": "Multiply factors on the winning line; maximum81."
      },
      "uniformStripAudit": {
        "uncappedRtpNumerator": "132275730380249",
        "uncappedRtpDenominator": "39573265696965",
        "uncappedRtp": 3.3425528080790574,
        "status": "Retired unsafe uniform-stop draft; preserved for diagnostic comparison only, never selected by new-round options."
      },
      "independentExpectation": {
        "model": "zplay-vegas-weighted-stops-v3",
        "providerReturnClaim": false,
        "payoutCapIncluded": false,
        "assumptions": {
          "stopDistribution": "fixed integer weights, independent by reel",
          "wildMultiplierWeights": {
            "2": 2,
            "3": 1
          },
          "freeSpinAward": 5,
          "extraWildRespins": 3
        },
        "sets": [
          {
            "set": 0,
            "lineReturn": {
              "numerator": "197106214613743447802497065094486446956450",
              "denominator": "217044833846611052821058491108458686035779",
              "decimal": 0.908135941871998
            },
            "scatterProbability": {
              "numerator": "2275600000000000000000000",
              "denominator": "32276728530667912205331920003",
              "decimal": 7050280817146094e-20
            },
            "goldProbability": {
              "numerator": "68900000",
              "denominator": "39324556483",
              "decimal": 0.0017520858761569367
            }
          },
          {
            "set": 1,
            "lineReturn": {
              "numerator": "3995722131201743303571227321727398611670",
              "denominator": "485319423241465174727919892467870160581",
              "decimal": 8.2331799220278
            },
            "scatterProbability": {
              "numerator": "0",
              "denominator": "1",
              "decimal": 0
            },
            "goldProbability": {
              "numerator": "0",
              "denominator": "1",
              "decimal": 0
            }
          },
          {
            "set": 2,
            "lineReturn": {
              "numerator": "1449332693553303546567423749839411",
              "denominator": "577343707275731527551026446616700",
              "decimal": 2.51034639381827
            },
            "scatterProbability": {
              "numerator": "14268000000",
              "denominator": "678660852851071",
              "decimal": 21023755739055495e-21
            },
            "goldProbability": {
              "numerator": "50000",
              "denominator": "16641163",
              "decimal": 0.003004597695485586
            }
          },
          {
            "set": 3,
            "lineReturn": {
              "numerator": "4990085961577751845327583644872771713704",
              "denominator": "158075533148976825376997602684292251725",
              "decimal": 31.56773133812487
            },
            "scatterProbability": {
              "numerator": "0",
              "denominator": "1",
              "decimal": 0
            },
            "goldProbability": {
              "numerator": "0",
              "denominator": "1",
              "decimal": 0
            }
          }
        ],
        "freeSpinReturn": {
          "numerator": "3123067842444785807618692219189719832771704842789218102593441253477",
          "denominator": "1117285837607639179498406858242428838231771261865319821693157036900",
          "decimal": 2.795227270697334
        },
        "freeSpinOffspring": {
          "numerator": "71340000000",
          "denominator": "678660852851071",
          "decimal": 10511877869527747e-20
        },
        "paidRoundReturn": {
          "numerator": "332492596825072258931175643403919293873356074310300986909756758013922603668723388134163901346777725405421051832955997678244815560650",
          "denominator": "349059659720576817452105630083962648173465103956145101358184224134673634596745973423020631043492914856185291427887940446054632951263",
          "decimal": 0.9525380191203804
        }
      }
    },
    "paytable": {
      "basis": "Per active line bet;25 fixed lines",
      "verifiedPublicTable": true,
      "byProviderSymbolId": {
        "0": {},
        "1": {},
        "2": {},
        "3": {
          "3": 10,
          "4": 75,
          "5": 150
        },
        "4": {
          "3": 5,
          "4": 50,
          "5": 125
        },
        "5": {
          "3": 5,
          "4": 25,
          "5": 100
        },
        "6": {
          "3": 5,
          "4": 25,
          "5": 100
        },
        "7": {
          "3": 5,
          "4": 20,
          "5": 75
        },
        "8": {
          "3": 5,
          "4": 20,
          "5": 50
        },
        "9": {
          "3": 5,
          "4": 10,
          "5": 50
        },
        "10": {
          "3": 5,
          "4": 10,
          "5": 50
        },
        "11": {
          "3": 5,
          "4": 10,
          "5": 50
        },
        "12": {},
        "13": {}
      },
      "scatter": {
        "count": 3,
        "totalStakeMultiplier": 2,
        "freeSpins": 5
      },
      "paths": [
        [
          1,
          1,
          1,
          1,
          1
        ],
        [
          0,
          0,
          0,
          0,
          0
        ],
        [
          2,
          2,
          2,
          2,
          2
        ],
        [
          0,
          1,
          2,
          1,
          0
        ],
        [
          2,
          1,
          0,
          1,
          2
        ],
        [
          1,
          0,
          0,
          0,
          1
        ],
        [
          1,
          2,
          2,
          2,
          1
        ],
        [
          0,
          0,
          1,
          2,
          2
        ],
        [
          2,
          2,
          1,
          0,
          0
        ],
        [
          1,
          2,
          1,
          0,
          1
        ],
        [
          1,
          0,
          1,
          2,
          1
        ],
        [
          0,
          1,
          1,
          1,
          0
        ],
        [
          2,
          1,
          1,
          1,
          2
        ],
        [
          0,
          1,
          0,
          1,
          0
        ],
        [
          2,
          1,
          2,
          1,
          2
        ],
        [
          1,
          1,
          0,
          1,
          1
        ],
        [
          1,
          1,
          2,
          1,
          1
        ],
        [
          0,
          0,
          2,
          0,
          0
        ],
        [
          2,
          2,
          0,
          2,
          2
        ],
        [
          0,
          2,
          2,
          2,
          0
        ],
        [
          2,
          0,
          0,
          0,
          2
        ],
        [
          1,
          2,
          0,
          2,
          1
        ],
        [
          1,
          0,
          2,
          0,
          1
        ],
        [
          0,
          2,
          0,
          2,
          0
        ],
        [
          2,
          0,
          2,
          0,
          2
        ]
      ]
    }
  },
  {
    "id": "assassins_native",
    "name": "Assassins",
    "type": "slots",
    "family": "slots",
    "columns": 5,
    "rows": 4,
    "paylines": 30,
    "symbols": [
      {
        "id": "crown",
        "label": "Crown",
        "mark": "\u265B",
        "color": "#f5ce65"
      },
      {
        "id": "chalice",
        "label": "Chalice",
        "mark": "\u265C",
        "color": "#e6bf79"
      },
      {
        "id": "ring",
        "label": "Ring",
        "mark": "\u25CE",
        "color": "#f5d990"
      },
      {
        "id": "hourglass",
        "label": "Hourglass",
        "mark": "\u231B",
        "color": "#8be8f7"
      },
      {
        "id": "ruby",
        "label": "Ruby",
        "mark": "\u25C6",
        "color": "#ff6488"
      },
      {
        "id": "emerald",
        "label": "Emerald",
        "mark": "\u25C6",
        "color": "#49d9a3"
      },
      {
        "id": "sapphire",
        "label": "Sapphire",
        "mark": "\u25C6",
        "color": "#65a7ff"
      },
      {
        "id": "amethyst",
        "label": "Amethyst",
        "mark": "\u25C6",
        "color": "#cc82ff"
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#ffef97"
      },
      {
        "id": "scatter",
        "label": "Temple",
        "mark": "\u03A9",
        "color": "#ffed9b"
      },
      {
        "id": "multiplier",
        "label": "Multiplier",
        "mark": "\xD7",
        "color": "#ffe48a"
      }
    ],
    "theme": {
      "bg": "#111a26",
      "accent": "#e55968",
      "secondary": "#8f92e4"
    },
    "featureDescription": "Unpublished design study: exact official title and reference remain unresolved.",
    "version": "superwin-assassins-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": false,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100
    }
  },
  {
    "id": "towerx_native",
    "name": "Tower X",
    "type": "tower",
    "family": "tower",
    "columns": 1,
    "rows": 8,
    "paylines": 0,
    "symbols": [],
    "theme": {
      "bg": "#101d36",
      "accent": "#ed9bff",
      "secondary": "#66e5f1"
    },
    "featureDescription": "Automatic building sequence: five building types add multipliers. Total stake contains 100 base units; the round ends with the umbrella jump.",
    "version": "superwin-towerx-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)",
      "mode": "atomic",
      "baseUnitsPerStake": 100
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Complete official building presentation, art, animations, audio and controls"
      ]
    },
    "maxWinMultiplier": 50,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Exact discrete expectation, not Monte Carlo.",
      "targetReturn": "Exactly97% before minor-unit rounding.",
      "basis": "E[building sum]=97;total cost100base units; maximumsum5000."
    },
    "paytable": {
      "basis": "Total stake contains100base units; payout=totalStake\xD7buildingSum/100.",
      "verifiedPublicRanges": true,
      "buildingRanges": {
        "suburb": [
          1,
          5
        ],
        "city": [
          6,
          10
        ],
        "green": [
          15,
          40
        ],
        "elite": [
          50,
          90
        ],
        "neon": [
          100,
          1e3
        ]
      },
      "maximumSum": 5e3
    }
  },
  {
    "id": "towerrush_native",
    "name": "Tower Rush",
    "type": "tower",
    "family": "tower",
    "columns": 1,
    "rows": 10,
    "paylines": 0,
    "symbols": [],
    "theme": {
      "bg": "#122738",
      "accent": "#ffd06c",
      "secondary": "#71d8ce"
    },
    "featureDescription": "Build or cash out. Frozen Floor protects the entire current win; no further bonuses after a freeze. Temple wheel has9 multiplier sections plus freeze. Triple Build adds3 automatic floors.",
    "version": "superwin-towerrush-2",
    "controls": {
      "stakeLabel": "Total stake (ETB)"
    },
    "actions": [
      "step",
      "cashout"
    ],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Complete official presentation/audio/controls",
        "Provider1-hour disconnect policy differs from platform30-minute settlement safeguard"
      ]
    },
    "maxWinMultiplier": null,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Analytic optimal-stopping value, tested with integer payouts; independent of provider probabilities.",
      "targetReturn": "97% for an optimal continuation policy before rounding/caps; early collection of a freeze can return less.",
      "basis": "Unfrozen landing odds normalize the exact continuation option value of a full bank. Frozen continuation succeeds with probability1/2 at1.5\xD7; full bank is paid on collapse."
    },
    "paytable": {
      "basis": "Current cashout multiplies by successful floor factors; after freeze a collapse pays the full bank.",
      "verifiedPublicBonusValues": true,
      "templeWheel": [
        1.5,
        1.5,
        2,
        2,
        3,
        3,
        5,
        5,
        7,
        "freeze"
      ],
      "nativeNormalFactor": 1.25,
      "nativePostFreezeFactor": 1.5,
      "nativeTripleAdditionalFactors": [
        1.25,
        1.25,
        1.25
      ]
    }
  },
  {
    "id": "egyptianlegends_native",
    "name": "Egyptian Legends",
    "type": "slots",
    "family": "cascade",
    "columns": 6,
    "rows": 5,
    "paylines": 0,
    "symbols": [
      {
        "id": "ankh",
        "label": "Ankh",
        "mark": "\u2625",
        "color": "#f7d86c",
        "providerSymbolId": 2
      },
      {
        "id": "eyeOfHorus",
        "label": "Eye of Horus",
        "mark": "\u25C9",
        "color": "#71c9e4",
        "providerSymbolId": 3
      },
      {
        "id": "book",
        "label": "Book",
        "mark": "\u25A3",
        "color": "#dfb376",
        "providerSymbolId": 4
      },
      {
        "id": "papyrus",
        "label": "Papyrus",
        "mark": "\u25A4",
        "color": "#e4cc99",
        "providerSymbolId": 5
      },
      {
        "id": "redGem",
        "label": "Red gem",
        "mark": "\u25C6",
        "color": "#f06475",
        "providerSymbolId": 6
      },
      {
        "id": "purpleGem",
        "label": "Purple gem",
        "mark": "\u25C6",
        "color": "#bf8df2",
        "providerSymbolId": 7
      },
      {
        "id": "blueGem",
        "label": "Blue gem",
        "mark": "\u25C6",
        "color": "#77b9ff",
        "providerSymbolId": 8
      },
      {
        "id": "greenGem",
        "label": "Green gem",
        "mark": "\u25C6",
        "color": "#75d8a0",
        "providerSymbolId": 9
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#f4d77b",
        "providerSymbolId": 1
      },
      {
        "id": "scatter",
        "label": "Pyramid Scatter",
        "mark": "\u25B3",
        "color": "#f6df84",
        "providerSymbolId": 10
      },
      {
        "id": "multiplier",
        "label": "Multiplier",
        "mark": "\xD7",
        "color": "#e8cf75",
        "providerSymbolId": 11
      }
    ],
    "theme": {
      "bg": "#251c24",
      "accent": "#edc46a",
      "secondary": "#8fd4df"
    },
    "featureDescription": "6\xD75 pay-anywhere cascades. Crashed symbols unlock Bastet, Sobek, Isis, Anubis and Horus at20/40/60/85/110 points. Bonus10 free spins; verified retriggers add2/3/5/10.",
    "version": "superwin-egyptianlegends-3",
    "controls": {
      "stakeLabel": "Base bet (ETB)",
      "paidModes": [
        {
          "id": "base",
          "label": "Base game",
          "multiplier": 1,
          "baseMinMinor": "10",
          "baseMaxMinor": "10000",
          "totalMinMinor": "10",
          "totalMaxMinor": "10000"
        },
        {
          "id": "bonus-buy",
          "label": "Buy 10 free spins",
          "multiplier": 100,
          "baseMinMinor": "10",
          "baseMaxMinor": "100",
          "totalMinMinor": "1000",
          "totalMaxMinor": "10000"
        },
        {
          "id": "super-bonus",
          "label": "Super Bonus: five feature spins",
          "multiplier": 500,
          "baseMinMinor": "10",
          "baseMaxMinor": "20",
          "totalMinMinor": "5000",
          "totalMaxMinor": "10000"
        },
        {
          "id": "feature",
          "feature": "Bastet",
          "label": "Bastet",
          "multiplier": 10,
          "baseMinMinor": "10",
          "baseMaxMinor": "1000",
          "totalMinMinor": "100",
          "totalMaxMinor": "10000"
        },
        {
          "id": "feature",
          "feature": "Sobek",
          "label": "Sobek",
          "multiplier": 15,
          "baseMinMinor": "10",
          "baseMaxMinor": "666",
          "totalMinMinor": "150",
          "totalMaxMinor": "10000"
        },
        {
          "id": "feature",
          "feature": "Isis",
          "label": "Isis",
          "multiplier": 20,
          "baseMinMinor": "10",
          "baseMaxMinor": "500",
          "totalMinMinor": "200",
          "totalMaxMinor": "10000"
        },
        {
          "id": "feature",
          "feature": "Anubis",
          "label": "Anubis",
          "multiplier": 40,
          "baseMinMinor": "10",
          "baseMaxMinor": "250",
          "totalMinMinor": "400",
          "totalMaxMinor": "10000"
        },
        {
          "id": "feature",
          "feature": "Horus",
          "label": "Horus",
          "multiplier": 50,
          "baseMinMinor": "10",
          "baseMaxMinor": "200",
          "totalMinMinor": "500",
          "totalMaxMinor": "10000"
        }
      ],
      "baseStakeMinMinor": "10",
      "totalStakeMaxMinor": "10000",
      "anteSupported": false
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Exact numeric public symbol paytable",
        "Official presentation/audio and controls",
        "Exact Anubis cell increment and cell-sum scope",
        "Ante probability model and complete in-demo validation of purchased modes"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100,
      "paytableStatus": "Independent review coefficients; exact runtime GetPayTable coefficients are unresolved.",
      "explicitReviewAssumptions": [
        "Anubis adds1 to each involved marked cell; exact increment and sum scope remain unverified.",
        "Feature-generated cascades do not refill the ordinary progress bar during an active power.",
        "Multiplier appearance weights and numeric symbol prizes are independent review values.",
        "Base-game scatter award is unverified and not paid in this disabled prototype.",
        "Super Bonus conditions the displayed board to contain a real paying feature combination; provider probabilities are not inferred.",
        "Super Bonus retrigger/scatter behavior is not verified; this review mode is limited to the five documented fixed-order feature spins."
      ],
      "modeWagerContract": "The submitted stake is the total authorized debit. The server derives an exact minor-unit base bet by dividing by the selected mode cost, and pays wins in base-bet units."
    },
    "paytable": {
      "verifiedPublicTable": false,
      "status": "Unpublished review coefficients; exact official numeric table unresolved.",
      "pointsPerStake": 1e4,
      "capTimesTotalStake": 100
    }
  },
  {
    "id": "olympianlegends_native",
    "name": "Olympian Legends",
    "type": "slots",
    "family": "cascade",
    "columns": 6,
    "rows": 5,
    "paylines": 0,
    "symbols": [
      {
        "id": "majorYellow",
        "label": "Major yellow gem",
        "mark": "\u25C6",
        "color": "#f5d767",
        "providerSymbolId": 2
      },
      {
        "id": "majorRed",
        "label": "Major red gem",
        "mark": "\u25C6",
        "color": "#f47386",
        "providerSymbolId": 3
      },
      {
        "id": "majorBlue",
        "label": "Major blue gem",
        "mark": "\u25C6",
        "color": "#81b5fc",
        "providerSymbolId": 4
      },
      {
        "id": "majorGreen",
        "label": "Major green gem",
        "mark": "\u25C6",
        "color": "#7cdbad",
        "providerSymbolId": 5
      },
      {
        "id": "simpleYellow",
        "label": "Yellow gem",
        "mark": "\u25C6",
        "color": "#d9ba55",
        "providerSymbolId": 6
      },
      {
        "id": "simpleRed",
        "label": "Red gem",
        "mark": "\u25C6",
        "color": "#ce6b79",
        "providerSymbolId": 7
      },
      {
        "id": "simpleBlue",
        "label": "Blue gem",
        "mark": "\u25C6",
        "color": "#70a0d9",
        "providerSymbolId": 8
      },
      {
        "id": "simpleGreen",
        "label": "Green gem",
        "mark": "\u25C6",
        "color": "#67b88e",
        "providerSymbolId": 9
      },
      {
        "id": "wild",
        "label": "Wild",
        "mark": "W",
        "color": "#f2e9a7",
        "providerSymbolId": 1
      },
      {
        "id": "scatter",
        "label": "Scatter",
        "mark": "S",
        "color": "#e8d69c",
        "providerSymbolId": 10
      }
    ],
    "theme": {
      "bg": "#172446",
      "accent": "#f0d898",
      "secondary": "#a3baff"
    },
    "featureDescription": "6\xD75 pay-anywhere cascades. Queued Poseidon, Hecate, Atlas, Hephaestus and Zeus powers unlock at20/40/60/85/110 points. Four or more Scatters award12 free spins.",
    "version": "superwin-olympianlegends-3",
    "controls": {
      "stakeLabel": "Base bet (ETB)",
      "paidModes": [
        {
          "id": "base",
          "label": "Base game",
          "multiplier": 1,
          "baseMinMinor": "10",
          "baseMaxMinor": "10000",
          "totalMinMinor": "10",
          "totalMaxMinor": "10000"
        },
        {
          "id": "bonus-buy",
          "label": "Buy 12 free spins",
          "multiplier": 100,
          "baseMinMinor": "10",
          "baseMaxMinor": "100",
          "totalMinMinor": "1000",
          "totalMaxMinor": "10000"
        }
      ],
      "baseStakeMinMinor": "10",
      "totalStakeMaxMinor": "10000",
      "anteSupported": false
    },
    "actions": [],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Exact numeric public symbol paytable",
        "Official presentation/audio and controls",
        "Exact Atlas block dimensions and scatter/retrigger table",
        "Ante probability model and complete in-demo validation of purchased modes"
      ]
    },
    "maxWinMultiplier": 100,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Previous slot calibration invalidated by public-rule corrections. No97% return claim for these draft slots.",
      "payoutCapTimesTotalStake": 100,
      "paytableStatus": "Independent review coefficients; exact runtime GetPayTable coefficients are unresolved.",
      "explicitReviewAssumptions": [
        "Atlas uses a3\xD73 review rectangle; provider dimensions are unverified.",
        "Free-spin retrigger and scatter payout table remain unavailable.",
        "Feature-generated cascades do not refill the ordinary progress bar during an active power.",
        "Buy bonus and ante bet remain unavailable."
      ],
      "modeWagerContract": "The submitted stake is the total authorized debit. The server derives an exact minor-unit base bet by dividing by the selected mode cost, and pays wins in base-bet units."
    },
    "paytable": {
      "verifiedPublicTable": false,
      "status": "Unpublished review coefficients; exact official numeric table unresolved.",
      "pointsPerStake": 1e4,
      "capTimesTotalStake": 100
    }
  },
  {
    "id": "coinminer_native",
    "name": "Coin Miner",
    "type": "mines",
    "family": "mines",
    "columns": 5,
    "rows": 5,
    "paylines": 0,
    "symbols": [
      {
        "id": "coin",
        "label": "Gold coin",
        "mark": "\u25CF",
        "color": "#f4ce69"
      },
      {
        "id": "mine",
        "label": "Mine",
        "mark": "\u2739",
        "color": "#f16d6d"
      }
    ],
    "theme": {
      "bg": "#132423",
      "accent": "#efca68",
      "secondary": "#76cfc8"
    },
    "featureDescription": "5\xD75 dynamic reveals using the current official94-variant multiplier table. TreasureBoost activates after18 safes for3mines, after1 for5mines, and immediately for7/10/17/20. Rescued picks are marked.",
    "version": "superwin-coinminer-3",
    "controls": {
      "stakeLabel": "Total stake (ETB)",
      "mines": {
        "min": 1,
        "max": 24,
        "default": 3,
        "choices": [
          1,
          2,
          3,
          5,
          7,
          10,
          17,
          20,
          24
        ],
        "values": [
          1,
          2,
          3,
          5,
          7,
          10,
          17,
          20,
          24
        ]
      }
    },
    "actions": [
      "pick",
      "cashout"
    ],
    "launchable": false,
    "officialPrivateMathVerified": false,
    "modelNotice": "Unpublished review model. Verified public rules are cited separately. Complete official presentation, controls and any listed rule/paytable gaps remain unfinished; provider private mathematics are not reproduced.",
    "requestedName": "CoinMin",
    "stakeLimits": {
      "min": "0.10",
      "max": "100.00",
      "maxWin": "10000.00",
      "currency": "ETB"
    },
    "releaseReady": false,
    "readiness": {
      "identityVerified": true,
      "fullDemoParity": false,
      "presentationVerified": false,
      "productionEnabled": false,
      "remaining": [
        "Complete official presentation/audio and controls",
        "Provider exact private rescue probabilities are not verified; independent rule disclosed",
        "Current demo monetary bet limits are injected at startup and remain unverified; ETB limits are explicit platform limits."
      ]
    },
    "maxWinMultiplier": null,
    "math": {
      "kind": "unpublished-review",
      "officialPrivateMathVerified": false,
      "currency": "ETB",
      "moneyUnit": "0.01 ETB",
      "maximumPayoutMinor": "1000000",
      "rounding": "Floor the final payable result to the nearest minor unit; caps can lower return.",
      "calibrationStatus": "Finite table and conditional-probability validation; not provider private RNG.",
      "paytableStatus": "Exact coin_miner_94 displayed table, matching the current official Play Demo link.",
      "targetReturn": "Independent conditional model targets94% on boost steps before rounding/caps; baseline/table rounding can yield up to94.40%.",
      "basis": "Current public94-variant payout table. Baseline combinatorial odds before boost; independent rescue odds normalize near94% without predetermining tile positions. Tile choice cannot alter the distribution.",
      "boostStartAfterSafePicks": {
        "3": 18,
        "5": 1,
        "7": 0,
        "10": 0,
        "17": 0,
        "20": 0
      }
    },
    "paytable": {
      "basis": "Multiply total stake by the entry for successful picks, floor to minor units, then apply platform cap.",
      "verifiedPublicTable": true,
      "providerVariant": "coin_miner_94",
      "rows": [
        {
          "mines": 1,
          "multi": [
            0.98,
            1.02,
            1.07,
            1.12,
            1.18,
            1.24,
            1.31,
            1.38,
            1.47,
            1.57,
            1.68,
            1.81,
            1.96,
            2.14,
            2.35,
            2.61,
            2.94,
            3.36,
            3.92,
            4.7,
            5.88,
            7.83,
            11.75,
            23.5
          ]
        },
        {
          "mines": 2,
          "multi": [
            1.02,
            1.11,
            1.22,
            1.34,
            1.48,
            1.65,
            1.84,
            2.07,
            2.35,
            2.69,
            3.1,
            3.62,
            4.27,
            5.13,
            6.27,
            7.83,
            10.07,
            13.43,
            18.8,
            28.2,
            47,
            94,
            282
          ]
        },
        {
          "mines": 3,
          "multi": [
            1.07,
            1.22,
            1.4,
            1.63,
            1.9,
            2.23,
            2.65,
            3.18,
            3.86,
            4.75,
            5.94,
            7.56,
            9.83,
            13.1,
            18.02,
            25.74,
            38.61,
            61.77,
            102.95,
            187.19,
            374.37,
            985.19
          ]
        },
        {
          "mines": 5,
          "multi": [
            1.18,
            1.45,
            1.81,
            2.27,
            2.87,
            3.65,
            4.69,
            6.05,
            8.06,
            11.04,
            15.34,
            21.6,
            30.86,
            45.38,
            67.74,
            104.21,
            162.83,
            262.63,
            468.98,
            997.82
          ]
        },
        {
          "mines": 7,
          "multi": [
            1.31,
            1.47,
            1.69,
            1.94,
            2.23,
            2.56,
            2.94,
            3.59,
            4.38,
            5.34,
            6.51,
            7.94,
            13.23,
            22.05,
            36.75,
            61.25,
            175.01,
            972.29
          ]
        },
        {
          "mines": 10,
          "multi": [
            1.46,
            2.28,
            3.56,
            5.56,
            8.69,
            13.57,
            21.21,
            33.66,
            53.43,
            84.81,
            134.63,
            213.69,
            339.19,
            538.4,
            997.04
          ]
        },
        {
          "mines": 17,
          "multi": [
            1.71,
            3.42,
            7.6,
            17.67,
            43.09,
            105.09,
            284.02,
            979.37
          ]
        },
        {
          "mines": 20,
          "multi": [
            2.69,
            8.95,
            29.84,
            99.47,
            994.71
          ]
        },
        {
          "mines": 24,
          "multi": [
            23.5
          ]
        }
      ]
    }
  }
];
var engine = createRemainingEngine(remainingPublicConfigs);
var remainingGames = engine.adapter;
var createRecoveryAdapter = engine.createRecoveryAdapter;
var sampleRawSlot = engine.sampleRawSlot;
var evaluateDraftGrid = engine.evaluateDraftGrid;
var createIsolatedDraftAdapter = engine.createIsolatedDraftAdapter;
var unresolvedDrafts = remainingPublicConfigs.filter((config) => ["darkhorus_native", "assassins_native"].includes(config.id));

// src/coin-frozen/models/coinminer-initial-pick.mjs
var COIN_ID = "coinminer_native";
var COIN_BASE_VERSION = "superwin-coinminer-3";
var COIN_OPERATOR_V1_VERSION = COIN_BASE_VERSION + "-etb1-40000-v1";
var COIN_INITIAL_PICK_VERSION = COIN_OPERATOR_V1_VERSION + "-first-pick-v2";
var COIN_INITIAL_PICK_POLICY = Object.freeze({
  id: "coin-first-confirmed-safe-pick-v2",
  initialCashoutMinor: "0",
  firstConfirmedSafePickRequired: true,
  additionalMinimumMultiplier: "0.00",
  additionalMinimumSource: "Independent operator choice matching the captured client repository default; the provider live server min_cashout setting is unverified.",
  unplayedExpiry: "Return the unused original stake at the unchanged round deadline. This is a local recovery policy, separate from manual cashout.",
  sourceRuntimeSha256: "cf80c61777289229fe02429fe400d7f3360c8609074022d482b1e652ff4750e5"
});
var fail8 = () => {
  throw Object.assign(Error("INVALID_OPERATOR_ROUND_STATE"), { status: 500 });
};
var unopened = (state) => state?.status === "active" && Array.isArray(state.picks) && state.picks.length === 0;
function checkedBase(adapter) {
  if (adapter?.definitions?.[COIN_ID]?.version !== COIN_OPERATOR_V1_VERSION || ["start", "act", "expire", "publicState"].some((key) => typeof adapter[key] !== "function")) throw Error("COIN_INITIAL_PICK_BASE_MISMATCH");
  return adapter;
}
function definitionFor(base) {
  const math = { ...base.math, version: COIN_INITIAL_PICK_VERSION, initialCashoutPolicy: COIN_INITIAL_PICK_POLICY };
  const rules = [
    ...base.rules ?? [],
    "Before the first confirmed safe pick the cashout value is0.00 ETB and cashout is unavailable.",
    "After a confirmed safe pick this independent operator profile imposes no additional minimum multiplier. The provider server threshold has not been verified.",
    "When an unplayed round expires, its unused original stake is returned under the local recovery policy."
  ];
  const fields = { version: COIN_INITIAL_PICK_VERSION, math, model: math, rules, initialCashoutPolicy: COIN_INITIAL_PICK_POLICY };
  return { ...base, ...fields, publicConfig: { ...base.publicConfig, ...fields } };
}
function legacyState(state) {
  if (!state || state.gameId !== COIN_ID || state.modelVersion !== COIN_INITIAL_PICK_VERSION || !Array.isArray(state.picks)) fail8();
  if (unopened(state) && (state.currentCashoutMinor !== "0" || JSON.stringify(state.actions) !== '["pick"]')) fail8();
  return {
    ...structuredClone(state),
    modelVersion: COIN_OPERATOR_V1_VERSION,
    ...unopened(state) ? { currentCashoutMinor: state.stakeMinor, actions: ["pick", "cashout"] } : {}
  };
}
function currentState(state) {
  return {
    ...state,
    modelVersion: COIN_INITIAL_PICK_VERSION,
    ...unopened(state) ? { currentCashoutMinor: "0", actions: ["pick"] } : {}
  };
}
var currentTransition = (result) => ({ ...result, state: currentState(result.state) });
function legacyCoinOperatorAdapter(adapter) {
  const base = checkedBase(adapter);
  return Object.freeze({
    definitions: Object.freeze({ [COIN_ID]: base.definitions[COIN_ID] }),
    start: base.start.bind(base),
    act: base.act.bind(base),
    expire: base.expire.bind(base),
    publicState: base.publicState.bind(base)
  });
}
function withCoinInitialPick(adapter) {
  const base = checkedBase(adapter);
  return {
    ...base,
    definitions: { ...base.definitions, [COIN_ID]: definitionFor(base.definitions[COIN_ID]) },
    start(id, options, rng, now) {
      const result = base.start(id, options, rng, now);
      return id === COIN_ID ? currentTransition(result) : result;
    },
    act(state, input, rng, now) {
      if (state?.gameId !== COIN_ID) return base.act(state, input, rng, now);
      const previous = legacyState(state);
      if (unopened(state) && input?.type === "cashout") throw Object.assign(Error("CASHOUT_REQUIRES_CONFIRMED_PICK"), { status: 409 });
      return currentTransition(base.act(previous, input, rng, now));
    },
    expire(state, rng, now) {
      if (state?.gameId !== COIN_ID) return base.expire(state, rng, now);
      return currentTransition(base.expire(legacyState(state), rng, now));
    },
    publicState(state, now) {
      if (state?.gameId !== COIN_ID) return base.publicState(state, now);
      const view = currentState(base.publicState(legacyState(state), now));
      return unopened(state) ? { ...view, multiplier: "0.00" } : view;
    }
  };
}

// src/coin-frozen/models/towerrush-disconnect.mjs
var TOWER_RUSH_ID = "towerrush_native";
var TOWER_RUSH_BASE_VERSION = "superwin-towerrush-2";
var TOWER_RUSH_OPERATOR_V1_VERSION = TOWER_RUSH_BASE_VERSION + "-etb1-40000-v1";
var TOWER_RUSH_DISCONNECT_VERSION = TOWER_RUSH_OPERATOR_V1_VERSION + "-disconnect-v2";
var TOWER_RUSH_DISCONNECT_MS = 60 * 60 * 1e3;
var TOWER_RUSH_DISCONNECT_POLICY = Object.freeze({
  id: "towerrush-server-presence-60m-v2",
  timeoutMs: TOWER_RUSH_DISCONNECT_MS,
  trigger: "Absence of authenticated state refreshes or accepted actions, measured by the server.",
  source: "references/book-tower-coin-runtime.json#/towerRush/facts/disconnectionTimeoutMinutes",
  sourceMeaning: "The public rule specifies a 60-minute disconnection timeout, not a maximum round duration.",
  detection: "The existing client refreshes active state about every two seconds while visible. The latest authenticated server observation is the local inactivity anchor; the provider detection cadence is not claimed.",
  settlement: "Collect the already-earned amount, or return the unused original stake when no floor was built. This retains the prior local recovery settlement rule."
});
var fail9 = (message = "INVALID_OPERATOR_ROUND_STATE", status = 500) => {
  throw Object.assign(Error(message), { status });
};
var copy = (value) => structuredClone(value);
function time2(now) {
  if (!Number.isSafeInteger(now) || now < 0 || now > Number.MAX_SAFE_INTEGER - TOWER_RUSH_DISCONNECT_MS) fail9("INVALID_ENGINE_TIME");
  return now;
}
function checkedBase2(adapter) {
  if (adapter?.definitions?.[TOWER_RUSH_ID]?.version !== TOWER_RUSH_OPERATOR_V1_VERSION || ["start", "act", "expire", "publicState"].some((key) => typeof adapter[key] !== "function")) fail9("TOWER_RUSH_DISCONNECT_BASE_MISMATCH");
  return adapter;
}
function definitionFor2(base) {
  const math = { ...base.math, version: TOWER_RUSH_DISCONNECT_VERSION, disconnectPolicy: TOWER_RUSH_DISCONNECT_POLICY };
  const readiness = { ...base.publicConfig.readiness, remaining: (base.publicConfig.readiness?.remaining ?? []).filter((item) => item !== "Provider1-hour disconnect policy differs from platform30-minute settlement safeguard") };
  const fields = {
    version: TOWER_RUSH_DISCONNECT_VERSION,
    math,
    model: math,
    readiness,
    disconnectPolicy: TOWER_RUSH_DISCONNECT_POLICY,
    rules: [
      ...base.rules ?? [],
      "An active round is collected after 60 minutes without authenticated state or action traffic. Continued authenticated presence renews that interval; elapsed time since the bet alone does not end it.",
      "The server measures presence and retains the accepted outcome. Refreshing never draws another floor or changes a wager or payout."
    ]
  };
  return { ...base, ...fields, publicConfig: { ...base.publicConfig, ...fields } };
}
function legacyState2(state, now) {
  time2(now);
  const recovery = state?.disconnectRecovery;
  if (state?.gameId !== TOWER_RUSH_ID || state.modelVersion !== TOWER_RUSH_DISCONNECT_VERSION || recovery?.policyId !== TOWER_RUSH_DISCONNECT_POLICY.id || !Number.isSafeInteger(recovery.lastObservedAt) || recovery.lastObservedAt < 0 || recovery.lastObservedAt > now || state.expiresAt !== recovery.lastObservedAt + TOWER_RUSH_DISCONNECT_MS || state.operatorUnitState?.expiresAt !== state.expiresAt) fail9();
  const result = { ...copy(state), modelVersion: TOWER_RUSH_OPERATOR_V1_VERSION };
  delete result.disconnectRecovery;
  return result;
}
function currentState2(state, lastObservedAt) {
  const expiresAt = lastObservedAt + TOWER_RUSH_DISCONNECT_MS;
  return {
    ...state,
    modelVersion: TOWER_RUSH_DISCONNECT_VERSION,
    expiresAt,
    ...state.operatorUnitState ? { operatorUnitState: { ...state.operatorUnitState, expiresAt } } : {},
    disconnectRecovery: { policyId: TOWER_RUSH_DISCONNECT_POLICY.id, lastObservedAt }
  };
}
var currentTransition2 = (result, lastObservedAt) => ({ ...result, state: currentState2(result.state, lastObservedAt) });
function legacyTowerRushOperatorAdapter(adapter) {
  const base = checkedBase2(adapter);
  return Object.freeze({
    definitions: Object.freeze({ [TOWER_RUSH_ID]: base.definitions[TOWER_RUSH_ID] }),
    start: base.start.bind(base),
    act: base.act.bind(base),
    expire: base.expire.bind(base),
    publicState: base.publicState.bind(base)
  });
}
function withTowerRushDisconnect(adapter) {
  const base = checkedBase2(adapter);
  return {
    ...base,
    definitions: { ...base.definitions, [TOWER_RUSH_ID]: definitionFor2(base.definitions[TOWER_RUSH_ID]) },
    start(id, options, rng, now) {
      const result = base.start(id, options, rng, now);
      return id === TOWER_RUSH_ID ? currentTransition2(result, time2(now)) : result;
    },
    act(state, input, rng, now) {
      if (state?.gameId !== TOWER_RUSH_ID) return base.act(state, input, rng, now);
      const previous = legacyState2(state, now);
      const result = base.act(previous, input, rng, now);
      return currentTransition2(result, result.state.status === "active" ? now : state.disconnectRecovery.lastObservedAt);
    },
    expire(state, rng, now) {
      if (state?.gameId !== TOWER_RUSH_ID) return base.expire(state, rng, now);
      const previous = legacyState2(state, now);
      if (state.status === "active" && now < state.expiresAt) fail9("ROUND_NOT_EXPIRED", 409);
      return currentTransition2(base.expire(previous, rng, now), state.disconnectRecovery.lastObservedAt);
    },
    publicState(state, now) {
      if (state?.gameId !== TOWER_RUSH_ID) return base.publicState(state, now);
      return currentState2(base.publicState(legacyState2(state, now), now), state.disconnectRecovery.lastObservedAt);
    },
    // Called only after authentication and while holding the existing user/round
    // transaction lock. It consumes no randomness and changes no financial field.
    observePresence(state, now) {
      const previous = legacyState2(state, now);
      base.publicState(previous, now);
      if (state.status !== "active" || now >= state.expiresAt) fail9("ROUND_NOT_ACTIVE", 409);
      return currentState2(copy(previous), now);
    }
  };
}

// src/coin-frozen/models/remaining-operator-games.mjs
var configs = remainingPublicConfigs.filter((config) => OPERATOR_GAME_IDS2.includes(config.id));
var engine2 = createRemainingEngine(configs, { operatorWagerProfile: OPERATOR_WAGER_PROFILE2 });
var legacy = engine2.createRecoveryAdapter();
var legacyOperatorCoinGames = legacyCoinOperatorAdapter(legacy);
var coinCurrent = withCoinInitialPick(legacy);
var legacyOperatorTowerRushGames = legacyTowerRushOperatorAdapter(coinCurrent);
var operatorRemainingGames = withTowerRushDisconnect(coinCurrent);
var definitions4 = operatorRemainingGames.definitions;
var createIsolatedOperatorAdapter = () => withTowerRushDisconnect(withCoinInitialPick(engine2.createIsolatedDraftAdapter()));
var evaluateDraftGrid2 = engine2.evaluateDraftGrid;

// src/frozen/remaining20/server/remaining20-release-approval.mjs
var TWO_TITLE_IDS = Object.freeze(["multihot100_native", "habeshafortune5_native"]);
var TWO_TITLE_VERSIONS = Object.freeze({
  multihot100_native: "superwin-multihot100-2-etb1-40000-v1",
  habeshafortune5_native: "superwin-habeshafortune5-2-etb1-40000-v1"
});

// src/nine-title-catalog.mjs
var NEW_SEVEN_IDS = Object.freeze([
  "multihotwildways_native",
  "multihot5wild_native",
  "multihot5superwilds_native",
  "multihotdeluxe_native",
  "burningice_native",
  "burningice10_native",
  "burningice40_native"
]);
var NINE_TITLE_IDS = Object.freeze([...TWO_TITLE_IDS, ...NEW_SEVEN_IDS]);
var NINE_TITLE_VERSIONS = Object.freeze({
  ...TWO_TITLE_VERSIONS,
  multihotwildways_native: "superwin-multihotwildways-2-etb1-40000-v1",
  multihot5wild_native: "superwin-multihot5wild-2-etb1-40000-v1",
  multihot5superwilds_native: "superwin-multihot5superwilds-2-etb1-40000-v1",
  multihotdeluxe_native: "superwin-multihotdeluxe-2-etb1-40000-v1",
  burningice_native: "superwin-burningice-2-etb1-40000-v1",
  burningice10_native: "superwin-burningice10-2-etb1-40000-v1",
  burningice40_native: "superwin-burningice40-2-etb1-40000-v1"
});

// src/ten-title-catalog.mjs
var COIN_ID2 = "coinminer_native";
var NEW_COIN_IDS = Object.freeze([COIN_ID2]);
var COIN_VERSION = "superwin-coinminer-3-etb1-40000-v1-first-pick-v2";
var TEN_TITLE_IDS = Object.freeze([...NINE_TITLE_IDS, COIN_ID2]);
var TEN_TITLE_VERSIONS = Object.freeze({ ...NINE_TITLE_VERSIONS, [COIN_ID2]: COIN_VERSION });

// src/ten-title-models.mjs
var coin = createIsolatedOperatorAdapter();
if (coin.definitions[COIN_ID2]?.version !== COIN_VERSION) throw Error("COIN_FROZEN_VERSION_MISMATCH");
var definitions5 = Object.freeze({ ...definitions3, [COIN_ID2]: coin.definitions[COIN_ID2] });
var publicGameConfigs4 = Object.freeze({ ...publicGameConfigs3, [COIN_ID2]: coin.definitions[COIN_ID2].publicConfig });
var evaluateDraftRound2 = (id, ...args) => id === COIN_ID2 ? coin.start(id, ...args) : evaluateDraftRound(id, ...args);
var act2 = (state, ...args) => state?.gameId === COIN_ID2 ? coin.act(state, ...args) : act(state, ...args);
var expire2 = (state, ...args) => state?.gameId === COIN_ID2 ? coin.expire(state, ...args) : expire(state, ...args);
var publicState2 = (state, ...args) => state?.gameId === COIN_ID2 ? coin.publicState(state, ...args) : publicState(state, ...args);

// src/demo-store-ten.mjs
var DEMO_IDS = TEN_TITLE_IDS;
var DEMO_CURRENCY = "CREDITS";
var DEMO_INITIAL_MINOR = "10000000";
var SUBJECT = /^@remaining20-demo:[a-f0-9]{64}$/;
var UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
var fail10 = (message, status = 422) => {
  throw Object.assign(Error(message), { status });
};
var digest = (value) => createHash("sha256").update(value).digest("hex");
var object3 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var canonical = (value) => Array.isArray(value) ? value.map(canonical) : object3(value) ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
var cash = (value) => {
  const n = BigInt(value);
  return `${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
};
var seededRandom = (seed, domain) => {
  let counter = 0;
  return () => {
    const bytes = createHmac("sha256", seed).update(domain + ":" + counter++).digest();
    return Number(bytes.readBigUInt64BE() & (1n << 53n) - 1n) / 2 ** 53;
  };
};
function demoGameConfig(source) {
  if (!DEMO_IDS.includes(source?.id) || source.version !== TEN_TITLE_VERSIONS[source.id]) fail10("DEMO_GAME_NOT_AVAILABLE", 404);
  return {
    ...structuredClone(source),
    launchable: true,
    published: false,
    demo: true,
    demoCreditsOnly: true,
    currency: DEMO_CURRENCY,
    currencyAdaptation: {
      ...structuredClone(source.currencyAdaptation || {}),
      currency: DEMO_CURRENCY,
      productionLaunchable: false,
      method: "Noncash demo credits only. The exact operator wager amounts and coefficient model are shown without any connection to a real account or currency balance."
    }
  };
}
function createRemainingDemoStore({
  canonicalMethods: canonicalMethods2,
  now = Date.now,
  seed = () => randomBytes(32).toString("hex"),
  id = randomUUID,
  ttlMs = 60 * 60 * 1e3,
  maxSessions = 64,
  maxRequests = 256,
  maxRounds = 128,
  sessionMap = /* @__PURE__ */ new Map(),
  newSevenStartsEnabled = true,
  newCoinStartsEnabled = true
} = {}) {
  if (typeof newCoinStartsEnabled !== "boolean" || typeof newSevenStartsEnabled !== "boolean" || ["validate", "transition", "view"].some((name) => typeof canonicalMethods2?.[name] !== "function") || ![ttlMs, maxSessions, maxRequests, maxRounds].every((value) => Number.isSafeInteger(value) && value > 0)) throw Error("INVALID_DEMO_STORE_CONFIGURATION");
  const definitions6 = Object.fromEntries(DEMO_IDS.map((gameId) => {
    const publicConfig2 = demoGameConfig(publicGameConfigs4[gameId]);
    return [gameId, { ...demoGameConfig(definitions5[gameId]), publicConfig: publicConfig2 }];
  }));
  const registry = { get(gameId, version) {
    if (!DEMO_IDS.includes(gameId)) fail10("DEMO_GAME_NOT_AVAILABLE", 404);
    if (version !== void 0 && version !== TEN_TITLE_VERSIONS[gameId]) fail10("GAME_MODEL_UNAVAILABLE", 409);
    return { id: gameId, version: TEN_TITLE_VERSIONS[gameId], definition: definitions6[gameId], adapter: ten_title_models_exports };
  } };
  const pureContext = Object.freeze({ registry }), sessions = sessionMap;
  const view = (row, at) => canonicalMethods2.view.call(pureContext, row, at);
  const transition2 = (model, result, options) => canonicalMethods2.transition.call(pureContext, model, result, options);
  function checkedSubject(subject) {
    if (!SUBJECT.test(subject || "")) fail10("UNAUTHORIZED", 401);
  }
  function trim(at) {
    for (const [key, value] of sessions) if (value.expiresAt <= at) sessions.delete(key);
  }
  function get(subject, { create = false, sessionId, at = now() } = {}) {
    checkedSubject(subject);
    trim(at);
    let value = sessions.get(subject);
    if (!value && create) {
      if (sessions.size >= maxSessions) fail10("DEMO_CAPACITY_REACHED", 429);
      const nextId = id();
      if (!UUID.test(nextId)) fail10("INVALID_DEMO_SESSION_ID", 500);
      value = { sessionId: nextId, expiresAt: at + ttlMs, balance: BigInt(DEMO_INITIAL_MINOR), rounds: /* @__PURE__ */ new Map(), requests: /* @__PURE__ */ new Map() };
      sessions.set(subject, value);
    }
    if (!value || sessionId !== void 0 && sessionId !== value.sessionId) fail10("DEMO_SESSION_CHANGED", 409);
    return value;
  }
  function apply(record, row, next, version, at) {
    if (record.balance < next.debit) fail10("INSUFFICIENT_FUNDS", 409);
    record.balance -= next.debit;
    if (next.payout !== null) record.balance += next.payout;
    const updated = {
      ...row,
      state: next.state,
      status: next.state.status,
      version,
      liability: String(next.liability),
      total_stake: next.state.stakeMinor,
      expires_at: next.state.expiresAt,
      ...next.state.status === "settled" ? { settled_at: at } : {}
    };
    record.rounds.set(updated.id, updated);
    return updated;
  }
  function expire3(record, at) {
    const row = [...record.rounds.values()].find((value) => value.status === "active");
    if (!row || row.expires_at > at) return;
    const model = registry.get(row.game_id, row.model_version), version = row.version + 1;
    const next = transition2(model, expire2(structuredClone(row.state), seededRandom(row.secret_seed, row.id + ":" + version), at), { prior: row, now: at });
    if (next.debit !== 0n || next.state.status !== "settled" || next.liability > BigInt(row.liability)) fail10("INVALID_EXPIRY_RESULT", 500);
    apply(record, row, next, version, at);
  }
  function snapshot(record, gameId, at) {
    const model = registry.get(gameId), rows = [...record.rounds.values()], active = rows.find((row) => row.status === "active");
    const latest = rows.filter((row) => row.game_id === gameId).at(-1);
    return {
      demo: true,
      demoCreditsOnly: true,
      authenticated: true,
      sessionId: record.sessionId,
      sessionExpiresAt: record.expiresAt,
      storage: "durable-demo-sqlite",
      resetNotice: "Demo credits and history survive reloads and restarts, and reset when this one-hour demo session expires.",
      game: structuredClone(model.definition),
      game_id: gameId,
      model_version: model.version,
      accepting: (gameId !== COIN_ID2 || newCoinStartsEnabled && record.requests.size + 1 < maxRequests) && (!NEW_SEVEN_IDS.includes(gameId) || newSevenStartsEnabled) && record.requests.size < maxRequests && record.rounds.size < maxRounds,
      balance: cash(record.balance),
      currency: DEMO_CURRENCY,
      server_now: at,
      round: latest ? view(latest, at) : null,
      other_active_game: active && active.game_id !== gameId ? active.game_id : null
    };
  }
  return Object.freeze({
    state(subject, gameId) {
      registry.get(gameId);
      const at = now(), record = structuredClone(get(subject, { create: true, at }));
      expire3(record, at);
      const result = snapshot(record, gameId, at);
      sessions.set(subject, record);
      return result;
    },
    action(subject, body, sessionId) {
      canonicalMethods2.validate.call(pureContext, body);
      registry.get(body.game_id);
      if (!UUID.test(sessionId || "")) fail10("DEMO_SESSION_CHANGED", 409);
      const at = now(), record = structuredClone(get(subject, { sessionId, at }));
      const requestHash = digest(JSON.stringify(canonical(body))), receipt = record.requests.get(body.request_id);
      if (receipt) {
        if (receipt.hash !== requestHash) fail10("REQUEST_ID_CONFLICT", 409);
        return { ...structuredClone(receipt.result), replayed: true, current_balance: cash(record.balance) };
      }
      if (body.type === "start" && body.game_id === COIN_ID2 && !newCoinStartsEnabled) fail10("DEMO_NEW_ROUNDS_DISABLED", 409);
      if (body.type === "start" && body.game_id === COIN_ID2 && record.requests.size + 1 >= maxRequests) fail10("DEMO_SESSION_LIMIT", 429);
      if (body.type === "start" && NEW_SEVEN_IDS.includes(body.game_id) && !newSevenStartsEnabled) fail10("DEMO_NEW_ROUNDS_DISABLED", 409);
      const collecting = body.type === "action" && (body.action === "collect" || body.game_id === COIN_ID2 && body.action === "cashout") && record.rounds.get(body.round_id)?.status === "active";
      if (record.requests.size >= maxRequests && !(record.requests.size === maxRequests && collecting)) fail10("DEMO_SESSION_LIMIT", 429);
      let row;
      if (body.type === "start") {
        const model = registry.get(body.game_id);
        if (body.model_version !== model.version) fail10("GAME_RULES_UPDATED_RELOAD", 409);
        expire3(record, at);
        const active = [...record.rounds.values()].find((value) => value.status === "active");
        if (active) fail10("FINISH_ACTIVE_ROUND:" + active.game_id, 409);
        if (record.rounds.size >= maxRounds) fail10("DEMO_SESSION_LIMIT", 429);
        const debit = BigInt(body.stake.replace(".", ""));
        if (record.balance < debit) fail10("INSUFFICIENT_FUNDS", 409);
        const roundId = id(), secretSeed = seed();
        if (!UUID.test(roundId) || record.rounds.has(roundId) || !/^[a-f0-9]{64}$/.test(secretSeed)) fail10("INVALID_SERVER_SEED", 500);
        const next = transition2(model, evaluateDraftRound2(model.id, { ...body.options ?? {}, stakeMinor: String(debit) }, seededRandom(secretSeed, roundId + ":0"), at), { debitExpected: debit, now: at });
        row = { id: roundId, game_id: model.id, model_version: model.version, secret_seed: secretSeed, commitment: digest(secretSeed), created_at: at };
        row = apply(record, row, next, 0, at);
      } else {
        row = record.rounds.get(body.round_id);
        if (!row || row.game_id !== body.game_id) fail10("ROUND_NOT_FOUND", 404);
        if (body.model_version !== row.model_version) fail10("GAME_RULES_UPDATED_RELOAD", 409);
        if (row.status !== "active") fail10("ROUND_ALREADY_SETTLED", 409);
        if (row.version !== body.expected_version) fail10("ROUND_VERSION_CHANGED", 409);
        expire3(record, at);
        row = record.rounds.get(row.id);
        if (row.status === "active") {
          const model = registry.get(row.game_id, row.model_version), version = row.version + 1;
          const next = transition2(model, act2(structuredClone(row.state), { ...body.input ?? {}, type: body.action }, seededRandom(row.secret_seed, row.id + ":" + version), at), { prior: row, now: at });
          if (next.debit !== 0n || next.liability > BigInt(row.liability)) fail10("INVALID_DEMO_ACTION_RESULT", 500);
          row = apply(record, row, next, version, at);
        }
      }
      const result = { status: "SUCCESS", request_id: body.request_id, ...snapshot(record, body.game_id, at), round: view(row, at) };
      result.accepting = (body.game_id !== COIN_ID2 || newCoinStartsEnabled && record.requests.size + 2 < maxRequests) && (!NEW_SEVEN_IDS.includes(body.game_id) || newSevenStartsEnabled) && record.requests.size + 1 < maxRequests && record.rounds.size < maxRounds;
      record.requests.set(body.request_id, { hash: requestHash, result: structuredClone(result) });
      sessions.set(subject, record);
      return result;
    },
    history(subject, gameId, sort = "recent") {
      registry.get(gameId);
      if (!["recent", "wins"].includes(sort)) fail10("INVALID_HISTORY_QUERY");
      const at = now(), record = structuredClone(get(subject, { at }));
      expire3(record, at);
      const rows = [...record.rounds.values()].filter((row) => row.game_id === gameId && row.status === "settled").sort((a, b) => {
        if (sort === "wins") {
          const difference = BigInt(b.state.payoutMinor) - BigInt(a.state.payoutMinor);
          if (difference !== 0n) return difference > 0n ? 1 : -1;
        }
        return b.created_at - a.created_at || b.id.localeCompare(a.id);
      }).slice(0, 50).map((row) => ({ createdAt: row.created_at, settledAt: row.settled_at, round: view(row, at) }));
      sessions.set(subject, record);
      return { demo: true, demoCreditsOnly: true, authenticated: true, sessionId: record.sessionId, game_id: gameId, currency: DEMO_CURRENCY, sort, rows };
    }
  });
}

// src/canonical-r4.mjs
import { Buffer as Buffer2 } from "node:buffer";
import { createHash as createHash2 } from "node:crypto";
var fail11 = (code, status = 422) => {
  throw Object.assign(new Error(code), { status });
};
var json = (value) => JSON.stringify(value);
var parse = (value) => typeof value === "string" ? JSON.parse(value) : value;
var uuid = (value) => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
var object4 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function minor(value) {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,14})$/.test(value)) fail11("INVALID_ENGINE_MONEY", 500);
  return BigInt(value);
}
function stake(value) {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,10})\.\d{2}$/.test(value) || BigInt(value.replace(".", "")) === 0n) fail11("INVALID_STAKE");
  return BigInt(value.replace(".", ""));
}
var canonicalMethods = {
  validate(body) {
    if (!object4(body) || Object.keys(body).some((k) => !["request_id", "type", "game_id", "model_version", "stake", "options", "round_id", "expected_version", "action", "input"].includes(k)) || !uuid(body.request_id) || !["start", "action"].includes(body.type) || typeof body.game_id !== "string" || typeof body.model_version !== "string") fail11("INVALID_LIBRARY_REQUEST");
    if (body.type === "start") {
      if (["round_id", "expected_version", "action", "input"].some((k) => body[k] !== void 0) || !object4(body.options ?? {})) fail11("INVALID_LIBRARY_REQUEST");
      stake(body.stake);
      if (Object.keys(body.options ?? {}).some((k) => ["stakeMinor", "gameId", "status", "payoutMinor", "maxPayoutMinor", "expiresAt", "modelVersion"].includes(k))) fail11("INVALID_LIBRARY_OPTIONS");
    } else if (["stake", "options"].some((k) => body[k] !== void 0) || !uuid(body.round_id) || !Number.isSafeInteger(body.expected_version) || body.expected_version < 0 || typeof body.action !== "string" || !object4(body.input ?? {}) || Object.hasOwn(body.input ?? {}, "type")) fail11("INVALID_LIBRARY_REQUEST");
  },
  transition(model, result, { prior = null, debitExpected = null, now } = {}) {
    if (!object4(result) || !object4(result.state)) fail11("INVALID_ENGINE_RESULT", 500);
    const state = result.state, debit = minor(result.debitMinor), liability = minor(result.maxPayoutMinor);
    if (!["active", "settled"].includes(state.status) || state.gameId !== model.id || minor(state.stakeMinor) !== (prior ? BigInt(prior.total_stake) : 0n) + debit || !Number.isSafeInteger(state.expiresAt) || state.expiresAt < 0) fail11("INVALID_ENGINE_STATE", 500);
    if (debitExpected !== null && debit !== debitExpected) fail11("ENGINE_STAKE_MISMATCH", 500);
    const payout = state.status === "settled" ? minor(result.payoutMinor) : null;
    if (state.status === "active" && (result.payoutMinor !== null || state.expiresAt <= now)) fail11("INVALID_ACTIVE_ENGINE_STATE", 500);
    if (payout !== null && (payout > liability || state.payoutMinor !== result.payoutMinor)) fail11("PAYOUT_EXCEEDS_RESERVED_LIABILITY", 500);
    if (Buffer2.byteLength(json(state)) > 128 * 1024) fail11("ENGINE_STATE_TOO_LARGE", 500);
    return { state, debit, liability, payout };
  },
  view(row, now) {
    const model = this.registry.get(row.game_id, row.model_version), state = parse(row.state), view = model.adapter.publicState(structuredClone(state), now);
    if (!object4(view)) fail11("INVALID_ENGINE_PUBLIC_STATE", 500);
    return { ...view, round_id: row.id, game_id: row.game_id, model_version: row.model_version, status: row.status, version: Number(row.version), stakeMinor: String(row.total_stake), commitment: row.commitment, ...row.status === "settled" ? { revealed_seed: row.secret_seed } : {} };
  }
};

// src/credits-storage.mjs
import { createHash as createHash3 } from "node:crypto";
var encoder = new TextEncoder();
var decoder = new TextDecoder("utf-8", { fatal: true });
var SUBJECT2 = /^@remaining20-demo:[a-f0-9]{64}$/;
var MAX_BYTES = 16 * 1024 * 1024;
var CHUNK_BYTES = 32768;
var sha = (bytes) => createHash3("sha256").update(bytes).digest("hex");
var encode = (value) => encoder.encode(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? { $creditsType: "bigint", value: String(item) } : item instanceof Map ? { $creditsType: "map", value: [...item] } : item));
var decode = (bytes) => JSON.parse(decoder.decode(bytes), (_key, item) => {
  if (item && typeof item === "object" && !Array.isArray(item) && Object.keys(item).length === 2) {
    if (item.$creditsType === "bigint" && typeof item.value === "string" && /^(0|[1-9]\d*)$/.test(item.value)) return BigInt(item.value);
    if (item.$creditsType === "map" && Array.isArray(item.value)) return new Map(item.value);
  }
  return item;
});
var CreditsSessionMap = class {
  constructor(storage) {
    this.sql = storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS credits_session(singleton INTEGER PRIMARY KEY CHECK(singleton=1),subject TEXT NOT NULL,expires_at INTEGER NOT NULL,bytes INTEGER NOT NULL,sha256 TEXT NOT NULL); CREATE TABLE IF NOT EXISTS credits_chunks(piece INTEGER PRIMARY KEY,data BLOB NOT NULL)");
  }
  get size() {
    return this.sql.exec("SELECT COUNT(*) AS count FROM credits_session").one().count;
  }
  metadata() {
    return this.sql.exec("SELECT subject,expires_at,bytes,sha256 FROM credits_session WHERE singleton=1").toArray()[0] ?? null;
  }
  get(subject) {
    const meta = this.metadata();
    if (!meta || meta.subject !== subject) return void 0;
    if (!SUBJECT2.test(meta.subject) || !Number.isSafeInteger(meta.bytes) || meta.bytes < 1 || meta.bytes > MAX_BYTES) throw Error("DEMO_STORAGE_INVALID");
    const bytes = new Uint8Array(meta.bytes);
    let at = 0, index = 0;
    for (const row of this.sql.exec("SELECT piece,data FROM credits_chunks ORDER BY piece")) {
      if (row.piece !== index++) throw Error("DEMO_STORAGE_INVALID");
      const part = new Uint8Array(row.data);
      if (part.byteLength > CHUNK_BYTES || at + part.byteLength > bytes.byteLength) throw Error("DEMO_STORAGE_INVALID");
      bytes.set(part, at);
      at += part.byteLength;
    }
    if (at !== bytes.byteLength || sha(bytes) !== meta.sha256) throw Error("DEMO_STORAGE_INVALID");
    const value = decode(bytes);
    if (!value || !(value.rounds instanceof Map) || !(value.requests instanceof Map) || typeof value.balance !== "bigint" || value.expiresAt !== meta.expires_at) throw Error("DEMO_STORAGE_INVALID");
    return value;
  }
  set(subject, value) {
    if (!SUBJECT2.test(subject) || !Number.isSafeInteger(value?.expiresAt) || value.expiresAt < 0) throw Error("DEMO_STORAGE_INVALID");
    const prior = this.metadata();
    if (prior && prior.subject !== subject) throw Error("DEMO_STORAGE_SUBJECT_CONFLICT");
    const bytes = encode(value);
    if (bytes.byteLength > MAX_BYTES) throw Object.assign(Error("DEMO_STORAGE_LIMIT"), { status: 429 });
    this.sql.exec("DELETE FROM credits_chunks");
    for (let offset = 0, piece = 0; offset < bytes.byteLength; offset += CHUNK_BYTES, piece++) this.sql.exec("INSERT INTO credits_chunks(piece,data) VALUES(?,?)", piece, bytes.slice(offset, offset + CHUNK_BYTES).buffer);
    this.sql.exec("INSERT OR REPLACE INTO credits_session(singleton,subject,expires_at,bytes,sha256) VALUES(1,?,?,?,?)", subject, value.expiresAt, bytes.byteLength, sha(bytes));
    return this;
  }
  delete(subject) {
    if (this.metadata()?.subject !== subject) return false;
    this.sql.exec("DELETE FROM credits_chunks; DELETE FROM credits_session");
    return true;
  }
  *[Symbol.iterator]() {
    const meta = this.metadata();
    if (meta) yield [meta.subject, this.get(meta.subject)];
  }
};

// src/credits-object-ten.mjs
var SUBJECT3 = /^@remaining20-demo:[a-f0-9]{64}$/;
var IDS = new Set(TEN_TITLE_IDS);
var NEW_COIN_STARTS_ENABLED = true;
var Remaining20CreditsDemoR4 = class extends DurableObject {
  #store;
  #sessions;
  constructor(ctx, env) {
    super(ctx, {});
    ctx.blockConcurrencyWhile(async () => {
      this.#sessions = new CreditsSessionMap(ctx.storage);
      this.#store = createRemainingDemoStore({ canonicalMethods, sessionMap: this.#sessions, maxSessions: 1, newCoinStartsEnabled: NEW_COIN_STARTS_ENABLED });
    });
  }
  async request(input) {
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((k) => !["operation", "subject", "gameId", "body", "sessionId", "sort"].includes(k)) || !SUBJECT3.test(input.subject || "") || !["state", "action", "history"].includes(input.operation)) return { status: 422, body: { error: "INVALID_DEMO_REQUEST" } };
    const gameId = input.operation === "action" ? input.body?.game_id : input.gameId;
    if (!IDS.has(gameId)) return { status: 404, body: { error: "DEMO_GAME_NOT_AVAILABLE" } };
    try {
      const body = this.ctx.storage.transactionSync(() => input.operation === "state" ? this.#store.state(input.subject, gameId) : input.operation === "history" ? this.#store.history(input.subject, gameId, input.sort || "recent") : this.#store.action(input.subject, input.body, input.sessionId));
      const expiry = this.#sessions.metadata()?.expires_at;
      if (Number.isSafeInteger(expiry)) await this.ctx.storage.setAlarm(Math.max(Date.now() + 1, expiry));
      return { status: 200, body };
    } catch (error) {
      if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) return { status: error.status, body: { error: error.message } };
      console.error(JSON.stringify({ event: "remaining20_credits_do_failed", code: "INTERNAL_ERROR" }));
      return { status: 503, body: { error: "RETRY_SAME_REQUEST" } };
    }
  }
  async alarm() {
    this.ctx.storage.transactionSync(() => {
      const meta = this.#sessions.metadata();
      if (meta && meta.expires_at <= Date.now()) this.#sessions.delete(meta.subject);
    });
  }
};
export {
  Remaining20CreditsDemoR4
};
