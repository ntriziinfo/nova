import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import test from 'node:test';
const root=process.cwd();
const reload=x=>JSON.parse(JSON.stringify(x));
const seq=(v,fallback=.99)=>()=>v.length?v.shift():fallback;
const options={setting:3};
export function check(){
 loadModel();
 const ui=vm.createContext({NovaArt,setTimeout,clearTimeout});
 for(const file of ['nova-ladder-presentation.js','nova-direct-award.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ui);
 const game=fs.readFileSync('nova-game.js','utf8');
 vm.runInContext(game.match(/  function rareCueGrade\([^]*?\n  }/)[0],ui);
  for(const upper of [false,true])for(let setting=1;setting<=6;setting++){
   let flow={...NovaArt.enter({setting},()=>.5),researchUpper:upper,remaining:'500',burstUsed:true};
   let t=NovaArt.step(reload(flow),{setting},seq([.9,.9,.1,.1,.5,.5]),'STRONG_NOVA');
   assert.equal(t.atOutcome.direct,0);assert.equal(t.atOutcome.fixed50,true);assert.equal(t.flow.remaining,'500');
   assert.equal(ui.NovaDirectAward.amount({...t,flowBefore:flow,flowAfter:t.flow}),0,'No immediate +50 overlay');
   assert.equal(ui.rareCueGrade({result:'STRONG_NOVA',resolved:{...t,flowBefore:flow,flowAfter:t.flow}}),'hot','Same guaranteed-zone cue eligibility');
   assert.deepEqual(t.flow.atPrelude.zones,['fixed50_sosuke']);assert.equal(t.flow.entryStage,'');
   let elapsed=1;flow=t.flow;
   while(flow.atPrelude){t=NovaArt.step(reload(flow),{setting},()=>.99,'REPLAY');flow=t.flow;elapsed++;}
   assert.equal(elapsed,4);assert.equal(t.atPrelude.after,3);assert.equal(flow.entryStage,'seven');assert.equal(flow.pendingZone,'sosuke');assert(flow.pendingFixed50);
   t=NovaArt.step(reload(flow),{setting},()=>.99);assert.equal(t.result,'BIG');assert.equal(t.flow.entryStage,'roulette');flow=t.flow;
   t=NovaArt.step(reload(flow),{setting},()=>0,'STRONG_NOVA');assert.equal(t.flow.entryStage,'confirmed');assert.equal(t.flow.pendingZone,'sosuke');assert.equal(t.flow.rouletteTable,0);assert(t.flow.pendingFixed50);flow=t.flow;
   flow=NovaArt.prepareBet(reload(flow),{setting},()=>.99);assert.equal(flow.zone,'sosuke');assert(flow.fixed50Zone);assert.equal(flow.award,'50');assert.equal(flow.pendingFixed50,false);
   assert(ui.NovaLadder.eligible(flow),'Existing Sosuke presentation');
   const before=BigInt(flow.remaining);
   t=NovaArt.step(reload(flow),{setting},()=>0,'BELL');assert.equal(t.result,'MISS');assert.equal(t.zoneAward,50);assert(t.flow.ladderRevealed);assert.equal(BigInt(t.flow.remaining),before);flow=t.flow;
   const presentation=reload(flow);
   t=NovaArt.step(reload(flow),{setting},()=>0,'SUPER_NOVA');assert.equal(t.result,'MISS');assert.equal(t.flow.zone,'');assert.equal(t.flow.award,'50');assert.equal(t.flow.remaining,String(before+50n));assert.equal(t.zoneAward,0);assert(!t.flow.fixed50Zone);
   const c=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'nova-results.js'),'utf8'),c);
   const card=c.NovaResults.transition(presentation,t.flow,setting,()=>.5);assert.equal(card.character,'sosuke');assert.equal(card.pt,'50');
   const again=NovaArt.settleZone(reload(t.flow));assert.equal(again.remaining,t.flow.remaining,'No duplicate settlement');
  }
  // A genuine other-zone hit remains in the queue alongside the replacement.
  let s={...NovaArt.enter(options,()=>.5),remaining:'500',burstUsed:true};
  let t=NovaArt.step(s,options,seq([.9,.9,.5,0,.9,.5,.5]),'STRONG_NOVA');
  assert(t.atOutcome.extraZone);assert.deepEqual(t.flow.atPrelude.zones,['fixed50_sosuke',t.atOutcome.extraZone]);
  while(t.flow.atPrelude)t=NovaArt.step(reload(t.flow),options,()=>.99,'REPLAY');
  assert(t.flow.pendingFixed50);assert.equal(t.flow.queuedZones.length,1);assert(t.flow.queuedZones[0]!=='fixed50_sosuke');
  // Further hits in one prelude must retain multiple fixed awards after reload.
  s={...s,atPrelude:{total:5,left:3,zones:['fixed50_sosuke','sora']}};
  t=NovaArt.step(s,options,seq([.9,.9,.1,0,.9]),'STRONG_NOVA');assert.deepEqual(t.flow.atPrelude.zones,['fixed50_sosuke','sora','fixed50_sosuke']);
  while(t.flow.atPrelude)t=NovaArt.step(reload(t.flow),options,()=>.99,'REPLAY');
  assert.deepEqual(t.flow.queuedZones,['sora','fixed50_sosuke']);
  // Queued replacements use Sosuke's existing entry artwork/voices, while the
  // queue retains its fixed reward identity until the engine consumes it.
  s=NovaArt.normalize({...s,atPrelude:null,queuedZones:['fixed50_sosuke','sosuke']});
  const c=vm.createContext({NovaArt,NovaProgress});vm.runInContext(fs.readFileSync(path.join(root,'nova-stock-entry.js'),'utf8'),c);
  const entry=c.NovaStockEntry.prepare(s,{});assert.equal(entry.zone,'sosuke');assert(entry.fixed50);assert(c.NovaStockEntry.matches(entry,s,{}));assert(!c.NovaStockEntry.matches(entry,{...s,queuedZones:['sosuke','fixed50_sosuke']},{}));
  const queued=NovaArt.step(reload(s),options,()=>.99);assert.equal(queued.flow.zone,'sosuke');assert(queued.flow.fixed50Zone);assert.equal(queued.zoneStartFlow.zone,'sosuke');assert.deepEqual(queued.flow.queuedZones,['sosuke']);
  const ordinary=NovaArt.startZone(NovaArt.settleZone(queued.flow),'sosuke',options,()=>.99);assert(!ordinary.fixed50Zone);assert.equal(ordinary.award,'200');
  const quiet=NovaArt.step({...s,queuedZones:[]},{...options,checkpointQuiet:true,netPt:2100,checkpointNext:2400},()=>0,'STRONG_NOVA');assert(quiet.atOutcome.checkpointQuiet);assert.equal(quiet.atOutcome.zone,'');assert(!quiet.atOutcome.fixed50);
}
test('fixed Sosuke: full entry, exact 50pt, persistence, simultaneous/queued awards, UI and checkpoint suppression',check);

test('fixed Sosuke probability preserves the former conditional mean in normal and upper AT',()=>{
 loadModel();
 for(const upper of [false,true])for(const role of ['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA']){
  const rule=NovaArt.atRoleRules[role]||{values:[20,30,50,100,300],weights:[.6,.3,.098,.0018,.0002]};
  const mean=rule.values.reduce((n,v,i)=>n+v*rule.weights[i],0)*(upper?1.5:1),chance=mean/50;
  assert(chance>0&&chance<1);
  for(let setting=1;setting<=6;setting++)for(const [roll,hit]of [[chance-1e-10,true],[chance,false],[.999999,false]]){
   const draws=role==='STRONG_NOVA'?[.1,roll]:[.99,0,roll,.99];
   const t=NovaArt.resolveAtRole({researchUpper:upper},role,setting,seq(draws));
   assert.equal(!!t.fixed50,hit);assert.equal(t.direct,0);
   assert.equal(t.zone,hit?'sosuke':'');
  }
 }
 assert.equal(NovaBalance.zoneMean('fixed50_sosuke'),50);
 assert(!NovaArt.zoneIds.includes('fixed50_sosuke'),'Fixed reward cannot leak into ordinary zone selection');
});
