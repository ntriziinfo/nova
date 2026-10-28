import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=readGameSource();
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('nova-reel-sheet-data.js','utf8'),context);
vm.runInContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-art.js','utf8'),context);
vm.runInContext(fs.readFileSync('nova-flow.js','utf8'),context);
vm.runInContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-normal.js','utf8'),context);
const constants=source.slice(source.indexOf('  const A_TYPE_PAYOUTS'),source.indexOf('  const symbolImagePreloads'));
const result=source.slice(source.indexOf('  const RESULT ='),source.indexOf('  const SETTING_PROFILE'));
const sheetHelpers=source.slice(source.indexOf('  const NOVA_SHEET_DATA'),source.indexOf('  function novaSymbol'));
const strips=source.slice(source.indexOf('  const REEL_STRIPS ='),source.indexOf('  function mod('));
vm.runInContext('const A_TYPE_PREMIUM_BIG_PAYOUT=500;'+constants+result+sheetHelpers+`
const A_TYPE_MODE=true;
const novaStopGridCache=new Map();const pressedStopCache=new Map();
const novaSymbol=(column,row)=>'NOVA_'+column+'_'+row;
const isNovaGrid=grid=>[0,1,2].every(r=>[0,1,2].every(c=>grid[r][c]===novaSymbol(c,r)));
`+strips+[
'novaGrid','mod','reelWindowFromTopIndex','normalizeATypeResult','displayResultFor','isMiddleLineOnlyResult',
'hasBellDiagonal','cherryResultFromRow','cherryResultFromRows','displayedResultFromGrid',
'displayedResultFromRow','gridPaylineRows','gridHasOnlyAllowedPaylines','buildNovaReelGrid',
'normalRewardFor','resolveATypeBonusOutcome','isCherryResult','novaPatternFromGrid','isNovaResult','buildForcedNovaGrid',
'bellNavigationMiss','nearestNavigatedBellStop','setGridColumn','nearestCommonStopColumn','pressedStopCandidates','nearestPressedStopColumn','prepareManualRareOutcome','drawSuperNovaBonus','resolveNormalOutcome','decideBigPremiumEffect','drawNormalResult'
].map(fn).join('\n')+`
const aTypeBonusRemainingNet=()=>remaining;
let remaining=1;const session={paid:0,bonusKind:"BIG"};const isATypeBonusComplete=()=>session.paid>=NovaArt.bonusTarget(session.bonusKind);
let pendingATypeInternalBonus=null;let pendingArtStep=null;let pendingPreparationRole='';
let pendingForceResult='';const isChanceLampLit=()=>true;
const replayGatedBonusPreparation=()=>false;
const preparationStopOrder=()=>[];
const normalState={sinceBonus:20,bonusPending:false,risingRemain:0};
const settings={};
const NORMAL_ROLE_PAYOUTS={};
const normalizeBonusAfterGames=value=>Number(value)||0;
const normalizeNovaRisingRemain=value=>Number(value)||0;
const isNovaRisingMode=()=>false;
const nextBonusAfterGames=value=>value+1;
`,context);
vm.runInContext(fs.readFileSync('nova-spin-resume.js','utf8'),context);
const run=code=>vm.runInContext(code,context);
const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
test('manual stops use only approved layouts for every order without redrawing outcomes',()=>{
 let seed=123456;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const role of ['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA']){
  let missed=0,caught=0;
  for(const order of orders)for(let trial=0;trial<100;trial++){
   context.role=role;context.order=order;context.positions=[random()*20,random()*20,random()*20];
   const out=run(`(()=>{
    const spin={result:role,grid:buildNovaReelGrid(role,1),stopped:[false,false,false],resolved:{reward:3,bonusHit:true,flowAfter:{phase:'art',remaining:300,stock:2}}};
    const before=JSON.stringify(spin.resolved);let previous=[];
    const originalRandom=Math.random;Math.random=()=>{throw Error('Unexpected RNG');};
    try{for(const i of order){
     const dist=col=>Math.min(...REEL_STRIPS[i].flatMap((_,top)=>col.every((v,r)=>REEL_STRIPS[i][(top+r)%20]===v)?[mod(positions[i]-top,20)]:[]));
     let col;try{col=nearestPressedStopColumn(i,spin,dist,false);}catch(e){throw Error(JSON.stringify({role,order,positions,i,held:spin.pressStopColumns,missed:spin.rareRoleMissed})+e.message);}
     if(!col)throw Error('Missing stop');
     if(dist(col)>4+1e-9&&!spin.rareRoleMissed){
      const held=spin.pressStopColumns;
      if(pressedStopCandidates(role).misses.some(g=>held.every((h,c)=>c===i||!h||h.every((v,r)=>g[r][c]===v))))throw Error('Extended rare catch despite a compatible miss');
     }
     for(const [c,old]of previous)if(old.some((v,r)=>spin.grid[r][c]!==v))throw Error('Changed stopped reel');
     spin.stopped[i]=true;previous.push([i,col.slice()]);
    }
    const unchanged=before===JSON.stringify(spin.resolved);prepareManualRareOutcome(spin);prepareManualRareOutcome(spin);
    return {missed:!!spin.rareRoleMissed,reward:spin.resolved.reward,result:spin.result,unchanged,flow:spin.resolved.flowAfter,bonusHit:spin.resolved.bonusHit,shown:displayedResultFromGrid(spin.grid),listed:Object.values(NOVA_SHEET_STOPS).flat().some(g=>JSON.stringify(g)===JSON.stringify(spin.grid)),approved:(novaSheetStopChoices(role)||[]).some(g=>JSON.stringify(g)===JSON.stringify(spin.grid))};
    }finally{Math.random=originalRandom;}
   })()`);
   assert.equal(out.listed,true);assert.equal(out.unchanged,true);assert.equal(out.result,role);assert.equal(out.bonusHit,true);assert.equal(out.flow.stock,2);assert.equal(out.reward,out.missed?0:3);
   if(out.missed)missed++;else {caught++;assert.equal(out.shown,role);assert.equal(out.approved,true);}
  }
  assert.ok(caught>0);console.log(role,{caught,missed});
 }
});
test('AUTO retains all rare payouts at any press position',()=>{
 for(const role of ['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA','BELL15'])for(const order of orders){context.role=role;context.order=order;
  assert.equal(run(`(()=>{const spin={result:role,grid:buildNovaReelGrid(role,1),stopped:[false,false,false],resolved:{reward:3}};
   for(const i of order){nearestPressedStopColumn(i,spin,col=>Math.min(...REEL_STRIPS[i].flatMap((_,top)=>col.every((v,r)=>REEL_STRIPS[i][(top+r)%20]===v)?[mod(8.5-top,20)]:[])),true);spin.stopped[i]=true;}
   prepareManualRareOutcome(spin);return spin.resolved.reward===3&&!spin.rareRoleMissed&&displayedResultFromGrid(spin.grid)===role&&(novaSheetStopChoices(role)||[]).some(g=>JSON.stringify(g)===JSON.stringify(spin.grid));})()`),true);
 }
});
test('reload retains a committed miss and never removes internal bonus or stock',()=>{
 const out=run(`(()=>{const spin={result:'STRONG_NOVA',grid:buildNovaReelGrid('STRONG_NOVA'),stopped:[true,true,true],pressStopColumns:[['a','b','c'],null,null],rareRoleMissed:true,resolved:{reward:2,bonusHit:true,flowAfter:{stock:3}}};
 const restored=NovaSpinResume.restore(NovaSpinResume.capture(spin),RESULT);prepareManualRareOutcome(restored);
 const again=NovaSpinResume.restore(NovaSpinResume.capture(restored),RESULT);prepareManualRareOutcome(again);return again;})()`);
 assert.equal(out.resolved.reward,0);assert.equal(out.resolved.rareMissPayout,2);assert.equal(out.resolved.bonusHit,true);assert.equal(out.resolved.flowAfter.stock,3);assert.equal(out.pressStopColumns[0][0],'a');
});

