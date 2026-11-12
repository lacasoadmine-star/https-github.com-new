"""Independent fixed strips constrained by observed symbols and payout bounds."""
import json,random,itertools
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
coeff=[10,10,10,10,20,20,25,50,75]
strips=[]
for seed in [1741,6143,1987]:
 rng=random.Random(seed)
 blocks=[[x]for x in range(4)for _ in range(7)]+[[x]*3 for x in [4,5,6]]+[[x]for x in [4,5,6]for _ in range(4)]+[[7]for _ in range(7)]+[[8]for _ in range(8)]
 for symbol in [4,7,8]:blocks.remove([symbol])
 blocks.append([8,7,4])
 for attempt in range(100000):
  rng.shuffle(blocks);strip=[x for block in blocks for x in block]
  windows=[[strip[(i+j)%64]for j in range(3)]for i in range(64)]
  if all(w.count(7)<=1 and w.count(8)<=1 and set(w)!={6,7,8}for w in windows):break
 else:raise RuntimeError('No constrained strip found')
 strips.append(strip)
lines=[[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]]
maximum=0;max_stops=None
for stops in itertools.product(range(64),repeat=3):
 grid=[[strips[c][(stops[c]+r)%64]for c in range(3)]for r in range(3)]
 total=sum(coeff[grid[line[0]][0]]for line in lines if grid[line[0]][0]==grid[line[1]][1]==grid[line[2]][2])
 if total>maximum:maximum=total;max_stops=stops
assert maximum==145,maximum
out={'strips':strips,'lines':lines,'coefficients':coeff,'maximumMultiplier':maximum,'maximumStops':list(max_stops),'reference':'Fresh Safari Simba help/paytable observed in this run','probabilityModel':'Independent fixed strips with exact target return calibration; not SmartSoft private RNG','originalProviderRngReproduced':False}
p=ROOT/'native-machines/safari-simba-2/server/strip-design.json';p.write_text(json.dumps(out,indent=2));print(json.dumps({'strip_lengths':list(map(len,strips)),'exhaustive_combinations':64**3,'verified_maximum':maximum}))
