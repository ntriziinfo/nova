import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(){const c=vm.createContext({});for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);return c;}
function rng(seed=8171){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
const plain=x=>JSON.parse(JSON.stringify(x));

test('AT, bonus, preparation and zone draws do not read the normal lottery',()=>{
 const c=load(),a=c.NovaArt;
 function trace(){const random=rng(),out=[];for(let setting=1;setting<=6;setting++){
  for(let i=0;i<2000;i++){
   out.push(a.step(a.enter({setting},random),{setting},random));
   out.push(a.drawBonus(random,setting));
   const role=a.drawPreparationRole(setting,random);out.push([role,a.drawPreparation(role,setting,random)]);
  }
  for(const zone of a.zoneIds){let s=a.startZone(a.enter({setting},random),zone,{setting},random);for(let i=0;i<20&&s.zone;i++){s=a.prepareBet(s,{setting},random);const t=a.step(s,{setting},random);out.push(t);s=t.flow;}}
 }return plain(out);}
 const before=trace();
 c.NovaNormal=new Proxy({}, {get(){throw Error('AT/bonus read the normal table');}});
 assert.deepEqual(trace(),before);
});

test('independent AT/bonus distributions normalize and retain expected 4pt per game',()=>{
 const a=load().NovaArt;
 for(let setting=1;setting<=6;setting++)for(const row of [a.roleProbabilities(setting),a.bonusRoleProbabilities(setting)]){
  assert.ok(Object.values(row).every(p=>p>=0&&p<=1));
  assert.ok(Math.abs(Object.values(row).reduce((s,p)=>s+p,0)-1)<1e-12);
  const net=Object.entries(row).reduce((sum,[role,p])=>sum+p*a.payout(role),0)-3*(1-row.REPLAY);
  assert.ok(Math.abs(net-4)<1e-12);
 }
 const actual={},random=rng();const N=200000;
 for(let i=0;i<N;i++){const role=a.step(a.normalize({payoutVersion:1,remaining:150}),{setting:3},random).result;actual[role]=(actual[role]||0)+1;}
 for(const [role,p]of Object.entries(a.roleProbabilities(3)))assert.ok(Math.abs((actual[role]||0)/N-p)<6*Math.sqrt(p*(1-p)/N),role);
});

test('phase-specific roles exclude strong bell and split chance eyes 40:60 / 60:40',()=>{const {NovaNormal:n,NovaArt:a}=load();for(let setting=1;setting<=6;setting++){for(const p of [n.roleProbabilities(setting),a.roleProbabilities(setting),a.preparationProbabilities(setting)]){assert.equal(p.STRONG_BELL,undefined);assert.ok(Math.abs(p.CHANCE_A/(p.CHANCE_A+p.CHANCE_B)-(setting%2?.4:.6))<1e-12);}assert.ok(Math.abs(n.roleProbabilities(setting).WEAK_NOVA-n.rareFactor(setting)/128)<1e-12);}});
test('CZ rewrite uses equal chance-eye thresholds',()=>{const f=load().NovaFlow;assert.equal(f.rewriteRates.CHANCE_A,3/14);assert.equal(f.rewriteRates.CHANCE_B,3/14);for(const [role,p]of Object.entries(f.rewriteRates)){const loss={phase:'cz',remaining:10,totalGames:15,success:false,winProbability:.4};assert.equal(f.rewrite(loss,role,{},()=>p-1e-12).success,true);if(p<1)assert.equal(f.rewrite(loss,role,{},()=>p).success,false);}});

test('live bonus preparation routes to its own lottery even when the normal draw is unavailable',()=>{
 const c=load(),html=fs.readFileSync('jag.html','utf8');
 const fn=html.match(/  function drawNormalResult\([^]*?\n  }/)[0];
 vm.runInContext(`const A_TYPE_MODE=true,normalState={bonusPending:true,prepLeft:3},settings={setting:6};let pendingArtStep=null,pendingATypeInternalBonus=null,pendingForceResult='';const isNovaResult=()=>false;`+fn,c);
 c.NovaNormal.drawRole=()=>{throw Error('Normal draw used for preparation');};
 c.NovaArt.drawPreparationRole=setting=>{assert.equal(setting,6);return 'CHANCE_A';};
 assert.equal(c.drawNormalResult(),'CHANCE_A');
 vm.runInContext("pendingForceResult='STRONG_BELL'",c);
 assert.equal(c.drawNormalResult(),'BELL');
});