test('ordinary misses and one-coin stops use the nearest compatible listed miss in all orders',()=>{
 for(const role of ['MISS','ONE_COIN'])for(const order of orders)for(let trial=0;trial<20;trial++){context.role=role;context.order=order;context.positions=[trial+.5,(trial*3)%20+.5,(trial*7)%20+.5];
 assert.equal(run(`(()=>{const spin={result:role,grid:buildNovaReelGrid(role,1),stopped:[false,false,false],resolved:{reward:role==='ONE_COIN'?1:0}};for(const i of order){const distance=col=>Math.min(...REEL_STRIPS[i].flatMap((_,top)=>col.every((v,r)=>REEL_STRIPS[i][(top+r)%20]===v)?[mod(positions[i]-top,20)]:[]));const col=nearestPressedStopColumn(i,spin,distance,false);const held=spin.pressStopColumns;const pool=pressedStopCandidates('MISS').misses.filter(g=>held.every((h,c)=>c===i||!h||h.every((v,r)=>g[r][c]===v)));const nearest=Math.min(...pool.map(g=>distance(g.map(row=>row[i]))));if(Math.abs(distance(col)-nearest)>1e-9)throw Error('not nearest physical miss');spin.stopped[i]=true;}prepareManualRareOutcome(spin);return displayedResultFromGrid(spin.grid)===role&&!spin.rareRoleMissed;})()`),true);
 }
});

