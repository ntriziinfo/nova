import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function setup(){
 const timers=new Map();let id=0;
 const c=vm.createContext({comebackIntroVoiceHold:null,setTimeout:(f,ms)=>{timers.set(++id,{f,ms});return id;},clearTimeout:i=>timers.delete(i)});
 for(const name of ['waitForComebackIntroVoice','clearComebackIntroVoiceHold'])vm.runInContext(fn(name),c);
 class Audio extends EventTarget{
  currentTime=0;ended=false;pauses=0;
  pause(){this.pauses++;}
 }
 return {c,timers,Audio};
}

test('loading, play promise resolution and timeupdate do not start reels; only ended releases the wait',async()=>{
 const {c,timers,Audio}=setup(),audio=new Audio();let loaded,finished=false;
 const wait=c.waitForComebackIntroVoice({audio,promise:new Promise(r=>loaded=r)}).then(proceed=>{finished=true;return proceed;});
 await Promise.resolve();assert(!finished);loaded();await Promise.resolve();assert(!finished);
 audio.dispatchEvent(new Event('playing'));audio.currentTime=4;audio.dispatchEvent(new Event('timeupdate'));
 await Promise.resolve();assert(!finished);assert.equal(timers.size,1);
 audio.ended=true;audio.dispatchEvent(new Event('timeupdate'));await Promise.resolve();assert(!finished);
 audio.dispatchEvent(new Event('ended'));
 assert.equal(await wait,true);assert.equal(audio.pauses,0);assert.equal(timers.size,0);assert.equal(c.comebackIntroVoiceHold,null);
});

test('audio errors, autoplay rejection and a stalled player release the paid spin without replaying BET',async()=>{
 for(const failure of ['error','rejection','stalled']){
  const {c,timers,Audio}=setup(),audio=new Audio();
  const wait=c.waitForComebackIntroVoice({audio,promise:failure==='rejection'?Promise.reject(Error('NotAllowedError')):new Promise(()=>{})});
  if(failure==='error')audio.dispatchEvent(new Event('error'));
  if(failure==='stalled'){
   const timer=[...timers.values()][0];assert.equal(timer.ms,10000);
   audio.dispatchEvent(new Event('timeupdate'));assert.equal([...timers.values()][0],timer);
   timer.f();
  }
  assert.equal(await wait,true);assert.equal(audio.pauses,1);assert.equal(timers.size,0);
 }
});

test('reset aborts a waiting spin; old events and rejections cannot unlock a later spin',async()=>{
 const {c,timers,Audio}=setup(),old=new Audio();let reject;
 const oldWait=c.waitForComebackIntroVoice({audio:old,promise:new Promise((_,r)=>reject=r)});
 const stale=[...timers.values()][0].f;c.clearComebackIntroVoiceHold();
 assert.equal(await oldWait,false);assert.equal(old.pauses,1);
 const next=new Audio();let done=false;
 const nextWait=c.waitForComebackIntroVoice({audio:next,promise:Promise.resolve()}).then(value=>{done=true;return value;});
 old.dispatchEvent(new Event('ended'));stale();reject(Error('old failed'));await Promise.resolve();await Promise.resolve();
 assert(!done);assert.equal(timers.size,1);next.ended=true;next.dispatchEvent(new Event('ended'));
 assert.equal(await nextWait,true);assert.equal(timers.size,0);
 for(const name of ['resetGame','resetRuntimeForMorning'])assert.match(fn(name),/clearComebackIntroVoiceHold\(\)/);
});
