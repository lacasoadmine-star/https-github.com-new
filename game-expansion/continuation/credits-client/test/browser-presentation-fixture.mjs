// Browser control integration only. Real media is deliberately not simulated as
// a visual-parity result. Geometry comes from the actual production renderer.
import {remaining7ControlGeometry} from '../presentation/smartsoft-remaining7-wide.mjs';
export class ReferencePresentationHost{
 constructor(){this.audio={stop(){},async music(){}};this.motion=null;}
 setGame(game){this.game=game;}
 resize(width,height){this.width=width;this.height=height;}
 setAudio(){} async playSound(){} async unlockAudio(){}
 cancelMotion(){} cancelWinPresentation(){} invalidate(){}
 isWinPresentationRunning(){return false;}
 startupProgress(){return {loaded:1,requested:1};}
 getCoinGeometry(){return null;}
 beginSpin(){return false;}
 render(){return {complete:true};}
 async draw(){this.lastPaint={scene:{width:2170,height:1130}};return {status:'painted',scene:this.lastPaint.scene};}
 getControlsGeometry(width,height){
  const geometry=remaining7ControlGeometry({},this.game),scale=Math.min(width/2170,height/1130);
  const x=(width-2170*scale)/2,y=(height-1130*scale)/2;
  return Object.fromEntries(Object.entries(geometry).map(([k,b])=>[k,{x:x+b.x*scale,y:y+b.y*scale,width:b.width*scale,height:b.height*scale}]));
 }
}
