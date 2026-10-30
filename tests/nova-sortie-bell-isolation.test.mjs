import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
const copy=x=>JSON.parse(JSON.stringify(x));
const c=vm.createContext({});
for(const file of ['nova-reel-sheet-data.js','nova-sortie-presentation.js','nova-bell-navi.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
vm.runInContext(['bellNavigationMiss','nearestNavigatedBellStop','prepareManualRareOutcome'].map(fn).join('\n'),c);
const sheet=c.NovaReelSheetData;
c.novaSheetStopChoices=()=>{throw Error('Sortie stop must not use ordinary bell/miss choices');};
c.committedAutoReferenceColumn=()=>null;

function makeSpin(role,nav,won){
 return {result:role,grid:[['','',''],['','',''],['','','']],stopped:[false,false,false],pendingStopColumns:[null,null,null],auditPressOrder:[],auditStopOrder:[],bellNaviOrder:nav.slice(),resolved:{researchSortie:{won,zone:won?'sora':''},reward:role==='BELL'?8:15,flowBefore:{phase:'art',researchSortieLeft:4},flowAfter:{phase:'art',researchSortieLeft:3,queuedZones:won?['sora']:[]}}};
}

test('hidden bell orders cannot overwrite sortie NOVA stops at any press position or stop order',()=>{
 for(const role of ['BELL','BELL15'])for(const won of [false,true])for(const nav of orders)for(const order of orders)for(let top=0;top<20;top++){
  const spin=makeSpin(role,nav,won),before=JSON.stringify(spin.resolved);
  const strips=sheet.strips;
  for(const i of order){
   spin.auditPressOrder.push(i);
   const target=copy(c.NovaSortie.target(spin,i,strips).column);
   target.forEach((v,r)=>spin.grid[r][i]=v);
   assert.equal(c.nearestNavigatedBellStop(i,spin,()=>top),null,'sortie target must retain priority over hidden bell navigation');
   assert.deepEqual(spin.grid.map(row=>row[i]),target);
   assert.equal(c.bellNavigationMiss(spin),false,'hidden navigation cannot cause a miss');
   spin.stopped[i]=true;spin.auditStopOrder.push(i);
   const decisive=order[0]===1?1:2-order[0],verdict=c.NovaSortie.stopVerdict(spin);
   assert.equal(!!verdict,spin.auditStopOrder.includes(decisive));
   if(verdict)assert.equal(verdict.won,won);
  }
  assert.equal(JSON.stringify(spin.resolved),before,'stop selection must not change the engine outcome');
  assert.equal(spin.grid[1].every(v=>v==='BAR'),won);
 }
});

test('sortie pays the already-drawn internal role regardless of hidden bell order, including resumed middle-first stops',()=>{
 for(const role of ['BELL','BELL15'])for(const won of [false,true])for(const nav of orders)for(const order of orders){
  const original=makeSpin(role,nav,won);original.auditPressOrder=order.slice();original.auditStopOrder=order.slice();original.stopped=[true,true,true];
  for(const spin of [original,c.NovaSpinResume.restore(c.NovaSpinResume.capture(original),{BELL:{},BELL15:{}})]){
   const before=JSON.stringify(spin.resolved);
   c.prepareManualRareOutcome(spin);c.prepareManualRareOutcome(spin);
   assert.equal(JSON.stringify(spin.resolved),before,'invisible bell order must not remove cash payout or change awarded stocks');
  }
 }
});

test('ordinary visible bell navigation still misses and forfeits its payout on the wrong order',()=>{
 for(const role of ['BELL','BELL15'])for(const order of orders){
  const spin=makeSpin(role,[2,1,0],false);delete spin.resolved.researchSortie;
  spin.auditPressOrder=order.slice();spin.stopped=[true,true,true];
  const wrong=order.join()!=='2,1,0';assert.equal(c.bellNavigationMiss(spin),wrong);
  c.prepareManualRareOutcome(spin);assert.equal(spin.resolved.reward,wrong?0:role==='BELL'?8:15);
 }
});
