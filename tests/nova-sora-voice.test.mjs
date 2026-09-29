import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=readGameSource();
function setup(){
 const sounds=[],c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,voiceOutputVolume:()=>.6,sfxOutputVolume:()=>.4,playOneShotSound:(src,volume)=>sounds.push({src,volume}),NovaAim:{drawGuide:()=>true,hasGuide:a=>!!a&&a.guide!==false,bet:()=>false}});
 for(const name of ['AIM_VOICE_SRCS','SEVEN_ZONE_VOICE_SRCS','NEBULA_ZONE_VOICE_SRCS','ZONE_START_VOICE_SRCS','ZONE_CONTINUE_VOICE_SRCS','OUMA_NOVA_VOICE_SRCS'])vm.runInContext(html.match(new RegExp('  const '+name+'=[^\\n]+'))[0],c);
 for(const name of ['playRandomAimVoice','playSevenAimVoice','playNebulaAimVoice','playAimBetPresentation','playZoneStartVoice','playZoneContinueVoice','playOumaNovaAimVoice','playOumaNovaWinVoice','novaSymbol','isNovaGrid'])vm.runInContext(name==='novaSymbol'||name==='isNovaGrid'?html.match(new RegExp('  function '+name+'[^\\n]+'))[0]:html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
 vm.runInContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-art.js','utf8'),c);
 return {c,sounds};
}
test('zone seven cues match the character on hits and misses, including reverse zones, without a voice draw',()=>{
 const choices=[['toto','aim-seven-toto'],['sora','aim-seven-sora'],['ura_sora','aim-seven-sora'],['sosuke','aim_seven_sosuke'],['giru','aim-seven-giru'],['ura_giru','aim-seven-giru'],['ouma','aim-seven-ouma'],['ura_ouma','aim-seven-ouma']];
 for(const [zone,voice] of choices)for(const ura of [false,true])for(const color of ['blue','red','rainbow'])for(const result of ['BIG','MISS']){
  const {c,sounds}=setup();let draws=0;c.playAimBetPresentation({aim:{symbol:'seven',color,guide:true,result},flowBefore:{phase:'art',zone,ura}},()=>{draws++;return .99;});
  assert.deepEqual(sounds,[{src:'assets/media/nova/aim/cue-'+color+'.wav',volume:.4},{src:'assets/media/nova/'+voice+'.wav',volume:.6}]);assert.equal(draws,0);
 }
 for(const [symbol,zone,guide] of [['seven','toto',false],['seven','sora',false]]){
  const {c,sounds}=setup();let draws=0;c.playAimBetPresentation({aim:{symbol,color:'blue',guide},flowBefore:{phase:'art',zone}},()=>{draws++;return .5;});assert.equal(draws,0);
 }
});
test('zone nebula guides play the matching voice or registered fallback on BET, including misses and reverse zones',()=>{
 for(const [zone,ura] of [['toto',false],['sora',false],['sora',true],['ura_sora',false],['giru',false],['ura_giru',false],['ouma',false],['ouma',true],['ura_ouma',false]])for(const color of ['blue','red','rainbow'])for(const result of ['NEBULA','MISS'])for(const roll of [0,.5,.999999]){
  const {c,sounds}=setup();let draws=0;
  c.playAimBetPresentation({aim:{symbol:'nebula',color,result,guide:true},flowBefore:{phase:'art',zone,ura}},()=>{draws++;return roll;});
  const dedicated=zone.replace(/^ura_/,'');
  const character=dedicated;
  assert.deepEqual(sounds,[{src:'assets/media/nova/aim/cue-'+color+'.wav',volume:.4},{src:'assets/media/nova/aim-nebula-'+character+'.wav',volume:.6}]);
  assert.equal(draws,dedicated?0:1);
 }
});

test('hidden zone nebula guides stay silent; simulation and non-zone states cannot trigger a zone voice',()=>{
 const {c,sounds}=setup();
 for(const zone of ['toto','sora','ura_sora'])c.playAimBetPresentation({aim:{symbol:'nebula',color:'blue',result:'MISS',guide:false},flowBefore:{phase:'art',zone}});
 assert.deepEqual(sounds,[]);
 for(const flowBefore of [{phase:'normal',zone:'toto'},{phase:'art'},{phase:'art',zone:'toto',entryStage:'seven'}])c.playNebulaAimVoice({flowBefore});
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){c[flag]=true;c.playNebulaAimVoice({flowBefore:{phase:'art',zone:'toto'}});c[flag]=false;}
 assert.deepEqual(sounds,[]);
});

