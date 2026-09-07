import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('jag.html','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const context=vm.createContext({});
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
'normalRewardFor','resolveATypeBonusOutcome','isCherryResult','novaPatternFromGrid','isNovaResult','buildForcedNovaGrid'
].map(fn).join('\n')+`
const aTypeBonusRemainingNet=()=>remaining;
let remaining=1;
`,context);
const run=code=>vm.runInContext(code,context);
test('every reel has exactly one contiguous three-cell logo and no retired symbols',()=>{
 assert.equal(run('REEL_STRIPS.every((s,c)=>s.length===21 && s.filter(x=>x.startsWith("NOVA_")).length===3 && [0,1,2].every(r=>s[6+r]===novaSymbol(c,r)) && !s.some(x=>[GRAPE_SYMBOL,CHERRY_SYMBOL,PIERROT_SYMBOL].includes(x)))'),true);
});
test('actual stop grids match every supported outcome using real consecutive strip cells',()=>{
 for(const result of ['MISS','BELL','REPLAY','BIG','MID','BAR3']) for(const row of [0,1,2]){
  run(`globalThis.grid=buildNovaReelGrid(${JSON.stringify(result)},${row});`);
  assert.equal(run('displayedResultFromGrid(grid)'),result);
  assert.equal(run('gridHasOnlyAllowedPaylines(grid,'+JSON.stringify(result)+')'),true);
  assert.equal(run('REEL_STRIPS.every((s,c)=>s.some((_,i)=>[0,1,2].every(r=>grid[r][c]===s[(i+r)%21])))'),true);
 }
});
test('bell pays 8 normally and 15 throughout bonus including final game',()=>{
 assert.equal(run('normalRewardFor("BELL")'),8);
 assert.equal(run('resolveATypeBonusOutcome("BELL").reward'),15);
 assert.equal(run('remaining=96; resolveATypeBonusOutcome("BELL").reward'),15);
 assert.equal(run('remaining=0; resolveATypeBonusOutcome("BELL").reward'),0);
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
