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
  'const novaStopGridCache=new Map();const novaSymbol=(c,r)=>`NOVA_${c}_${r}`;const isNovaGrid=grid=>[0,1,2].every(r=>[0,1,2].every(c=>grid[r][c]===novaSymbol(c,r)));'+strips+
  ['mod','reelWindowFromTopIndex','normalizeATypeResult','displayResultFor','isMiddleLineOnlyResult','hasBellDiagonal',
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

test('8pt and 15pt bells retain their approved sheet stops for all orders and resume points',()=>{
 const {c}=setup();
 for(const role of ['BELL','BELL15'])for(const order of orders)for(let pos=0;pos<20;pos++){
  const spin={result:role,lineRow:1,resolved:{reward:role==='BELL15'?15:8},stopped:[false,false,false],grid:c.buildNovaReelGrid(role,1,order[0])};
  for(const index of order){
   c.nearestCommonStopColumn(index,spin,column=>Math.min(...c.strips[index].flatMap((_,n)=>column.every((v,j)=>v===c.strips[index][(n+j)%20])?[(pos+index*7-n+40)%20]:[])));
   spin.stopped[index]=true;
   const resumed=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),c.results);
   assert.deepEqual(plain(resumed.grid),plain(spin.grid));assert.equal(resumed.resolved.reward,role==='BELL15'?15:8);
  }
  assert.equal(c.displayedResultFromGrid(spin.grid),role);
  assert(c.NovaReelSheetData.stops[role].some(pattern=>JSON.stringify(pattern)===JSON.stringify(spin.grid)));
 }
});
test('new line selection keeps one visual random draw, original payout and legacy pending 15pt recognition',()=>{
 const {c}=setup();let calls=0;c.drawCount=()=>{calls++;return .5;};vm.runInContext('Math.random=drawCount',c);
 for(const role of ['BELL','BELL15'])for(let first=0;first<3;first++){
  const before=calls;c.buildNovaReelGrid(role,1,first);assert.equal(calls-before,1);
 }
 assert.equal(c.NovaArt.cashPayout('BELL'),8);assert.equal(c.NovaArt.cashPayout('BELL15'),15);
 const bell=c.results.BELL.reel[0];assert.equal(c.displayedResultFromGrid([['x','x','x'],['7',bell,bell],['x','x','x']]),'BELL15');
 const nav=fs.readFileSync('nova-bell-navi.js','utf8');assert(!nav.includes("symbol.alt=number===1?'7を狙う'"));
});
