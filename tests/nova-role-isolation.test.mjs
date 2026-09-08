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
   out.push(a.step(a.enter(),{setting},random));
   out.push(a.drawBonus(random,setting));
   const role=a.drawPreparationRole(setting,random);out.push([role,a.drawPreparation(role,setting,random)]);
  }
  for(const zone of a.zoneIds){let s=a.startZone(a.enter(),zone,{setting},random);for(let i=0;i<20&&s.zone;i++){s=a.prepareBet(s,{setting},random);const t=a.step(s,{setting},random);out.push(t);s=t.flow;}}
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
 for(let i=0;i<N;i++){const role=a.step(a.enter(),{setting:3},random).result;actual[role]=(actual[role]||0)+1;}
 for(const [role,p]of Object.entries(a.roleProbabilities(3)))assert.ok(Math.abs((actual[role]||0)/N-p)<6*Math.sqrt(p*(1-p)/N),role);
});

test('normal/CZ strong roles appear 20% less often, conditional CZ weights double, and base stays stable',()=>{
 const c=load(),n=c.NovaNormal,a=c.NovaArt,f=c.NovaFlow;
 const changed={STRONG_SUICA:[500,.3,.25],STRONG_BELL:[400,.2,.2],CHANCE_A:[250,.25,.25],WEAK_NOVA:[400,.15,.1],STRONG_NOVA:[2000,.5,.5]};
 for(let setting=1;setting<=6;setting++){
  const row=n.roleProbabilities(setting),old=a.preparationProbabilities(setting);
  for(const [role,[denom,cz,rewrite]]of Object.entries(changed)){
   assert.ok(Math.abs(row[role]-.8*n.rareFactor(setting)/denom)<1e-15);
   assert.equal(n.rare[role].cz,2*cz);assert.equal(f.rewriteRates[role],2*rewrite);
   assert.ok(Math.abs(row[role]*n.rare[role].cz-1.6*old[role]*cz)<1e-15);
   assert.ok(Math.abs(row[role]*f.rewriteRates[role]-1.6*old[role]*rewrite)<1e-15);
  }
  for(const role of ['WEAK_SUICA','CHANCE_B','REPLAY'])assert.equal(row[role],old[role]);
  const cost=p=>3*(1-p.REPLAY)-Object.entries(p).reduce((s,[role,v])=>s+v*n.pay(role),0);
  assert.ok(Math.abs(cost(row)-cost(old))<1e-12);
 }
 assert.equal(n.defaults.superDenom,32768);
});

test('CZ rewrite and normal CZ entry use the new conditional rates at the actual branch boundaries',()=>{
 const c=load(),{NovaNormal:n,NovaFlow:f,NovaBalance:b}=c;
 for(const phase of ['cz','strong_cz'])for(const [role,p]of Object.entries(f.rewriteRates)){
  const loss={phase,remaining:10,totalGames:15,success:false,winProbability:.4};
  assert.equal(f.rewrite(loss,role,{},()=>p-1e-12).success,true);
  if(p<1)assert.equal(f.rewrite(loss,role,{},()=>p).success,false);
 }
 for(const level of ['low','high'])for(const games of [0,100])for(const role of Object.keys(n.rare)){
  const state={mode:'通常A',level,games},scale=b.profile(3).scale;
  const p=n.rare[role].cz*scale*n.multiplier(state);
  const run=roll=>{const seq=[.99,roll,.5];return n.spin(state,{phase:'normal'},3,{scale},()=>seq.shift()??.99,role);};
  assert.equal(run(p-1e-12).entry,'CZ');assert.equal(run(p).entry,'');
 }
});

test('live bonus preparation routes to its own lottery even when the normal draw is unavailable',()=>{
 const c=load(),html=fs.readFileSync('jag.html','utf8');
 const fn=html.match(/  function drawNormalResult\([^]*?\n  }/)[0];
 vm.runInContext(`const A_TYPE_MODE=true,normalState={bonusPending:true,prepLeft:3},settings={setting:6};let pendingArtStep=null,pendingATypeInternalBonus=null,pendingForceResult='';const isNovaResult=()=>false;`+fn,c);
 c.NovaNormal.drawRole=()=>{throw Error('Normal draw used for preparation');};
 c.NovaArt.drawPreparationRole=setting=>{assert.equal(setting,6);return 'CHANCE_A';};
 assert.equal(c.drawNormalResult(),'CHANCE_A');
 vm.runInContext("pendingForceResult='STRONG_BELL'",c);
 assert.equal(c.drawNormalResult(),'STRONG_BELL');
});
