import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('jag.html','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('nova-art.js','utf8'),context);
vm.runInContext(fs.readFileSync('nova-flow.js','utf8'),context);
vm.runInContext(fs.readFileSync('nova-normal.js','utf8'),context);
const constants=source.slice(source.indexOf('  const A_TYPE_PAYOUTS'),source.indexOf('  const symbolImagePreloads'));
const result=source.slice(source.indexOf('  const RESULT ='),source.indexOf('  const SETTING_PROFILE'));
const strips=source.slice(source.indexOf('  const REEL_STRIPS ='),source.indexOf('  function mod('));
vm.runInContext('const A_TYPE_PREMIUM_BIG_PAYOUT=500;'+constants+result+`
const A_TYPE_MODE=true;
const novaStopGridCache=new Map();
const novaSymbol=(column,row)=>'NOVA_'+column+'_'+row;
const isNovaGrid=grid=>[0,1,2].every(r=>[0,1,2].every(c=>grid[r][c]===novaSymbol(c,r)));
`+strips+[
'mod','reelWindowFromTopIndex','normalizeATypeResult','displayResultFor','isMiddleLineOnlyResult',
'hasBellDiagonal','cherryResultFromRow','cherryResultFromRows','displayedResultFromGrid',
'displayedResultFromRow','gridPaylineRows','gridHasOnlyAllowedPaylines','buildNovaReelGrid',
'normalRewardFor','resolveATypeBonusOutcome','isCherryResult','novaPatternFromGrid','isNovaResult','buildForcedNovaGrid',
'drawSuperNovaBonus','resolveNormalOutcome','decideBigPremiumEffect','drawNormalResult'
].map(fn).join('\n')+`
const aTypeBonusRemainingNet=()=>remaining;
let remaining=1;const session={paid:0,bonusKind:"BIG"};const isATypeBonusComplete=()=>session.paid>=NovaArt.bonusTarget(session.bonusKind);
let pendingATypeInternalBonus=null;let pendingArtStep=null;
let pendingForceResult='';const isChanceLampLit=()=>true;
const normalState={sinceBonus:20,bonusPending:false,risingRemain:0};
const settings={};
const NORMAL_ROLE_PAYOUTS={};
const normalizeBonusAfterGames=value=>Number(value)||0;
const normalizeNovaRisingRemain=value=>Number(value)||0;
const isNovaRisingMode=()=>false;
const nextBonusAfterGames=value=>value+1;
`,context);
const run=code=>vm.runInContext(code,context);
test('every reel has exactly one contiguous three-cell logo and no retired symbols',()=>{
 assert.equal(run('REEL_STRIPS.every((s,c)=>s.length===21 && s.filter(x=>x.startsWith("NOVA_")).length===3 && [0,1,2].every(r=>s[6+r]===novaSymbol(c,r)) && !s.some(x=>[GRAPE_SYMBOL,CHERRY_SYMBOL,PIERROT_SYMBOL].includes(x)))'),true);
});
test('actual stop grids match every supported outcome using real consecutive strip cells',()=>{
 for(const result of ['NEBULA','MISS','BELL','STRONG_BELL','WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B','REPLAY','BIG','MID','BAR3']) for(const row of [0,1,2]){
  run(`globalThis.grid=buildNovaReelGrid(${JSON.stringify(result)},${row});`);
  assert.equal(run('displayedResultFromGrid(grid)'),result);
  assert.equal(run('gridHasOnlyAllowedPaylines(grid,'+JSON.stringify(result)+')'),true);
  assert.equal(run('REEL_STRIPS.every((s,c)=>s.some((_,i)=>[0,1,2].every(r=>grid[r][c]===s[(i+r)%21])))'),true);
 }
});
test('bell pays 15 normally and throughout bonus including final game',()=>{
 assert.equal(run('normalRewardFor("BELL")'),15);
 assert.equal(run('resolveATypeBonusOutcome("BELL").reward'),15);
 assert.equal(run('session.paid=145; resolveATypeBonusOutcome("BELL").reward'),15);
 assert.equal(run('session.paid=150; resolveATypeBonusOutcome("BELL").reward'),0);
});

test('nebula alone awards a bonus ART set, and NOVA strengths no longer substitute for it',()=>{
 run('session.paid=0;');
 assert.equal(run('resolveATypeBonusOutcome("NEBULA").artSetWon'),1);
 assert.equal(run('resolveATypeBonusOutcome("NEBULA").reward'),0);
 for(const role of ['WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'])assert.equal(run(`resolveATypeBonusOutcome('${role}').artSetWon`),0);
 run('session.paid=150;');assert.equal(run('resolveATypeBonusOutcome("NEBULA").artSetWon'),0);
 run('session.paid=0;');
});
test('retired forced outcomes cannot enter active play',()=>{
 assert.equal(run('normalizeATypeResult("GRAPE")'),'BELL');
 for(const name of ['SMALL','CHERRY_ANY','CHERRY_DOUBLE','CHERRY_TRIPLE']) assert.equal(run(`normalizeATypeResult('${name}')`),'MISS');
});
test('NOVA patterns require left triple and use super then strong then weak precedence',()=>{
 for(let mask=0;mask<8;mask++){
  const expected=!(mask&1)?'':mask===7?'SUPER_NOVA':(mask&6)?'STRONG_NOVA':'WEAK_NOVA';
  const actual=run(`novaPatternFromGrid([0,1,2].map(r=>[0,1,2].map(c=>(${mask}&(1<<c))?novaSymbol(c,r):'ANY')))`);
  assert.equal(actual,expected,'triple mask '+mask);
 }
 assert.equal(run('novaPatternFromGrid(null)'),'');
 assert.equal(run('novaPatternFromGrid([[novaSymbol(0,1)],[novaSymbol(0,0)],[novaSymbol(0,2)]])'),'');
});
test('forced NOVA outcomes survive normalization and stop at the exact requested strength without payout',()=>{
 for(const result of ['WEAK_NOVA','STRONG_NOVA','SUPER_NOVA']){
  assert.equal(run(`normalizeATypeResult('${result}')`),result);
  for(let i=0;i<40;i++){
   run(`globalThis.forcedGrid=buildNovaReelGrid('${result}');`);
   assert.equal(run('novaPatternFromGrid(forcedGrid)'),result);
   assert.equal(run('REEL_STRIPS.every((s,c)=>s.some((_,top)=>[0,1,2].every(r=>forcedGrid[r][c]===s[(top+r)%21])))'),true);
  }
  assert.equal(run(`normalRewardFor('${result}')`),0);
  assert.equal(run(`remaining=96;resolveATypeBonusOutcome('${result}').reward`),0);
 }
});
test('Super NOVA draws exactly one 50:50 BIG or freeze outcome without premium reroll',()=>{
 for(const [roll,expected] of [[0,'FREEZE'],[.499999,'FREEZE'],[.5,'BIG'],[.999999,'BIG']]){
  run(`globalThis.drawCount=0; Math.random=()=>{drawCount++;return ${roll}}; globalThis.outcome=resolveNormalOutcome('SUPER_NOVA');`);
  assert.equal(run('outcome.superNovaOutcome'),expected);
  assert.equal(run('outcome.bonusHit'),true);
  assert.equal(run('outcome.bonusKind'),'BIG');
  assert.equal(run('outcome.premiumBonus'),expected==='FREEZE');
  assert.equal(run('decideBigPremiumEffect("SUPER_NOVA",outcome,true)'),expected==='FREEZE');
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
 assert.equal(run('entry.flowAfter.remaining'),2);
 assert.equal(run('entry.bonusHit'),false);
 run('normalState.flow=entry.flowAfter;globalThis.czFirst=resolveNormalOutcome("MISS");');
 assert.equal(run('czFirst.flowAfter.remaining'),1);
 run('normalState.flow=czFirst.flowAfter;pendingATypeInternalBonus={kind:"BIG",source:"CZ成功",gamesSinceLastBonusAtStart:20};globalThis.czLast=resolveNormalOutcome("MISS");');
 assert.equal(run('czLast.czCompleted'),true);
 assert.equal(run('czLast.bonusHit'),true);
 assert.equal(run('czLast.bonusSource'),'CZ成功');
 assert.equal(run('czLast.flowAfter.phase'),'normal');
});
test('game resolver expires ART when final payout exhausts the quota',()=>{
 run('normalState.bonusPending=false;normalState.flow={...NovaArt.enter(),remaining:"3"};pendingArtStep=NovaArt.step(normalState.flow,{rare:0},()=>.99,"BELL");globalThis.endArt=resolveNormalOutcome("BELL");');
 assert.equal(run('endArt.flowAfter.phase'),'normal');assert.equal(run('endArt.bonusHit'),false);
});

test('Sora seven directly adds an ART set and Ouma super never invokes the normal freeze',()=>{
 run('normalState.bonusPending=false;normalState.flow=NovaArt.startZone(NovaArt.enter(),"sora");pendingArtStep=NovaArt.step(normalState.flow,{soraHit:1,soraReset:0},()=>.5);globalThis.soraResolved=resolveNormalOutcome("BIG");');
 assert.equal(run('soraResolved.aTypeBonusReady'),false);assert.equal(run('soraResolved.flowAfter.sets'),'2');assert.equal(run('decideBigPremiumEffect("BIG",soraResolved,true)'),false);
 run('normalState.flow=NovaArt.startZone(NovaArt.enter(),"ouma");normalState.flow.awardTier=4;pendingArtStep=NovaArt.step(normalState.flow,{},()=>0,"SUPER_NOVA");globalThis.oumaResolved=resolveNormalOutcome("SUPER_NOVA");');
 assert.equal(run('oumaResolved.bonusHit'),false);assert.equal(run('oumaResolved.superNovaOutcome'),'');assert.equal(run('oumaResolved.flowAfter.award'),'925');
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
