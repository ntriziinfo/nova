import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const plain=value=>JSON.parse(JSON.stringify(value));
const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
const zones=['ouma','urapi','ura_ouma'];
function setup(){
 const c=vm.createContext({setTimeout:()=>0,clearTimeout(){}});
 vm.runInContext(fs.readFileSync('nova-reel-sheet-data.js','utf8'),c);
 for(const file of ['nova-tuning.js','nova-art.js','nova-normal.js','nova-aim-presentation.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 const constants=source.slice(source.indexOf('  const A_TYPE_PAYOUTS'),source.indexOf('  const symbolImagePreloads'));
 const results=source.slice(source.indexOf('  const RESULT ='),source.indexOf('  const SETTING_PROFILE'));
 const sheetHelpers=source.slice(source.indexOf('  const NOVA_SHEET_DATA'),source.indexOf('  function novaSymbol'));
 const strips=source.slice(source.indexOf('  const REEL_STRIPS ='),source.indexOf('  function mod('));
 vm.runInContext('const A_TYPE_PREMIUM_BIG_PAYOUT=500;const A_TYPE_MODE=true;'+constants+results+sheetHelpers+
  'const novaStopGridCache=new Map();const novaSymbol=(c,r)=>`NOVA_${c}_${r}`;const isNovaGrid=grid=>[0,1,2].every(r=>[0,1,2].every(c=>grid[r][c]===novaSymbol(c,r)));'+strips+
  ['novaGrid','mod','reelWindowFromTopIndex','normalizeATypeResult','displayResultFor','isMiddleLineOnlyResult','hasBellDiagonal',
   'cherryResultFromRow','cherryResultFromRows','displayedResultFromGrid','displayedResultFromRow','gridPaylineRows',
   'gridHasOnlyAllowedPaylines','buildNovaReelGrid','buildForcedNovaGrid','novaPatternFromGrid','isNovaResult','setGridColumn'].map(fn).join('\n')+
  '\nglobalThis.strips=REEL_STRIPS;globalThis.results=RESULT;',c);
 c.target=(spin,i)=>c.NovaAim.novaZoneStopTarget(spin,i,c.strips,c.results);
 return c;
}
function draw(c,zone,role,overrides={}){
 const before={...c.NovaArt.startZone(c.NovaArt.enter({},()=>.5),zone,{},()=>.5),...overrides};
 const step=c.NovaArt.step(before,{},()=>.99,role);
 return {result:step.result,spec:c.results[step.result],grid:c.buildNovaReelGrid(step.result,1),lineRow:1,stopped:[false,false,false],auditPressOrder:[],
  resolved:{...step,flowBefore:before,flowAfter:step.flow,reward:c.NovaNormal.pay(step.result)}};
}
function fullLogo(c,spin,i){return [0,1,2].every(row=>spin.grid[row][i]===c.NovaReelSheetData.stops.SUPER_NOVA[0][row][i]);}

test('all six orders reveal wins and misses at the requested stop, using contiguous real reel strips',()=>{
 const c=setup();
 for(const zone of zones)for(const role of ['MISS','SUPER_NOVA'])for(const order of orders){
  const spin=draw(c,zone,role),original=plain(spin.resolved),won=role==='SUPER_NOVA';
  assert.equal(spin.result,role);assert(c.NovaAim.isNovaZoneSpin(spin));
  vm.runInContext('Math.random=()=>{throw Error("stop display consumed RNG")}',c);
  for(const [rank,i] of order.entries()){
   spin.auditPressOrder.push(i);const target=c.target(spin,i);c.setGridColumn(spin.grid,i,target.column);spin.stopped[i]=true;
   if(order[0]===1&&rank===0)assert.equal(fullLogo(c,spin,1),won,'middle-first logo is certain');
   else if(order[0]!==1&&rank===0)assert(fullLogo(c,spin,i),'outer-first always shows logo');
   if(rank===1&&order[0]!==1)assert.equal(fullLogo(c,spin,i),i===1||won,'scissors second stop decides outcome');
   assert(c.strips[i].some((_,top)=>spin.grid.every((row,r)=>row[i]===c.strips[i][(top+r)%c.strips[i].length])));
  }
  assert.equal([0,1,2].every(i=>fullLogo(c,spin,i)),won);
  if(!won){
   const missed=order[0]===1?1:2-order[0];
   assert(spin.grid.every(row=>!String(row[missed]).startsWith('NOVA_')&&row[missed]!==c.results.WEAK_SUICA.reel[missed]));
  }
  assert.equal(spin.result,role);assert.deepEqual(plain(spin.resolved),original);
  vm.runInContext('Math.random=()=>.5',c);
 }
});

test('pending animated landings and every partial stop survive reload without another draw or payout',()=>{
 const c=setup();
 for(const zone of zones)for(const role of ['MISS','SUPER_NOVA'])for(const order of orders)for(const cut of [1,2,3]){
  let spin=draw(c,zone,role);const original=plain(spin.resolved);
  for(const i of order.slice(0,cut)){spin.auditPressOrder.push(i);const col=c.target(spin,i).column;c.setGridColumn(spin.grid,i,col);(spin.pendingStopColumns||=[])[i]=col;}
  spin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),c.results);
  for(const i of order){
   if(!spin.auditPressOrder.includes(i))spin.auditPressOrder.push(i);
   const col=c.target(spin,i).column;
   if(spin.pendingStopColumns[i])assert.deepEqual(plain(col),plain(spin.pendingStopColumns[i]));
   c.setGridColumn(spin.grid,i,col);spin.stopped[i]=true;
  }
  assert.equal([0,1,2].every(i=>fullLogo(c,spin,i)),role==='SUPER_NOVA');
  assert.deepEqual(plain(spin.resolved),original);assert.equal(spin.result,role);
 }
});

