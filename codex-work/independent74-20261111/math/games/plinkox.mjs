export default {
  "id": "ind74_plinkox",
  "title": "Plinko X — Independent",
  "catalogName": "Plinko X",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-plinkox-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 34",
    "colors": [
      "#b6fd35",
      "#bf648f",
      "#f13425"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "5250000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/plinkox",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "plinko",
  "model": "binomial-plinko-v1",
  "rows": 10,
  "bucketMultipliersBps": [
    525000,
    11200,
    9800,
    8800,
    8200,
    8000,
    8200,
    8800,
    9800,
    11200,
    525000
  ],
  "rules": [
    "This original 10-row path independently turns left or right with probability one half at each peg.",
    "The bucket index equals the number of right turns. Bucket k has probability C(rows,k) divided by 2 raised to rows.",
    "The published bucket multiplier gives the total payout. Prizes round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "Bucket 0",
      "multiplierBps": 525000,
      "probabilityNumerator": "1",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 1",
      "multiplierBps": 11200,
      "probabilityNumerator": "10",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 2",
      "multiplierBps": 9800,
      "probabilityNumerator": "45",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 3",
      "multiplierBps": 8800,
      "probabilityNumerator": "120",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 4",
      "multiplierBps": 8200,
      "probabilityNumerator": "210",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 5",
      "multiplierBps": 8000,
      "probabilityNumerator": "252",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 6",
      "multiplierBps": 8200,
      "probabilityNumerator": "210",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 7",
      "multiplierBps": 8800,
      "probabilityNumerator": "120",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 8",
      "multiplierBps": 9800,
      "probabilityNumerator": "45",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 9",
      "multiplierBps": 11200,
      "probabilityNumerator": "10",
      "probabilityDenominator": "1024"
    },
    {
      "label": "Bucket 10",
      "multiplierBps": 525000,
      "probabilityNumerator": "1",
      "probabilityDenominator": "1024"
    }
  ],
  "nominalReturn": {
    "numerator": "9728000",
    "denominator": "10240000",
    "type": "before-integer-floor",
    "proof": "Sum(C(rows,k)×bucketBps[k])/(2^rows×10000).Exactbetreturn uses integer flooredprizes."
  }
};
