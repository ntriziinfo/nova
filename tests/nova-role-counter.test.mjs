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
    {flowBefore:{phase:'cz'}},{flowBefore:{phase:'rt'}},{flowBefore:{phase:'art'}},
    {flowBefore:{phase:'art',zone:'sora'}},{flowBefore:{phase:'normal',zero:true}},
    {flowBefore:{phase:'normal'},bonusPendingAtStart:true},{flowBefore:{phase:'normal'},zoneSpin:true}
  ])n.record(stats,'WEAK_SUICA',resolved);
  assert.equal(JSON.stringify(stats),saved);
  assert.equal(stats.normalRoleGames,7);
  for(const role of n.roles)assert.equal(stats[role.key],1,role.label);
  assert.equal(stats.totalPaid,800);assert.equal(stats.totalFee,300);
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
  const c=context({$:element,stats:{normalRoleGames:100,normalRoleReplayCount:10},machineDisplayBase:{normalRoleGames:900,normalRoleReplayCount:90},playSessionStartStats:{}});
  vm.runInContext(fn('updateRoleCounter'),c);
  const total={totalSpins:2000,atFirstCount:4,bigCount:10};c.updateRoleCounter(total);
  assert.equal(element('roleCounterTotalGames').textContent,'2,000');
  assert.equal(element('roleCounterAtCount').textContent,'4');assert.equal(element('roleCounterAtOdds').textContent,'1/500.0');
  assert.equal(element('roleCounterBigCount').textContent,'10');assert.equal(element('roleCounterBigOdds').textContent,'1/200.0');
  assert.equal(element('roleCounterNormalGames').textContent,'1,000');assert.equal(element('roleCounterReplayOdds').textContent,'1/10.0');
  c.updateRoleCounter({...total,atFirstCountPartial:true});assert.equal(element('roleCounterAtOdds').textContent,'—');
});
