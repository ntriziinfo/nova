import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8');
function setup(){
 const sounds=[],c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,voiceOutputVolume:()=>.6,sfxOutputVolume:()=>.4,playOneShotSound:(src,volume)=>sounds.push({src,volume}),NovaAim:{drawGuide:()=>true,hasGuide:a=>!!a&&a.guide!==false,bet:()=>false}});
 for(const name of ['AIM_VOICE_SRCS','ZONE_START_VOICE_SRCS'])vm.runInContext(html.match(new RegExp('  const '+name+'=[^\\n]+'))[0],c);
 for(const name of ['playRandomAimVoice','playAimBetPresentation','playZoneStartVoice','playSoraContinueVoice'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
 vm.runInContext(fs.readFileSync('nova-art.js','utf8'),c);
 return {c,sounds};
}
test('all colored seven cues choose one of three voices equally, regardless of zone or hit, retaining color SE',()=>{
 const choices=[[0,'aim_seven_sosuke'],[1/3-.000001,'aim_seven_sosuke'],[1/3,'aim-seven-sora'],[2/3-.000001,'aim-seven-sora'],[2/3,'aim-seven-giru'],[.999999,'aim-seven-giru']];
 for(const [roll,voice] of choices)for(const [zone,ura] of [['toto',false],['sora',false],['sora',true]])for(const color of ['blue','red','rainbow'])for(const result of ['BIG','MISS']){
  const {c,sounds}=setup();let draws=0;c.playAimBetPresentation({aim:{symbol:'seven',color,guide:true,result},flowBefore:{phase:'art',zone,ura}},()=>{draws++;return roll;});
  assert.deepEqual(sounds,[{src:'assets/media/nova/aim/cue-'+color+'.wav',volume:.4},{src:'assets/media/nova/'+voice+'.wav',volume:.6}]);assert.equal(draws,1);
 }
 for(const [symbol,zone,guide] of [['nebula','sora',true],['nebula','toto',true],['seven','sora',false]]){
  const {c,sounds}=setup();let draws=0;c.playAimBetPresentation({aim:{symbol,color:'blue',guide},flowBefore:{phase:'art',zone}},()=>{draws++;return .5;});assert.equal(draws,0);
 }
});
test('initial BIG nebula guides play the available voice on BET and hide it with an absent guide',()=>{
 for(const result of ['NEBULA','MISS'])for(const color of ['blue','red','rainbow']){
  const {c,sounds}=setup();c.playAimBetPresentation({aTypeBonusGame:true,initialBonusGame:true,aim:{symbol:'nebula',result,color,guide:true}});
  assert.deepEqual(sounds,[{src:'assets/media/nova/aim/cue-'+color+'.wav',volume:.4},{src:'assets/media/nova/aim-nebula-giru.wav',volume:.6}]);
 }
 const {c,sounds}=setup();c.playAimBetPresentation({aTypeBonusGame:true,initialBonusGame:true,aim:{symbol:'nebula',color:'blue',result:'MISS',guide:false}});assert.equal(sounds.length,0);
 // Additional registered characters enter the same uniform draw automatically.
 vm.runInContext("AIM_VOICE_SRCS.nebula.push('another-character.wav')",c);
 for(const roll of [0,.5])c.playAimBetPresentation({aTypeBonusGame:true,initialBonusGame:true,aim:{symbol:'nebula',color:'red',guide:true}},()=>roll);
 assert.equal(sounds[1].src,'assets/media/nova/aim-nebula-giru.wav');assert.equal(sounds[3].src,'another-character.wav');
});
test('bonus resolver distinguishes initial BIG from a bonus during AT before playing nebula voice',()=>{
 for(const phase of ['normal','art']){
  const {c,sounds}=setup();c.normalState={flow:{phase}};c.session={bonusTier:'normal',paid:0};c.settings={setting:1};c.isATypeBonusComplete=()=>false;
  vm.runInContext(html.match(/  function resolveATypeBonusOutcome\([^]*?\n  }/)[0],c);
  const resolved=c.resolveATypeBonusOutcome('NEBULA');assert.equal(resolved.initialBonusGame,phase==='normal');
  c.playAimBetPresentation(resolved);
  assert.equal(sounds.filter(s=>s.src.endsWith('aim-nebula-giru.wav')).length,phase==='normal'?1:0);
 }
});
test('bonus entrance seven cues use the common character draw after preparation completes',()=>{
 for(const [roll,voice] of [[0,'aim_seven_sosuke'],[.5,'aim-seven-sora'],[.9,'aim-seven-giru']]){
  const {c,sounds}=setup();c.A_TYPE_MODE=true;c.normalState={bonusPending:true,prepConfirmed:true,prepLeft:0};
  const draw=c.playRandomAimVoice;c.playRandomAimVoice=symbol=>draw(symbol,()=>roll);
  vm.runInContext(html.match(/  function triggerBonusConfirmBetSoundIfNeeded\([^]*?\n  }/)[0],c);
  assert.equal(c.triggerBonusConfirmBetSoundIfNeeded(),true);assert.equal(sounds[0].src,'assets/media/nova/'+voice+'.wav');
  c.normalState.prepLeft=1;c.triggerBonusConfirmBetSoundIfNeeded();assert.equal(sounds.length,1);
 }
});
test('actual confirmed-to-zone BET transitions announce matching Sora and Giru zones only once on entry',()=>{
 for(const pendingZone of ['sora','ura_sora','giru','ura_giru'])for(const initialStage of ['', 'entry']){
  const {c,sounds}=setup();
  const before={phase:'art',entryStage:'confirmed',pendingZone,initialStage,entryQuota:'500',remaining:'500'};
  const after=c.NovaArt.prepareBet(before,{setting:1},()=>.5);
  c.playZoneStartVoice(before,after);
  assert.deepEqual(sounds,[{src:'assets/media/nova/zone-start-'+pendingZone.replace('_','-')+'.wav',volume:.6}]);
  c.playZoneStartVoice(after,after);assert.equal(sounds.length,1);
 }
 const {c,sounds}=setup();c.playZoneStartVoice({phase:'art',entryStage:'roulette'},{phase:'art',entryStage:'confirmed',pendingZone:'giru'});
 c.playZoneStartVoice({phase:'art',entryStage:'confirmed'},{phase:'art',zone:'toto'});assert.equal(sounds.length,0);
});
test('continuation voice is restricted to Sora nebula wins and respects silent simulation',()=>{
 const {c,sounds}=setup();
 for(const zone of ['sora','ura_sora'])c.playSoraContinueVoice('nebula',{flowBefore:{phase:'art',zone}});
 assert.equal(sounds.length,2);assert.ok(sounds.every(s=>s.src==='assets/media/nova/continue-sora.wav'&&s.volume===.6));
 for(const [symbol,resolved] of [['seven',{flowBefore:{phase:'art',zone:'sora'}}],['nebula',{flowBefore:{phase:'art',zone:'toto'}}],['nebula',{aTypeBonusGame:true,flowBefore:{phase:'art',zone:'sora'}}]])c.playSoraContinueVoice(symbol,resolved);
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){c[flag]=true;c.playSoraContinueVoice('nebula',{flowBefore:{phase:'art',zone:'sora'}});c[flag]=false;}
 assert.equal(sounds.length,2);
});
