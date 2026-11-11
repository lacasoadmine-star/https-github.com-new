export default {
  "id": "ind74_carx",
  "title": "CarX — Independent",
  "catalogName": "CarX",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-carx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 28",
    "colors": [
      "#266ac4",
      "#dc5948",
      "#cd8347"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "11000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/carx",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1000000,
  "returnBps": 9640,
  "maxMultiplierBps": 1100000,
  "growthBpsPerSecond": 2037,
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
      "multiplierBps": 1100000
    }
  ],
  "nominalReturn": {
    "numerator": "9640",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9640×1000000/(M+1))/1000000.Exactreturnequals survival×floor(bet×M/10000)/bet."
  }
};