test('final guaranteed award honors the engine result; final miss and queued zone still use their starting zone',()=>{
 const c=setup();
 for(const zone of zones){
  const guaranteed=draw(c,zone,'MISS',{zoneLeft:1,award:'0'});
  assert.equal(guaranteed.result,'SUPER_NOVA');assert(c.NovaAim.isNovaZoneSpin(guaranteed));
  const final=draw(c,zone,'MISS',{zoneLeft:1,award:'1000'});
  assert.equal(final.result,'MISS');assert.equal(final.resolved.flowAfter.zone,'');assert(c.NovaAim.isNovaZoneSpin(final));
  const queued=draw(c,zone,'MISS');queued.resolved.zoneStartFlow=queued.resolved.flowBefore;queued.resolved.flowBefore={phase:'art',zone:''};
  assert(c.NovaAim.isNovaZoneSpin(queued));
 }
});

test('automatic reverse freeze, failure transition, entries and unrelated aim cues are untouched',()=>{
 const c=setup();
 for(const change of [{oumaFreeze:true},{oumaFailed:true},{aTypeBonusGame:true},{stockEntry:{}},{researchSortie:{}},{aim:{symbol:'seven'}},{zoneSpin:false},
  {flowBefore:{phase:'art',zone:'sosuke'}},{flowBefore:{phase:'normal',zone:'ouma'}},{flowBefore:{phase:'art',zone:'ouma',entryStage:'seven'}}]){
  const spin=draw(c,'ouma','SUPER_NOVA');Object.assign(spin.resolved,change);spin.auditPressOrder=[1];assert.equal(c.target(spin,1),null);
 }
 for(const role of ['BELL','REPLAY','WEAK_NOVA','STRONG_NOVA','WEAK_SUICA','NEBULA']){
  const spin=draw(c,'ouma','MISS');spin.result=role;spin.auditPressOrder=[0];assert.equal(c.target(spin,0),null);
 }
 const noPress=draw(c,'ouma','MISS');assert.equal(c.target(noPress,0),null);
});
