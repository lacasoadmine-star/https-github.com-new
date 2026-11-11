export default {
  "id": "ind74_wheelofdestiny",
  "title": "Wheel Of Destiny — Independent",
  "catalogName": "Wheel Of Destiny",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-wheelofdestiny-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Aurora Garden 49",
    "colors": [
      "#872a5e",
      "#324a1a",
      "#d0c640"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "5148000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/wheel-of-destiny",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "wheel",
  "model": "weighted-wheel-v1",
  "sectors": [
    {
      "id": "sector-0",
      "label": "Cloud",
      "weight": 40,
      "multiplierBps": 0
    },
    {
      "id": "sector-1",
      "label": "Mist",
      "weight": 25,
      "multiplierBps": 0
    },
    {
      "id": "sector-2",
      "label": "Rest",
      "weight": 15,
      "multiplierBps": 0
    },
    {
      "id": "sector-3",
      "label": "Spark",
      "weight": 10,
      "multiplierBps": 10000
    },
    {
      "id": "sector-4",
      "label": "Pair",
      "weight": 5,
      "multiplierBps": 20000
    },
    {
      "id": "sector-5",
      "label": "Glow",
      "weight": 3,
      "multiplierBps": 44800
    },
    {
      "id": "sector-6",
      "label": "Prism",
      "weight": 1,
      "multiplierBps": 104800
    },
    {
      "id": "sector-7",
      "label": "Crown",
      "weight": 1,
      "multiplierBps": 514800
    }
  ],
  "rules": [
    "This original eight-sector weighted wheel settles when Play is pressed.",
    "Each sector's probability is its published weight divided by 100. Its multiplier gives the total payout, including the stake.",
    "Zero sectors lose. Nonzero prizes round down to whole minor units."
  ],
  "paytable": [
    {
      "id": "sector-0",
      "label": "Cloud",
      "weight": 40,
      "multiplierBps": 0
    },
    {
      "id": "sector-1",
      "label": "Mist",
      "weight": 25,
      "multiplierBps": 0
    },
    {
      "id": "sector-2",
      "label": "Rest",
      "weight": 15,
      "multiplierBps": 0
    },
    {
      "id": "sector-3",
      "label": "Spark",
      "weight": 10,
      "multiplierBps": 10000
    },
    {
      "id": "sector-4",
      "label": "Pair",
      "weight": 5,
      "multiplierBps": 20000
    },
    {
      "id": "sector-5",
      "label": "Glow",
      "weight": 3,
      "multiplierBps": 44800
    },
    {
      "id": "sector-6",
      "label": "Prism",
      "weight": 1,
      "multiplierBps": 104800
    },
    {
      "id": "sector-7",
      "label": "Crown",
      "weight": 1,
      "multiplierBps": 514800
    }
  ],
  "nominalReturn": {
    "numerator": "954000",
    "denominator": "1000000",
    "type": "before-integer-floor",
    "proof": "Sum(weight×multiplierBps)/(100×10000).Exactbet-dependentreturn uses flooredsectorpayouts."
  }
};
