import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function context(extra={}){
  const c=vm.createContext(extra);
  vm.runInContext(fs.readFileSync('nova-role-counter.js','utf8')+';Math.random=()=>{throw Error("counter consumed lottery RNG")}',c);
  return c;
}

test('only ordinary normal games count, including high state and preludes, with bell navigation separated',()=>{
  const {NovaRoleCounter:n}=context(),stats={totalPaid:800,totalFee:300};
  for(const result of ['MISS','WEAK_SUICA','WEAK_NOVA','STRONG_NOVA','REPLAY','BELL']){
    const resolved={flowBefore:{phase:'normal'},highAtStart:true,czPrelude:{after:2}};
    const before=JSON.stringify(resolved);n.record(stats,result,resolved);assert.equal(JSON.stringify(resolved),before);
  }
  n.record(stats,'BELL',{flowBefore:{phase:'normal'},normalBellNavi:true});
  const saved=JSON.stringify(stats);
  for(const resolved of [
    {flowBefore:{phase:'rt'}},{flowBefore:{phase:'art'}},
    {flowBefore:{phase:'art',zone:'sora'}},{flowBefore:{phase:'normal',zero:true}},
    {flowBefore:{phase:'normal'},bonusPendingAtStart:true},{flowBefore:{phase:'normal'},zoneSpin:true}
  ])n.record(stats,'WEAK_SUICA',resolved);
  assert.equal(JSON.stringify(stats),saved);
  assert.equal(stats.normalRoleGames,7);
  for(const role of n.roles)assert.equal(stats[role.key],1,role.label);
  assert.equal(stats.totalPaid,800);assert.equal(stats.totalFee,300);
});

test('both CZ types count for first hits, preparation and zero-game effects do not double count BBs',()=>{
  const c=context({stats:{},NovaDataCounter:{hit(){}}}), n=c.NovaRoleCounter;
  const play=(phase,other={})=>n.record(c.stats,'REPLAY',{flowBefore:{phase},...other});
  vm.runInContext(fn('recordAtFirstEntry'),c);
  c.recordAtFirstEntry({phase:'normal'},{phase:'art'}); // legacy BB already pending on update
  assert.equal(c.stats.firstHitAtCount,undefined);
  play('normal'); play('cz',{bonusHit:true,bonusKind:'BIG'});
  play('normal',{bonusPendingAtStart:true,bonusReady:true,bonusKind:'BIG'});
  play('strong_cz',{bonusReady:true,bonusKind:'BIG'});
  play('cz',{flowBefore:{phase:'cz',zero:true},bonusHit:true,bonusKind:'BIG'});
  play('art',{bonusHit:true,bonusKind:'BIG'}); play('rt');
  c.recordAtFirstEntry({phase:'normal'},{phase:'art'});
  c.recordAtFirstEntry({phase:'art'},{phase:'art'});
  assert.deepEqual([c.stats.firstHitEligibleGames,c.stats.firstHitBigCount,c.stats.firstHitAtCount],[3,2,1]);
  assert.equal(c.stats.normalRoleGames,1);
  assert.equal(c.stats.normalRoleReplayCount,1);
});

test('role counts carry through player changes and reloads, without inventing legacy normal-role history',()=>{
  const {NovaRoleCounter:n}=context();
  const base={normalRoleGames:1000,normalRoleSuikaCount:20},start={normalRoleGames:400,normalRoleSuikaCount:10},stats={normalRoleGames:500,normalRoleSuikaCount:12};
  const expected=n.display(stats,base,start);
  assert.equal(expected.normalRoleGames,1100);assert.equal(expected.normalRoleSuikaCount,22);
  assert.equal(n.odds(expected.normalRoleSuikaCount,expected.normalRoleGames),'1/50.0');
  assert.deepEqual(n.display(stats,base,start),expected);
  assert.equal(n.display(stats,null,start).normalRoleGames,500);
  assert.equal(n.display({normalSpins:5000,bellCount:800,novaRareCounts:{WEAK_SUICA:100}},null,null).normalRoleGames,0);
  assert.equal(n.odds(0,100),'—');assert.equal(n.snapshot(stats).normalRoleSuikaCount,12);
});

test('the counter lists the displayable normal roles while their probabilities remain common',()=>{
  const c=context();
  for(const file of ['nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
  const labels=Object.fromEntries(Array.from(c.NovaRoleCounter.roles,role=>[role.result,role.label]));
  assert.equal(labels.WEAK_SUICA,'スイカ');assert.equal(labels.WEAK_NOVA,'弱チェリー');assert.equal(labels.STRONG_NOVA,'強チェリー');
  const results=Array.from(c.NovaRoleCounter.roles,role=>role.result).sort(),expected=['BELL','NAVI_BELL','REPLAY','STRONG_NOVA','WEAK_NOVA','WEAK_SUICA'];
  assert.deepEqual(results,expected);const common=JSON.stringify(c.NovaNormal.normalRoleProbabilities(1));
  for(let setting=1;setting<=6;setting++){const row=c.NovaNormal.normalRoleProbabilities(setting);assert.equal(JSON.stringify(row),common);for(const role of results)assert(row[role]>0,role);}
  assert(!results.includes('ONE_COIN'));assert(!results.includes('MISS'));
});

test('panel displays cumulative AT and combined BIG with their own denominator, and normal-only small-role odds',()=>{
  const els=new Map(),element=id=>{
    if(!els.has(id))els.set(id,{textContent:'',children:[{}]});return els.get(id);
  };
  const c=context({$:element,stats:{normalRoleGames:100,normalRoleReplayCount:10,firstHitEligibleGames:180,firstHitBigCount:2,firstHitAtCount:1},machineDisplayBase:{normalRoleGames:900,normalRoleReplayCount:90,firstHitEligibleGames:420,firstHitBigCount:3,firstHitAtCount:1},playSessionStartStats:{}});
  vm.runInContext(fn('updateRoleCounter'),c);
  const total={totalSpins:2000,atFirstCount:4,bigCount:10};c.updateRoleCounter(total);
  assert.equal(element('roleCounterTotalGames').textContent,'2,000');
  assert.equal(element('roleCounterEligibleGames').textContent,'600');
  assert.equal(element('roleCounterAtCount').textContent,'2');assert.equal(element('roleCounterAtOdds').textContent,'1/300.0');
  assert.equal(element('roleCounterBigCount').textContent,'5');assert.equal(element('roleCounterBigOdds').textContent,'1/120.0');
  assert.equal(element('roleCounterNormalGames').textContent,'1,000');assert.equal(element('roleCounterReplayOdds').textContent,'1/10.0');
  c.updateRoleCounter({...total,atFirstCountPartial:true});assert.equal(element('roleCounterAtOdds').textContent,'1/300.0');
  c.stats={...total,dataNormalGames:800};c.machineDisplayBase={...total};c.updateRoleCounter(total);
  assert.equal(element('roleCounterEligibleGames').textContent,'0');
  assert.equal(element('roleCounterBigOdds').textContent,'—');assert.equal(element('roleCounterAtOdds').textContent,'—');
});
