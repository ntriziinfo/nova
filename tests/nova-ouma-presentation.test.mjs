import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {beforeOumaPush} from './helpers/ouma-push-source.mjs';
const h=readGameSource(),fn=n=>h.match(new RegExp('  function '+n+'\\([^]*?\\n  }'))[0];
function setup(win,playing=false){
 let now=0,rolls=0,spins=0,played=0,clears=0,clearedAll=0,staticColumns=0;
 const liftArgs=[],offers=[],timers=new Map();let id=0;
 const nodes={machine:{dataset:{}},spinBtn:{},resultText:{}};
 const strips=[Array(20).fill(0),Array(20).fill(0),Array(20).fill(0)];
 const c=vm.createContext({
  stopSuperSpeedIfNeeded:()=>false,mod:(n,m)=>(n%m+m)%m,
  NovaDirectAward:{clear(){c.awardCleared=true;}},autoPlay:false,isSpinning:false,
  queueAutoStep(){c.autoQueued=true;},autoDelayMs:()=>100,canUsePlayState:()=>true,
  NovaResults:{transition:()=>null},playCzPushPromptVoice:cue=>offers.push(cue),
  normalState:{flow:{zone:'ouma',oumaPending:true}},debugFastSpinActive:false,settings:{novaArt:{}},
  stopBtns:[{}],reels:[0,1,2].map(()=>({style:{setProperty(){}}})),
  document:{getElementById:id=>nodes[id],createElement:()=>({setAttribute(){}}),querySelector:()=>({append:b=>nodes[b.id]=b})},
  $:id=>nodes[id],clearTimeout:id=>timers.delete(id),setTimeout(cb,ms){timers.set(++id,{cb,ms});return id;},
  clearOumaReverseAudio(){c.oumaReverseAudio=null;},stopAutoPlay(){},stopSpeedToBonus(){},persistState(){},updateDisplay(){},isCompleteTrialLocked:()=>false,
  NovaArt:{zoneName:()=>"逢魔",prepareBet(v){rolls++;return {...v,oumaPending:false,zero:win};}},
  spin(options){spins++;c.spinOptions=options;c.isSpinning=true;},
  Audio:function(){this.play=()=>{played++;return Promise.resolve();};this.pause=()=>{};},
  performance:{now:()=>now},sfxOutputVolumeForSource:()=>1,SFX_OUTPUT_SCALE:1,
  NovaReelMotion:{start(...args){liftArgs.push(args);},clear(){clears++;},clearAll(){clearedAll++;}},
  REEL_STRIPS:strips,cellHtml(){},setReelColumn(){staticColumns++;},reelWindowFromTopIndex(){}
 });
 vm.runInContext(fs.readFileSync('nova-ouma-push.js','utf8'),c);
 vm.runInContext(fs.readFileSync('nova-results.js','utf8').replace("if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);",''),c);
 vm.runInContext('let oumaChainTimer=null;var oumaFailDimTimer=null;var oumaPresentation=null,oumaIntroAudio=null,oumaStoppedTops=[0,0,0],oumaReverseAudio=null;'+['trackZoneResult','clearOumaPresentation','scheduleOumaZeroChain','resolveOumaChallenge'].map(fn).join('\n'),c);
 if(playing)c.oumaReverseAudio={paused:false,ended:false};
 return {c,nodes,liftArgs,offers,timers,setNow:v=>now=v,land:()=>liftArgs.forEach(a=>a[6].done()),
  press:()=>nodes.novaOumaPush.onclick(),tick:()=>{for(const [id,t] of [...timers]){timers.delete(id);t.cb();}},
  rolls:()=>rolls,spins:()=>spins,played:()=>played,clears:()=>clears,clearedAll:()=>clearedAll,staticColumns:()=>staticColumns};
}
test('exact pre-PUSH engine reconstruction retains every existing gameplay statement',()=>{beforeOumaPush(fs.readFileSync('nova-game.js','utf8').replace(/\r\n/g,'\n'));});
test('stopped reels hold until reverse audio ends, then accept BET',()=>{
 const t=setup(true,true);t.c.scheduleOumaZeroChain();
 assert.equal(t.nodes.machine.dataset.oumaFreeze,'hold');assert.equal(t.nodes.spinBtn.disabled,true);
 t.c.resolveOumaChallenge();assert.equal(t.rolls(),0);
 t.c.oumaReverseAudio.onended();assert.equal(t.nodes.machine.dataset.oumaFreeze,'bet');assert.equal(t.nodes.spinBtn.disabled,false);
});
for(const [zone,ura] of [['urapi',false],['ouma',false],['ouma',true]])for(const win of [true,false]){
 test(`${zone} ura=${ura} win=${win}: PUSH appears after all three lift stops and reveals once`,()=>{
  const t=setup(win);Object.assign(t.c.normalState.flow,{zone,ura});t.c.oumaStoppedTops=[19,4,13];
  t.c.scheduleOumaZeroChain();t.c.resolveOumaChallenge();t.c.resolveOumaChallenge();
  assert.equal(t.rolls(),1);assert.equal(t.played(),1);assert.equal(t.spins(),0);assert.equal(t.c.awardCleared,true);
  t.setNow(250);assert.deepEqual(t.liftArgs.map(a=>a[6].clock()),[.25,.185,.13]);
  t.setNow(620);t.liftArgs.forEach(a=>{assert.equal(a[6].clock(),.5);assert.equal(a[4],true);assert.equal(a[6].steps,1);});
  t.liftArgs[0][6].done();t.liftArgs[1][6].done();assert.equal(t.nodes.novaOumaPush,undefined);
  t.liftArgs[2][6].done();const button=t.nodes.novaOumaPush;
  assert.equal(button.hidden,false);assert.equal(button.className,'white');assert.equal(t.c.oumaIntroAudio,null);
  assert.equal(t.nodes.machine.dataset.oumaFreeze,'push');assert.equal(t.nodes.spinBtn.disabled,true);
  assert.deepEqual(JSON.parse(JSON.stringify(t.offers)),[{variant:'white',voice:'default'}]);
  const prepared=JSON.stringify(t.c.normalState.flow),click=button.onclick;
  t.tick();t.c.resolveOumaChallenge();assert.equal(t.spins(),0);assert.equal(t.rolls(),1);
  click();click();assert.equal(t.spins(),1);assert.equal(t.rolls(),1);assert.equal(button.hidden,true);
  assert.equal(t.c.spinOptions.oumaFailed,!win);assert.equal(JSON.stringify(t.c.normalState.flow),prepared);
  if(win){assert.deepEqual([...t.c.oumaStoppedTops],[0,5,14]);assert.equal(t.clears(),0);assert.equal(t.clearedAll(),0);}
  else {assert.equal(t.clears(),3);assert.equal(t.staticColumns(),3);assert.equal(t.nodes.machine.dataset.oumaFreeze,'');}
 });
}
test('blocked successful handoff clears retained lift layer',()=>{
 const t=setup(true);t.c.scheduleOumaZeroChain();t.c.resolveOumaChallenge();t.land();
 t.c.spin=()=>{};t.press();assert.equal(t.c.isSpinning,false);assert.equal(t.clearedAll(),1);
});
for(const stage of ['lift','push'])test(`reset during ${stage} cancels old callbacks and hides PUSH`,()=>{
 const t=setup(true);t.c.autoPlay=true;t.c.scheduleOumaZeroChain();t.c.resolveOumaChallenge();
 if(stage==='push')t.land();const click=t.nodes.novaOumaPush?.onclick;
 t.c.clearOumaPresentation();t.land();click?.();t.tick();
 assert.equal(t.spins(),0);assert.equal(t.c.NovaOumaPush.busy,false);assert.equal(t.clearedAll(),1);
});
test('AUTO is retained and queued only once reverse audio ends',()=>{
 const t=setup(true,true);t.c.autoPlay=true;t.c.stopAutoPlay=()=>{throw Error('AUTO stopped');};
 t.c.scheduleOumaZeroChain();assert.equal(t.c.autoQueued,undefined);t.c.oumaReverseAudio.onended();assert.equal(t.c.autoQueued,true);
});
for(const win of [true,false])test(`AUTO pushes after 1 second without drawing again (win=${win})`,()=>{
 const t=setup(win);Object.assign(t.c,{autoPlay:true,bonusEndBgmPlaying:false,bonusConfirmSoundPlaying:false,canPlayCompleteTrial:()=>true,autoPollDelayMs:()=>100});
 vm.runInContext(fn('runAutoStep'),t.c);t.c.scheduleOumaZeroChain();t.c.runAutoStep();t.c.runAutoStep();
 assert.equal(t.rolls(),1);assert.equal(t.spins(),0);assert.equal(t.timers.size,0);
 t.land();t.c.runAutoStep();t.c.runAutoStep();assert.equal(t.timers.size,1);assert.equal([...t.timers.values()][0].ms,1000);
 t.tick();assert.equal(t.spins(),1);assert.equal(t.rolls(),1);assert.equal(t.c.spinOptions.oumaFailed,!win);
});
test('AUTO stop/restart, temporary permission loss, and stale timer do not lose or duplicate a PUSH',()=>{
 const t=setup(true);let allowed=true;t.c.canUsePlayState=()=>allowed;
 t.c.scheduleOumaZeroChain();t.c.resolveOumaChallenge();t.land();
 assert.equal(t.timers.size,0);t.c.autoPlay=true;t.c.NovaOumaPush.autoPress();
 const stale=[...t.timers.values()][0].cb;
 t.c.autoPlay=false;t.tick();assert.equal(t.spins(),0);
 allowed=false;t.press();assert.equal(t.spins(),0);assert.equal(t.c.NovaOumaPush.busy,true);
 allowed=true;t.c.autoPlay=true;t.c.NovaOumaPush.autoPress();stale();assert.equal(t.timers.size,1);
 t.tick();assert.equal(t.spins(),1);assert.equal(t.rolls(),1);
});
