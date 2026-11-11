export default {
  "id": "ind74_mineisland",
  "title": "Mine Island — Independent",
  "catalogName": "Mine Island",
  "sourceCategory": "Instant Games",
  "mathVersion": "independent-mineisland-v1",
  "implementationStatus": "math-tested-not-financially-verified",
  "theme": {
    "name": "Copper Voyage 38",
    "colors": [
      "#d2d045",
      "#45eff6",
      "#f9456b"
    ]
  },
  "limits": {
    "minBetMinor": "10",
    "maxBetMinor": "100000",
    "betStepMinor": "10",
    "maxWinMinor": "250650"
  },
  "provenance": {
    "catalog": "Name/category from https://www.smartsoftgaming.com/games/mine-island",
    "observed": "No completed official round was verified for this title.",
    "designed": "Independently authored probabilities, prizes, limits, theme, state and rules. No provider source code or media assets were reused."
  },
  "family": "mines",
  "model": "hidden-mines-v1",
  "returnBps": 9600,
  "cells": 25,
  "rows": 5,
  "cols": 5,
  "mines": 4,
  "maxPicks": 5,
  "rules": [
    "This original five-by-five hidden board contains four uniformly placed mines.",
    "Reveal any unrevealed cell. A mine loses the stake and any uncollected winnings.",
    "After a safe reveal, Collect ends the round. Five safe picks collect automatically.",
    "At k safe picks, multiplier basis points equal floor(9600 times C(25,k) divided by C(21,k)). Integer prizes round down."
  ],
  "paytable": [
    {
      "label": "1safe picks",
      "step": 1,
      "multiplierBps": 11428,
      "probabilityNumerator": "21",
      "probabilityDenominator": "25"
    },
    {
      "label": "2safe picks",
      "step": 2,
      "multiplierBps": 13714,
      "probabilityNumerator": "210",
      "probabilityDenominator": "300"
    },
    {
      "label": "3safe picks",
      "step": 3,
      "multiplierBps": 16601,
      "probabilityNumerator": "1330",
      "probabilityDenominator": "2300"
    },
    {
      "label": "4safe picks",
      "step": 4,
      "multiplierBps": 20290,
      "probabilityNumerator": "5985",
      "probabilityDenominator": "12650"
    },
    {
      "label": "5safe picks",
      "step": 5,
      "multiplierBps": 25065,
      "probabilityNumerator": "20349",
      "probabilityDenominator": "53130"
    }
  ],
  "nominalReturn": {
    "numerator": "96",
    "denominator": "100",
    "type": "upper-bound-before-floor",
    "proof": "Survival=C(21,k)/C(25,k).Multiplythisbyflooredpayouttocomputeexactbetreturn;nominalupperbound96%."
  }
};
