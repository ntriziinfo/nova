import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fixture(file){
 let now=0,id=0,button,shown=[],hidden=0;const timers=new Map();
 const c=vm.createContext({setTimeout(fn,ms){timers.set(++id,{fn,at:now+ms});return id;},clearTimeout(id){timers.delete(id);},
  document:{querySelector:()=>({append(el){button=el;}}),createElement:()=>({setAttribute(){}})},
  NovaResults:{show(card){shown.push(card);},hide(){hidden++;}}});
 vm.runInContext(fs.readFileSync(file,'utf8'),c);vm.runInContext('Math.random=()=>{throw Error("game RNG used by viewer")}',c);
 return {c,tick(ms){const end=now+ms;for(;;){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();}now=end;},get button(){return button;},shown,get hidden(){return hidden;}};
}
test('seat PUSH is immediate; later idle PUSH waits five seconds and is cancelled by a spin or AUTO',()=>{
 const f=fixture('nova-result-recall.js'),state={},api=f.c.NovaResultRecall;
 const options={state,eligible:true,makeInitial:()=>({kind:'bonus',color:'mode',character:'plush_toto',pt:'0'}),save(){},sound(){}};
 api.sync(options);assert.equal(f.button.hidden,false);
 api.bet();api.sync({...options,eligible:false});f.tick(6000);assert.equal(f.button.hidden,true);
 api.sync(options);f.tick(4999);assert.equal(f.button.hidden,true);f.tick(1);assert.equal(f.button.hidden,false);
 api.sync({...options,eligible:false});assert.equal(f.button.hidden,true);
 api.sync(options);f.tick(3000);api.sync({...options,eligible:false});f.tick(3000);assert.equal(f.button.hidden,true);
});
test('recall remembers exactly one hint across presses/reload and does not advance or mutate game/accounting',()=>{
 const f=fixture('nova-result-recall.js'),state={flow:{phase:'normal'},credits:123},api=f.c.NovaResultRecall;let draws=0,sounds=0,saves=0;
 const options={state,eligible:true,makeInitial:()=>{draws++;return {kind:'bonus',color:'mode',character:'plush_toto',pt:'0'};},save(){saves++;},sound(){sounds++;}};
 api.sync(options);f.button.onclick();assert.equal(draws,1);assert.equal(saves,1);assert.equal(sounds,1);assert.equal(f.shown[0].recall,true);
 api.bet();api.sync(options);f.tick(5000);f.button.onclick();assert.equal(draws,1);assert.equal(sounds,2);
 const result={kind:'at',color:'mode',character:'plush_nigo',pt:'1234'};
 api.remember(state,result);assert.deepEqual(JSON.parse(JSON.stringify(state.lastModeResult)),result);
 const clone=JSON.parse(JSON.stringify(state));api.sync({...options,state:clone});f.button.onclick();assert.equal(draws,1);assert.equal(f.shown.at(-1).character,'plush_nigo');
 assert.deepEqual(state.flow,{phase:'normal'});assert.equal(state.credits,123);
 api.remember(state,{kind:'zone',character:'sora',pt:'100'});assert.equal(state.lastModeResult.character,'plush_nigo');
});
test('loading an existing mode result reuses it and a cabinet reset clears that portrait',()=>{
 const f=fixture('nova-result-recall.js'),api=f.c.NovaResultRecall;let draws=0;
 const opt={eligible:true,save(){},sound(){},makeInitial(){draws++;return {character:'plush_kushuri'};}};
 api.sync({...opt,state:{resultCard:{kind:'bonus',color:'mode',character:'plush_sora',pt:'150'}}});f.button.onclick();assert.equal(draws,0);assert.equal(f.shown[0].character,'plush_sora');
 api.sync({...opt,state:{}});f.button.onclick();assert.equal(draws,1);
});
test('sortie stop lock starts at actual sound playback, lasts four seconds, and ignores duplicate starts',async()=>{
 const f=fixture('nova-sortie-audio-gate.js'),api=f.c.NovaSortieAudioGate,spin={resolved:{sortieEntry:true}};let playing,resolve,ready=0;
 const audio={addEventListener(e,fn){if(e==='playing')playing=fn;},removeEventListener(){}};
 const promise=new Promise(r=>resolve=r);api.begin(spin,{audio,promise},()=>ready++);
 f.tick(1500);assert.equal(api.locked(spin),true);playing();resolve();await Promise.resolve();
 f.tick(3999);assert.equal(api.locked(spin),true);assert.equal(ready,0);f.tick(1);assert.equal(api.locked(spin),false);assert.equal(ready,1);
 api.begin(spin,{audio,promise},()=>ready++);assert.equal(api.locked(spin),false);
 assert.equal(api.locked({resolved:{}}),false);
});
test('muted, blocked and missing audio retain a bounded four-second stop wait',async()=>{
 for(const blocked of [false,true]){
  const playback=blocked?{promise:Promise.reject(Error('blocked'))}:undefined;
  const f=fixture('nova-sortie-audio-gate.js'),api=f.c.NovaSortieAudioGate,spin={resolved:{sortieEntry:true}};
  api.begin(spin,playback);await new Promise(setImmediate);f.tick(3999);assert.equal(api.locked(spin),true);f.tick(1);assert.equal(api.locked(spin),false);
 }
});
