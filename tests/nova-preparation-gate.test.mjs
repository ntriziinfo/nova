import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(){
 const c=vm.createContext({});
 for(const file of ['nova-tuning.js','nova-art.js','nova-normal.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 return c.NovaArt;
}
const sequence=(...values)=>{let index=0;return ()=>values[index++]??.999999999;};
const plain=value=>JSON.parse(JSON.stringify(value));

test('preparation uses one common role table and three equal start replays',()=>{
 const a=load(),ordinary=0.1341900203150272,bell=.33899124238186484,miss=.16398540396977482,rare=[.026499999999999996,.0025,.0005],common=plain(a.preparationProbabilities(3));
 assert.equal(a.preparationRules.version,20261027);
 assert.equal(a.preparationRules.startReplayChance,1/3);
 assert.equal(a.preparationRules.meanGames,3);
 for(const [role,payout]of [['WEAK_SUICA',3],['WEAK_NOVA',2],['STRONG_NOVA',2]])assert.equal(a.preparationCashPayout(role),payout);
 for(let setting=1;setting<=6;setting++){
  const row=a.preparationProbabilities(setting);
  assert.deepEqual(plain(row),common);
  assert.deepEqual([row.WEAK_SUICA,row.WEAK_NOVA,row.STRONG_NOVA],rare);
  assert.equal(row.REPLAY,ordinary);
  assert.equal(row.BELL,bell);assert.equal(row.MISS,miss);
  for(const role of a.preparationRules.startReplayRoles)assert.equal(row[role],1/9);
  assert.ok(Object.values(row).every(probability=>probability>=0&&probability<=1));
  assert.ok(Math.abs(Object.values(row).reduce((sum,probability)=>sum+probability,0)-1)<1e-12);
  let edge=0;for(const [role,probability]of Object.entries(row)){if(probability)assert.equal(a.drawPreparationRole(setting,()=>(edge+probability/2)),role);edge+=probability;}
  const net=Object.entries(row).reduce((sum,[role,probability])=>sum+probability*a.preparationCashPayout(role),0)-3;
  assert.ok(Math.abs(net-1.2)<1e-12,`setting ${setting}: ${net}`);
 }
 assert.equal(1/a.preparationRules.startReplayChance,3);
});

test('start replay roles retain their complete three-choice stop order and refund the BET',()=>{
 const a=load(),expected={
  START_REPLAY_RIGHT:['right','middle','left'],
  START_REPLAY_MIDDLE:['middle','right','left'],
  START_REPLAY_LEFT:['left','middle','right']
 };
 for(const [role,stops]of Object.entries(expected)){
  assert.equal(a.isPreparationStartReplay(role),true);
  assert.equal(a.preparationStartOrder(role),stops[0]);
  assert.equal(a.preparationDisplayRole(role),'REPLAY');
  assert.deepEqual(plain(a.preparationRules.startReplayStops[stops[0]]),stops);
  assert.equal(a.preparationCashPayout(role),3);
  assert.equal(a.cashPayout(role),3);
 }
 assert.equal(a.isPreparationStartReplay('REPLAY'),false);
 assert.equal(a.preparationStartOrder('REPLAY'),'');
 assert.equal(a.preparationDisplayRole('BELL'),'BELL');
});

test('bonus preparation independently draws upper BIG, upper AT and AT entitlement with rare multi-stocks',()=>{
 const a=load(),weak=a.preparationRules.bonus.weak,strong=a.preparationRules.bonus.strong;
 assert.deepEqual(plain(weak),{upperBonus:0.013189655172413795,upperAt:0.06594827586206897,at:0.13189655172413794});
 assert.deepEqual(plain(strong),{upperBonus:.05,upperAt:.25,at:.5});
 assert.deepEqual(plain(a.drawBonusPreparationReward('WEAK_SUICA',1,sequence(0,0,0,0))),{upperBonus:true,upperAt:true,atConfirmed:true,sets:1,stockCount:1});
 assert.deepEqual(plain(a.drawBonusPreparationReward('WEAK_NOVA',1,sequence(1,0,1,.9945))),{upperBonus:false,upperAt:true,atConfirmed:true,sets:2,stockCount:2});
 assert.deepEqual(plain(a.drawBonusPreparationReward('STRONG_NOVA',1,sequence(1,1,0,.9995))),{upperBonus:false,upperAt:false,atConfirmed:true,sets:3,stockCount:3});
 assert.deepEqual(plain(a.drawBonusPreparationReward('STRONG_NOVA',1,sequence(.05,.25,.5))),{upperBonus:false,upperAt:false,atConfirmed:false,sets:0,stockCount:0});
 let calls=0;assert.deepEqual(plain(a.drawBonusPreparationReward('MISS',1,()=>{calls++;return 0;})),{upperBonus:false,upperAt:false,atConfirmed:false,sets:0,stockCount:0});assert.equal(calls,0);
});

test('AT preparation awards only one existing-weight character-zone stock',()=>{
 const a=load(),weak=a.preparationRules.at.weakZone,strong=a.preparationRules.at.strongZone;
 assert.equal(weak,0.06594827586206897);assert.equal(strong,.25);
 for(let setting=1;setting<=6;setting++){
  const factor=a.balanceFor(setting).preparationReward;
  assert.equal(a.atPreparationZoneChance('WEAK_SUICA',setting),Math.min(1,weak*factor));
  assert.equal(a.atPreparationZoneChance('WEAK_NOVA',setting),Math.min(1,weak*factor));
  assert.equal(a.atPreparationZoneChance('STRONG_NOVA',setting),Math.min(1,strong*factor));
 }
 const weak1=a.atPreparationZoneChance('WEAK_SUICA',1),strong1=a.atPreparationZoneChance('STRONG_NOVA',1);
 assert.deepEqual(plain(a.drawAtPreparationReward('WEAK_SUICA',1,sequence(weak1-1e-12,0))),{sets:0,zones:['sosuke']});
 assert.deepEqual(plain(a.drawAtPreparationReward('WEAK_NOVA',1,sequence(weak1))),{sets:0,zones:[]});
 assert.deepEqual(plain(a.drawAtPreparationReward('STRONG_NOVA',1,sequence(strong1-1e-12,.999999))),{sets:0,zones:['ura_ouma']});
 assert.deepEqual(plain(a.drawPreparation('STRONG_NOVA',1,sequence(0,0))),{sets:0,zones:['sosuke']});
});

test('new initial AT waits for a start replay, saves zone rewards, and legacy waits still count down',()=>{
 const a=load();
 let flow=a.enterInitial({setting:3},()=>.99);
 assert.equal(flow.initialPreparationVersion,a.preparationRules.version);assert.equal(flow.initialWait,0);
 let spin=a.step(flow,{setting:3},()=>.99,'MISS');
 assert.equal(spin.initialPreparationSpin,true);assert.equal(spin.initialPreparationStarted,false);assert.equal(spin.flow.initialStage,'wait');
 spin=a.step(spin.flow,{setting:3},sequence(0,0),'WEAK_SUICA');
 assert.deepEqual(plain(spin.preparationReward),{sets:0,zones:['sosuke']});assert.deepEqual(plain(spin.flow.queuedZones),['sosuke']);
 for(const [role,order,stops]of [
  ['START_REPLAY_RIGHT','right',['right','middle','left']],
  ['START_REPLAY_MIDDLE','middle',['middle','right','left']],
  ['START_REPLAY_LEFT','left',['left','middle','right']]
 ]){
  const started=a.step(a.enterInitial({setting:3},()=>.99),{setting:3},()=>.5,role);
  assert.equal(started.initialPreparationStarted,true);assert.equal(started.prepStartOrder,order);assert.deepEqual(plain(started.prepStartOrderStops),stops);
  assert.equal(started.flow.initialStage,'entry');assert.equal(started.flow.entryStage,'seven');
 }
 flow=a.normalize({...a.enterInitial({setting:3},()=>.99),initialPreparationVersion:0,initialWait:2});
 spin=a.step(flow,{setting:3},()=>.99,'MISS');assert.equal(spin.flow.initialStage,'wait');assert.equal(spin.flow.initialWait,1);
 spin=a.step(spin.flow,{setting:3},()=>.99,'MISS');assert.equal(spin.flow.initialStage,'entry');assert.equal(spin.flow.initialWait,0);
});

test('CZ direct zone selector excludes only Sosuke and keeps all other preparation-weight zones reachable',()=>{
 const a=load(),seen=new Set();
 for(let i=0;i<10000;i++){const zone=a.pickNonSosukeZone(3,()=>(i+.5)/10000);assert.notEqual(zone,'sosuke');seen.add(zone);}
 assert.deepEqual([...seen].sort(),plain(a.zoneIds).filter(zone=>zone!=='sosuke').sort());
});

test('live preparation seals its rare reward in the saved spin and carries delayed CZ direct awards',()=>{
 const source=fs.readFileSync('nova-game.js','utf8');
 assert.match(source,/const bonusPreparationReward=bonusPreparationSpin\?NovaArt\.drawBonusPreparationReward\(preparationRole,settings\.setting\):null/);
 assert.match(source,/const won=resolved\.bonusPreparationReward\|\|NovaArt\.drawBonusPreparationReward\(role,settings\.setting\)/);
 assert.match(source,/normalState\.reachMePrepSets = resolved\.czDirect \? 1 : 0/);
 assert.match(source,/beginBonusPreparation\(prepAward\)/);
});
