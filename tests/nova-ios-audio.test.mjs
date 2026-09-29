import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync('nova-audio.js','utf8');
function setup(ios=true){
 const listeners={},nodes=[],gains=[],events=[];let decode=null,fetches=0,nativePlays=0;
 class NativeAudio extends EventTarget{
  constructor(src){super();this.attrs={};if(src)this.attrs.src=src;this.volume=1;this.muted=false;this.loop=false;this.preload='auto';}
  cloneNode(){const a=new NativeAudio();a.attrs={...this.attrs};return a;}
  getAttribute(name){return this.attrs[name]??null;}
  setAttribute(name,value){this.attrs[name]=String(value);}
  play(){nativePlays++;return Promise.resolve();}
  dispatchEvent(event){super.dispatchEvent(event);this['on'+event.type]?.(event);return true;}
 }
 const c={state:'suspended',currentTime:0,sampleRate:44100,destination:{},resumes:0,addEventListener(){},
  resume(){this.resumes++;this.state='running';return Promise.resolve();},
  createBuffer:()=>({duration:0,length:1,numberOfChannels:1}),
  createBufferSource(){const n={connections:[],connect(x){this.connections.push(x);},disconnect(){this.connections=[];},start(t,offset){this.offset=offset;this.started=true;},stop(){this.stopped=true;}};nodes.push(n);return n;},
  createGain(){const g={gain:{value:1},connections:[],connect(x){this.connections.push(x);},disconnect(){this.connections=[];}};gains.push(g);return g;},
  decodeAudioData:async()=>decode?decode():{duration:4,length:176400,numberOfChannels:1}};
 const root={navigator:{userAgent:ios?'iPhone':'desktop',platform:'',maxTouchPoints:ios?5:0,audioSession:{}},
  document:{baseURI:'https://nova.test/',hidden:false,addEventListener(){}},Audio:NativeAudio,AudioContext:function(){return c;},
  Event,DOMException,URL,fetch:async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};},
  setInterval:()=>1,clearInterval(){},window:{addEventListener(name,fn){listeners[name]=fn;},dispatchEvent(e){events.push(e.type);}}};
 vm.runInNewContext(code,root);
 return {api:root.NovaAudio,root,c,nodes,gains,events,listeners,NativeAudio,fetches:()=>fetches,nativePlays:()=>nativePlays,decode:fn=>{decode=fn;}};
}
test('desktop keeps native Audio; iPad desktop user agent is also detected',()=>{
 const {api,NativeAudio}=setup(false);assert.equal(api.enabled,false);assert.equal(api.Audio,NativeAudio);
 const {root}=setup(false);root.navigator.platform='MacIntel';root.navigator.maxTouchPoints=5;vm.runInNewContext(code,root);assert(root.NovaAudio.enabled);
});
test('real tap completion unlocks shared context even if audio session category is unsupported',async()=>{
 const {api,root,c,listeners}=setup();assert(listeners.touchend&&listeners.click&&listeners.keydown);
 assert.equal(await api.unlock({isTrusted:false}),false);assert.equal(c.resumes,0);
 Object.defineProperty(root.navigator.audioSession,'type',{set(){throw new Error('Unsupported');}});
 assert.equal(await api.unlock({isTrusted:true}),true);assert.equal(c.resumes,1);assert.equal(api.context(),c);
});
test('no sound is started before an actual user gesture',async()=>{
 const {api,c}=setup();c.state='running';const a=new api.Audio('clip.wav');
 await assert.rejects(a.play(),{name:'NotAllowedError'});assert.equal(api.status().started,0);
 await api.unlock({isTrusted:true});await a.play();assert.equal(api.status().started,1);
});
test('delayed and overlapping audio use buffers, with live volume, loop, pause/resume and one decode per file',async()=>{
 const {api,c,nodes,gains,fetches,nativePlays}=setup();await api.unlock({isTrusted:true});
 const a=new api.Audio('voice.wav'),b=a.cloneNode(true);a.volume=.2;a.loop=true;
 await a.play();await b.play();assert.equal(api.status().active,2);assert.equal(nativePlays(),0);assert.equal(fetches(),1);
 assert.equal(gains[0].gain.value,.2);a.volume=.6;assert.equal(gains[0].gain.value,.6);
 a.muted=true;assert.equal(gains[0].gain.value,0);a.muted=false;
 c.currentTime=1.5;assert.equal(a.currentTime,1.5);a.pause();assert.equal(api.status().active,1);assert.equal(a.currentTime,1.5);
 c.currentTime=3;await a.play();assert.equal(nodes.at(-1).offset,1.5);assert.equal(nodes.at(-1).loop,true);
});
test('cancelling or changing source during decoding never starts the stale clip',async()=>{
 const {api,decode}=setup();await api.unlock({isTrusted:true});
 let finish;decode(()=>new Promise(resolve=>finish=resolve));
 const a=new api.Audio('late.wav'),pending=a.play();
 while(!finish)await Promise.resolve();a.pause();finish({duration:4,length:100,numberOfChannels:1});await pending;
 assert.equal(api.status().active,0);assert(a.paused);
 a.src='next.wav';assert.equal(a.currentTime,0);assert(Number.isNaN(a.duration));
});
test('ended dispatches once and a voice bus replaces, rather than doubles, output',async()=>{
 const {api,nodes,gains}=setup();await api.unlock({isTrusted:true});const a=new api.Audio('clip.wav'),bus={};
 assert(api.connect(a,bus));assert(api.connect(a,bus));assert.deepEqual(gains[0].connections,[bus]);
 let ended=0;a.onended=()=>ended++;await a.play();nodes.at(-1).onended();
 assert.equal(ended,1);assert(a.ended);assert(a.paused);assert.equal(api.status().active,0);
 api.disconnect(a);assert.equal(gains[0].connections.length,0);api.connect(a,bus);assert.deepEqual(gains[0].connections,[bus]);
});
test('decode failure rejects and clears pending state; oversized buffers are not retained in cache',async()=>{
 const {api,decode}=setup();await api.unlock({isTrusted:true});const a=new api.Audio('bad.wav');
 decode(()=>{throw new Error('decode failed');});await assert.rejects(a.play());assert(a.paused);
 decode(()=>({duration:100,length:16000000,numberOfChannels:2}));await a.play();assert.equal(api.status().cachedBytes,0);a.pause();
});
