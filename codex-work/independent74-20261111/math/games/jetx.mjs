export default {
  "id": "ind74_jetx",
  "title": "New Era of JetX — Independent",
  "catalogName": "New Era of JetX",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-jetx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 3",
    "colors": [
      "#514950",
      "#12c6f6",
      "#4a84e9"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "9000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/jetx",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1000000,
  "returnBps": 9480,
  "maxMultiplierBps": 900000,
  "growthBpsPerSecond": 1262,
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
      "multiplierBps": 900000
    }
  ],
  "nominalReturn": {
    "numerator": "9480",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9480×1000000/(M+1))/1000000.Exactreturnequals survival×floor(bet×M/10000)/bet."
  }
};
