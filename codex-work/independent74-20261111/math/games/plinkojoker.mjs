export default {
  "id": "ind74_plinkojoker",
  "title": "4 Bonuses Bonanza — Independent",
  "catalogName": "4 Bonuses Bonanza",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-plinkojoker-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Lunar Arcade 45",
    "colors": [
      "#113647",
      "#c7bb91",
      "#c1736d"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "20632000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/4-bonuses-bonanza",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "plinko",
  "model": "binomial-plinko-v1",
  "rows": 12,
  "bucketMultipliersBps": [
    2063200,
    13000,
    11200,
    9800,
    8800,
    8200,
    8000,
    8200,
    8800,
    9800,
    11200,
    13000,
    2063200
  ],
  "rules": [
    "This original 12-row path independently turns left or right with probability one half at each peg.",
    "The bucket index equals the number of right turns. Bucket k has probability C(rows,k) divided by 2 raised to rows.",
    "The published bucket multiplier gives the total payout. Prizes round down to whole minor units."
  ],
  "paytable": [
    {
      "label": "Bucket 0",
      "multiplierBps": 2063200,
      "probabilityNumerator": "1",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 1",
      "multiplierBps": 13000,
      "probabilityNumerator": "12",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 2",
      "multiplierBps": 11200,
      "probabilityNumerator": "66",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 3",
      "multiplierBps": 9800,
      "probabilityNumerator": "220",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 4",
      "multiplierBps": 8800,
      "probabilityNumerator": "495",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 5",
      "multiplierBps": 8200,
      "probabilityNumerator": "792",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 6",
      "multiplierBps": 8000,
      "probabilityNumerator": "924",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 7",
      "multiplierBps": 8200,
      "probabilityNumerator": "792",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 8",
      "multiplierBps": 8800,
      "probabilityNumerator": "495",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 9",
      "multiplierBps": 9800,
      "probabilityNumerator": "220",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 10",
      "multiplierBps": 11200,
      "probabilityNumerator": "66",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 11",
      "multiplierBps": 13000,
      "probabilityNumerator": "12",
      "probabilityDenominator": "4096"
    },
    {
      "label": "Bucket 12",
      "multiplierBps": 2063200,
      "probabilityNumerator": "1",
      "probabilityDenominator": "4096"
    }
  ],
  "nominalReturn": {
    "numerator": "39321600",
    "denominator": "40960000",
    "type": "before-integer-floor",
    "proof": "Sum(C(rows,k)×bucketBps[k])/(2^rows×10000).Exactbetreturn uses integer flooredprizes."
  }
};
