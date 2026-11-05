import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const source=fs.readFileSync('nova-super-speed-reels.js','utf8');
const game=fs.readFileSync('nova-game.js','utf8').replace(/\r\n/g,'\n');
const context=vm.createContext({Math:{random(){throw Error('presentation must not draw');}}});
vm.runInContext(source,context);
const eligible=context.NovaSuperSpeedReels.eligible;
const normal={active:true,flow:{phase:'normal'},bonus:false,blocked:false};

test('only ordinary super-speed play uses the still reels',()=>{
 assert.equal(eligible(normal),true);
 assert.equal(eligible({...normal,active:false}),false);
 assert.equal(eligible({...normal,bonus:true}),false);
 assert.equal(eligible({...normal,blocked:true}),false);
 for(const phase of ['cz','strong_cz','art','bonus'])assert.equal(eligible({...normal,flow:{phase}}),false);
});
test('aims, CZ presentation and phase transitions immediately reveal live reels',()=>{
 for(const r of [{aim:{symbol:'seven'}},{aim:{symbol:'nebula'}},{aim:{symbol:'nova'}},
  {stockEntry:true},{sortieEntry:true},{researchSortie:{}},{czPrelude:{}},{czLamp:1},
  {bonusReady:true},{bonusWaitSpin:true},{flowBefore:{phase:'cz'}},{flowAfter:{phase:'art'}}]){
  assert.equal(eligible({...normal,spin:{resolved:r}}),false,JSON.stringify(r));
 }
 const state=Object.freeze({...normal,spin:Object.freeze({resolved:Object.freeze({reward:8,result:'BELL',flowBefore:{phase:'normal'},flowAfter:{phase:'normal'}})})});
 assert.equal(eligible(state),true);
 assert.equal(state.spin.resolved.reward,8);
});
test('view adapter respects results, shutdown, CZ failure and automatic stop',()=>{
 let seen;
 const c=vm.createContext({NovaSuperSpeedReels:{sync:s=>{seen=s;}},superSpeedActive:true,autoPlay:true,
  normalState:{flow:{phase:'normal'}},session:{active:false},isSpinning:false,currentSpin:null,
  NovaCzPresentation:{failureActive:false},isCompleteTrialLocked:()=>false});
 vm.runInContext(game.match(/  function syncSuperSpeedReelDisplay\([^]*?\n  }/)[0],c);
 c.syncSuperSpeedReelDisplay();assert.equal(eligible(seen),true);
 for(const field of ['resultCard','pendingZoneResult','pendingSortieResult','ladderAwardPresentation']){
  c.normalState[field]={};c.syncSuperSpeedReelDisplay();assert.equal(eligible(seen),false);delete c.normalState[field];
 }
 c.normalState.stockEntry={stage:'prepare'};c.syncSuperSpeedReelDisplay();assert.equal(eligible(seen),true,'do not telegraph the next sortie aim');
 c.normalState.stockEntry.stage='seven';c.syncSuperSpeedReelDisplay();assert.equal(eligible(seen),false);
 delete c.normalState.stockEntry;c.NovaCzPresentation.failureActive=true;c.syncSuperSpeedReelDisplay();assert.equal(eligible(seen),false);
 c.NovaCzPresentation.failureActive=false;c.autoPlay=false;c.syncSuperSpeedReelDisplay();assert.equal(eligible(seen),false);
});
test('historical static reel proof restores the exact prior source independently of checkpoint gameplay',async()=>{
 const {beforeCheckpointInterruption}=await import('./helpers/checkpoint-source.mjs');
 const hooks=game.match(/^    globalThis\.NovaSuperSpeedReels && syncSuperSpeedReelDisplay\(\);\n/gm);
 assert.equal(hooks.length,6);
 const restored=beforeCheckpointInterruption(game).replace(/  function syncSuperSpeedReelDisplay\([^]*?\n  }\n\n/,'')
  .replace(/^    globalThis\.NovaSuperSpeedReels && syncSuperSpeedReelDisplay\(\);\n/gm,'');
 assert.equal(createHash('sha256').update(restored).digest('hex'),'d761f85b894370bd95fc2b63afa5c69fd789f14682a284413cdfcbbd20cadf92');
});

test('high-speed skips random preview symbols but actual stopped columns remain visible',()=>{
 const cells=Array.from({length:3},()=>({}));let renders=0,motion=0;
 const c=vm.createContext({REEL_STRIPS:[['A','B','C']],reelSpinOffsets:[0],currentSpin:{},superSpeedActive:true,autoPlay:true,normalState:{flow:{phase:'normal'}},session:{active:false},NovaSuperSpeedReels:context.NovaSuperSpeedReels,
  ensureReelCells:()=>cells,updateReelCell(){renders++;},mod:(a,b)=>(a%b+b)%b,reels:[{classList:{contains:()=>false}}],REEL_FULL_ROTATION_MS:800});
 vm.runInContext(game.match(/  function setRandomReel\([^]*?\n  }/)[0],c);
 c.setRandomReel(0);assert.equal(renders,0);assert.equal(c.reelSpinOffsets[0],2);
 c.superSpeedActive=false;c.setRandomReel(0);assert.equal(renders,3);assert.equal(c.reelSpinOffsets[0],1);
 const css=fs.readFileSync('nova-super-speed-reels.css','utf8');assert.doesNotMatch(css,/visibility:hidden|opacity:|background:/);
 assert.doesNotMatch(source,/createElement|cloneNode|超ハイスピード中/);
});
