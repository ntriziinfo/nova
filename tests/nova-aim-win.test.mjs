import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(){
 const elements=[],timers=new Map();let id=0;
 const host={dataset:{},append(){},querySelector(){return null;}};
 const context=vm.createContext({document:{getElementById:()=>host,addEventListener(){},createElement(tag){const e={tag,style:{},dataset:{},append(){},setAttribute(){},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}};elements.push(e);return e;}},window:{addEventListener(){},dispatchEvent(){}},Event:class{},setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);}});
 vm.runInContext(fs.readFileSync('nova-aim-presentation.js','utf8'),context);
 return {aim:context.NovaAim,elements,timers};
}
test('win locks from playback for 3 seconds, plays once and defers result',()=>{
 const {aim,elements,timers}=setup();let sounds=0,results=0;
 aim.win(()=>sounds++);assert.equal(aim.busy,true);assert.equal(sounds,0);
 const video=elements.at(-1);assert.equal(video.loop,false);assert.equal(video.muted,true);
 const start=video.onplaying;start();start();assert.equal(sounds,1);
 aim.afterWin(()=>results++);assert.equal(results,0);
 const timer=[...timers.values()][0];assert.equal(timer.ms,3000);timer.fn();
 assert.equal(aim.busy,false);assert.equal(results,1);
 aim.bet(null);assert.equal(video.paused,true);assert.equal(sounds,1);
});
test('reset cancels pending playback and result callbacks',()=>{
 const {aim,elements,timers}=setup();let sounds=0,results=0;
 aim.win(()=>sounds++);const start=elements.at(-1).onplaying;start();
 aim.afterWin(()=>results++);const timer=[...timers.values()][0];aim.reset();timer.fn();start();
 assert.equal(aim.busy,false);assert.equal(results,0);assert.equal(sounds,1);
});
test('consecutive wins create independent nonlooping audio instances',()=>{
 const html=fs.readFileSync('jag.html','utf8'),audios=[];
 const c=vm.createContext({debugFastSpinActive:false,aimWinAudios:new Set(),sfxOutputVolume:()=>.5,oneShotSoundCache:new Map([['assets/media/nova/aim/seven-win.wav',{cloneNode(){const a={play(){return Promise.resolve();}};audios.push(a);return a;}}]])});
 vm.runInContext(html.match(/  function playAimSevenWinSound\([^]*?\n  }/)[0],c);
 c.playAimSevenWinSound();c.playAimSevenWinSound();assert.equal(audios.length,2);assert.notEqual(audios[0],audios[1]);assert.equal(audios[0].loop,false);assert.equal(c.aimWinAudios.size,2);audios[0].onended();assert.equal(c.aimWinAudios.size,1);
});
const aimCode=fs.readFileSync('nova-aim-presentation.js','utf8');
test('right first aligns both symbols; other orders miss while internal result stays intact',()=>{
 const c=vm.createContext({});vm.runInContext(aimCode,c);
 for(const symbol of ['seven','nebula'])for(const order of [[2,1,0],[2,0,1],[0,1,2],[0,2,1],[1,0,2],[1,2,0]]){
  const result=symbol==='seven'?'BIG':'NEBULA';
  const stops=order.map((index,n)=>c.NovaAim.stopTarget({symbol},result,order.slice(0,n+1),index));
  assert.equal(stops.every(s=>s.onLine),order[0]===2);
  assert.equal(stops.at(-1).aligned,order[0]===2);
 }
});
test('reverse miss breaks on third stop, scissors left-middle is a two-stop confirmation',()=>{
 const c=vm.createContext({});vm.runInContext(aimCode,c);
 for(const symbol of ['seven','nebula']){
  assert.deepEqual([2,1,0].map((index,n)=>c.NovaAim.stopTarget({symbol},'MISS',[2,1,0].slice(0,n+1),index).onLine),[true,true,false]);
  assert.equal(c.NovaAim.stopTarget({symbol},'MISS',[2,0],0).onLine,false);
  assert.equal(c.NovaAim.stopTarget({symbol},symbol==='seven'?'BIG':'NEBULA',[2,0],0).onLine,true);
 }
});
test('artwork rendering preserves configured coordinates while dimensions are unavailable',()=>{
 const source=fs.readFileSync('nova-artwork.js','utf8');
 const render=source.match(/  function render\(id\){[^]*?\n  }/)[0];
 const position={x:19.7667,y:34.0807,w:17.6},item={style:{},querySelector:()=>({naturalWidth:0})};
 const c=vm.createContext({items:new Map([['urapi',item]]),positions:{urapi:position},layer:{clientWidth:1000,clientHeight:0}});
 vm.runInContext(render,c);c.render('urapi');assert.equal(position.y,34.0807);assert.equal(item.style.top,'34.0807%');
});
