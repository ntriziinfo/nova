import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({crypto:{getRandomValues(a){a[0]=123456;return a;}}});
for(const file of ['nova-tuning.js','nova-art.js','nova-aim-confidence.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const C=c.NovaAimConfidence,plain=x=>JSON.parse(JSON.stringify(x));

test('every prior preserves wins and yields exactly blue20/red90/rainbow100 among shown cues',()=>{
 for(const p of [0,.01,.19,.2,.21,.24,.37,.49,.5,.65,.75,.77,.85,.905,.95,.999,1]){
  const rows=C.table(p);
  assert.ok(Math.abs(rows.reduce((n,r)=>n+r.win,0)-p)<1e-10);
  assert.ok(Math.abs(rows.reduce((n,r)=>n+r.miss,0)-(1-p))<1e-10);
  for(const r of rows){assert.ok(r.win>=-1e-10&&r.miss>=-1e-10);if(r.color&&r.win+r.miss>1e-10)assert.ok(Math.abs(r.win/(r.win+r.miss)-({blue:.2,red:.9,rainbow:1}[r.color]))<1e-10);}
 }
});
test('presentation uses no lottery random draw, preserves result/award and caches color for reload',()=>{
 vm.runInContext('Math.random=()=>{throw Error("lottery RNG used");}',c);
 for(const zone of ['ouma','urapi'])for(const won of [false,true]){
  const r={zoneSpin:true,zoneAward:won?100:0,flowBefore:{phase:'art',zone,zoneLeft:4,award:'100'},flowAfter:{phase:'art',zone,award:won?'200':'100'},reward:0};
  const before=plain(r),display=C.prepare(r,{},()=>.5);delete r.aimDisplay;assert.deepEqual(r,before);r.aimDisplay=display;
  assert.deepEqual(C.prepare(r,{},()=>{throw Error('reselected');}),display);
  if(!won)assert.notEqual(display.color,'rainbow');
 }
});
test('guaranteed NOVA wins and seven wins use rainbow; unrelated nebula remains unchanged',()=>{
 const r={zoneSpin:true,zoneAward:100,flowBefore:{phase:'art',zone:'ouma',zoneLeft:1,award:'0'}};
 assert.equal(C.prepare(r,{},()=>.5).color,'rainbow');
 const seven={aim:{symbol:'seven',result:'BIG',guaranteed:true},flowBefore:{phase:'art',zone:'sora'}};
 assert.equal(C.prepare(seven,{},()=>.5).color,'rainbow');
 const nebula={aim:{symbol:'nebula',result:'NEBULA',color:'red'},flowBefore:{phase:'art',zone:'sora'}};
 assert.equal(C.prepare(nebula),null);assert.equal(nebula.aim.color,'red');
});
test('seven color uses guided prior and never changes the engine aim or guide',()=>{
 const r={aim:{symbol:'seven',result:'BIG',guide:true,color:'red'},flowBefore:{phase:'art',zone:'sora',zoneLeft:4,award:'200'}},before=plain(r.aim);
 C.prepare(r,{},()=>.5);assert.deepEqual(r.aim,before);
 const hidden={...r,aimDisplay:undefined,aim:{...r.aim,guide:false}};assert.equal(C.prepare(hidden),null);
});
test('common and rare upper-challenge cues preserve success and guarantee flags',()=>{
 for(const source of ['initial','rare','threshold'])for(const won of [false,true]){
  const r={flowBefore:{phase:'art'},researchChallenge:{source,priorAim:'common',role:'MISS',won,...(source==='threshold'?{targetChance:.65}:{})}};
  const d=C.prepare(r,{setting:1},()=>.5);if(!won)assert.notEqual(d.color,'rainbow');assert.equal(r.researchChallenge.won,won);
 }
 const guaranteed={flowBefore:{phase:'art'},researchChallenge:{source:'initial',priorAim:'rare',role:'MISS',won:true}};
 assert.equal(C.prepare(guaranteed,{setting:1},()=>.5).color,'rainbow');
});
