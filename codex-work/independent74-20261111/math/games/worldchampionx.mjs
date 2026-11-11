export default {
  "id": "ind74_worldchampionx",
  "title": "World Champion X — Independent",
  "catalogName": "World Champion X",
  "sourceCategory": "Crash Games",
  "mathVersion": "independent-worldchampionx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 7",
    "colors": [
      "#9602ba",
      "#5a533f",
      "#311c18"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "5000000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/world-champion-x",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "crash",
  "model": "clock-crash-v1",
  "ticketCount": 1000000,
  "returnBps": 9640,
  "maxMultiplierBps": 500000,
  "growthBpsPerSecond": 1386,
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
      "multiplierBps": 500000
    }
  ],
  "nominalReturn": {
    "numerator": "9640",
    "denominator": "10000",
    "type": "upper-bound-before-floor",
    "proof": "AtBPSmultiplierM,survival=floor(9640×1000000/(M+1))/1000000.Exactreturnequals survival×floor(bet×M/10000)/bet."
  }
};
