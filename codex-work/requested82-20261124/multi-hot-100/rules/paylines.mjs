/** Current Multi Hot100 line geometry transcribed from its own public static atlas.
 * Source artwork hashes and extraction facts are in payline-art-evidence.json.
 * This is geometry, not a probability model or release authorization.
 */
export const M100_PAYLINES = Object.freeze([
  Object.freeze([0,0,0,0,0]), // 1
  Object.freeze([1,1,1,1,1]), // 2
  Object.freeze([2,2,2,2,2]), // 3
  Object.freeze([3,3,3,3,3]), // 4
  Object.freeze([1,0,0,0,1]), // 5
  Object.freeze([2,1,1,1,2]), // 6
  Object.freeze([3,2,2,2,3]), // 7
  Object.freeze([2,3,3,3,2]), // 8
  Object.freeze([1,2,2,2,1]), // 9
  Object.freeze([0,1,1,1,0]), // 10
  Object.freeze([0,1,0,1,0]), // 11
  Object.freeze([1,2,1,2,1]), // 12
  Object.freeze([2,3,2,3,2]), // 13
  Object.freeze([3,2,3,2,3]), // 14
  Object.freeze([2,1,2,1,2]), // 15
  Object.freeze([1,0,1,0,1]), // 16
  Object.freeze([0,0,1,0,0]), // 17
  Object.freeze([1,1,2,1,1]), // 18
  Object.freeze([2,2,3,2,2]), // 19
  Object.freeze([3,3,2,3,3]), // 20
  Object.freeze([2,2,1,2,2]), // 21
  Object.freeze([1,1,0,1,1]), // 22
  Object.freeze([1,0,0,0,0]), // 23
  Object.freeze([2,1,1,1,1]), // 24
  Object.freeze([3,2,2,2,2]), // 25
  Object.freeze([0,1,1,1,1]), // 26
  Object.freeze([1,2,2,2,2]), // 27
  Object.freeze([2,3,3,3,3]), // 28
  Object.freeze([0,0,1,1,1]), // 29
  Object.freeze([1,1,2,2,2]), // 30
  Object.freeze([2,2,3,3,3]), // 31
  Object.freeze([1,1,0,0,0]), // 32
  Object.freeze([2,2,1,1,1]), // 33
  Object.freeze([3,3,2,2,2]), // 34
  Object.freeze([0,0,0,1,1]), // 35
  Object.freeze([3,3,3,2,2]), // 36
  Object.freeze([0,0,0,0,1]), // 37
  Object.freeze([3,3,3,3,2]), // 38
  Object.freeze([0,1,2,1,0]), // 39
  Object.freeze([3,2,1,2,3]), // 40
  Object.freeze([1,2,3,2,1]), // 41
  Object.freeze([2,1,0,1,2]), // 42
  Object.freeze([1,1,1,2,2]), // 43
  Object.freeze([2,2,2,3,3]), // 44
  Object.freeze([2,2,2,1,1]), // 45
  Object.freeze([1,1,1,0,0]), // 46
  Object.freeze([1,1,1,1,2]), // 47
  Object.freeze([2,2,2,2,3]), // 48
  Object.freeze([2,2,2,2,1]), // 49
  Object.freeze([1,1,1,1,0]), // 50
  Object.freeze([0,0,0,1,0]), // 51
  Object.freeze([1,1,1,2,1]), // 52
  Object.freeze([2,2,2,3,2]), // 53
  Object.freeze([3,3,3,2,3]), // 54
  Object.freeze([2,2,2,1,2]), // 55
  Object.freeze([1,1,1,0,1]), // 56
  Object.freeze([0,0,1,1,0]), // 57
  Object.freeze([1,1,2,2,1]), // 58
  Object.freeze([2,2,3,3,2]), // 59
  Object.freeze([3,3,2,2,3]), // 60
  Object.freeze([2,2,1,1,2]), // 61
  Object.freeze([1,1,0,0,1]), // 62
  Object.freeze([0,1,0,0,0]), // 63
  Object.freeze([1,2,1,1,1]), // 64
  Object.freeze([2,3,2,2,2]), // 65
  Object.freeze([3,2,3,3,3]), // 66
  Object.freeze([2,1,2,2,2]), // 67
  Object.freeze([1,0,1,1,1]), // 68
  Object.freeze([0,1,1,0,0]), // 69
  Object.freeze([1,2,2,1,1]), // 70
  Object.freeze([2,3,3,2,2]), // 71
  Object.freeze([3,2,2,3,3]), // 72
  Object.freeze([2,1,1,2,2]), // 73
  Object.freeze([1,0,0,1,1]), // 74
  Object.freeze([0,1,0,1,1]), // 75
  Object.freeze([1,2,1,2,2]), // 76
  Object.freeze([2,3,2,3,3]), // 77
  Object.freeze([3,2,3,2,2]), // 78
  Object.freeze([2,1,2,1,1]), // 79
  Object.freeze([1,0,1,0,0]), // 80
  Object.freeze([0,0,1,0,1]), // 81
  Object.freeze([1,1,2,1,2]), // 82
  Object.freeze([2,2,3,2,3]), // 83
  Object.freeze([3,3,2,3,2]), // 84
  Object.freeze([2,2,1,2,1]), // 85
  Object.freeze([1,1,0,1,0]), // 86
  Object.freeze([0,0,1,1,2]), // 87
  Object.freeze([3,3,2,2,1]), // 88
  Object.freeze([0,0,1,2,2]), // 89
  Object.freeze([3,3,2,1,1]), // 90
  Object.freeze([0,1,1,1,2]), // 91
  Object.freeze([3,2,2,2,1]), // 92
  Object.freeze([0,1,1,2,2]), // 93
  Object.freeze([3,2,2,1,1]), // 94
  Object.freeze([0,0,0,1,2]), // 95
  Object.freeze([3,3,3,2,1]), // 96
  Object.freeze([0,1,2,2,2]), // 97
  Object.freeze([3,2,1,1,1]), // 98
  Object.freeze([2,2,1,0,0]), // 99
  Object.freeze([1,1,2,3,3]), // 100
]);

export function m100Payline(lineId) {
  if (!Number.isInteger(lineId) || lineId < 1 || lineId > M100_PAYLINES.length) throw new RangeError('M100_PAYLINE_ID');
  return M100_PAYLINES[lineId - 1];
}
