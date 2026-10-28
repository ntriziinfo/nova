import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c=vm.createContext({document:{getElementById:()=>null,addEventListener(){}},window:{addEventListener(){}},setTimeout,clearTimeout});
for(const f of ['nova-ladder-presentation.js','nova-aim-presentation.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const verdict=s=>JSON.parse(JSON.stringify(c.NovaAim.stopVerdict(s)));
test('middle/scissors confirmations and failures are not revealed before the decisive stopped reel',()=>{
 for(const won of [false,true])for(const order of [[1,0,2],[0,2,1],[2,0,1],[2,1,0]]){
  const decisive=order[0]===1?1:2-order[0];
  for(let count=1;count<=3;count++){
   const stopped=order.slice(0,count),spin={result:won?'NEBULA':'MISS',aimAligned:won,auditStopOrder:stopped,resolved:{aim:{symbol:'nebula',guide:true}}};
   const v=verdict(spin);assert.equal(!!v,stopped.includes(decisive));if(v)assert.equal(v.won,won);
  }
 }
});
test('NOVA, sortie and ladder use the same early success/failure boundary',()=>{
 for(const won of [true,false]){
  const nova={result:won?'SUPER_NOVA':'MISS',resolved:{zoneSpin:true,flowBefore:{phase:'art',zone:'ouma'}},auditStopOrder:[1]};assert.equal(verdict(nova).won,won);
  const sortie={resolved:{stockEntry:true,sortieEntry:true,sortieFake:!won},auditStopOrder:[1]};assert.equal(verdict(sortie).won,won);
  const ladder={resolved:{zoneSpin:true,flowBefore:{phase:'art',zone:'giru',ladder:[50,100],ladderIndex:0,ladderRevealed:true},flowAfter:{ladderIndex:won?1:0}},auditStopOrder:[0]};assert.equal(verdict(ladder),null);ladder.auditStopOrder.push(2);assert.equal(verdict(ladder).won,won);
  ladder.resolved.flowBefore.ladderRevealed=false;assert.equal(verdict(ladder),null);
 }
});
test('presentation played flags survive resume without changing the resolved award',()=>{
 const spin={result:'BIG',grid:[['a','b','c'],['7','7','7'],['x','y','z']],resolved:{reward:15},stopped:[false,true,false],stopOutcomeRevealed:{kind:'aim',won:true},earlyAimSoundPlayed:true,earlyAimFailurePlayed:false,superNovaStopSoundPlayed:true,ladderOutcomeSoundPlayed:true,sortieConfirmSoundPlayed:true};
 const restored=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),{BIG:{}});
 for(const k of ['earlyAimSoundPlayed','earlyAimFailurePlayed','superNovaStopSoundPlayed','ladderOutcomeSoundPlayed','sortieConfirmSoundPlayed'])assert.equal(restored[k],spin[k]);assert.equal(restored.resolved.reward,15);
});
