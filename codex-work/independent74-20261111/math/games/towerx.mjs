export default {
  "id": "ind74_towerx",
  "title": "Tower X — Independent",
  "catalogName": "Tower X",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-towerx-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Cobalt Lanterns 58",
    "colors": [
      "#ec9ccf",
      "#5e9b18",
      "#103164"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "15700000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/tower-x",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "ladder",
  "model": "conditional-ladder-v1",
  "returnBps": 9560,
  "multipliersBps": [
    12000,
    15000,
    20000,
    30000,
    50000,
    80000,
    150000,
    300000,
    600000,
    1570000
  ],
  "modes": [
    "easy"
  ],
  "defaultMode": "easy",
  "maxSteps": 10,
  "rules": [
    "This original ten-step ladder attempts the first step on Play. The first step can fail.",
    "Each successful step offers Collect. A failed step forfeits all uncollected value.",
    "First-step survival is return basis points divided by the first multiplier. Later conditional survival is previous multiplier divided by next multiplier.",
    "Visual step choices do not change probabilities. The final successful step collects automatically."
  ],
  "paytable": [
    {
      "mode": "easy",
      "rows": [
        {
          "label": "Step 1",
          "step": 1,
          "multiplierBps": 12000,
          "conditionalSurvival": {
            "numerator": 9560,
            "denominator": 12000
          }
        },
        {
          "label": "Step 2",
          "step": 2,
          "multiplierBps": 15000,
          "conditionalSurvival": {
            "numerator": 12000,
            "denominator": 15000
          }
        },
        {
          "label": "Step 3",
          "step": 3,
          "multiplierBps": 20000,
          "conditionalSurvival": {
            "numerator": 15000,
            "denominator": 20000
          }
        },
        {
          "label": "Step 4",
          "step": 4,
          "multiplierBps": 30000,
          "conditionalSurvival": {
            "numerator": 20000,
            "denominator": 30000
          }
        },
        {
          "label": "Step 5",
          "step": 5,
          "multiplierBps": 50000,
          "conditionalSurvival": {
            "numerator": 30000,
            "denominator": 50000
          }
        },
        {
          "label": "Step 6",
          "step": 6,
          "multiplierBps": 80000,
          "conditionalSurvival": {
            "numerator": 50000,
            "denominator": 80000
          }
        },
        {
          "label": "Step 7",
          "step": 7,
          "multiplierBps": 150000,
          "conditionalSurvival": {
            "numerator": 80000,
            "denominator": 150000
          }
        },
        {
          "label": "Step 8",
          "step": 8,
          "multiplierBps": 300000,
          "conditionalSurvival": {
            "numerator": 150000,
            "denominator": 300000
          }
        },
        {
          "label": "Step 9",
          "step": 9,
          "multiplierBps": 600000,
          "conditionalSurvival": {
            "numerator": 300000,
            "denominator": 600000
          }
        },
        {
          "label": "Step 10",
          "step": 10,
          "multiplierBps": 1570000,
          "conditionalSurvival": {
            "numerator": 600000,
            "denominator": 1570000
          }
        }
      ]
    }
  ],
  "nominalReturn": {
    "numerator": "9560",
    "denominator": "10000",
    "type": "before-integer-floor",
    "proof": "Conditionalsurvivalprobabilities telescope toreturnBps/Mk;expectedprize=bet×returnBps/10000beforeintegerfloor."
  }
};
