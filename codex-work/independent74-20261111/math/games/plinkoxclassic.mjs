export default {
  "id": "ind74_plinkoxclassic",
  "title": "Plinko X Classic — Independent",
  "catalogName": "Plinko X Classic",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-plinkoxclassic-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 5",
    "colors": [
      "#d66bf1",
      "#b13215",
      "#9ef8c7"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "1392000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/plinko-x-classic",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "plinko",
  "model": "binomial-plinko-v1",
  "rows": 8,
  "bucketMultipliersBps": [
    139200,
    9800,
    8800,
    8200,
    8000,
    8200,
    8800,
    9800,
    139200
  ],
  "rules": [
    "This original 8-row path independently turns left or right with probability one half at each peg.",
    "The bucket index equals the number of right turns. Bucket k has probability C(rows,k) divided by 2 raised to rows.",
    "The published bucket multiplier gives the total payout. Prizes round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "Bucket 0",
      "multiplierBps": 139200,
      "probabilityNumerator": "1",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 1",
      "multiplierBps": 9800,
      "probabilityNumerator": "8",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 2",
      "multiplierBps": 8800,
      "probabilityNumerator": "28",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 3",
      "multiplierBps": 8200,
      "probabilityNumerator": "56",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 4",
      "multiplierBps": 8000,
      "probabilityNumerator": "70",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 5",
      "multiplierBps": 8200,
      "probabilityNumerator": "56",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 6",
      "multiplierBps": 8800,
      "probabilityNumerator": "28",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 7",
      "multiplierBps": 9800,
      "probabilityNumerator": "8",
      "probabilityDenominator": "256"
    },
    {
      "label": "Bucket 8",
      "multiplierBps": 139200,
      "probabilityNumerator": "1",
      "probabilityDenominator": "256"
    }
  ],
  "nominalReturn": {
    "numerator": "2406400",
    "denominator": "2560000",
    "type": "before-integer-floor",
    "proof": "Sum(C(rows,k)×bucketBps[k])/(2^rows×10000).Exactbetreturn uses integer flooredprizes."
  }
};