test('initial BIG nebula guides choose Giru, Toto, Ouma or Sora equally on BET and hide voices with an absent guide',()=>{
 for(const [roll,character] of [[0,'giru'],[.249999,'giru'],[.25,'toto'],[.499999,'toto'],[.5,'ouma'],[.749999,'ouma'],[.75,'sora'],[.999999,'sora']])for(const result of ['NEBULA','MISS'])for(const color of ['blue','red','rainbow']){
  const {c,sounds}=setup();c.playAimBetPresentation({aTypeBonusGame:true,initialBonusGame:true,aim:{symbol:'nebula',result,color,guide:true}},()=>roll);
  assert.deepEqual(sounds,[{src:'assets/media/nova/aim/cue-'+color+'.wav',volume:.4},{src:'assets/media/nova/aim-nebula-'+character+'.wav',volume:.6}]);
 }
 const {c,sounds}=setup();c.playAimBetPresentation({aTypeBonusGame:true,initialBonusGame:true,aim:{symbol:'nebula',color:'blue',result:'MISS',guide:false}});assert.equal(sounds.length,0);
 // Additional registered characters enter the same uniform draw automatically.
 vm.runInContext("AIM_VOICE_SRCS.nebula.push('another-character.wav')",c);
 for(const roll of [0,.9])c.playAimBetPresentation({aTypeBonusGame:true,initialBonusGame:true,aim:{symbol:'nebula',color:'red',guide:true}},()=>roll);
 assert.equal(sounds[1].src,'assets/media/nova/aim-nebula-giru.wav');assert.equal(sounds[3].src,'another-character.wav');
});
test('bonus resolver distinguishes initial BIG from a bonus during AT before playing nebula voice',()=>{
 for(const phase of ['normal','art']){
  const {c,sounds}=setup();c.normalState={flow:{phase}};c.session={bonusTier:'normal',paid:0};c.settings={setting:1};c.isATypeBonusComplete=()=>false;
  vm.runInContext(html.match(/  function resolveATypeBonusOutcome\([^]*?\n  }/)[0],c);
  const resolved=c.resolveATypeBonusOutcome('NEBULA');assert.equal(resolved.initialBonusGame,phase==='normal');
  c.playAimBetPresentation(resolved,()=>0);
  assert.equal(sounds.filter(s=>s.src.endsWith('aim-nebula-giru.wav')).length,phase==='normal'?1:0);
 }
});
test('bonus entrance seven cues use the common character draw after preparation completes',()=>{
 for(const [roll,voice] of [[0,'aim_seven_sosuke'],[.2,'aim-seven-sora'],[.4,'aim-seven-giru'],[.6,'aim-seven-toto'],[.8,'aim-seven-ouma']]){
  const {c,sounds}=setup();c.A_TYPE_MODE=true;c.normalState={bonusPending:true,prepConfirmed:true,prepLeft:0};
  const draw=c.playRandomAimVoice;c.playRandomAimVoice=symbol=>draw(symbol,()=>roll);
  vm.runInContext(html.match(/  function triggerBonusConfirmBetSoundIfNeeded\([^]*?\n  }/)[0],c);
  assert.equal(c.triggerBonusConfirmBetSoundIfNeeded(),true);assert.equal(sounds[0].src,'assets/media/nova/'+voice+'.wav');
  c.normalState.prepLeft=1;c.triggerBonusConfirmBetSoundIfNeeded();assert.equal(sounds.length,1);
 }
});
test('actual confirmed-to-zone BET transitions announce registered zones only once on entry',()=>{
 for(const pendingZone of ['toto','sora','ura_sora','giru','ura_giru','ouma','ura_ouma'])for(const initialStage of ['', 'entry']){
  const {c,sounds}=setup();
  const before={phase:'art',entryStage:'confirmed',pendingZone,initialStage,entryQuota:'500',remaining:'500'};
  const after=c.NovaArt.prepareBet(before,{setting:1},()=>.5);
  c.playZoneStartVoice(before,after);
  assert.deepEqual(sounds,[{src:'assets/media/nova/zone-start-'+pendingZone.replace('_','-')+'.wav',volume:.6}]);
  c.playZoneStartVoice(after,after);assert.equal(sounds.length,1);
 }
 const {c,sounds}=setup();c.playZoneStartVoice({phase:'art',entryStage:'roulette'},{phase:'art',entryStage:'confirmed',pendingZone:'giru'});
 c.playZoneStartVoice({phase:'art',entryStage:'confirmed'},{phase:'art',zone:'urapi'});assert.equal(sounds.length,0);
});
test('continuation voices match Toto and Sora nebula wins and respect silent simulation',()=>{
 const {c,sounds}=setup();
 for(const zone of ['sora','ura_sora','toto'])c.playZoneContinueVoice('nebula',{flowBefore:{phase:'art',zone}});
 assert.deepEqual(sounds.map(s=>s.src),['assets/media/nova/continue-sora.wav','assets/media/nova/continue-sora.wav','assets/media/nova/continue-toto.wav']);
 for(const [symbol,resolved] of [['seven',{flowBefore:{phase:'art',zone:'toto'}}],['nebula',{flowBefore:{phase:'art',zone:'giru'}}],['nebula',{aTypeBonusGame:true,flowBefore:{phase:'art',zone:'toto'}}]])c.playZoneContinueVoice(symbol,resolved);
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){c[flag]=true;c.playZoneContinueVoice('nebula',{flowBefore:{phase:'art',zone:'toto'}});c[flag]=false;}
 assert.equal(sounds.length,3);
});

