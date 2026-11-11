export default {
  "id": "ind74_rollx",
  "title": "Roll X — Independent",
  "catalogName": "Roll X",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-rollx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Ember Spire 72",
    "colors": [
      "#3d91ec",
      "#849aad",
      "#904291"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "960000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/rollx",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "dice",
  "model": "uniform-dice-v1",
  "returnBps": 9600,
  "minTarget": 10,
  "maxTarget": 90,
  "defaultTarget": 50,
  "rules": [
    "This original game draws one uniform integer from 0 through 99. Choose a target from 10 through 90 before Play.",
    "A roll below the target wins. The offered multiplier in basis points is floor(9600 times 100 divided by target).",
    "The total prize is floor(stake times offered basis points divided by 10000); other rolls lose."
  ],
  "paytable": [
    {
      "label": "Target 10",
      "target": 10,
      "multiplierBps": 96000,
      "probabilityNumerator": "10",
      "probabilityDenominator": "100"
    },
    {
      "label": "Target 25",
      "target": 25,
      "multiplierBps": 38400,
      "probabilityNumerator": "25",
      "probabilityDenominator": "100"
    },
    {
      "label": "Target 50",
      "target": 50,
      "multiplierBps": 19200,
      "probabilityNumerator": "50",
      "probabilityDenominator": "100"
    },
    {
      "label": "Target 75",
      "target": 75,
      "multiplierBps": 12800,
      "probabilityNumerator": "75",
      "probabilityDenominator": "100"
    },
    {
      "label": "Target 90",
      "target": 90,
      "multiplierBps": 10666,
      "probabilityNumerator": "90",
      "probabilityDenominator": "100"
    }
  ],
  "nominalReturn": {
    "numerator": "96",
    "denominator": "100",
    "type": "upper-bound-before-floor",
    "proof": "Exactreturn=(target/100)×floor(bet×floor(960000/target)/10000)/bet;neverabove96%."
  }
};
