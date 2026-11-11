import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(fs.readFileSync('/workspace/work/references/smartsoft-catalog.json', 'utf8'));
const previousPath = path.join(here, 'game-verification-matrix.json');
const previous = fs.existsSync(previousPath) ? JSON.parse(fs.readFileSync(previousPath, 'utf8')) : {games: []};
const previousGames = new Map(previous.games.map(game => [game.referenceName, game]));
const output = {
  scope: 'Independent implementations; no claim of SmartSoft code, assets, RNG or financial equivalence',
  generatedAt: new Date().toISOString(),
  productionMutationsByQA: false,
  definitions: {
    implemented: 'A playable native implementation exists, beyond a catalog row or HTTP 200',
    engineVerified: 'Actual rules, payout and state-transition tests passed for this game',
    browserVerified: 'Actual controls and a complete round were exercised in an isolated local browser',
    accountWalletVerified: 'Authenticated account debit, payout and replay behavior was verified with the intended wallet',
    deployed: 'Observed successful deployed behavior; a queued build is insufficient',
  },
  games: catalog.map((reference, index) => ({
    index,
    referenceName: reference.name,
    referenceCategory: reference.category || null,
    officialPage: reference.officialUrl,
    implementationId: reference.providerGameName === 'MineIsland2' ? 'ind74_mineisland2' : null,
    implemented: false,
    engineVerified: false,
    browserVerified: false,
    mobileVerified: false,
    accountWalletVerified: false,
    deployed: false,
    status: reference.providerGameName === 'MineIsland2' ? 'implementation-in-progress' : 'not-implemented',
    evidence: [],
    ...previousGames.get(reference.name),
  })),
};
fs.writeFileSync(previousPath, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({path: previousPath, total: output.games.length, implemented: output.games.filter(g => g.implemented).length, browserVerified: output.games.filter(g => g.browserVerified).length}));
