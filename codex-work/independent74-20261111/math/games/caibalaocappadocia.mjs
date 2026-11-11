export default {
  "id": "ind74_caibalaocappadocia",
  "title": "Cai Balao Cappadocia — Independent",
  "catalogName": "Cai Balao Cappadocia",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-caibalaocappadocia-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Jade Orchard 29",
    "colors": [
      "#cd7b23",
      "#1a9ef5",
      "#10b8fa"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "12800000"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/cai-balao-cappadocia",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "ladder",
  "model": "conditional-ladder-v1",
  "returnBps": 9600,
  "multipliersBps": [
    11000,
    16000,
    20000,
    30000,
    50000,
    80000,
    150000,
    300000,
    600000,
    1280000
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
          "multiplierBps": 11000,
          "conditionalSurvival": {
            "numerator": 9600,
            "denominator": 11000
          }
        },
        {
          "label": "Step 2",
          "step": 2,
          "multiplierBps": 16000,
          "conditionalSurvival": {
            "numerator": 11000,
            "denominator": 16000
          }
        },
        {
          "label": "Step 3",
          "step": 3,
          "multiplierBps": 20000,
          "conditionalSurvival": {
            "numerator": 16000,
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
          "multiplierBps": 1280000,
          "conditionalSurvival": {
            "numerator": 600000,
            "denominator": 1280000
          }
        }
      ]
    }
  ],
  "nominalReturn": {
    "numerator": "9600",
    "denominator": "10000",
    "type": "before-integer-floor",
    "proof": "Conditionalsurvivalprobabilities telescope toreturnBps/Mk;expectedprize=bet×returnBps/10000beforeintegerfloor."
  }
};
