// Synthetic PUBLIC receipt shapes for artwork inspection only. These are not
// recorded production rounds, provider probability samples, or money transfers.
const base=(gameId,version,round_id)=>({round_id,game_id:gameId,model_version:version,stakeMinor:'1000',status:'active',payoutMinor:null});
const snapshot=round=>({confirmed:true,balanceMinor:'100000',round});
export const REVIEW_FIXTURES={
  towerx_native:[
    {id:'idle',label:'Awaiting confirmed result',snapshot:{confirmed:false}},
    {id:'five-buildings',label:'Synthetic receipt · all five building types',snapshot:snapshot({...base('towerx_native','superwin-towerx-2','review-towerx-five'),status:'settled',payoutMinor:'5060',family:'tower',floors:[{level:1,type:'suburb',multiplier:4},{level:2,type:'city',multiplier:8},{level:3,type:'green',multiplier:24},{level:4,type:'elite',multiplier:70},{level:5,type:'neon',multiplier:400}],totalBuildingMultiplier:506,baseUnitsPerStake:100,feature:'Umbrella jump'})},
    {id:'building-prefix',label:'Only the first two confirmed buildings',options:{frameIndex:1},snapshot:snapshot({...base('towerx_native','superwin-towerx-2','review-towerx-prefix'),status:'settled',payoutMinor:'5060',family:'tower',floors:[{level:1,type:'suburb',multiplier:4},{level:2,type:'city',multiplier:8},{level:3,type:'green',multiplier:24},{level:4,type:'elite',multiplier:70},{level:5,type:'neon',multiplier:400}],totalBuildingMultiplier:506,baseUnitsPerStake:100})},
  ],
  towerrush_native:[
    {id:'idle',label:'No confirmed floors',snapshot:{confirmed:false}},
    {id:'frozen',label:'Synthetic receipt · protected Frozen Floor',snapshot:snapshot({...base('towerrush_native','superwin-towerrush-2','review-towerrush-freeze'),family:'tower',level:3,floors:[{level:1,type:'normal',multiplier:1.25},{level:2,type:'frozen',multiplier:1.25},{level:3,type:'normal',multiplier:1.5}],currentCashoutMinor:'2343',lockedPayoutMinor:'1562',frozen:true})},
    {id:'temple',label:'Synthetic receipt · confirmed Temple3× section',options:{showTemple:true},snapshot:snapshot({...base('towerrush_native','superwin-towerrush-2','review-towerrush-temple'),family:'tower',level:2,floors:[{level:1,type:'normal',multiplier:1.25},{level:2,type:'temple',multiplier:1.25,wheelSection:3}],currentCashoutMinor:'4687',lockedPayoutMinor:'0',frozen:false})},
    {id:'triple',label:'Synthetic receipt · three additional automatic floors',snapshot:snapshot({...base('towerrush_native','superwin-towerrush-2','review-towerrush-triple'),family:'tower',level:4,floors:[{level:1,type:'triple',multiplier:1.25},{level:2,type:'triple-additional',multiplier:1.25},{level:3,type:'triple-additional',multiplier:1.25},{level:4,type:'triple-additional',multiplier:1.25}],currentCashoutMinor:'2440',lockedPayoutMinor:'0',frozen:false})},
  ],
  coinminer_native:[
    {id:'closed',label:'No confirmed reveals',snapshot:{confirmed:false}},
    {id:'boost',label:'Synthetic94 receipt · two coins, one rescued pick',snapshot:snapshot({...base('coinminer_native','superwin-coinminer-3','review-coinminer-boost'),family:'mines',columns:5,rows:5,mines:5,picks:[{index:0,safe:true},{index:6,safe:true,treasureBoost:true}],currentCashoutMinor:'1450',treasureBoost:{active:true,rescuedPicks:1}})},
    {id:'mine',label:'Synthetic94 receipt · a confirmed mine',snapshot:snapshot({...base('coinminer_native','superwin-coinminer-3','review-coinminer-mine'),family:'mines',columns:5,rows:5,mines:5,picks:[{index:0,safe:true},{index:6,safe:true,treasureBoost:true},{index:12,safe:false}],status:'settled',payoutMinor:'0',currentCashoutMinor:'0',reason:'mine',treasureBoost:{active:true,rescuedPicks:1}})},
  ],
};
