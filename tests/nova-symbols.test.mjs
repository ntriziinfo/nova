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
const novaStopGridCache=new Map();
const committedAutoReferenceColumn=()=>null;
const novaSymbol=(column,row)=>'NOVA_'+column+'_'+row;
const isNovaGrid=grid=>[0,1,2].every(r=>[0,1,2].every(c=>grid[r][c]===novaSymbol(c,r)));
`+strips+[
'novaGrid','mod','reelWindowFromTopIndex','normalizeATypeResult','displayResultFor','isMiddleLineOnlyResult',
'hasBellDiagonal','cherryResultFromRow','cherryResultFromRows','displayedResultFromGrid',
'displayedResultFromRow','gridPaylineRows','gridHasOnlyAllowedPaylines','buildNovaReelGrid',
'normalRewardFor','resolveATypeBonusOutcome','isCherryResult','novaPatternFromGrid','isNovaResult','buildForcedNovaGrid',
'setGridColumn','nearestCommonStopColumn','drawSuperNovaBonus','resolveNormalOutcome','decideBigPremiumEffect','drawNormalResult'
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
test('specified twenty-cell strips contain cherry and middle blanks with no legacy NOVA tiles',()=>{
 assert.equal(run('REEL_STRIPS.every(s=>s.length===20&&!s.some(x=>x.startsWith("NOVA_")))'),true);
 assert.equal(run('REEL_STRIPS[0][12]===BLANK_SYMBOL&&REEL_STRIPS[1][17]===BLANK_SYMBOL&&REEL_STRIPS[2][12]===BLANK_SYMBOL'),true);
 assert.equal(run('[[3,8,13,18],[2,8,12,19],[0,7,15]].every((positions,c)=>positions.every(i=>REEL_STRIPS[c][i]===CHERRY_SYMBOL))'),true);
});

test('actual stop grids match every supported outcome using real consecutive strip cells',()=>{
 for(const result of ['NEBULA','MISS','ONE_COIN','BELL','BELL15','WEAK_SUICA','REPLAY','BIG','BAR3']) for(const row of [0,1,2]){
  run(`globalThis.grid=buildNovaReelGrid(${JSON.stringify(result)},${row});`);
  assert.equal(run('displayedResultFromGrid(grid)'),result);
  assert.equal(run('NOVA_SHEET_STOPS[novaSheetStopRole('+JSON.stringify(result)+')].some(pattern=>novaSheetFingerprint(pattern)===novaSheetFingerprint(grid))'),true);
  assert.equal(run('REEL_STRIPS.every((s,c)=>s.some((_,i)=>[0,1,2].every(r=>grid[r][c]===s[(i+r)%20])))'),true);
 }
});

test('every cached stop candidate comes from the approved sheet category',()=>{
 const violations=run(`(()=>{
  const violations=[];
  for(const role of ['MISS','CZ','STRONG_CZ','ONE_COIN','BELL','BELL15','REPLAY','NEBULA','BIG','BAR3','WEAK_SUICA']){
   for(const row of [0,1,2])for(const first of [0,1,2])buildNovaReelGrid(role,row,first);
  }
  for(const [key,grids]of novaStopGridCache){
   if(key.startsWith('cherry:'))continue;const role=key.split(':')[0];
   for(const grid of grids){
    const sheetRole=novaSheetStopRole(role),patterns=NOVA_SHEET_STOPS[sheetRole]||[];
    if(displayedResultFromGrid(grid)!==role||!patterns.some(pattern=>novaSheetFingerprint(pattern)===novaSheetFingerprint(grid))){
     violations.push({key,grid});break;
    }
   }
  }
  return violations;
 })()`);
 assert.equal(violations.length,0,JSON.stringify(violations));
});

test('stop-grid filtering preserves the visual RNG draw count on cold and cached selections',()=>{
 const draws=run(`(()=>{
  const original=Math.random,counts=[];
  try{
   let calls=0;Math.random=()=>{calls++;return .5;};
   novaStopGridCache.clear();
   for(const role of ['MISS','ONE_COIN','BELL','BELL15','REPLAY','NEBULA','BIG','BAR3','WEAK_SUICA']){
    for(let pass=0;pass<2;pass++){
     const before=calls;buildNovaReelGrid(role,1);counts.push(calls-before);
    }
   }
   return counts;
  }finally{Math.random=original;}
 })()`);
 assert.deepEqual(Array.from(draws),Array(18).fill(1));
});
test('one-coin uses an approved miss stop without changing its exact payout',()=>{
 const audit=run(`(()=>{
  const choices=novaSheetStopChoices('ONE_COIN'),original=Math.random,results=[];
  try{
   novaStopGridCache.delete('ONE_COIN:0');
   for(let index=0;index<choices.length;index++){
    let draws=0;Math.random=()=>{draws++;return (index+.25)/choices.length;};
    const grid=buildNovaReelGrid('ONE_COIN',0),fingerprint=novaSheetFingerprint(grid);
    results.push({draws,fingerprint,expected:novaSheetFingerprint(choices[index]),
     approved:NOVA_SHEET_STOPS.MISS.some(pattern=>novaSheetFingerprint(pattern)===fingerprint),
     displayed:displayedResultFromGrid(grid),safe:gridHasOnlyAllowedPaylines(grid,'ONE_COIN'),
     contiguous:REEL_STRIPS.every((s,c)=>s.some((_,i)=>[0,1,2].every(r=>grid[r][c]===s[(i+r)%20])))});
   }
  }finally{Math.random=original;}
  return {choiceCount:choices.length,results};
 })()`);
 assert(audit.choiceCount>0);
 assert.equal(audit.results.length,audit.choiceCount);
 for(const item of audit.results){
  assert.equal(item.draws,1);assert.equal(item.fingerprint,item.expected);
  assert.equal(item.approved,true);assert.equal(item.displayed,'ONE_COIN');
  assert.equal(item.safe,true);assert.equal(item.contiguous,true);
 }
 assert.equal(run('normalizeATypeResult("ONE_COIN")'),'ONE_COIN');
 assert.equal(run('normalRewardFor("ONE_COIN")'),1);
});
test('active rare labels and browser settlement keep the approved 3pt and 2pt payouts',()=>{
 for(const [role,name,label,payout]of [
  ['WEAK_SUICA','スイカ','スイカ',3],
  ['WEAK_NOVA','弱チェリー','弱チェリー',2],
  ['STRONG_NOVA','強チェリー','強チェリー',2]
 ]){
  assert.equal(run(`RESULT.${role}.name`),name);
  assert.equal(run(`RESULT.${role}.label`),label);
  assert.equal(run(`RESULT.${role}.kind`),'rare');
  assert.equal(run(`normalRewardFor('${role}')`),payout);
  run('normalState.flow=NovaFlow.normalize(null);pendingArtStep=null;');
  assert.equal(run(`resolveNormalOutcome('${role}').reward`),payout);
  run('session.paid=0;');
  assert.equal(run(`resolveATypeBonusOutcome('${role}').reward`),payout);
 }
});
test('bell pays 8 normally and caps the final BIG payout at the remaining 50pt target',()=>{
 assert.equal(run('normalRewardFor("BELL")'),8);
 assert.equal(run('resolveATypeBonusOutcome("BELL").reward'),8);
 assert.equal(run('session.paid=45; resolveATypeBonusOutcome("BELL").reward'),5);
 assert.equal(run('session.paid=50; resolveATypeBonusOutcome("BELL").reward'),0);
});

test('nebula alone awards a bonus ART set, and NOVA strengths no longer substitute for it',()=>{
 run('session.paid=0;');
 assert.equal(run('resolveATypeBonusOutcome("NEBULA").artSetWon'),1);
 assert.equal(run('resolveATypeBonusOutcome("NEBULA").reward'),0);
 for(const role of ['WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'])assert.equal(run(`resolveATypeBonusOutcome('${role}').artSetWon`),0);
 run('session.paid=50;');assert.equal(run('resolveATypeBonusOutcome("NEBULA").artSetWon'),0);
 run('session.paid=0;');
});
test('retired forced outcomes cannot enter active play',()=>{
 assert.equal(run('normalizeATypeResult("GRAPE")'),'BELL');
 for(const name of ['SMALL','CHERRY_ANY','CHERRY_DOUBLE','CHERRY_TRIPLE']) assert.equal(run(`normalizeATypeResult('${name}')`),'MISS');
});
test('cherry strength uses left upper/lower and diagonal triple; middle-only left cherry is not a win',()=>{
 assert.equal(run('novaPatternFromGrid([[CHERRY_SYMBOL,"x","x"],["x",CHERRY_SYMBOL,"x"],["x","x",CHERRY_SYMBOL]])'),'STRONG_NOVA');
 assert.equal(run('novaPatternFromGrid([["x","x",CHERRY_SYMBOL],["x",CHERRY_SYMBOL,"x"],[CHERRY_SYMBOL,"x","x"]])'),'STRONG_NOVA');
 assert.equal(run('novaPatternFromGrid([[CHERRY_SYMBOL,"x","x"],["x","x","x"],["x","x","x"]])'),'WEAK_NOVA');
 assert.equal(run('novaPatternFromGrid([["x","x","x"],[CHERRY_SYMBOL,"x","x"],["x","x","x"]])'),'');
});

test('forced NOVA outcomes survive normalization, keep their strength and settle their exact payout',()=>{
 for(const [result,payout] of [['WEAK_NOVA',2],['STRONG_NOVA',2],['SUPER_NOVA',0]]){
  assert.equal(run(`normalizeATypeResult('${result}')`),result);
  for(let i=0;i<40;i++){
   run(`globalThis.forcedGrid=buildNovaReelGrid('${result}');`);
   assert.equal(run('novaPatternFromGrid(forcedGrid)'),result);
   assert.equal(run('REEL_STRIPS.every((s,c)=>s.some((_,top)=>[0,1,2].every(r=>forcedGrid[r][c]===s[(top+r)%20])))'),true);
  }
  assert.equal(run(`normalRewardFor('${result}')`),payout);
  assert.equal(run(`remaining=96;session.paid=0;resolveATypeBonusOutcome('${result}').reward`),payout);
 }
});
test('Super NOVA retains one 50:50 BIG or premium-BIG outcome without using the sortie-freeze name',()=>{
 for(const [roll,expected] of [[0,'PREMIUM_BIG'],[.499999,'PREMIUM_BIG'],[.5,'BIG'],[.999999,'BIG']]){
  run(`globalThis.drawCount=0; Math.random=()=>{drawCount++;return ${roll}}; globalThis.outcome=resolveNormalOutcome('SUPER_NOVA');`);
  assert.equal(run('outcome.superNovaOutcome'),expected);
  assert.equal(run('outcome.bonusHit'),true);
  assert.equal(run('outcome.bonusKind'),'BIG');
  assert.equal(run('outcome.premiumBonus'),expected==='PREMIUM_BIG');
  assert.equal(run('decideBigPremiumEffect("SUPER_NOVA",outcome,true)'),expected==='PREMIUM_BIG');
  assert.equal(run('drawCount'),1);
 }
 run('drawCount=0; remaining=96; globalThis.bonusOutcome=resolveATypeBonusOutcome("SUPER_NOVA");');
 assert.equal(run('drawCount'),0);
 assert.equal(run('bonusOutcome.superNovaOutcome'),undefined);
 assert.equal(run('bonusOutcome.reward'),0);
});
test('game resolver carries CZ entry and final success into the bonus pipeline',()=>{
 run('settings.novaFlow={czGames:2,czMaxGames:2,czChance:1};normalState.flow=NovaFlow.normalize(null);globalThis.entry=resolveNormalOutcome("CZ");');
 assert.equal(run('entry.flowAfter.phase'),'cz');
 assert.equal(run('entry.flowAfter.remaining'),15);
 assert.equal(run('entry.flowAfter.ruleVersion'),2);
 assert.equal(run('entry.bonusHit'),false);
 run('normalState.flow={...entry.flowAfter,remaining:2};globalThis.czFirst=resolveNormalOutcome("MISS");');
 assert.equal(run('czFirst.flowAfter.remaining'),1);
 run('normalState.flow=czFirst.flowAfter;pendingATypeInternalBonus={kind:"BIG",source:"CZ成功",gamesSinceLastBonusAtStart:20};globalThis.czLast=resolveNormalOutcome("MISS");');
 assert.equal(run('czLast.czCompleted'),true);
 assert.equal(run('czLast.bonusHit'),true);
 assert.equal(run('czLast.bonusSource'),'CZ成功');
 assert.equal(run('czLast.flowAfter.phase'),'normal');
});
test('game resolver enters comeback when final payout exhausts the quota',()=>{
 run('normalState.bonusPending=false;normalState.flow={...NovaArt.enter(),remaining:"3"};pendingArtStep=NovaArt.step(normalState.flow,{rare:0},()=>.99,"BELL");globalThis.endArt=resolveNormalOutcome("BELL");');
 assert.equal(run('endArt.flowAfter.phase'),'art');assert.equal(run('endArt.flowAfter.comebackLeft'),5);assert.equal(run('endArt.bonusHit'),false);
});

test('Sora seven adds points without a bonus and Ouma super never invokes the normal freeze',()=>{
 run('normalState.bonusPending=false;normalState.flow=NovaArt.startZone(NovaArt.enter(),"sora");pendingArtStep=NovaArt.step(normalState.flow,{soraHit:1,soraReset:0},()=>.5);globalThis.soraResolved=resolveNormalOutcome("BIG");');
 assert.equal(run('soraResolved.aTypeBonusReady'),false);assert.equal(run('soraResolved.flowAfter.sets'),'0');assert.equal(run('decideBigPremiumEffect("BIG",soraResolved,true)'),false);
 run('normalState.flow=NovaArt.startZone(NovaArt.enter(),"ouma");normalState.flow.awardTier=4;pendingArtStep=NovaArt.step(normalState.flow,{},()=>0,"SUPER_NOVA");globalThis.oumaResolved=resolveNormalOutcome("SUPER_NOVA");');
 assert.equal(run('oumaResolved.bonusHit'),false);assert.equal(run('oumaResolved.superNovaOutcome'),'');assert.equal(run('oumaResolved.flowAfter.award'),'100');
});

test('freeze pending bonus aligns 777 and is ready without a BAR or second bonus requirement',()=>{
 run('normalState.flow=NovaFlow.normalize(null);normalState.bonusPending=true;normalState.bonusKind="BIG";normalState.premiumBonus=true;normalState.oneGameRenBonus=false;pendingForceResult="";');
 assert.equal(run('drawNormalResult()'),'BIG');
 run('globalThis.freezeReady=resolveNormalOutcome("BIG");');
 assert.equal(run('freezeReady.aTypeBonusReady'),true);
 assert.equal(run('freezeReady.premiumBonus'),true);
 assert.equal(run('freezeReady.oneGameRenBonus'),false);
});

test('CZ full-lamp bonus pending aligns BIG or REG on the very next game',()=>{
 for(const kind of ['BIG','MID']){
  run(`normalState.flow=NovaFlow.normalize(null);normalState.bonusPending=true;normalState.bonusKind="${kind}";normalState.bonusSource="CZ全員点灯";normalState.premiumBonus=false;pendingForceResult="";`);
  assert.equal(run('drawNormalResult()'),kind);
  run('globalThis.fullLampNext=resolveNormalOutcome(drawNormalResult());');
  assert.equal(run('fullLampNext.aTypeBonusReady'),true);
  assert.equal(run('fullLampNext.bonusWaitSpin'),false);
 }
});
test('nearest common stops preserve the role for every reel position and stop order',()=>{
 const stats=run(`(()=>{
 const stats={};const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
 for(const role of ['BELL','REPLAY']){let max=0,total=0,count=0;
  buildNovaReelGrid(role,1);
  const grids=novaStopGridCache.get(role+':1');
  for(const order of orders)for(const direction of [-1,1])for(let l=0;l<20;l++)for(let m=0;m<20;m++)for(let r=0;r<20;r++){
   const positions=[l+.25,m+.25,r+.25],spin={result:role,lineRow:1,grid:grids[0].map(row=>row.slice())};
   for(const i of order){const distances=new Map();for(let top=0;top<20;top++){const key=reelWindowFromTopIndex(i,top).join('|'),d=mod(direction*(top-positions[i]),20);distances.set(key,Math.min(distances.get(key)??Infinity,d));}const distance=column=>distances.get(column.join('|'));
    const column=nearestCommonStopColumn(i,spin,distance),d=distance(column);max=Math.max(max,d);total+=d;count++;
   }
   if(displayedResultFromGrid(spin.grid)!==role||!NOVA_SHEET_STOPS[role].some(pattern=>novaSheetFingerprint(pattern)===novaSheetFingerprint(spin.grid)))throw Error('role mismatch '+role);
  }stats[role]={max,average:total/count,count};
 }return stats;})()`);
 console.log('nearest-stop exhaustive statistics',JSON.stringify(stats));assert.ok(stats.BELL.max<20);assert.ok(stats.REPLAY.max<20);
});

 test('15pt bell grids align bells horizontally using real strip cells',()=>{for(let first=0;first<3;first++){run('globalThis.grid=buildNovaReelGrid("BELL15",1,'+first+');');assert.equal(run('grid[1]['+first+']'), '🔔');assert.equal(run('displayedResultFromGrid(grid)'), 'BELL15');assert.equal(run('REEL_STRIPS.every((s,c)=>s.some((_,i)=>[0,1,2].every(r=>grid[r][c]===s[(i+r)%20])))'),true);}});

test('cherry substitution retains exactly two visual RNG draws, BAR NOVA retains zero',()=>{
 const counts=run(`(()=>{const old=Math.random,out=[];try{let n=0;Math.random=()=>{n++;return .25};for(const role of ['WEAK_NOVA','STRONG_NOVA','SUPER_NOVA']){for(let i=0;i<2;i++){const before=n;buildNovaReelGrid(role);out.push(n-before);}}return out;}finally{Math.random=old;}})()`);
 assert.deepEqual(Array.from(counts),[2,2,2,2,0,0]);
});

test('updated strips support chance roles, all supplied BIG stops and the separate BAR diamond',()=>{
 for(const role of ['CHANCE_A','CHANCE_B','STRONG_SUICA']){
  run('globalThis.grid=buildNovaReelGrid('+JSON.stringify(role)+')');
  assert.equal(run('displayedResultFromGrid(grid)'),run('normalizeATypeResult('+JSON.stringify(role)+')'));
 }
 run('buildNovaReelGrid("BIG");buildNovaReelGrid("BAR3");');
 assert.equal(run('novaStopGridCache.get("BIG:1").length'),4);
 assert.equal(run('novaSheetFingerprint(buildNovaReelGrid("SUPER_NOVA"))===novaSheetFingerprint(NOVA_SHEET_STOPS.SUPER_NOVA[0])'),true);
});

test('old pending layouts migrate their visuals without replacing the current strips or redrawing the outcome',()=>{
 run(`globalThis.currentStrips=JSON.stringify(REEL_STRIPS);
 globalThis.v2Pending=NovaSpinResume.restore({
  version:1,reelLayoutVersion:2,result:'MISS',lineRow:1,
  grid:[['7',BLANK_SYMBOL,'7'],[REPLAY_SYMBOL,BELL_SYMBOL,BELL_SYMBOL],['7',SUICA_SYMBOL,'7']],
  resolved:{reward:0,flowBefore:{phase:'normal'},flowAfter:{phase:'normal'}},stopped:[false,true,false],
  auditStopOrder:[1],bellNaviOrder:[1,2,0]
 },RESULT);
 globalThis.ledgerBefore=JSON.stringify(v2Pending.resolved);
 globalThis.randomBefore=Math.random;
 try{Math.random=()=>{throw Error('migration must not draw');};migratePendingReelLayout(v2Pending);}finally{Math.random=randomBefore;}`);
 assert.equal(run('v2Pending.reelLayoutVersion'),3);
 assert.equal(run('JSON.stringify(v2Pending.resolved)===ledgerBefore'),true);
 assert.equal(run('v2Pending.stopped[1]&&v2Pending.auditStopOrder[0]===1&&v2Pending.bellNaviOrder.join()===\'1,2,0\''),true);
 assert.equal(run('novaSheetStopChoices("MISS").some(g=>novaSheetFingerprint(g)===novaSheetFingerprint(v2Pending.grid))'),true);
 assert.equal(run('REEL_STRIPS.every((strip,column)=>strip.some((_,top)=>[0,1,2].every(row=>v2Pending.grid[row][column]===strip[(top+row)%strip.length])))'),true);
 assert.equal(run('JSON.stringify(REEL_STRIPS)===currentStrips'),true);
});

test('current pending windows and render assets are used directly',()=>{
 run(`globalThis.currentPending={reelLayoutVersion:3,result:'BIG',grid:NOVA_SHEET_STOPS.BIG[0].map(row=>row.slice())};globalThis.currentBefore=JSON.stringify(currentPending);migratePendingReelLayout(currentPending);`);
 assert.equal(run('JSON.stringify(currentPending)===currentBefore'),true);
 assert.doesNotMatch(source,/PIERROT_SYMBOL|ELEPHANT_SYMBOL|GRAPE_SYMBOL|REEL_LAYOUT_V[12]_STRIPS|selectReelLayout/);
 const html=fs.readFileSync('jag.html','utf8');
 assert.doesNotMatch(html,/🐘|🤡|piero\.png|nova-bar-20261027|grapeSymImg/);
});
