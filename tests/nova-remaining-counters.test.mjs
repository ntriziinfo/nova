import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});
for(const file of ['nova-art.js','nova-remaining-counters.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const snapshot=(...args)=>JSON.parse(JSON.stringify(ctx.NovaRemainingCounters.snapshot(...args)));
const current=(...args)=>JSON.parse(JSON.stringify(ctx.NovaRemainingCounters.current(...args)));

test('zone award defaults and text controls are independent of the frame; custom positions survive',()=>{
 const api=ctx.NovaRemainingCounters,plain=v=>JSON.parse(JSON.stringify(v));
 assert.deepEqual(plain(api.defaults.zoneaward),{x:45,y:22.6,w:9.4,h:11.8,labelsize:8,valuesize:20,unitsize:10,textgap:4});
 for(const prop of ['labelsize','valuesize','unitsize','textgap'])assert.equal(api.unit('zoneaward',prop),'px');
 assert.equal(api.unit('zoneaward','w'),'%');
 const custom={zoneaward:{x:40,y:25,w:20,h:10},count:{x:21}};
 assert.equal(api.migrateLayout(custom),custom);
 const old={zoneaward:{x:60,y:20,w:18,h:11},count:{x:21}},saved=JSON.stringify(old);
 assert.deepEqual(plain(api.migrateLayout(old)),{zoneaward:{x:45,y:22.6,w:9.4,h:11.8},count:{x:21}});
 assert.equal(JSON.stringify(old),saved);
});

test('zone winnings are per zone, keep the settled result, and never reveal an unresolved award',()=>{
 const flow=Object.freeze({phase:'art',zone:'sora',award:'100',remaining:'300'});
 const before=JSON.stringify(flow),api=ctx.NovaRemainingCounters;
 assert.equal(api.zoneAward(flow).value,'100');
 assert.equal(api.zoneAward(flow,{spin:{resolved:{flowBefore:flow,flowAfter:{...flow,award:'200'}}}}).value,'100');
 assert.equal(api.zoneAward({phase:'art',zone:''},{zoneResult:{kind:'zone',pt:'200',totalPt:'900'}}).value,'200');
 assert.equal(api.zoneAward({phase:'art',zone:'toto',award:'0'}).value,'0');
 assert.equal(api.zoneAward({phase:'normal'}),null);
 assert.equal(api.zoneAward(flow,{bonus:true}),null);
 assert.equal(api.zoneAward(flow,{spin:{resolved:{zoneStartFlow:{zone:'toto',award:'10'},flowBefore:flow}}}).value,'10');
 assert.equal(JSON.stringify(flow),before);
});

test('the shared display switches between CZ, AT and the active zone without changing banked points',()=>{
 const flow=Object.freeze({phase:'art',remaining:'1234',zone:'sora',ura:true,zoneLeft:5});
 assert.deepEqual(current(flow),{mode:'zone',label:'裏空ゾーン',value:'5',unit:'G',active:true,hold:false});
 assert.deepEqual(current({...flow,zone:''}),{mode:'at',label:'AT残り',value:'1,234',unit:'pt',active:true,hold:false});
 assert.equal(current({phase:'cz',remaining:12}).mode,'cz');
 assert.equal(current({phase:'strong_cz',remaining:8}).label,'強CZ残り');
 assert.equal(current({phase:'normal'}).mode,'idle');
 assert.equal(flow.remaining,'1234');
});

test('shared display clears old zone units and HOLD, hides prelude counts, and does not leak future results',()=>{
 const flow=Object.freeze({phase:'art',remaining:'100',researchChallengeActive:true,burstLeft:0,researchAim:'nova'});
 assert.equal(current(flow).hold,true);
 const next=current({phase:'art',remaining:'100'});assert.equal(next.hold,false);assert.equal(next.unit,'pt');
 const prelude=current({phase:'cz',remaining:15},{czPrelude:true});assert.equal(prelude.mode,'idle');assert.equal(prelude.unit,'');
 assert.equal(current({phase:'art',remaining:'100',burstPending:true}).label,'上位AT準備');
 const pending={spin:{resolved:{flowAfter:{phase:'art',zone:'sora',zoneLeft:5,remaining:'1000'}}}};
 assert.equal(current({phase:'art',remaining:'100',zone:'sora',zoneLeft:1},pending).value,'1');
 assert.equal(current({phase:'normal'},{bonus:true}).label,'ボーナス中');
});
test('normal and prelude do not claim an active CZ; CZ counts stay separate from AT points',()=>{
 assert.equal(snapshot({phase:'normal',remaining:0}).atcounter.value,'—');
 for(const phase of ['cz','strong_cz']){
  const flow=Object.freeze({phase,remaining:15});
  const value=snapshot(flow);assert.equal(value.czcounter.value,'15');assert.equal(value.atcounter.active,false);
  assert.equal(snapshot(flow,{czPrelude:true}).czcounter.active,false);
  assert.equal(snapshot(flow,{bonus:true}).czcounter.active,false);
  assert.equal(snapshot(flow,{bonusPending:true}).czcounter.active,false);
 }
});
test('all character zones, initial zone, and 0G holds retain independent AT and zone counters',()=>{
 for(const zone of ['sosuke','toto','urapi','giru','sora','ouma','kushuri_nito'])for(const ura of [false,true]){
  const flow=Object.freeze({phase:'art',remaining:'1234',zone,zoneLeft:3,ura,zero:zone==='ouma'});
  const value=snapshot(flow);assert.equal(value.atcounter.value,'1,234');assert.equal(value.zonecounter.value,'3');
  assert.equal(value.zonecounter.label,ctx.NovaArt.zoneName(flow)+'ゾーン');assert.equal(value.zonecounter.hold,zone==='ouma');
 }
 const huge=snapshot({phase:'art',remaining:'9007199254740993'});assert.equal(huge.atcounter.value,'9,007,199,254,740,993');
 assert.equal(snapshot({phase:'art',remaining:'72',zone:'sora',zoneLeft:3},{bonus:true}).atcounter.value,'72');
 assert.equal(snapshot({phase:'art',remaining:'72',zone:'sora',zoneLeft:3},{bonus:true}).zonecounter.active,false);
});
test('sortie, comeback, preparation and upper challenge use their own countdowns without guessing pending games',()=>{
 for(const [extra,label,left,hold]of [
  [{researchSortieLeft:9},'出陣チャレンジ','9',false],
  [{comebackLeft:4},'引き戻しチャレンジ','4',false],
  [{initialStage:'wait',initialWait:2},'AT準備','2',false],
  [{researchChallengeActive:true,burstLeft:0,researchAim:'nova'},'スーパーノヴァチャレンジ','0',true],
  [{burstLeft:7},'スーパーノヴァチャレンジ','7',false]
 ])assert.deepEqual(snapshot({phase:'art',remaining:'200',...extra}).zonecounter,{label,value:left,unit:'G',active:true,hold});
 const replayGated={phase:'art',remaining:'200',initialStage:'wait',initialWait:0,initialPreparationVersion:ctx.NovaArt.preparationRules.version};
 assert.deepEqual(snapshot(replayGated).zonecounter,{label:'AT準備',value:'開始リプレイ待ち',unit:'',active:true,hold:false});
 assert.equal(ctx.NovaArt.label(replayGated),'AT準備中 / 開始リプレイ待ち');
 assert.equal(ctx.NovaArt.label({phase:'art',remaining:'200',initialStage:'wait',initialWait:2}),'AT準備中 / 残り2G');
 assert.equal(snapshot({phase:'art',burstPending:true}).zonecounter.value,'—');
 assert.equal(snapshot({phase:'art',burstPending:true,zone:'sora',zoneLeft:2}).zonecounter.value,'2');
});
test('in-flight outcomes do not reveal a future reset or award, and queued zone entry shows its actual start',()=>{
 const flow=Object.freeze({phase:'art',remaining:'200',zone:'sora',zoneLeft:1});
 const options={spin:{resolved:{flowAfter:{phase:'art',remaining:'1000',zone:'sora',zoneLeft:5}}}};
 assert.equal(snapshot(flow,options).zonecounter.value,'1');assert.equal(snapshot(flow,options).atcounter.value,'200');
 options.spin.resolved.zoneStartFlow={phase:'art',zone:'ouma',zoneLeft:5};
 assert.equal(snapshot(flow,options).zonecounter.label,'逢魔ゾーン');assert.equal(snapshot(flow,options).zonecounter.value,'5');
 assert.equal(flow.zoneLeft,1);assert.equal(flow.remaining,'200');
});

test('BB remaining points override banked AT and clear on exit without changing state',()=>{
 const flow=Object.freeze({phase:'art',remaining:'1234',zone:'sora',zoneLeft:5});
 for(const left of [300,120,0])assert.deepEqual(current(flow,{bonus:true,bonusRemaining:left}),{mode:'bonus',label:'BB残り',value:String(left),unit:'pt',active:true,hold:false});
 assert.equal(current({phase:'normal'},{bonus:true,bonusRemaining:300}).value,'300');
 assert.equal(current(flow,{bonus:false,bonusRemaining:0}).mode,'zone');
 assert.equal(flow.remaining,'1234');
});


test('lever consumes exactly one displayed G, without leaking ST resets or mutating the draw',()=>{
 for(const zone of ['sosuke','giru','sora','toto','ouma','urapi','kushuri_nito']){
  const before={phase:'art',zone,zoneLeft:1,remaining:'300'},spin={resolved:{flowBefore:before,zoneSpin:true,flowAfter:{...before,zoneLeft:5}}},saved=JSON.stringify(spin);
  assert.equal(current(before,{spin}).value,'0');assert.equal(JSON.stringify(spin),saved);
  assert.equal(current(before,{spin:{resolved:{...spin.resolved,flowBefore:{...before,zero:true}}}}).value,'1');
 }
 for(const phase of ['cz','strong_cz'])assert.equal(current({phase,remaining:1},{spin:{resolved:{flowBefore:{phase,remaining:1}}}}).value,'0');
 for(const [field,flag]of [['researchSortieLeft',{researchSortie:{}}],['comebackLeft',{comebackEvent:'failure'}]]){
  const before={phase:'art',[field]:1};assert.equal(current(before,{spin:{resolved:{flowBefore:before,...flag}}}).value,'0');
 }
 const before={phase:'art',researchChallengeActive:true,burstLeft:4,researchAim:''};
 for(const [role,priorAim,left]of [['MISS','',3],['BELL','',4],['MISS','common',4]])assert.equal(current(before,{spin:{resolved:{flowBefore:before,researchChallenge:{role,priorAim}}}}).value,String(left));
});
