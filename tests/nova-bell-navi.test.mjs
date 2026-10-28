import {loadVoiceCatalog} from './helpers/voice-catalog.mjs';
import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});vm.runInContext(fs.readFileSync('nova-bell-navi.js','utf8'),context);
const n=context.NovaBellNavi,copy=x=>JSON.parse(JSON.stringify(x));
const bell=()=>({result:'BELL',resolved:{flowBefore:{phase:'art'}}});
test('normal left-first bell navigation is reserved for confirmed CZ entry',()=>{
 const normal=extra=>({result:'BELL',resolved:{flowBefore:{phase:'normal'},normalBellNavi:true,...extra}});
 for(const extra of [{},{normalInternal:{prelude:{kind:'czFake'}}},{internalBonus:'BIG'}]){
  for(let i=0;i<60;i++){
   let calls=0;const spin=normal(extra),before=JSON.stringify(spin);
   assert.notEqual(n.drawOrder(()=>{calls++;return (i+.5)/60;},spin)[0],0);
   assert.equal(calls,1);assert.equal(JSON.stringify(spin),before);
  }
 }
 for(const extra of [{normalInternal:{prelude:{kind:'cz'}}},{flowAfter:{phase:'cz'}},{czPrelude:{enter:true}}]){
  assert.equal(n.drawOrder(()=>0,normal(extra))[0],0);
 }
});
test('AT left-first only appears with a confirmed reward or won zone prelude',()=>{
 for(let i=0;i<60;i++)assert.notEqual(n.drawOrder(()=>(i+.5)/60,bell())[0],0);
 for(const extra of [{atOutcome:{direct:50}},{flowAfter:{atPrelude:{zones:['toto']}}},{atPrelude:{confirmed:true}}]){
  const s=bell();Object.assign(s.resolved,extra);assert.equal(n.drawOrder(()=>0,s)[0],0);
 }
});
test('unrestricted bell nav has all six equally sized random stop-order intervals',()=>{
 const drawn=[];
 for(let i=0;i<6;i++){
  const order=copy(n.drawOrder(()=>(i+.5)/6));assert.deepEqual(order.slice().sort(),[0,1,2]);drawn.push(order.join(''));
 }
 assert.equal(new Set(drawn).size,6);
});
test('bell nav only applies during ordinary AT, never over zone, initial or bonus presentations',()=>{
 assert(n.eligible(bell()));
 for(const result of ['REPLAY','MISS','BIG','SUPER_NOVA'])assert(!n.eligible({...bell(),result}));
 for(const phase of ['normal','cz','strong_cz'])assert(!n.eligible({result:'BELL',resolved:{flowBefore:{phase}}}));
 for(const flag of ['zone','entryStage','initialStage','comebackLeft','comebackConfirmed','burstPending','burstLeft']){
  const s=bell();s.resolved.flowBefore[flag]=true;assert(!n.eligible(s),flag);
 }
 for(const flag of ['zoneSpin','bonusPendingAtStart','comebackEvent','burstEvent']){
  const s=bell();s.resolved[flag]=true;assert(!n.eligible(s),flag);
 }
 assert(!n.eligible({...bell(),aTypeBonusActiveAtStart:true}));
});
test('AUTO and takeover reuse the committed nav order without another random draw',()=>{
 const spin={...bell(),bellNaviOrder:[1,2,0],stopped:[false,true,false]};
 const order=n.stopOrder(spin);assert.deepEqual(copy(order),[1,2,0]);order[0]=0;assert.deepEqual(spin.bellNaviOrder,[1,2,0]);
 assert.deepEqual(copy(n.stopOrder({resolved:{aim:{}}})),[2,1,0]);
 assert.deepEqual(copy(n.stopOrder({})),[0,1,2]);
 assert.deepEqual(copy(n.stopOrder({zoneActiveAtStart:true,resolved:{}})),[0,1,2]);
 assert.deepEqual(copy(n.stopOrder({zoneActiveAtStart:true,reversePushGuide:'red',resolved:{}})),[2,1,0]);
 for(const selected of [[0,1,2],[1,0,2],[0,2,1]]){
  const before=selected.slice(),actual=n.stopOrder({autoStopOrder:selected,resolved:{}});assert.deepEqual(copy(actual),selected);actual.reverse();assert.deepEqual(selected,before);
  assert.deepEqual(copy(n.stopOrder({autoStopOrder:selected,resolved:{aim:{guide:false}}})),selected);
  assert.deepEqual(copy(n.stopOrder({autoStopOrder:selected,resolved:{zoneSpin:true,flowBefore:{zone:'ouma'},aimDisplay:{guide:false}}})),selected);
  assert.deepEqual(copy(n.stopOrder({autoStopOrder:selected,resolved:{researchChallenge:{priorAim:'nova'},aimDisplay:{guide:false}}})),selected);
  assert.deepEqual(copy(n.stopOrder({autoStopOrder:selected,bellNaviOrder:[2,0,1],resolved:{}})),[2,0,1]);
 }
});

