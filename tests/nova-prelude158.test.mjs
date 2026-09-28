import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel} from '../scripts/zone-v2-model.mjs';
loadModel();const a=NovaArt,n=NovaNormal;
const reload=s=>JSON.parse(JSON.stringify(s));
const base=()=>({...a.enter({},()=>.5),remaining:'500',burstUsed:true});

test('AT hit and fake preludes last 3-5 games including the trigger, preserve saves and confirm only at 3 dark stops',()=>{
 for(const [roll,total]of [[.01,3],[.5,4],[.99,5]])for(const hit of [true,false]){
  let s=base();
  for(let g=1;g<=total;g++){
   const t=a.step(reload(s),{setting:3},()=>roll,g===1?(hit?'STRONG_NOVA':'STRONG_SUICA'):'REPLAY');
   assert.equal(t.atPrelude.total,total);assert.equal(t.atPrelude.left,total-g);
   assert.equal(t.atPrelude.before,0);
   if(g<total){assert([1,2].includes(t.atPrelude.after));assert.equal(t.flow.entryStage,'');assert(t.flow.atPrelude);}
   else{assert.equal(t.atPrelude.after,hit?3:0);assert.equal(!!t.atPrelude.confirmed,hit);assert.equal(!!t.atPrelude.failed,!hit);assert.equal(t.flow.atPrelude,null);assert.equal(t.flow.entryStage,hit?'seven':'');}
   s=t.flow;
  }
 }
});

test('ongoing AT preludes keep extra wins, direct awards, burst reservations and zero remaining points',()=>{
 let s={...base(),remaining:'1',atPrelude:{total:4,left:3,zones:['sora']}};
 let t=a.step(s,{setting:3},()=>.99,'STRONG_NOVA');assert.equal(t.flow.atPrelude.zones.length,2);assert.equal(t.flow.atPrelude.left,2);
 t=a.step(reload(t.flow),{setting:3},()=>0,'STRONG_SUICA');assert(t.atOutcome.direct>0);assert.equal(t.flow.atPrelude.left,1);assert.equal(t.flow.entryStage,'');
 t=a.step(reload(t.flow),{setting:3},()=>.99,'BELL');assert.equal(t.flow.pendingZone,'sora');assert.equal(t.flow.queuedZones.length,1);assert.equal(t.atPrelude.after,3);
 s={...base(),remaining:'0',burstPending:true,atPrelude:{total:3,left:1,zones:['toto']}};
 t=a.step(s,{},()=>.99,'REPLAY');assert(t.atPrelude.confirmed);assert.equal(t.flow.entryStage,'seven');assert(t.flow.burstPending);
 assert.equal(a.step(reload(t.flow),{},()=>.99,'REPLAY').flow.entryStage,'roulette');
 s={...base(),remaining:'0',atPrelude:{total:3,left:1,zones:[]}};
 t=a.step(s,{},()=>.99,'REPLAY');assert(t.atPrelude.failed);assert.equal(t.flow.comebackLeft,5);
 s={...base(),sets:'1',atPrelude:{total:3,left:2,zones:[]}};
 assert.equal(a.prepareBet(s).sets,'1');assert.equal(a.afterBonus(s,{},0).atPrelude.left,2);
});

test('a pending miss can upgrade to a real zone win without restarting the timer',()=>{
 const s={...base(),atPrelude:{total:5,left:1,zones:[]}};
 const t=a.step(s,{setting:3},()=>.99,'STRONG_NOVA');assert(t.atPrelude.confirmed);assert.equal(t.atPrelude.total,5);assert.equal(t.flow.entryStage,'seven');
});

test('normal CZ chance uses the pre-role internal state and the real per-setting lottery',()=>{
 for(let setting=1;setting<=6;setting++)for(const level of ['low','high'])for(const role of Object.keys(n.rare)){
  const t=n.spin({level,highLeft:5},{phase:'normal'},setting,{},()=>.99,role);
  assert.equal(t.czChance,n.roleCzRate({level},role,setting));
 }
});

test('each landed reel darkens in the actual stop order, resets on BET, and uses CZ3 failure sound only when dark',()=>{
 const source=fs.readFileSync('jag.html','utf8'),painted=[],sounds=[];
 const c=vm.createContext({renderCzPrelude:v=>painted.push([...v]),updateDisplay(){},showMessage(){},showOverlay(){},NovaInitialDuo:{eligible:()=>false},sfxOutputVolume:()=>.4,playOneShotSound:src=>sounds.push(src),isLadderShutterSpin:()=>false,STOP_SOUND_SRC:'ordinary'});
 for(const name of ['showCzPrelude','playStopSound'])vm.runInContext(source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
 for(const field of ['czPrelude','atPrelude'])for(const count of [0,1,2,3]){
  const resolved={[field]:{before:2,after:count}};c.currentSpin={resolved};c.showCzPrelude(0,resolved);assert.deepEqual(painted.at(-1),[]);
  const order=[2,0,1];
  for(let i=0;i<3;i++){c.playStopSound(order[i],i+1);c.showCzPrelude(i+1,resolved,order[i]);assert.equal(sounds.at(-1),i<count?'assets/media/jag/cz_third_failure.wav':'ordinary');assert.deepEqual(painted.at(-1),order.slice(0,Math.min(i+1,count)));}
  c.showCzPrelude(3,resolved);assert.deepEqual(painted.at(-1),order.slice(0,count));
  c.showCzPrelude(0,{});assert.deepEqual(painted.at(-1),[]);
 }
});
