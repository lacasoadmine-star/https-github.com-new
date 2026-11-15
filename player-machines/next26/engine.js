/* ZPLAY next26: original, no-money engineering fixture. Not an official SmartSoft engine. */
(function (root) {
  'use strict';
  const raw = [
    ['popx','PopX','cascade','🍭','#ee4c9a'],
    ['mine-island2','Mine Island2','path','🏝️','#28ab95'],
    ['new-era-of-jetx','New Era of JetX','crash','✈️','#3484e0'],
    ['balloonx','BalloonX','crash','🎈','#e94f82'],
    ['plinko-x-classic','Plinko X Classic','plinko','🔴','#faab45'],
    ['propel-x','Propel X','crash','🚀','#9a64df'],
    ['world-champion-x','World Champion X','crash','🏆','#c9aa36'],
    ['chicken-ways','Chicken Ways','path','🐔','#ef964c'],
    ['dice-jungle','Dice Jungle','slot','🎲','#248a60'],
    ['cai-balao-cappadocia','Cai Balao Cappadocia','crash','🎈','#b75fc0'],
    ['carx','CarX','crash','🏎️','#e55742'],
    ['jingle-bell-bonanza','Jingle Bell Bonanza','slot','🔔','#2aab80'],
    ['balloon','Balloon','crash','🎈','#ea5282'],
    ['plinkox','Plinko X','plinko','🟠','#e3aa39'],
    ['helicopter-x','Helicopter X','crash','🚁','#3aa1bf'],
    ['mine-island','Mine Island','mines','💎','#1aa8a3'],
    ['fotballx','Football X','crash','⚽','#2a9a7d'],
    ['cricket-x','Cricket X','crash','🏏','#759c42'],
    ['cricketerx','CricketerX','crash','🏏','#b4a340'],
    ['wheel-of-destiny','Wheel Of Destiny','wheel','🎡','#8e6ac7'],
    ['aviastar','AviaStar','crash','🛩️','#3b93cc'],
    ['smash-x','Smash X','crash','💥','#db665b'],
    ['tower-x','Tower X','tower','🏰','#9e8fcb'],
    ['rollx','Roll X','wheel','🟢','#5bb887'],
    ['doublex','Double X','roulette','🔴','#d06e55'],
    ['samurai-deluxe','Samurai','slot','⚔️','#b36350']
  ];
  const catalogue = Object.freeze(raw.map((v,i) => Object.freeze({order:i+1,id:v[0],name:v[1],mode:v[2],icon:v[3],color:v[4]})));
  const symbols=['◆','♠','●','★','✦','7','🍒','🔔'];
  const round = n => Math.round(n*100)/100;
  class Engine {
    constructor(spec, rng=Math.random) {
      if (!spec || !catalogue.some(g=>g.id===spec.id)) throw Error('UNKNOWN_GAME');
      if (typeof rng !== 'function') throw Error('RNG_REQUIRED');
      this.game=spec;this.rng=rng;this.rounds=0;this.level=1;this.choice='red';
      this.history=[];this.reset();
    }
    reset() {
      this.phase='ready';this.elapsed=0;this.duration=0;this.multiplier=1;
      this.outcome=null;this.tiles=[];this.revealed=[];this.board=[];this.winning=[];
      this.position=0;this.target=0;this.crashAt=0;this.stopRequested=false;
      this.steps=0;this.message='Press PLAY to begin a no-money test round.';
    }
    random(n) {return Math.max(0,Math.min(n-1,Math.floor(this.rng()*n)));}
    start() {
      if (this.phase==='running') return false;
      this.reset();this.rounds++;this.phase='running';this.message='Round '+this.rounds+' · '+this.game.mode;
      const kind=this.game.mode;
      if (kind==='crash' || kind==='cascade') {
        this.crashAt=round(1.18+this.rng()*5.2);this.duration=7800;this.target=1+this.random(4);
        if(kind==='cascade') this.board=Array.from({length:30},()=>symbols[this.random(6)]);
      } else if(kind==='plinko' || kind==='wheel' || kind==='roulette' || kind==='slot') {
        this.duration=kind==='slot'?1650:kind==='plinko'?1300:1750;
        this.target=this.random(kind==='plinko'?11:kind==='roulette'?2:kind==='wheel'?12:8);
        if(kind==='slot') this.board=Array.from({length:15},()=>symbols[this.random(symbols.length)]);
      } else if(kind==='mines') {
        this.tiles=Array(25).fill(false);this.revealed=[];
        const positions=Array.from({length:25},(_,i)=>i);
        for(let i=positions.length-1;i>0;i--){const j=this.random(i+1);[positions[i],positions[j]]=[positions[j],positions[i]];}
        for(const index of positions.slice(0,4))this.tiles[index]=true;
      } else if(kind==='path' || kind==='tower') {
        this.tiles=Array.from({length:8},()=>this.random(3));this.revealed=[];
      } else {throw Error('UNSUPPORTED_MODE');}
      return true;
    }
    finish(outcome) {
      if(this.phase!=='running') return false;
      this.phase='complete';this.outcome=outcome;this.message=outcome==='win'?'Collected '+this.multiplier.toFixed(2)+'×':outcome==='loss'?'Round ended':'Round complete';
      this.history.unshift({round:this.rounds,outcome,multiplier:this.multiplier,mode:this.game.mode});
      this.history.length=Math.min(this.history.length,30);
      return true;
    }
    act(name, value) {
      if(name==='level') {if(this.phase==='running')return false;const v=Number(value);if(!Number.isInteger(v)||v<1||v>10)return false;this.level=v;return true;}
      if(name==='choice') {if(this.phase==='running'||!['red','black'].includes(value))return false;this.choice=value;return true;}
      if(name==='play')return this.start();
      if(this.phase!=='running')return false;
      const kind=this.game.mode;
      if(name==='stop') {
        if(!['slot','wheel','roulette','plinko'].includes(kind))return false;
        this.stopRequested=true;this.duration=Math.min(this.duration,this.elapsed+150);
        return true;
      }
      if(name==='collect') {
        if(['crash','cascade'].includes(kind) && this.multiplier>1) return this.finish('win');
        if(['mines','path','tower'].includes(kind) && this.steps>0) return this.finish('win');
        return false;
      }
      if(name==='pick') {
        const index=Number(value);
        if(!Number.isInteger(index))return false;
        if(kind==='mines') {
          if(index<0||index>=25||this.revealed.includes(index))return false;
          this.revealed.push(index);this.steps++;
          if(this.tiles[index])return this.finish('loss');
          this.multiplier=round(1+this.steps*(0.18+this.level/100));
          if(this.steps>=21)return this.finish('win');
          return true;
        }
        if(kind==='tower' || kind==='path') {
          if(index<0||index>2||this.steps>=this.tiles.length)return false;
          this.revealed.push(index);const safe=this.tiles[this.steps];this.steps++;
          if(index!==safe)return this.finish('loss');
          this.multiplier=round(1+this.steps*(0.25+this.level/100));
          if(this.steps===this.tiles.length)return this.finish('win');
          return true;
        }
      }
      return false;
    }
    tick(ms) {
      if(this.phase!=='running')return false;
      const dt=Math.max(0,Math.min(250,Number(ms)||0));this.elapsed+=dt;
      const k=this.game.mode;
      if(k==='crash'||k==='cascade') {
        this.multiplier=round(1+this.elapsed/2700+Math.pow(this.elapsed/5300,2));
        if(k==='cascade'&&this.elapsed>350 && this.steps<6 && this.elapsed>this.steps*800+350) {
          this.steps++;
          if(this.rng()<0.66){this.multiplier=round(this.multiplier+0.16*this.steps);this.board=Array.from({length:30},()=>symbols[this.random(6)]);}
        }
        if(this.multiplier>=this.crashAt || this.elapsed>=this.duration) this.finish('loss');
      } else if(['slot','wheel','roulette','plinko'].includes(k)&&this.elapsed>=this.duration) {
        if(k==='slot') {
          const first=this.board[0], match=this.board.filter(c=>c===first).length;
          this.multiplier=match>=4?round(1+match/4):1;
          this.finish(match>=4?'win':'loss');
        } else if(k==='plinko') {
          const bins=[3,1.5,1,0.7,0.5,0.3,0.5,0.7,1,1.5,3];
          this.multiplier=bins[this.target];this.finish('complete');
        } else if(k==='wheel') {
          this.multiplier=[1,1.2,1.5,2,1,0.5,3,1,1.5,2,0.2,4][this.target];this.finish('complete');
        } else {
          this.multiplier=this.target===(this.choice==='red'?0:1)?2:0;
          this.finish(this.multiplier===2?'win':'loss');
        }
      }
      return true;
    }
    snapshot() {return {id:this.game.id,mode:this.game.mode,round:this.rounds,phase:this.phase,outcome:this.outcome,multiplier:this.multiplier,elapsed:this.elapsed,duration:this.duration,level:this.level,choice:this.choice,board:this.board.slice(),tiles:this.tiles.slice(),revealed:this.revealed.slice(),steps:this.steps,target:this.target,crashAt:this.crashAt,message:this.message,stopRequested:this.stopRequested,history:this.history.slice()};}
  }
  function createEngine(id,rng) {const spec=catalogue.find(g=>g.id===id);return new Engine(spec,rng);}
  const api={catalogue,Engine,createEngine,symbols,version:'next26-r1-no-money'};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.ZPLAY26=api;
})(typeof globalThis!=='undefined'?globalThis:this);