test('zone selection entry uses a uniform five-character draw even with a previous zone in state',()=>{
 for(const [roll,voice] of [[0,'aim_seven_sosuke'],[.199999,'aim_seven_sosuke'],[.2,'aim-seven-sora'],[.399999,'aim-seven-sora'],[.4,'aim-seven-giru'],[.599999,'aim-seven-giru'],[.6,'aim-seven-toto'],[.799999,'aim-seven-toto'],[.8,'aim-seven-ouma'],[.999999,'aim-seven-ouma']]){
  const {c,sounds}=setup();c.NovaAim.bet=()=>true;let draws=0;
  c.playAimBetPresentation({flowBefore:{phase:'art',zone:'sora',entryStage:'seven'},flowAfter:{phase:'art',entryStage:'roulette'}},()=>{draws++;return roll;});
  assert.equal(sounds[0].src,'assets/media/nova/'+voice+'.wav');assert.equal(draws,1);
 }
});

test('Ouma nova aim plays on ordinary zone BET, but stays silent during automatic reverse freezes and outside the zone',()=>{
 for(const zone of ['ouma','ura_ouma'])for(const ura of [false,true])for(const result of ['SUPER_NOVA','MISS']){
  const {c,sounds}=setup();c.playAimBetPresentation({result,flowBefore:{phase:'art',zone,ura},flowAfter:{phase:'art'}});
  assert.deepEqual(sounds,[{src:'assets/media/nova/aim-nova-ouma.wav',volume:.6}]);
 }
 const {c,sounds}=setup();
 for(const zone of ['ouma','ura_ouma'])for(const ura of [false,true])for(const flag of ['oumaFreeze','artReverse','oumaFailed']){
  c.playAimBetPresentation({[flag]:true,result:'SUPER_NOVA',flowBefore:{phase:'art',zone,ura},flowAfter:{phase:'art'}});
 }
 for(const resolved of [{flowBefore:{phase:'normal',zone:'ouma'}},{flowBefore:{phase:'art'}},{flowBefore:{phase:'art',zone:'urapi'}},{flowBefore:{phase:'art',zone:'ouma',entryStage:'seven'}},{flowBefore:{phase:'art',zone:'ouma'},oumaFailed:true},{flowBefore:{phase:'art',zone:'ouma'},aTypeBonusGame:true}])c.playOumaNovaAimVoice(resolved);
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){c[flag]=true;c.playOumaNovaAimVoice({flowBefore:{phase:'art',zone:'ouma'}});c[flag]=false;}
 assert.deepEqual(sounds,[]);
});

const alignedNova=()=>[0,1,2].map(row=>[0,1,2].map(col=>'NOVA_'+col+'_'+row));
const oumaSpin=()=>({result:'SUPER_NOVA',stopped:[true,true,true],grid:alignedNova(),auditGrid:alignedNova(),resolved:{flowBefore:{phase:'art',zone:'ouma'},flowAfter:{phase:'art'}}});
test('Ouma and reverse Ouma choose all three nova win lines once after actual third reel landing, including final game and freeze',()=>{
 for(const zone of ['ouma','ura_ouma'])for(const ura of [false,true])for(const freeze of [false,true])for(const [roll,take] of [[0,1],[1/3,2],[2/3,3],[.999999,3]]){
  const {c,sounds}=setup(),spin=oumaSpin();spin.resolved.flowBefore={phase:'art',zone,ura};spin.resolved.oumaFreeze=freeze;
  spin.stopped=[true,true,false];c.playOumaNovaWinVoice(spin,()=>roll);assert.equal(sounds.length,0);
  spin.stopped[2]=true;c.playOumaNovaWinVoice(spin,()=>roll);c.playOumaNovaWinVoice(spin,()=>roll);
  assert.deepEqual(sounds,[{src:'assets/media/nova/nova-win-'+take+'-ouma.wav',volume:.6}]);
 }
});
test('nova win voices cannot leak into normal, other zones, bonuses, misses, incomplete or misaligned reels',()=>{
 const {c,sounds}=setup(),cases=[];
 for(const flow of [{phase:'normal',zone:'ouma'},{phase:'art'},{phase:'art',zone:'urapi'},{phase:'art',zone:'sora'},{phase:'art',zone:'ouma',entryStage:'seven'}]){const s=oumaSpin();s.resolved.flowBefore=flow;cases.push(s);}
 for(const result of ['MISS','BELL','WEAK_NOVA','STRONG_NOVA'])cases.push({...oumaSpin(),result});
 for(const flag of ['aTypeBonusGame','oumaFailed']){const s=oumaSpin();s.resolved[flag]=true;cases.push(s);}
 const bad=oumaSpin();bad.auditGrid[2][2]='BELL';cases.push(bad,{...oumaSpin(),stopped:[]});
 for(const s of cases)c.playOumaNovaWinVoice(s);
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){c[flag]=true;c.playOumaNovaWinVoice(oumaSpin());c[flag]=false;}
 assert.deepEqual(sounds,[]);
});
