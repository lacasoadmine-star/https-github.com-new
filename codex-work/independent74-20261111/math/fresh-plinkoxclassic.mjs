// Newly authored from the public board and one completed official demo round.
// This is the pink 1x-ball submodel only. Provider ball selection/path weights,
// 5x/10x balls, audio and total game RTP remain unverified and unimplemented.
const bucketMultipliersBps=[10000000,1000000,200000,100000,40000,20000,2000,2000,2000,2000,2000,20000,40000,100000,200000,1000000,10000000];
function choose(n,k){let a=1;for(let i=1;i<=k;i++)a=a*(n-i+1)/i;return a;}
export default {
 id:'ind74_fresh_plinkoxclassic',title:'Plinko X Classic — Independent pink-ball prototype',catalogName:'Plinko X Classic',sourceCategory:'Instant Games',
 family:'plinko',model:'observed-board-independent-pink-ball-v1',mathVersion:'fresh-plinkoxclassic-20261111-pink-v1',rows:16,bucketMultipliersBps,
 observedPegboard:true,implementedBallMultiplier:1,providerBallMultipliers:[1,5,10],completeProviderBallTypesImplemented:false,
 limits:{minBetMinor:'100',maxBetMinor:'4000000',betStepMinor:'100',maxWinMinor:'4000000000'},
 provenance:{catalog:'https://www.smartsoftgaming.com/games/plinko-x-classic',observed:'2026-11-11: official 16-row/17-bucket board; a pink ball at 50 DMO returned 100 DMO on 2x; balance 20000 → 19950 → 20050 DMO.',designed:'Fresh independent 1x pink-ball model. Each peg independently chooses left/right with equal probability; provider probabilities and 5x/10x ball selection are unknown. This is not the complete official game.'},
 rules:['The visible 16-row board and 17 bucket prizes follow the fresh official demo observation.','Only the pink 1x ball is implemented. The official 5x/10x ball types and their probabilities are not implemented.','This independent model takes 16 fair left/right turns. It is not a reproduction of the provider probability distribution.','Payout equals stake times the visible bucket multiplier, floored to minor units.'],
 nominalReturn:{numerator:'158963',denominator:'163840',description:'Independent fair-path pink-ball model only; not provider game RTP.'},
 paytable:bucketMultipliersBps.map((multiplierBps,k)=>({label:'Bucket '+k,multiplierBps,probabilityNumerator:String(choose(16,k)),probabilityDenominator:'65536'}))
};
