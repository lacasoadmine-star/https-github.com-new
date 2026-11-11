import { mkdir, writeFile } from 'node:fs/promises';
import { listGameDefinitions } from '../math/index.mjs';

const names = `MultiHot 5
Foxy Hot 20
Multi Hot 100
Habesha Fortune 5
Burning Ice 10
Burning Ice 40
Coin Miner
Tower Rush
Tower X
PlinkoX
JetX
Balloon
Multi Hot 40
Multi Hot 20
Safari Simba
Foxy Hot 40
Magic Garden
Magic Garden 10
Magic Garden 20
Magic Garden 40
Book of Magic
Captain Candy
MoonStone
Samurai
Burning Ice
Burning Ice 30
Burning Ice 50
Vegas Hot 40
Vegas Hot 81
Vegas Hot 20
Vegas Hot 10
Crazy Hunt
Football X
Cricket X
JetX3
Armada
Burning Ice 2
SpinX
Luck Racing
Lucky Drink
Lucky Drink in Egypt
Burning Ice Deluxe
Jasmine
Dark Honesty
Burning Ice 40 Deluxe
Mines
Tower
Keno
Baccarat
Blackjack
European Roulette
American Roulette
Classic Roulette
VIP Roulette
Sic Bo
Hot Fruits
Fruits and Stars
Star Cash
Juicy Fruits
Mega Burning Wins
Super Seven
Diamond 777
Wild Fruits
Triple Seven
Lucky Seven
Golden Clover
Book of Win
Clover Party
Mega Joker
Sunny Farm
Crazy Time Casino Series
Turbo Plinko
Speed Crash
SmartSoft Special Edition Lobby`.split('\n');
const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
if (names.length !== 74 || new Set(names.map(normalize)).size !== 74) throw Error('The requested scope must contain exactly 74 unique entries.');
const definitions = listGameDefinitions();
const entries = names.map((name, i) => {
  const protectedEntry = i < 2;
  const model = protectedEntry ? null : definitions.find(g => normalize(g.catalogName) === normalize(name) || g.id === 'ind74_' + normalize(name));
  return {
    number: i + 1, name, protected: protectedEntry,
    disposition: protectedEntry ? 'preserve-existing-code-and-route' : name.endsWith('Lobby') ? 'requested-lobby-not-a-wager-engine' : model ? 'authored-math-found; requested-limits-and-complete-client-still-unverified' : 'requires-individual-implementation-and-reference-verification',
    authoredModelId: model?.id || null,
    providerEquivalenceVerified: false,
    productionWalletVerified: false,
    deployed: false,
    requestedBetLimits: protectedEntry ? null : { currency: 'ETB', minMinor: '100', maxMinor: null, testPresetsMinor: Array.from({length:20}, (_,i)=>String((i+1)*100)), policy: 'server-game-policy-and-retained-account-house-reserve' },
    requestedLimitsImplementedAndTested: false
  };
});
const scope = {
  source: 'Latest explicit user brief; supersedes the earlier public-catalog scope.',
  totalEntries: 74, protectedEntries: 2, requestedNewEntries: 72,
  useExistingWorker: 'superwin-player', useExistingBackendOnly: true,
  newInfrastructureCreationAllowed: false,
  testPolicy: 'Use isolated test points first; no player funds until actual ledger integration is verified.',
  exactOfficialDemoFidelityVerified: false,
  notes: ['The requested list differs from the official catalog collected earlier. Title matches are not proof of complete implementation.', 'The requested Lobby is navigation rather than a wager engine.', 'No automatic deletion of protected or legacy game code is performed.'],
  entries
};
await mkdir(new URL('.', import.meta.url), { recursive: true });
await writeFile(new URL('./requested74.json', import.meta.url), JSON.stringify(scope, null, 2) + '\n');
console.log(JSON.stringify({ total: 74, protected: 2, newEntries: 72, authoredModelMatches: entries.filter(x => x.authoredModelId).length }));