function voiceHarness(){
 const sounds=[],html=readGameSource();
 const c=vm.createContext({NovaBellNavi:n,debugFastSpinActive:false,speedToBonusActive:false,voiceOutputVolume:()=>.6,playOneShotSound:(src,volume)=>sounds.push({src,volume})});
 loadVoiceCatalog(c);
 vm.runInContext(html.match(/  const BELL_NAVI_VOICE_SRCS=[^\n]+/)[0]+'\n'+html.match(/  const BELL_NAVI_COMPLETE_VOICE_SRCS=[^\n]+/)[0]+'\n'+html.match(/  function playBellNaviVoice\([^]*?\n  }/)[0],c);
 return {c,sounds};
}

test('wrong BELL and BELL15 prefixes miss immediately, except during research sortie',()=>{
 for(const result of ['BELL','BELL15']){
  assert.equal(n.presentationMissed({result,bellNaviOrder:[2,0,1],auditPressOrder:[2]}),false);
  assert.equal(n.presentationMissed({result,bellNaviOrder:[2,0,1],auditPressOrder:[2,1]}),true);
  assert.equal(n.presentationMissed({result,bellNaviOrder:[2,0,1],auditStopOrder:[0]}),true);
  assert.equal(n.presentationMissed({result,bellNaviOrder:[2,0,1],auditPressOrder:[0],resolved:{researchSortie:{won:true}}}),false);
 }
 for(const result of ['REPLAY','MISS'])assert.equal(n.presentationMissed({result,bellNaviOrder:[2,0,1],auditPressOrder:[0]}),false);
});

test('all six orders keep the randomly selected character through manual and AUTO stops',()=>{
 const voiceIntervals=['sosuke','sora','giru','toto','ouma','nito','kushuri'].flatMap((character,i)=>[[i/7,character],[(i+1)/7-1e-8,character]]);
 for(const [roll,character] of voiceIntervals)for(let pick=0;pick<6;pick++)for(const autoStopAtStart of [false,true]){
  const sources=['left','center','right'].map(side=>'assets/media/nova/navi-'+side+'-'+character+'.wav');let draws=0;
  const {c,sounds}=voiceHarness(),spin={...bell(),autoStopAtStart,bellNaviOrder:copy(n.drawOrder(()=>(pick+.5)/6)),stopped:[false,false,false]};
  const rng=()=>{draws++;return roll;};
  c.playBellNaviVoice(spin,rng);c.playBellNaviVoice(spin,rng);
  const order=copy(n.stopOrder(spin));
  for(let index=0;index<3;index++){
   assert.equal(sounds.length,index+1);assert.deepEqual(sounds[index],{src:sources[order[index]],volume:.6});
   spin.stopped[order[index]]=true;c.playBellNaviVoice(spin,rng);c.playBellNaviVoice(spin,rng);
  }
  assert.equal(sounds.length,4);
  assert.deepEqual(sounds[3],{src:'assets/media/nova/navi-complete-'+character+'.wav',volume:.6});
  assert.equal(spin.bellNaviVoiceCharacter,character);assert.equal(draws,1);
 }
});

