import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadVoiceCatalog} from './helpers/voice-catalog.mjs';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const plain=value=>JSON.parse(JSON.stringify(value));
const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
function setup(){
 const played=[],c=vm.createContext({setTimeout:()=>0,clearTimeout(){},debugFastSpinActive:false,speedToBonusActive:false,
  sfxOutputVolume:()=>1,voiceOutputVolume:()=>1,playOneShotSound:src=>played.push(src),playWinSound:()=>played.push('chance'),
  REPLAY_SOUND_SRC:'replay',PAYOUT_3PT_BELL_SOUND_SRC:'bell',PAYOUT_SOUND_SRC:'payout',STOP_SOUND_SRC:'stop',oneShotSoundCache:new Map()});
 vm.runInContext(fs.readFileSync('nova-reel-sheet-data.js','utf8'),c);
 for(const file of ['nova-tuning.js','nova-art.js','nova-normal.js','nova-ladder-presentation.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 const constants=source.slice(source.indexOf('  const A_TYPE_PAYOUTS'),source.indexOf('  const symbolImagePreloads'));
 const results=source.slice(source.indexOf('  const RESULT ='),source.indexOf('  const SETTING_PROFILE'));
 const sheetHelpers=source.slice(source.indexOf('  const NOVA_SHEET_DATA'),source.indexOf('  function novaSymbol'));
 const strips=source.slice(source.indexOf('  const REEL_STRIPS ='),source.indexOf('  function mod('));
 vm.runInContext('const A_TYPE_PREMIUM_BIG_PAYOUT=500;const A_TYPE_MODE=true;'+constants+results+sheetHelpers+
  'const novaStopGridCache=new Map();const novaSymbol=(c,r)=>`NOVA_${c}_${r}`;const isNovaGrid=grid=>[0,1,2].every(r=>[0,1,2].every(c=>grid[r][c]===novaSymbol(c,r)));const committedAutoReferenceColumn=()=>null;'+strips+
  ['novaGrid','mod','reelWindowFromTopIndex','normalizeATypeResult','displayResultFor','isMiddleLineOnlyResult','hasBellDiagonal',
   'cherryResultFromRow','cherryResultFromRows','displayedResultFromGrid','displayedResultFromRow','gridPaylineRows',
   'gridHasOnlyAllowedPaylines','buildNovaReelGrid','buildForcedNovaGrid','novaPatternFromGrid','isNovaResult','setGridColumn','nearestCommonStopColumn',
   'isComebackChanceSpin','playRareNaviSound','rareCueGrade','playRareCueVoice','playWeakNovaSound','playStrongNovaSound','playChanceSound',
   'shouldSuppressPayoutSound','payoutSoundSrcFor','isLadderShutterSpin','playStopSound'].map(fn).join('\n')+
  '\nglobalThis.strips=REEL_STRIPS;globalThis.results=RESULT;',c);
 loadVoiceCatalog(c);
 vm.runInContext(source.match(/  const RARE_CUE_VOICE_SRCS=[^\n]+/)[0],c);
 c.target=(spin,i)=>c.NovaLadder.target(spin,i,c.strips,c.results,c.gridHasOnlyAllowedPaylines);
 return {c,played};
}
function draw(c,zone,role,index=0,revealed=true,ladder=[50,50,200,300,500]){
 const before={...c.NovaArt.startZone(c.NovaArt.enter({},()=>.5),zone,{},()=>.5),ladder,ladderIndex:index,ladderRevealed:revealed,
  award:String(ladder[index]),zoneLeft:ladder.length-index-(revealed?1:0)};
 const step=c.NovaArt.step(before,{},()=>.99,role);
 return {result:step.result,spec:c.results[step.result],grid:c.buildNovaReelGrid(step.result,1),lineRow:1,stopped:[false,false,false],auditPressOrder:[],
  resolved:{...step,flowBefore:before,flowAfter:step.flow,reward:c.NovaNormal.pay(step.result)}};
}

test('all six orders give the requested middle line in Sosuke, Giru and Ura Giru, without extra winning lines',()=>{
 const {c}=setup();
 for(const zone of ['sosuke','giru','ura_giru'])for(const role of ['MISS','REPLAY','BELL','WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'])for(const order of orders){
  const spin=draw(c,zone,role),internal=plain(spin.resolved),internalRole=spin.result,won=internalRole!=='MISS';
  vm.runInContext('Math.random=()=>{throw Error("presentation consumed game RNG")}',c);
  for(const i of order){spin.auditPressOrder.push(i);const target=c.target(spin,i);c.setGridColumn(spin.grid,i,target.column);spin.stopped[i]=true;}
  const expected=['REPLAY','REPLAY','REPLAY'];if(!won)expected[order[0]===1?1:2]='🔔';
  assert.deepEqual(plain(spin.grid[1]),expected,`${zone} ${role} ${order}`);
  assert(c.gridHasOnlyAllowedPaylines(spin.grid,won?'REPLAY':'MISS'));
  assert(c.strips.every((strip,i)=>strip.some((_,top)=>spin.grid.every((row,r)=>row[i]===strip[(top+r)%strip.length]))));
  assert.deepEqual(plain(spin.resolved),internal);assert.equal(spin.result,internalRole);
  vm.runInContext('Math.random=()=>.5',c);
 }
});

test('equal-value promotion and final promotion pass; first reveal and fixed 50pt failure do not',()=>{
 const {c}=setup();
 for(const zone of ['sosuke','giru','ura_giru']){
  const equal=draw(c,zone,'REPLAY');assert.equal(equal.resolved.zoneAward,0);assert(c.NovaLadder.outcome(equal.resolved).won);
  const final=draw(c,zone,'BELL',3);assert.equal(final.resolved.flowAfter.zone,'');assert(c.NovaLadder.outcome(final.resolved).won);
  const reveal=draw(c,zone,'SUPER_NOVA',0,false);assert(!c.NovaLadder.outcome(reveal.resolved).won);
 }
 const fixed=draw(c,'fixed50_sosuke','SUPER_NOVA');assert.equal(fixed.result,'MISS');assert(!c.NovaLadder.outcome(fixed.resolved).won);
});

test('pending landing and stop order survive reload without changing role, payout or progress',()=>{
 const {c}=setup();
 for(const zone of ['sosuke','giru','ura_giru'])for(const role of ['MISS','BELL','STRONG_NOVA'])for(const order of orders)for(const cut of [1,2,3]){
  let spin=draw(c,zone,role);const original=plain(spin.resolved);
  for(const i of order.slice(0,cut)){spin.auditPressOrder.push(i);const col=c.target(spin,i).column;c.setGridColumn(spin.grid,i,col);(spin.pendingStopColumns||=[])[i]=col;}
  spin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),c.results);
  for(const i of order){if(!spin.auditPressOrder.includes(i))spin.auditPressOrder.push(i);const col=c.target(spin,i).column;
   if(spin.pendingStopColumns[i])assert.deepEqual(plain(col),plain(spin.pendingStopColumns[i]));c.setGridColumn(spin.grid,i,col);spin.stopped[i]=true;}
  const expected=['REPLAY','REPLAY','REPLAY'];if(role==='MISS')expected[order[0]===1?1:2]='🔔';
  assert.deepEqual(plain(spin.grid[1]),expected);assert.deepEqual(plain(spin.resolved),original);assert.equal(spin.result,role);
 }
});

