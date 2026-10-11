import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup({reduced=false}={}){
 const elements=[],animations=[],frames=new Map(),timers=new Map(),events=[];let draws=0,frameId=0,now=0,timerId=0;
 const clock={setTimeout(fn,ms){timers.set(++timerId,{fn,at:now+ms});return timerId;},clearTimeout(id){timers.delete(id);}};
 function advance(ms){now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}}
 function element(tag){
  const classes=new Set(),e={tag,children:[],style:{setProperty(k,v){this[k]=v;}},dataset:{},offsetWidth:1000,hidden:false,
   classList:{toggle(k,on){on?classes.add(k):classes.delete(k);},remove(k){classes.delete(k);}},
   append(...children){this.children.push(...children);},setAttribute(k,v){this[k]=v;},
   get firstChild(){return this.children[0];},querySelectorAll(){return this.children.filter(e=>e.dataset.reel!==undefined);},
   getBoundingClientRect(){return {left:0,top:0,width:1000,height:1200};},
   animate(frames,options){const a={frames,options,cancelled:false,cancel(){this.cancelled=true;}};animations.push(a);return a;}
  };elements.push(e);return e;
 }
 const host=element('host'),reels=[0,1,2].map(i=>{const e=element('reel');e.dataset.reel=String(i);return e;});
 const lamps=['sosuke','toto','urapi','giru1','sora1','ouma1','nito','kushuri'].map(id=>({dataset:{artwork:id}}));
 host.querySelector=()=>({getBoundingClientRect:()=>({left:100,top:600,width:600,height:240})});host.querySelectorAll=()=>reels;
 const context=vm.createContext({NovaClock:clock,performance:{now:()=>now},Event:class{constructor(type){this.type=type;}},crypto:{getRandomValues(a){draws++;a[0]=0;return a;}},document:{getElementById:()=>host,createElement:element,querySelectorAll:s=>s==='.novaArtItem'?lamps:reels},window:{addEventListener(){},dispatchEvent:e=>events.push(e.type)},matchMedia:()=>({matches:reduced}),requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id)});
 vm.runInContext(fs.readFileSync('nova-sortie-presentation.js','utf8'),context);
 vm.runInContext('Math.random=()=>{throw Error("Presentation must not consume game RNG")}',context);
 return {api:context.NovaSortie,animations,lamps,frames,timers,events,advance,jump:ms=>{now+=ms;},frame:()=>{const [id,fn]=frames.entries().next().value;frames.delete(id);fn();},draws:()=>draws,view:()=>elements.find(e=>e.id==='novaSortieCharacter')};
}
function spin(won,zone='sora',finished=false){return {stopped:[false,false,false],resolved:{researchSortie:Object.freeze({won,zone:won?zone:'',finished}),reward:8,flowAfter:{remaining:'600',queuedZones:won?[zone]:[]}}};}
const visible=t=>t.view().firstChild.children.filter(e=>e.tag==='img'&&!e.hidden).map(e=>e.dataset.character);

test('BET and the first two stops fade the same awarded character; the third reveals the true award',()=>{
 for(const zone of ['sosuke','toto','urapi','giru','sora','ouma','ura_giru','ura_sora','ura_ouma','kushuri_nito']){
  const t=setup(),s=spin(true,zone),before=JSON.stringify(s.resolved);t.api.begin(s);
  const expected=zone==='kushuri_nito'?['nito','kushuri']:[zone.replace('ura_','')];
  assert.deepEqual(visible(t),expected);assert.equal(t.view().dataset.confirmed,'false');assert.equal(t.draws(),0);
  for(let stage=0;stage<3;stage++){
   if(stage){s.stopped[3-stage]=true;t.api.stop(s);}
   assert.deepEqual(visible(t),expected);assert.equal(t.view().dataset.stage,String(stage));
   assert.equal(t.animations.at(-1).frames[0].opacity,0);assert.equal(t.animations.at(-1).frames.at(-1).opacity,0);
   const count=t.animations.length;t.api.stop(s);assert.equal(t.animations.length,count,'re-render must not replay a stop');
  }
  s.stopped[0]=true;t.api.stop(s);
  assert.equal(t.view().dataset.confirmed,'true');assert.equal(t.view().hidden,false);assert.equal(t.animations.at(-1).frames.at(-1).opacity,1);
  assert(t.view().children.at(-1).textContent.endsWith('ゾーン獲得！'));
  if(zone.startsWith('ura_'))assert(t.view().children.at(-1).textContent.startsWith('裏'));
  assert.equal(JSON.stringify(s.resolved),before);assert.equal(t.draws(),0);
  assert.equal(t.view().style.top,'600px');assert.equal(t.view().style.height,'240px');
  assert.equal(t.lamps.filter(l=>l.dataset.sortieWon==='true').length,zone==='kushuri_nito'?2:1);
 }
});