test('a wrong press stops every subsequent normal navigation voice',()=>{
 const {c,sounds}=voiceHarness();
 for(const spin of [bell(),{...bell(),stopped:[true,true,true]},{rareNavi:{color:'red',mark:'!!'},stopped:[false,false,false]},{rareNavi:{color:'red',mark:'!!'},stopped:[true,true,true]},null])c.playBellNaviVoice(spin);
 assert.equal(sounds.length,0);
 const spin={...bell(),bellNaviOrder:[2,0,1],auditPressOrder:[],stopped:[false,false,false]};
 c.playBellNaviVoice(spin,()=>0);assert.equal(sounds[0].src,'assets/media/nova/navi-right-sosuke.wav');
 spin.auditPressOrder.push(2);spin.stopped[2]=true;c.playBellNaviVoice(spin);assert.equal(sounds[1].src,'assets/media/nova/navi-left-sosuke.wav');
 spin.auditPressOrder.push(1);spin.stopped[1]=true;c.playBellNaviVoice(spin);
 assert.equal(sounds.length,2,'wrong second press must suppress the next and completion voices');
 spin.bellNaviFailed=true;spin.auditPressOrder=[2];c.playBellNaviVoice(spin);
 assert.equal(sounds.length,2,'the persisted failure flag also stays silent');
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){
  c[flag]=true;c.playBellNaviVoice({...bell(),bellNaviOrder:[0,1,2],stopped:[false,false,false]});c[flag]=false;
 }
 assert.equal(sounds.length,2);
});

test('the first wrong press hides navigation, stops live voices and plays the failure voice once',()=>{
 const html=readGameSource(),sounds=[],stops=[];
 const live={paused:0,currentTime:4,pause(){this.paused++;}};
 const c=vm.createContext({
  NovaBellNavi:{presentationMissed:n.presentationMissed,stop:spin=>stops.push(spin)},
  BELL_NAVI_FAILURE_VOICE_SRC:'assets/media/nova/navi-failure-sosuke.wav',
  voiceOutputVolume:()=>.6,
  playOneShotSound:(src,volume,options)=>{sounds.push({src,volume,options});return {};}
 });
 vm.runInContext(html.match(/  function handleBellNavigationFailure\([^]*?\n  }/)[0],c);
 const spin={...bell(),bellNaviOrder:[2,0,1],auditPressOrder:[0],bellNaviVoiceAudios:[live]};
 assert.equal(c.handleBellNavigationFailure(spin),true);
 assert.equal(spin.bellNaviFailed,true);assert.equal(spin.bellNaviFailurePlayed,true);
 assert.equal(live.paused,1);assert.equal(live.currentTime,0);assert.equal(spin.bellNaviVoiceAudios.length,0);
 assert.equal(stops.length,1);assert.equal(sounds.length,1);assert.equal(sounds[0].src,'assets/media/nova/navi-failure-sosuke.wav');assert.equal(sounds[0].volume,.6);assert.equal(sounds[0].options.allowDuringPremiumConfirm,true);
 assert.equal(c.handleBellNavigationFailure(spin),false);assert.equal(stops.length,1);assert.equal(sounds.length,1);
 assert.match(html,/auditPressOrder \|\|= \[\]\)\.push\(i\);\s*handleBellNavigationFailure\(currentSpin\);/);
});

test('visible aim AUTO prioritizes reverse order over stale bell navigation',()=>{
 for(const resolved of [{zoneSpin:true,flowBefore:{zone:'ouma'},aimDisplay:{guide:true}},{zoneSpin:true,zoneStartFlow:{zone:'urapi'},aimDisplay:{guide:true}},{researchChallenge:{priorAim:'nova'},aimDisplay:{guide:true}},{aim:{symbol:'seven',guide:true}},{aim:{symbol:'nebula',guide:true}},{bonusPendingAtStart:true,bonusReady:true}])assert.deepEqual(copy(n.stopOrder({resolved,bellNaviOrder:[0,1,2]})),[2,1,0]);
});

test('sortie trigger uses middle first while other aims remain reverse',()=>{assert.deepEqual(copy(n.stopOrder({resolved:{stockEntry:true,sortieEntry:true}})),[1,2,0]);assert.deepEqual(copy(n.stopOrder({resolved:{stockEntry:true}})),[2,1,0]);});
