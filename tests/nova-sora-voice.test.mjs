import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8');
function setup(){
 const sounds=[],c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,voiceOutputVolume:()=>.6,sfxOutputVolume:()=>.4,playOneShotSound:(src,volume)=>sounds.push({src,volume}),NovaAim:{drawGuide:()=>true,hasGuide:a=>!!a&&a.guide!==false,bet:()=>false}});
 for(const name of ['playAimBetPresentation','playSoraZoneStartVoice','playSoraContinueVoice'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
 vm.runInContext(fs.readFileSync('nova-art.js','utf8'),c);
 return {c,sounds};
}
test('Sora and reverse Sora seven cues add the voice while retaining their color SE',()=>{
 for(const [zone,ura] of [['sora',false],['sora',true],['ura_sora',false]])for(const color of ['blue','red','rainbow']){
  const {c,sounds}=setup();c.playAimBetPresentation({aim:{symbol:'seven',color,guide:true},flowBefore:{phase:'art',zone,ura}});
  assert.deepEqual(sounds,[{src:'assets/media/nova/aim/cue-'+color+'.wav',volume:.4},{src:'assets/media/nova/aim-seven-sora.wav',volume:.6}]);
 }
 for(const [symbol,zone,guide] of [['nebula','sora',true],['seven','toto',true],['seven','sora',false]]){
  const {c,sounds}=setup();c.playAimBetPresentation({aim:{symbol,color:'blue',guide},flowBefore:{phase:'art',zone}});
  assert.equal(sounds.some(s=>s.src.endsWith('aim-seven-sora.wav')),false);
 }
});
test('actual confirmed-to-zone BET transitions announce the matching Sora zone only once on entry',()=>{
 for(const pendingZone of ['sora','ura_sora'])for(const initialStage of ['', 'entry']){
  const {c,sounds}=setup();
  const before={phase:'art',entryStage:'confirmed',pendingZone,initialStage,entryQuota:'750',remaining:'750'};
  const after=c.NovaArt.prepareBet(before,{setting:1},()=>.5);
  c.playSoraZoneStartVoice(before,after);
  assert.deepEqual(sounds,[{src:'assets/media/nova/zone-start-'+(pendingZone==='ura_sora'?'ura-sora':'sora')+'.wav',volume:.6}]);
  c.playSoraZoneStartVoice(after,after);assert.equal(sounds.length,1);
 }
 const {c,sounds}=setup();c.playSoraZoneStartVoice({phase:'art',entryStage:'roulette'},{phase:'art',entryStage:'confirmed',pendingZone:'sora'});
 c.playSoraZoneStartVoice({phase:'art',entryStage:'confirmed'},{phase:'art',zone:'toto'});assert.equal(sounds.length,0);
});
test('continuation voice is restricted to Sora nebula wins and respects silent simulation',()=>{
 const {c,sounds}=setup();
 for(const zone of ['sora','ura_sora'])c.playSoraContinueVoice('nebula',{flowBefore:{phase:'art',zone}});
 assert.equal(sounds.length,2);assert.ok(sounds.every(s=>s.src==='assets/media/nova/continue-sora.wav'&&s.volume===.6));
 for(const [symbol,resolved] of [['seven',{flowBefore:{phase:'art',zone:'sora'}}],['nebula',{flowBefore:{phase:'art',zone:'toto'}}],['nebula',{aTypeBonusGame:true,flowBefore:{phase:'art',zone:'sora'}}]])c.playSoraContinueVoice(symbol,resolved);
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){c[flag]=true;c.playSoraContinueVoice('nebula',{flowBefore:{phase:'art',zone:'sora'}});c[flag]=false;}
 assert.equal(sounds.length,2);
});
