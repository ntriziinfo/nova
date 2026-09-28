import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8');
function setup(){
 const sounds=[],c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,voiceOutputVolume:()=>.6,playOneShotSound:(src,volume)=>sounds.push({src,volume})});
 vm.runInContext(html.match(/  const GIRU_LADDER_VOICE_SRCS=[^\n]+/)[0],c);
 for(const name of ['playGiruLadderBetVoice','playGiruLadderResultVoice'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
 vm.runInContext(fs.readFileSync('nova-art.js','utf8'),c);
 return {c,sounds};
}
function challenge(c,zone,pass){
 const flow={...c.NovaArt.startZone(c.NovaArt.enter(),zone,{},()=>.5),ladderRevealed:true,ladder:[100,300,500,1000,2000],ladderIndex:1,award:'300',zoneLeft:3};
 const step=c.NovaArt.step(flow,{},()=>.99,pass?'REPLAY':'MISS');
 return {result:step.result,resolved:{flowBefore:flow,flowAfter:step.flow}};
}

test('Giru and reverse Giru use a 70% good-flow hint on passes and 10% on misses; remaining two lines are equal',()=>{
 for(const zone of ['giru','ura_giru'])for(const pass of [false,true]){
  const {c,sounds}=setup(),counts={};
  for(let i=0;i<100;i++){
   const spin=challenge(c,zone,pass);let draws=0;
   c.playGiruLadderBetVoice(spin,()=>{draws++;return (i+.5)/100;});
   c.playGiruLadderBetVoice(spin,()=>{throw new Error('duplicate BET voice');});
   assert.equal(draws,1);const {src,volume}=sounds.at(-1);assert.equal(volume,.6);
   const name=src.match(/bet-(.+)\.wav$/)[1];counts[name]=(counts[name]||0)+1;
  }
  assert.deepEqual(counts,{'good-flow':pass?70:10,moment:pass?15:45,challenge:pass?15:45});
 }
});

test('base reveal, entry roulette, other characters, bonuses and the result spin do not play challenge lines',()=>{
 const {c,sounds}=setup();
 const cases=[
  {phase:'normal',zone:'giru',ladderRevealed:true},
  {phase:'art',zone:'giru',ladderRevealed:false},
  {phase:'art',zone:'sosuke',ladderRevealed:true},
  {phase:'art',zone:'giru',ladderRevealed:true,entryStage:'roulette'},
  {phase:'art',zone:'giru',ladderRevealed:true,entryStage:'confirmed'}
 ].map(flowBefore=>({resolved:{flowBefore}}));
 const bonus=challenge(c,'giru',true);bonus.resolved.aTypeBonusGame=true;cases.push(bonus);
 const result=challenge(c,'giru',true);result.ladderResultPresentation={zone:'giru',pt:'500'};cases.push(result);
 for(const spin of cases)c.playGiruLadderBetVoice(spin,()=>{throw new Error('unexpected voice draw');});
 assert.deepEqual(sounds,[]);
});

test('result first stop uses final secured pt with 1000 taking precedence over 500, only once',()=>{
 for(const zone of ['giru','ura_giru'])for(const [pt,name]of [[0,'under500'],[300,'under500'],[499,'under500'],[500,'500'],[999,'500'],[1000,'1000'],[2000,'1000'],[3000,'1000']]){
  const {c,sounds}=setup(),spin={ladderResultPresentation:{zone,pt:String(pt)}};
  c.playGiruLadderResultVoice(spin,0);assert.equal(sounds.length,0);
  for(const stop of [1,1,2,3])c.playGiruLadderResultVoice(spin,stop);
  assert.deepEqual(sounds,[{src:'assets/media/nova/giru-ladder-result-'+name+'.wav',volume:.6}]);
 }
});

test('result voices stay silent on other zones, invalid awards, second/third stops and simulations',()=>{
 const {c,sounds}=setup();
 for(const presentation of [null,{zone:'sosuke',pt:'1000'},{zone:'giru',pt:'bad'},{zone:'giru',pt:-1}])c.playGiruLadderResultVoice({ladderResultPresentation:presentation},1);
 for(const stop of [0,2,3])c.playGiruLadderResultVoice({ladderResultPresentation:{zone:'giru',pt:1000}},stop);
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){
  c[flag]=true;
  c.playGiruLadderBetVoice(challenge(c,'giru',true));
  c.playGiruLadderResultVoice({ladderResultPresentation:{zone:'giru',pt:1000}},1);
  c[flag]=false;
 }
 assert.deepEqual(sounds,[]);
});
