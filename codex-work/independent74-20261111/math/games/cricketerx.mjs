export default {
  "id": "ind74_cricketerx",
  "title": "CricketerX — Independent",
  "catalogName": "CricketerX",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-cricketerx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 48",
    "colors": [
      "#85f9f6",
      "#021606",
      "#dab29c"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "15000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/cricketerx",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1000000,
  "returnBps": 9600,
  "maxMultiplierBps": 1500000,
  "growthBpsPerSecond": 2657,
  "rules": [
    "This original server-clock crash game can lose immediately. Collect before the hidden bust point.",
    "The server clock determines the collection multiplier. Client-supplied payouts or multipliers are ignored.",
    "Surviving the maximum multiplier collects automatically. Payouts round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "First milestone",
      "multiplierBps": 11000
    },
    {
      "label": "Double",
      "multiplierBps": 20000
    },
    {
      "label": "Maximum",
      "multiplierBps": 1500000
    }
  ],
  "nominalReturn": {
    "numerator": "9600",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9600×1000000/(M+1))/1000000.Exactreturnequals survival×floor(bet×M/10000)/bet."
  }
};
