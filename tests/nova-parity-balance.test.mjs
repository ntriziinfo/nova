import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(){
 const context=vm.createContext({});
 for(const file of ['nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
 return {t:context.NovaTuning,a:context.NovaArt,f:context.NovaFlow,n:context.NovaNormal};
}
const plain=value=>JSON.parse(JSON.stringify(value));
const near=(actual,expected,tolerance=1e-12)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
const sequence=(...values)=>{let index=0;return ()=>values[index++]??.999999999;};
const moments=row=>{
 const total=row.weights.reduce((sum,value)=>sum+value,0),mean=row.values.reduce((sum,value,index)=>sum+value*row.weights[index],0)/total;
 return {mean,variance:row.values.reduce((sum,value,index)=>sum+(value-mean)**2*row.weights[index],0)/total};
};

test('normal, AT and preparation role tables stay common while base30 and net targets remain fixed',()=>{
 const {a,n}=load(),settings=[1,2,3,4,5,6],normal=plain(n.roleProbabilities(3)),base=plain(n.normalRoleProbabilities(3)),at=plain(a.roleProbabilities(3)),upper=plain(a.roleProbabilities(3,true)),preparation=plain(a.preparationProbabilities(3)),bonus=plain(a.bonusRoleProbabilities(3,'normal',false));
 for(const setting of settings){
  assert.deepEqual(plain(n.roleProbabilities(setting)),normal);
  assert.deepEqual(plain(n.normalRoleProbabilities(setting)),base);
  assert.deepEqual(plain(a.roleProbabilities(setting)),at);
  assert.deepEqual(plain(a.roleProbabilities(setting,true)),upper);
  assert.deepEqual(plain(a.preparationProbabilities(setting)),preparation);
  assert.deepEqual(plain(a.bonusRoleProbabilities(setting,'normal',false)),bonus);
  for(const row of [normal,base,at,upper,preparation,bonus])near(Object.values(row).reduce((sum,value)=>sum+value,0),1);
  const cash=Object.entries(base).reduce((sum,[role,probability])=>sum+probability*(role==='NAVI_BELL'?8:n.pay(role)),0);
  near(50/(3*(1-base.REPLAY)-cash),30,1e-9);
  for(const [row,target] of [[at,a.atNetRules.normal],[upper,a.atNetRules.upper]])near(Object.entries(row).reduce((sum,[role,probability])=>sum+probability*a.cashPayout(role),0)-3,target);
  near(Object.entries(preparation).reduce((sum,[role,probability])=>sum+probability*a.preparationCashPayout(role),0)-3,a.preparationRules.targetNet);
 }
});

test('CZ profiles make each even setting steadier than the preceding odd setting and keep every CZ at 15G',()=>{
 const {t,f}=load(),profiles=[1,2,3,4,5,6].map(t.balanceProfile);
 assert.deepEqual(profiles.map(profile=>profile.style),['rough','steady','rough','steady','rough','steady']);
 for(let odd=0;odd<6;odd+=2){
  const rough=profiles[odd],steady=profiles[odd+1];
  for(const key of ['gameCzEntry','rareCzEntry','gameCzSuccess','rareCzSuccess','strongCzSuccess','strongRareSuccess'])assert.ok(steady[key]>rough[key],`${key}: setting ${odd+2} must exceed ${odd+1}`);
  assert.ok(f.rareDirectPerGameRates[odd]>f.rareDirectPerGameRates[odd+1]);
  assert.ok(f.gameRewriteRates[odd]>f.gameRewriteRates[odd+1]);
 }
 for(let setting=1;setting<=6;setting++){
  const profile=profiles[setting-1],configured=f.forSetting({},setting);
  near(configured.czChance,profile.gameCzSuccess);near(configured.strongChance,profile.strongCzSuccess);
  near(f.rareTargets[setting-1],profile.rareCzSuccess);near(f.strongRareTargets[setting-1],profile.strongRareSuccess);
  near(1-(1-f.rarePerGameRates[setting-1])**15,profile.rareCzSuccess);
  near(1-(1-f.strongRarePerGameRates[setting-1])**15,profile.strongRareSuccess);
  const rare=f.enterCZ(false,configured,()=>.999999,'rare'),game=f.enterCZ(false,configured,()=>.999999,'game');
  for(const flow of [rare,game]){assert.equal(flow.remaining,15);assert.equal(flow.totalGames,15);}
  near(rare.targetProbability,profile.rareCzSuccess);near(rare.directPerGameChance,f.rareDirectPerGameRates[setting-1]);near(game.targetProbability,profile.gameCzSuccess);
 }
});

test('weak roles keep a common 15% response while quality and repeat-zone spread create odd/even character',()=>{
 const {t,a}=load(),profiles=[1,2,3,4,5,6].map(t.balanceProfile);
 for(let setting=1;setting<=6;setting++){
  const profile=profiles[setting-1];
  assert.equal(profile.weakResponse,.15);assert.equal(profile.weakQuality.reduce((sum,value)=>sum+value,0),100);
  assert.deepEqual(plain(a.balanceFor(setting).weakQuality),plain(profile.weakQuality));
  assert.deepEqual(plain(a.weakQualityWeights(setting,false)),plain(profile.weakQuality));
  near(a.weakAtResponseChance(setting,false,false),.15);near(a.weakAtResponseChance(setting,true,false),.15);
  near(a.weakAtResponseChance(setting,false,true),.225);near(a.weakAtResponseChance(setting,true,true),.225);
  assert.equal(a.drawWeakAtReward(setting,{},()=>.15).quality,-1);
  let edge=0;
  for(let quality=0;quality<profile.weakQuality.length;quality++){
   const weight=profile.weakQuality[quality];if(!weight)continue;
   const roll=(edge+weight/2)/100,out=a.drawWeakAtReward(setting,{},sequence(0,roll,0));
   assert.equal(out.quality,quality);
   if(quality===0){assert.equal(out.direct,10);assert.equal(out.keepDirect,true);}
   else if(quality===1){assert.equal(out.zone,'sosuke');assert.equal(out.fixed50,true);}
   else assert.ok(a.zoneGroups[['weak','strong','super'][quality-2]].includes(out.zone));
   edge+=weight;
  }
  const repeat=profile.repeatZone;near(repeat.weights.reduce((sum,value)=>sum+value,0),1);
  edge=0;for(let index=0;index<repeat.values.length;index++){const roll=edge+repeat.weights[index]/2;assert.equal(a.drawRepeatZoneFactor(setting,()=>roll),repeat.values[index]);edge+=repeat.weights[index];}
 }
 for(let odd=0;odd<6;odd+=2){
  assert.ok(profiles[odd].weakQuality.slice(3).reduce((sum,value)=>sum+value,0)>profiles[odd+1].weakQuality.slice(3).reduce((sum,value)=>sum+value,0));
  assert.ok(moments(profiles[odd].repeatZone).variance>moments(profiles[odd+1].repeatZone).variance);
 }
});

test('first earned zone stays common, repeat factors survive saves, and settlement applies the selected factor',()=>{
 const {a}=load();
 for(let setting=1;setting<=6;setting++){
  let flow=a.enter({setting},()=>.5);flow.remaining='100';
  const first=a.startZone(flow,'toto',{setting},()=>.5);assert.equal(first.balanceZoneCount,1);assert.equal(first.zoneBalanceFactor,1);
  const saved=a.normalize(plain(first));assert.equal(saved.balanceZoneCount,1);assert.equal(saved.zoneBalanceFactor,1);
  const after=a.settleZone({...saved,award:'100'}),factor=a.balanceFor(setting).repeatZone.values[0];
  const second=a.startZone(after,'toto',{setting},()=>0);assert.equal(second.balanceZoneCount,2);assert.equal(second.zoneBalanceFactor,factor);
  const reloaded=a.normalize(plain(second));assert.equal(reloaded.zoneBalanceFactor,factor);
  const settled=a.settleZone({...reloaded,remaining:'0',award:'100'});assert.equal(settled.remaining,a.balanceZoneAward(100,factor).toString());assert.equal(settled.zoneBalanceFactor,1);
 }
});

test('300pt plus alpha entry and replay-gated preparation mechanics remain fixed',()=>{
 const {a}=load();assert.equal(a.freshInitialRules.quota,300);assert.deepEqual(plain(a.freshInitialBases),[100,100,100,100,100,100]);assert.equal(a.preparationRules.startReplayChance,1/3);assert.equal(a.preparationRules.meanGames,3);
 for(let setting=1;setting<=6;setting++){
  assert.equal(a.freshInitialAward(setting,'BELL'),100);assert.equal(a.freshInitialAward(setting,'WEAK_NOVA'),150);assert.equal(a.freshInitialAward(setting,'STRONG_NOVA'),200);
  const row=a.initialRoleProbabilities(setting),mean=3*Object.entries(row).reduce((sum,[role,probability])=>sum+probability*a.freshInitialAward(setting,role==='BELL15'?'BELL':role),0);
  near(mean,306.0206038135593,1e-9);
  const entry=a.enterInitial({setting},()=>.999999);assert.equal(entry.entryQuota,'300');assert.equal(entry.initialPreparationVersion,a.preparationRules.version);assert.equal(entry.initialStage,'wait');
  const preparation=a.preparationProbabilities(setting),startChance=a.preparationRules.startReplayRoles.reduce((sum,role)=>sum+preparation[role],0);
  near(startChance,1/3);near(1/startChance,3);near(Object.entries(preparation).reduce((sum,[role,probability])=>sum+probability*a.preparationCashPayout(role),0)-3,1.2);
 }
});