test('common stop draws are preserved when applying the visual overlay',()=>{
 for(const role of ['BELL','REPLAY'])for(const order of orders){
  const runs=[false,true].map(overlay=>{
   const {c}=setup(),spin=draw(c,'giru',role);let calls=0;c.nextRandom=()=>{calls++;return .7;};vm.runInContext('Math.random=nextRandom',c);
   for(const i of order){spin.auditPressOrder.push(i);c.nearestCommonStopColumn(i,spin,()=>0);if(overlay)c.setGridColumn(spin.grid,i,c.target(spin,i).column);spin.stopped[i]=true;}
   return {calls,role:spin.result,resolved:plain(spin.resolved)};
  });
  assert.deepEqual(runs[0],runs[1]);assert(runs[0].calls>0);
 }
});

test('rare-role SE is suppressed only for actual ladder games; queued cue selection keeps its RNG draw',()=>{
 const {c,played}=setup();
 for(const zone of ['sosuke','giru','ura_giru'])for(const role of ['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA']){
  const spin=draw(c,zone,role);spin.rareNavi={color:'red'};c.currentSpin=spin;
  c.playRareNaviSound(spin);c.playWeakNovaSound(role,spin.resolved);c.playStrongNovaSound(role,spin.resolved);c.playChanceSound(role,spin.resolved);
  assert(c.shouldSuppressPayoutSound(role,8,spin));
  const prior=played.length;c.playStopSound(2,3);assert.equal(played.length,prior+1);assert.equal(played.at(-1),spin.result==='MISS'?'assets/media/nova/ouma-fail.wav':'assets/media/nova/shutter-close.wav');played.length=0;
  spin.result=role; // Include retired rare roles in saved presentation records.
  spin.resolved.zoneStartFlow=spin.resolved.flowBefore;spin.resolved.flowBefore={phase:'art'};
  let draws=0;c.playRareCueVoice(spin,()=>{draws++;return .5;});assert.equal(draws,1);assert.equal(played.length,0);
 }
 for(const role of ['WEAK_NOVA','STRONG_NOVA','CHANCE_A','CHANCE_B']){
  const r={flowBefore:{phase:'normal'}};c.playWeakNovaSound(role,r);c.playStrongNovaSound(role,r);c.playChanceSound(role,r);
 }
 assert.equal(played.length,4);
 const bell=draw(c,'sosuke','BELL');assert.equal(c.payoutSoundSrcFor('BELL',8,bell),'replay');assert(!c.shouldSuppressPayoutSound('BELL',8,bell));
 for(const change of [{aTypeBonusGame:true},{stockEntry:{}},{researchSortie:{}},{aim:{symbol:'seven'}},{zoneSpin:false}]){
  const spin=draw(c,'sosuke','REPLAY');Object.assign(spin.resolved,change);assert.equal(c.target(spin,0),null);
 }
 const result=draw(c,'giru','REPLAY');result.ladderResultPresentation={pt:50};assert.equal(c.target(result,0),null);
});
