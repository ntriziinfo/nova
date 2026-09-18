import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});vm.runInContext(fs.readFileSync('nova-bell-navi.js','utf8'),context);
const n=context.NovaBellNavi,copy=x=>JSON.parse(JSON.stringify(x));
const bell=()=>({result:'BELL',resolved:{flowBefore:{phase:'art'}}});
test('AT bell nav has all six equally sized random stop-order intervals',()=>{
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
});

function voiceHarness(){
 const sounds=[],html=fs.readFileSync('jag.html','utf8');
 const c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,voiceOutputVolume:()=>.6,playOneShotSound:(src,volume)=>sounds.push({src,volume})});
 vm.runInContext(html.match(/  const BELL_NAVI_VOICE_SRCS=[^\n]+/)[0]+'\n'+html.match(/  const BELL_NAVI_COMPLETE_VOICE_SRC=[^\n]+/)[0]+'\n'+html.match(/  function playBellNaviVoice\([^]*?\n  }/)[0],c);
 return {c,sounds};
}

test('all six numbered orders announce directions then celebrate third landing exactly once for manual and AUTO',()=>{
 const sources=['left','center','right'].map(side=>'assets/media/nova/navi-'+side+'-sosuke.wav');
 for(let pick=0;pick<6;pick++)for(const autoStopAtStart of [false,true]){
  const {c,sounds}=voiceHarness(),spin={...bell(),autoStopAtStart,bellNaviOrder:copy(n.drawOrder(()=>(pick+.5)/6)),stopped:[false,false,false]};
  c.playBellNaviVoice(spin);c.playBellNaviVoice(spin);
  const order=copy(n.stopOrder(spin));
  for(let index=0;index<3;index++){
   assert.equal(sounds.length,index+1);assert.deepEqual(sounds[index],{src:sources[order[index]],volume:.6});
   spin.stopped[order[index]]=true;c.playBellNaviVoice(spin);c.playBellNaviVoice(spin);
  }
  assert.equal(sounds.length,4);
  assert.deepEqual(sounds[3],{src:'assets/media/nova/navi-complete-sosuke.wav',volume:.6});
 }
});

test('voice follows the remaining displayed guide after wrong order, and stays silent without numbered navigation',()=>{
 const {c,sounds}=voiceHarness();
 for(const spin of [bell(),{...bell(),stopped:[true,true,true]},{rareNavi:{color:'red',mark:'!!'},stopped:[false,false,false]},{rareNavi:{color:'red',mark:'!!'},stopped:[true,true,true]},null])c.playBellNaviVoice(spin);
 assert.equal(sounds.length,0);
 const spin={...bell(),bellNaviOrder:[2,0,1],stopped:[true,false,false]};
 c.playBellNaviVoice(spin);assert.equal(sounds[0].src,'assets/media/nova/navi-right-sosuke.wav');
 spin.stopped[2]=true;c.playBellNaviVoice(spin);assert.equal(sounds[1].src,'assets/media/nova/navi-center-sosuke.wav');
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){
  c[flag]=true;c.playBellNaviVoice({...bell(),bellNaviOrder:[0,1,2],stopped:[false,false,false]});c[flag]=false;
 }
 assert.equal(sounds.length,2);
});
