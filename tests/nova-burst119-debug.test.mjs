import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {loadModel} from '../scripts/zone-v2-model.mjs';

const html=fs.readFileSync('jag.html','utf8');
function context(){
 loadModel();
 const c=vm.createContext({NovaArt,NovaNormal,A_TYPE_MODE:true,settings:{setting:6,novaArt:{}},normalState:{flow:{phase:'normal'},bonusPending:false},forceResult:'BURST',pendingForceResult:'BURST',bonusActive:false,RESULT:{}});
 vm.runInContext('function isATypeBonusActive(){return bonusActive;}',c);
 for(const name of ['normalizeForceResult','forceResultName','takeForcedResult','forcedBurstStep','drawNormalResult']){
  const match=html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'));assert(match,name);vm.runInContext(match[0],c);
 }
 return c;
}

test('one-shot burst flag survives pending and active BIG, then is consumed once',()=>{
 const c=context();assert.equal(c.normalizeForceResult('BURST'),'BURST');assert.match(c.forceResultName('BURST'),/爆発チャレンジ/);
 c.normalState.bonusPending=true;assert.equal(c.takeForcedResult(),'');assert.equal(c.forceResult,'BURST');
 c.normalState.bonusPending=false;c.bonusActive=true;assert.equal(c.takeForcedResult(),'');assert.equal(c.forceResult,'BURST');
 c.bonusActive=false;assert.equal(c.takeForcedResult(),'BURST');assert.equal(c.forceResult,'');assert.equal(c.takeForcedResult(),'');
 c.forceResult='BELL';c.bonusActive=true;assert.equal(c.takeForcedResult(),'BELL');assert.equal(c.forceResult,'');
});

test('normal-screen selection creates 150pt AT and a full three-game challenge with random success',()=>{
 const c=context();assert.equal(c.drawNormalResult(),'MISS');const t=c.pendingArtStep;
 assert.equal(t.flow.remaining,'150');assert.equal(t.flow.burstPending,true);assert.equal(t.flow.burstUsed,true);assert.equal(t.zoneSpin,true);
 let s=t.flow;for(let i=0;i<3;i++){const next=NovaArt.step(s,{setting:6},()=>.99999);assert.equal(next.burstEvent,i===2?'failure':'continue');s=next.flow;}
 assert.equal(s.remaining,'150');assert.equal(s.burstWon,false);assert.equal(s.burstLeft,0);
 const won=NovaArt.step(t.flow,{setting:6},()=>0);assert.equal(won.burstEvent,'success');assert.equal(won.flow.remaining,'2150');assert.equal(won.flow.atLevel,5);
});

test('existing quota and stocks survive; active zone finishes before the queued challenge',()=>{
 const c=context(),a=NovaArt;
 const base={...a.startZone(a.enter({setting:6},()=>0),'toto',{},()=>0),remaining:'765',sets:'2',stock:'3',award:'500',sevenHits:1,zoneLeft:1};
 c.normalState.flow=base;c.drawNormalResult();const queued=c.pendingArtStep.flow;
 assert.equal(queued.zone,'toto');assert.equal(queued.zoneLeft,1);assert.equal(queued.award,'500');assert.equal(queued.remaining,'765');assert.equal(queued.stock,'3');assert.equal(queued.sets,'2');
 const end=a.step(queued,{setting:6},()=>.99999,'MISS');assert.equal(end.burstEvent,undefined);assert.equal(end.flow.zone,'');assert.equal(end.flow.burstPending,true);
 const start=a.step(a.normalize(JSON.parse(JSON.stringify(end.flow))),{setting:6},()=>.99999);assert.equal(start.burstEvent,'continue');assert.equal(start.flow.burstLeft,2);
});

test('forced retry escapes recovery or previous challenge without discarding earned quota',()=>{
 const c=context(),a=NovaArt,base={...a.enter({setting:6},()=>0),remaining:'1234',atLevel:5,burstWon:true,burstUsed:true,burstLeft:1,comebackLeft:2,comebackLamp:'toto'};
 const t=c.forcedBurstStep(base);assert.equal(t.flow.remaining,'1234');assert.equal(t.flow.atLevel,5);assert.equal(t.flow.comebackLeft,0);assert.equal(t.flow.burstLeft,0);assert.equal(t.flow.burstWon,false);
 assert.equal(a.step(t.flow,{setting:6},()=>.99999).flow.burstLeft,2);assert.equal(base.comebackLeft,2);
});

test('manual and AUTO/simulation spin paths share flag consumption; measured gameplay is unchanged',()=>{
 assert.equal((html.match(/pendingForceResult = takeForcedResult\(\);/g)||[]).length,2);
 assert(html.includes("['BURST','爆発チャレンジ（3G・成功抽選）']"));
 for(const file of ['nova-art.js','nova-normal.js','nova-flow.js','nova-balance.js'])assert.equal(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),execFileSync('git',['show',`b17a4d6:${file}`],{encoding:'utf8'}).replace(/\r\n/g,'\n'),file);
});
