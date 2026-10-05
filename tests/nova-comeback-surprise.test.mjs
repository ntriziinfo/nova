import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readGameSource} from '../scripts/game-source.mjs';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';

const source=readGameSource();
function setup(){
 const sounds=[];
 const c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,
  voiceOutputVolume:()=>1,sfxOutputVolume:()=>1,STOP_SOUND_SRC:'ordinary-stop',
  isLadderShutterSpin:()=>false,playOneShotSound:src=>sounds.push(src),playWinSound:()=>sounds.push('chance')});
 vm.runInContext(source.match(/  const RARE_CUE_VOICE_SRCS=\{[^]*?\n  };/)[0],c);
 for(const name of ['isComebackChanceSpin','rareCueGrade','playRareCueVoice','playRareNaviSound','playWeakNovaSound','playStrongNovaSound','playChanceSound','playStopSound']){
  vm.runInContext(source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
 }
 return {c,sounds};
}

test('comeback rare roles give no cue in manual or AUTO, including the last game, without changing lottery draws',()=>{
 loadModel();
 const {c,sounds}=setup();
 for(let setting=1;setting<=6;setting++)for(const comebackLeft of [5,1])for(const autoStopAtStart of [false,true])for(const role of ['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA']){
  const flow={...NovaArt.beginComeback(NovaArt.enter({setting},()=>.5)),comebackLeft};
  const rng=xoshiro128(1234),baseline=xoshiro128(1234);
  const step=NovaArt.step(flow,{setting},rng,role);
  const expected=NovaArt.step(flow,{setting},baseline,role);
  assert.equal(step.comebackEvent,'success');
  const resolved={...step,flowBefore:flow,flowAfter:step.flow},snapshot=JSON.stringify(resolved);
  const spin={result:role,resolved,autoStopAtStart,stopped:[false,false,false],rareNavi:{color:'red',mark:'!!'}};
  c.currentSpin=spin;sounds.length=0;
  c.playRareNaviSound(spin);
  c.playRareCueVoice(spin,rng);c.playRareCueVoice(spin,rng);
  baseline(); // The previous implementation selected one rare-cue character.
  assert.equal(rng(),baseline(),'hiding a cue must preserve subsequent lottery draws');
  assert.equal(spin.rareCueVoicePlayed,true);
  assert.equal(sounds.length,0,'no BET warning, even with a restored rare navigation');
  for(let order=1;order<=3;order++)c.playStopSound(order-1,order);
  c.playWeakNovaSound(role,resolved);c.playStrongNovaSound(role,resolved);c.playChanceSound(role,resolved);
  assert.deepEqual(sounds,['ordinary-stop','ordinary-stop','ordinary-stop']);
  assert.equal(JSON.stringify(resolved),snapshot,'presentation must not change the comeback outcome');
  assert.deepEqual(step,expected);
  assert.equal(step.flow.comebackConfirmed,true);
 }
});

test('comeback detection includes terminal results but excludes the preceding AT game and the awarded zone',()=>{
 const {c}=setup();
 for(const comebackEvent of ['continue','failure','success'])assert.equal(c.isComebackChanceSpin({comebackEvent}),true);
 assert.equal(c.isComebackChanceSpin({flowBefore:{comebackLeft:1}}),true);
 for(const resolved of [undefined,{}, {comebackEvent:'entry',flowBefore:{phase:'art'}}, {flowBefore:{phase:'art',zone:'sora',comebackConfirmed:true}}])assert.equal(c.isComebackChanceSpin(resolved),false);
});

test('restoring a saved rare navigation cannot reveal a comeback role; ordinary AT still shows it',()=>{
 let root;
 const element=()=>({style:{},dataset:{},children:[],setAttribute(){},append(child){this.children.push(child);this.firstChild=this.children[0];this.lastChild=child;},getAttribute(){return '';}});
 const host={append(el){root=el;},querySelector:()=>null};
 const c=vm.createContext({document:{getElementById:()=>host,createElement:element,addEventListener(){}},window:{addEventListener(){}},Image:class{constructor(){Object.assign(this,element());}}});
 vm.runInContext(fs.readFileSync('nova-bell-navi.js','utf8'),c);
 const spin={result:'WEAK_NOVA',stopped:[false,false,false],rareNavi:{color:'red',mark:'!'},resolved:{flowBefore:{phase:'art'}}};
 c.NovaBellNavi.restore(spin);assert.equal(root.hidden,false);
 spin.resolved.flowBefore.comebackLeft=1;
 c.NovaBellNavi.restore(spin);assert.equal(root.hidden,true);
 spin.resolved={comebackEvent:'success',flowBefore:{phase:'art'}};
 c.NovaBellNavi.restore(spin);assert.equal(root.hidden,true);
});