test('middle-first NEBULA aim pulls the three symbols below it up to the top line',()=>{
 const expected=Array.from(run('[NEBULA_SYMBOL,BELL_SYMBOL,REPLAY_SYMBOL]'));
 for(const position of [10,11,12,12.999]){context.position=position;
  const out=run(`(()=>{const spin={result:'MISS',grid:buildNovaReelGrid('MISS',1),stopped:[false,false,false],auditPressOrder:[1],resolved:{reward:0}};
   const distance=col=>Math.min(...REEL_STRIPS[1].flatMap((_,top)=>col.every((v,r)=>REEL_STRIPS[1][(top+r)%20]===v)?[mod(position-top,20)]:[]));
   const originalRandom=Math.random;Math.random=()=>{throw Error('Unexpected RNG');};try{const col=nearestPressedStopColumn(1,spin,distance,false);return {col,distance:distance(col),listed:pressedStopCandidates('MISS').misses.some(g=>col.every((v,r)=>g[r][1]===v))};}finally{Math.random=originalRandom;}})()`);
  assert.deepEqual(Array.from(out.col),expected);
  assert.ok(Math.abs(out.distance-(position-9))<1e-9);assert.equal(out.listed,true);
 }
 context.position=13;
 const outside=run(`(()=>{const spin={result:'MISS',grid:buildNovaReelGrid('MISS',1),stopped:[false,false,false],auditPressOrder:[1],resolved:{reward:0}};
  const distance=col=>Math.min(...REEL_STRIPS[1].flatMap((_,top)=>col.every((v,r)=>REEL_STRIPS[1][(top+r)%20]===v)?[mod(position-top,20)]:[]));return nearestPressedStopColumn(1,spin,distance,false);})()`);
 assert.notDeepEqual(Array.from(outside),expected);
 context.position=10;
 for(const variant of [{automatic:true,audit:'[1]'},{automatic:false,audit:'[0,1]'},{automatic:false,audit:'[1]',zone:true}]){
  context.variant=variant;
  const col=run(`(()=>{const spin={result:'MISS',grid:buildNovaReelGrid('MISS',1),stopped:[false,false,false],auditPressOrder:${variant.audit},zoneActiveAtStart:${!!variant.zone},resolved:{reward:0}};
   const distance=col=>Math.min(...REEL_STRIPS[1].flatMap((_,top)=>col.every((v,r)=>REEL_STRIPS[1][(top+r)%20]===v)?[mod(position-top,20)]:[]));return nearestPressedStopColumn(1,spin,distance,${!!variant.automatic});})()`);
  assert.notDeepEqual(Array.from(col),expected);
 }
});