test('misses tease with separate visual randomness but never show a third-stop confirmation',()=>{
 const t=setup(),s=spin(false),before=JSON.stringify(s.resolved);t.api.begin(s);
 assert.equal(t.draws(),1);assert.deepEqual(visible(t),['sosuke']);
 for(const i of [2,1]){s.stopped[i]=true;t.api.stop(s);assert.equal(t.draws(),1);assert.deepEqual(visible(t),['sosuke']);}
 const last=t.animations.at(-1);s.stopped[0]=true;t.api.stop(s);
 assert.equal(t.view().hidden,true);assert.equal(last.cancelled,true);assert.equal(t.animations.length,3);
 assert.equal(JSON.stringify(s.resolved),before);assert(t.lamps.every(l=>l.dataset.sortieWon==='false'));
});

test('wrong stop order still reveals an internally awarded zone; replay resumes the current stage',()=>{
 const t=setup(),s=spin(true,'ura_giru',true);s.stopped=[true,false,true];s.auditPressOrder=[0,2];t.api.begin(s);
 assert.equal(t.view().dataset.stage,'2');assert.deepEqual(visible(t),['giru']);
 s.stopped[1]=true;t.api.stop(s);assert.equal(t.view().dataset.confirmed,'true');
 t.api.begin(JSON.parse(JSON.stringify(s)));assert.equal(t.view().dataset.stage,'3');assert.equal(t.view().dataset.confirmed,'true');
});

test('new BET, reset and leaving sortie cancel old fades and clear a final award',()=>{
 const t=setup(),s=spin(true,'sora');t.api.begin(s);const first=t.animations.at(-1);
 t.api.clear();assert.equal(first.cancelled,true);assert.equal(t.view().hidden,true);
 s.stopped=[true,true,true];t.api.begin(s);assert.equal(t.view().dataset.confirmed,'true');
 t.api.begin(spin(false));assert.equal(t.view().dataset.confirmed,'false');assert.deepEqual(visible(t),['sosuke']);
 const last=t.animations.at(-1);t.api.begin({resolved:{}});assert.equal(t.view().hidden,true);assert.equal(last.cancelled,true);
 assert(t.lamps.every(l=>l.dataset.sortieWon==='false'));
});

test('missing or unknown award character cannot turn into a false third-stop reveal',()=>{
 const t=setup(),s=spin(true,'unknown');s.stopped=[true,true,true];t.api.begin(s);
 assert.equal(t.view().hidden,true);assert.equal(t.animations.length,0);assert.equal(t.draws(),0);
});

function sound(){
 const listeners=new Map();return {currentTime:0,readyState:4,paused:false,loop:false,volume:1,listeners,
  pause(){this.paused=true;},addEventListener(k,fn){listeners.set(k,fn);},removeEventListener(k){listeners.delete(k);}
 };
}

test('winning third stop plays the supplied sound once and scales by its playback position within 80–100%',()=>{
 const t=setup(),audio=sound(),s=spin(true);let plays=0;
 t.api.setSoundPlayer(src=>{assert.equal(src,'assets/media/nova/sortie-award.mp3');plays++;return {audio,promise:Promise.resolve()};});
 t.api.begin(s);for(const i of [2,1]){s.stopped[i]=true;t.api.stop(s);}assert.equal(plays,0);
 s.stopped[0]=true;t.api.stop(s);t.api.stop(s);assert.equal(plays,1);assert.equal(audio.loop,false);
 const scales=[];
 for(let time=0;time<5.21;time+=.01){audio.currentTime=time;t.frame();scales.push(Number(t.view().firstChild.style['--sortie-win-scale']));}
 assert(Math.min(...scales)>=.8);assert(Math.max(...scales)<=1);assert(Math.min(...scales)<.81);assert(Math.max(...scales)>.99);
 audio.currentTime=.09;t.frame();const atBeat=t.view().firstChild.style['--sortie-win-scale'];
 audio.currentTime=4;t.frame();audio.currentTime=.09;t.frame();assert.equal(t.view().firstChild.style['--sortie-win-scale'],atBeat,'seek must use the audio clock');
 t.api.updateVolume(0);assert.equal(audio.volume,0);assert.equal(t.frames.size,1,'mute does not stop the visual');
 audio.listeners.get('ended')();assert.equal(audio.paused,true);assert.equal(audio.loop,false);assert.equal(audio.currentTime,0);assert.equal(t.frames.size,0);assert.equal(audio.listeners.size,0);
 t.api.stop(s);assert.equal(plays,1,'finished sound must not restart on render');assert.equal(t.api.busy,true,'audio completion does not release the hold');
});

