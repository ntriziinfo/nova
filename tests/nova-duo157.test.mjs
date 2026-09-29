import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
loadModel();const a=NovaArt;
const initial=(plan=[50,50,50])=>({...a.enterInitial({},()=>0),initialStage:'zone',initialWait:0,zone:'kushuri_nito',initialPlan:plan,initialIndex:0,zoneLeft:3,award:'0',sets:'2',queuedZones:['ura_sora']});
const reload=s=>a.normalize(JSON.parse(JSON.stringify(s)));

test('weak/strong roles replace only their game with 100/200; final points and saved awards match',()=>{
 for(const [role,points]of Object.entries(a.initialRareAwards))for(const plan of [[50,50,50],[100,100,100]])for(let specialGame=0;specialGame<3;specialGame++){
  let s=initial(plan.slice()),total=0;
  for(let g=0;g<3;g++){
   const forced=g===specialGame?role:'BELL',step=a.step(reload(s),{},()=>.5,forced);
   assert.equal(step.result,forced);assert.equal(step.zoneAward,g===specialGame?points:plan[g]);
   total+=step.zoneAward;s=reload(step.flow);assert.equal(s.award,String(total));
   assert.equal(s.remaining,g===2?String(total):'0');assert.equal(s.sets,'2');assert.deepEqual(s.queuedZones,['ura_sora']);
  }
  assert.equal(s.initialStage,'');assert.equal(s.zone,'');assert.deepEqual(a.settleZone(s),s);
 }
});

test('natural initial-zone rare roles use the AT frequencies and the new exact award mean',()=>{
 const rng=xoshiro128('duo157');let sawWeak=0,sawStrong=0;
 for(let setting=1;setting<=6;setting++){
  let total=0;const count=12000;
  for(let i=0;i<count;i++){
   let s={...a.enterInitial({setting},rng),initialStage:'entry',entryStage:'confirmed',pendingZone:'kushuri_nito'};
   s=a.prepareBet(s,{setting},rng);
   for(let g=0;g<3;g++){
    const step=a.step(s,{setting},rng);const fixed=a.initialRareAwards[step.result];
    if(fixed){assert.equal(step.zoneAward,fixed);sawWeak+=fixed===100;sawStrong+=fixed===200;}
    else assert([50,100].includes(step.zoneAward));s=step.flow;
   }
   total+=Number(s.remaining);
  }
  const mean=NovaBalance.zoneMean('kushuri_nito',{setting});assert(mean>200&&mean<250);assert(Math.abs(total/count-mean)<1.5,`${setting}: ${total/count} vs ${mean}`);
 }
 assert(sawWeak>0&&sawStrong>0);
});

test('duo stop effects follow accepted button presses once, leaving ordinary landing sounds silent',()=>{
 const html=readGameSource(),sounds=[],jumps=[];let rank=0;
 const spin={resolved:{flowBefore:initial()}};
 const c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,currentSpin:spin,NovaInitialDuo:{eligible:s=>s?.initialStage==='zone'&&s?.zone==='kushuri_nito',stop:n=>{if(n<=rank)return false;rank=n;jumps.push(n);return true;}},sfxOutputVolume:()=>.4,playOneShotSound:(src,volume)=>sounds.push({src,volume})});
 for(const name of ['playInitialDuoStop','playStopSound'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
 for(let n=1;n<=3;n++){c.playInitialDuoStop(spin,n);c.playInitialDuoStop(spin,n);c.playStopSound(3-n,n);}
 assert.deepEqual(jumps,[1,2,3]);assert.deepEqual(sounds.map(s=>s.src.split('/').at(-1)),['initial-duo-stop.mp3','initial-duo-stop.mp3','initial-duo-final-stop.mp3']);assert(sounds.every(s=>s.volume===.4));
 c.playInitialDuoStop({resolved:{flowBefore:{phase:'art'}}},1);assert.equal(sounds.length,3);
 rank=0;c.debugFastSpinActive=true;c.playInitialDuoStop(spin,1);c.debugFastSpinActive=false;c.speedToBonusActive=true;c.playInitialDuoStop(spin,1);assert.equal(sounds.length,3);
 const stop=html.slice(html.indexOf('  function stopSingleReel(i,'),html.indexOf('  function stopAllReels()'));
 assert(stop.indexOf('playInitialDuoStop(')<stop.indexOf('await NovaReelMotion.stop'));
 assert(!stop.slice(stop.indexOf('currentSpin.stopped[i] = true;')).includes('NovaInitialDuo.stop('));
});