test('AUTO and super-speed MISS layouts keep BAR at the lower-left without changing the result',()=>{
 let draws=0;context.autoRng=()=>{draws++;return .37;};
 const built=run(`(()=>{const originalRandom=Math.random;Math.random=autoRng;try{return buildNovaReelGrid('MISS',1,0,{autoMissBarBottom:true});}finally{Math.random=originalRandom;}})()`);
 assert.equal(draws,1);assert.equal(built[2][0],'BAR');
 for(const order of [[0,1,2],[1,0,2],[0,2,1]])for(let top=0;top<20;top++){context.top=top;context.order=order;
  const out=run(`(()=>{const spin={result:'MISS',grid:buildNovaReelGrid('MISS',1,0,{autoMissBarBottom:true}),autoMissBarBottom:true,stopped:[false,false,false],auditPressOrder:[],resolved:{reward:0,flowAfter:{phase:'normal'}}};
   const before=JSON.stringify(spin.resolved);for(const i of order){spin.auditPressOrder.push(i);const distance=col=>Math.min(...REEL_STRIPS[i].flatMap((_,n)=>col.every((v,r)=>REEL_STRIPS[i][(n+r)%20]===v)?[mod(top+.5-n,20)]:[]));nearestPressedStopColumn(i,spin,distance,true);spin.stopped[i]=true;}
   return {bar:spin.grid[2][0],listed:pressedStopCandidates('MISS').misses.some(g=>JSON.stringify(g)===JSON.stringify(spin.grid)),same:before===JSON.stringify(spin.resolved),shown:displayedResultFromGrid(spin.grid)};})()`);
  assert.equal(out.bar,'BAR');assert.equal(out.listed,true);assert.equal(out.same,true);assert.equal(out.shown,'MISS');
 }
});

test('wrong bell navigation pays zero but retains the engine decrement and outcomes',()=>{
 for(const role of ['BELL','BELL15'])for(const order of orders){context.role=role;context.order=order;
  const result=run(`(()=>{const spin={result:role,stopped:[true,true,true],bellNaviOrder:[2,1,0],auditPressOrder:order,resolved:{reward:role==='BELL'?8:15,flowAfter:{phase:'art',pt:85,stock:3}}};const before=JSON.stringify(spin.resolved.flowAfter);prepareManualRareOutcome(spin);prepareManualRareOutcome(spin);return {paid:spin.resolved.reward,same:before===JSON.stringify(spin.resolved.flowAfter)};})()`);
  assert.equal(result.paid,order.join()=== '2,1,0'?(role==='BELL'?8:15):0);assert.equal(result.same,true);
 }
});

test('no miss candidate displays left seven-cherry-seven',()=>{
 for(const role of ['MISS','WEAK_SUICA','WEAK_NOVA','STRONG_NOVA']){context.role=role;assert.equal(run("pressedStopCandidates(role).misses.some(g=>g[0][0]==='7'&&g[1][0]===CHERRY_SYMBOL&&g[2][0]==='7')"),false);}
});

test('all bell navigation orders land approved wins or misses without moving held reels',()=>{
 for(const role of ['BELL','BELL15'])for(const nav of orders)for(const order of orders)for(let top=0;top<20;top++){
  context.role=role;context.nav=nav;context.order=order;context.top=top;
  const out=run(`(()=>{const spin={result:role,grid:buildNovaReelGrid(role,1),stopped:[false,false,false],bellNaviOrder:nav,auditPressOrder:[],resolved:{reward:role==='BELL'?8:15,flowAfter:{pt:77}}};
   for(const i of order){const before=spin.grid.map(r=>r.slice());spin.auditPressOrder.push(i);
    nearestNavigatedBellStop(i,spin,col=>Math.min(...REEL_STRIPS[i].flatMap((_,n)=>col.every((v,r)=>REEL_STRIPS[i][(n+r)%20]===v)?[mod(top+.5-n,20)]:[])));
    for(let c=0;c<3;c++)if(spin.stopped[c]&&before.some((r,n)=>r[c]!==spin.grid[n][c]))throw Error('Moved stopped reel');
    spin.stopped[i]=true;
   }
   const wrong=bellNavigationMiss(spin);prepareManualRareOutcome(spin);
   return {wrong,paid:spin.resolved.reward,pt:spin.resolved.flowAfter.pt,listed:(novaSheetStopChoices(wrong?'MISS':role)||[]).some(g=>JSON.stringify(g)===JSON.stringify(spin.grid)),shown:displayedResultFromGrid(spin.grid)};
  })()`);
  assert.equal(out.wrong,nav.join()!==order.join());assert.equal(out.listed,true);assert.equal(out.shown,out.wrong?'MISS':role);assert.equal(out.paid,out.wrong?0:role==='BELL'?8:15);assert.equal(out.pt,77);
 }
});