test('failed or superseded playback cannot keep audio or animation alive',async()=>{
 const t=setup(),old=sound(),next=sound(),s=spin(true);s.stopped=[true,true,true];let reject;
 t.api.setSoundPlayer(()=>({audio:old,promise:new Promise((_,r)=>{reject=r;})}));t.api.begin(s);t.api.clear();
 t.api.setSoundPlayer(()=>({audio:next,promise:Promise.resolve()}));t.api.begin(spin(true));s.stopped=[true,true,true];t.api.begin(s);
 reject(new Error('delayed failure'));await Promise.resolve();assert.equal(next.paused,false);assert.equal(t.frames.size,1);
 next.listeners.get('error')();assert.equal(next.paused,true);assert.equal(t.frames.size,0);assert.equal(t.view().firstChild.style['--sortie-win-scale'],'1');
});

test('reduced motion keeps the confirmation audio but omits the zoom frame loop',()=>{
 const t=setup({reduced:true}),audio=sound(),s=spin(true);s.stopped=[true,true,true];
 t.api.setSoundPlayer(()=>({audio}));t.api.begin(s);assert.equal(audio.loop,false);assert.equal(t.frames.size,0);assert.equal(t.api.waitMs,4000);
 t.api.clear();assert.equal(audio.paused,true);
});

test('only awarded third stops hold the next BET for exactly four seconds, including the final sortie game',()=>{
 for(const finished of [false,true]){
  const t=setup(),s=spin(true,'sora',finished);t.api.begin(s);assert.equal(t.api.busy,false);
  for(const i of [2,1]){s.stopped[i]=true;t.api.stop(s);assert.equal(t.api.busy,false);}
  s.stopped[0]=true;t.api.stop(s);assert.equal(t.api.waitMs,4000);
  t.advance(2000);t.api.stop(s);assert.equal(t.api.waitMs,2000,'render must not restart hold');
  t.advance(1999);assert.equal(t.api.busy,true);assert.equal(t.api.waitMs,1);assert.deepEqual(t.events,[]);
  t.advance(1);assert.equal(t.api.busy,false);assert.deepEqual(t.events,['nova-sortie-unlocked']);
  t.advance(4000);assert.equal(t.events.length,1);
  const miss=spin(false);miss.stopped=[true,true,true];t.api.begin(miss);assert.equal(t.api.busy,false);
 }
});

test('playback failure and missing animation frames do not release or prolong the four-second hold',async()=>{
 const t=setup(),audio=sound(),s=spin(true);s.stopped=[true,true,true];
 t.api.setSoundPlayer(()=>({audio,promise:Promise.reject(new Error('autoplay blocked'))}));t.api.begin(s);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(t.frames.size,0);assert.equal(t.api.busy,true);
 t.jump(3999);assert.equal(t.api.waitMs,1);
 t.jump(1);assert.equal(t.api.busy,false,'deadline is independent of RAF and delayed background timer delivery');
 t.advance(0);assert.deepEqual(t.events,['nova-sortie-unlocked']);
});

test('reset cancels the hold and stale callbacks cannot unlock a later award',()=>{
 const t=setup(),s=spin(true);s.stopped=[true,true,true];t.api.begin(s);
 const stale=[...t.timers.values()][0].fn;t.advance(1000);t.api.clear();assert.equal(t.api.busy,false);assert.equal(t.timers.size,0);
 t.api.begin(s);stale();assert.equal(t.api.waitMs,4000);assert.deepEqual(t.events,[]);
 t.advance(4000);assert.deepEqual(t.events,['nova-sortie-unlocked']);
 t.api.begin(s);t.api.clear();t.advance(5000);assert.equal(t.events.length,1);
});
