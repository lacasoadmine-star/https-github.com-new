import {ReferenceAssetStore} from '../presentation/machine-renderer.mjs';
import {BURNING_ICE40_ID,burningIce40WagerView} from '../presentation/smartsoft/burningice40-controls.mjs';
import {createBurningIce40SourceScene} from '../presentation/smartsoft/burningice40-source-scene.mjs';

// Explicit local presentation opt-in. Never selects a model, opens a release
// gate, substitutes a font, supplies an outcome, or sends a financial action.
export const BURNING_ICE40_SOURCE_PRESENTATION='burningice40-source';
export function burningIce40HostWagerView(state,{selectedStake,canStart=false,canChangeStake=false,animating=false}={}){
 const busy=state?.busy===true||animating===true;
 return burningIce40WagerView(state?.game,{...state,pending:!!state?.pending||busy},{
  stake:selectedStake,
  canStart:canStart===true&&state?.accepting===true&&state?.game?.launchable===true,
  canChangeStake:canChangeStake===true,
 });
}
export function createBurningIce40HostScene(manifest,snapshot,{grid=null,preview=null}={}){
 if(manifest?.id!==BURNING_ICE40_ID||!snapshot.burningIce40Wager)throw Error('BURNING_ICE40_HOST_VIEW_INVALID');
 const scene=createBurningIce40SourceScene(manifest,{grid,preview,wagerView:snapshot.burningIce40Wager});
 return {...scene,hostIntegrated:true,sourcePresentation:BURNING_ICE40_SOURCE_PRESENTATION,
  wagerView:snapshot.burningIce40Wager,receiptDriven:true,staticOnly:true};
}
export class BurningIce40SourceAssetStore extends ReferenceAssetStore{
 async prepare(scene){
  if(scene?.sourcePresentation!==BURNING_ICE40_SOURCE_PRESENTATION||scene.gameId!==BURNING_ICE40_ID)throw Error('BURNING_ICE40_HOST_SCENE_INVALID');
  // Only the requested original sprites. No unrelated native timeline, font
  // alias, audio preload, or invented replacement is needed for this scene.
  const files=new Set(scene.commands.filter(command=>command.type==='sprite').map(command=>this.manifest.frames[command.frame].file));
  return new Map(await Promise.all([...files].map(async file=>[file,await this.loadImage(file)])));
 }
}
