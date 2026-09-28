import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-flow.js','utf8'),c);const f=c.NovaFlow;

test('lamp timing varies across CZs, spans the session even for low final tiers, and never forces three lamps in game one',()=>{
 const firstGames=new Set(),stopOrders=new Set();
 for(const total of [15,16,17,18,19,20])for(let seed=0;seed<50;seed++)for(let tier=1;tier<=6;tier++){
  let previous=0;const litGames=[];
  for(let game=1;game<=total;game++)for(let stop=1;stop<=3;stop++){
   const lamp={stage:tier,totalGames:total,remaining:total-game+1,timingSeed:seed};
   const shown=f.lampDisplayAtStop(lamp,stop);
   assert(shown.stage>=previous);assert.equal(shown.stage,f.lampDisplayAtStop(JSON.parse(JSON.stringify(lamp)),stop).stage);
   if(game===1)assert(shown.stage<=1);
   if(shown.stage>previous){litGames.push(game);stopOrders.add(stop);if(!previous)firstGames.add(game);}
   if(shown.stage===8)assert.equal(f.lampAtStop(lamp,3).stage,6);
   previous=shown.stage;
  }
  assert.equal(previous,tier+2);assert(litGames.at(-1)>=Math.floor(total*.65));assert(litGames.length>=3);
 }
 assert(firstGames.size>=3);assert.equal(stopOrders.size,3);
});
test('upgraded targets cannot dim lamps, and presentation scheduling consumes no gameplay randomness',()=>{
 for(let seed=0;seed<30;seed++)for(let game=1;game<=20;game++)for(let stop=1;stop<=3;stop++){
  let previous=0;
  for(let tier=1;tier<=6;tier++){
   const stage=f.lampDisplayAtStop({stage:tier,totalGames:20,remaining:21-game,timingSeed:seed},stop).stage;
   assert(stage>=previous);previous=stage;
  }
 }
 const saved={phase:'cz',remaining:20,totalGames:20,success:false,winProbability:.4,lampRoll:.35,rainbowRoll:.9};
 const lamp=f.drawLamp(saved,()=>{throw Error('Unexpected RNG draw');});
 assert.equal(lamp.timingSeed,f.drawLamp(f.normalize(JSON.parse(JSON.stringify(saved))),()=>{throw Error('Unexpected RNG draw');}).timingSeed);
});

function awardHarness(){
 const created=[],decodes=[];
 class Element{
  constructor(tag){this.tag=tag;this.dataset={};this.style={};this.children=[];this.attrs={};this.hidden=false;this.classList={add(){},remove(){}};created.push(this);}
  append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}
  set src(v){this.attrs.src=v;this.complete=false;}get src(){return this.attrs.src;}
  decode(){return new Promise(resolve=>decodes.push(resolve));}
  load(){this.complete=true;this.naturalWidth=2000;this.onload?.();}
 }
 const host=new Element('host');
 const context=vm.createContext({document:{querySelector:()=>host,createElement:t=>new Element(t),addEventListener(){}},Image:class extends Element{constructor(){super('img');}},performance:{now:()=>100},NovaClock:{clearTimeout(){},setTimeout(){}}});
 vm.runInContext(fs.readFileSync('nova-direct-award.js','utf8'),context);
 return {award:context.NovaDirectAward,decodes,root:()=>host.children[0],img:()=>host.children[0].children[0],fallback:()=>host.children[0].children[2]};
}
const direct=pt=>({atOutcome:{direct:pt},flowBefore:{phase:'art'}});
test('50 to 20 never displays the previous bitmap while loading; error fallback shows only the current actual gain',async()=>{
 const h=awardHarness();h.award.show(direct(50));h.img().load();h.decodes.shift()();await Promise.resolve();assert(!h.img().hidden);
 h.award.clear();h.award.show(direct(20));assert(h.img().hidden);assert(!h.fallback().hidden);assert.equal(h.fallback().textContent,'＋20pt');assert.equal(h.root().dataset.pt,'20');
 h.img().onerror();assert(h.img().hidden);assert.equal(h.fallback().textContent,'＋20pt');
 h.img().load();h.decodes.shift()();await Promise.resolve();assert(!h.img().hidden);assert(h.img().src.endsWith('direct-plus-20pt.png'));assert(h.fallback().hidden);
});
test('stale award decodes cannot reveal an old award after a switch, glyph amount or clear',async()=>{
 const h=awardHarness();h.award.show(direct(50));h.img().load();const old=h.decodes.shift();
 h.award.show(direct(20));old();await Promise.resolve();assert(h.img().hidden);assert.equal(h.fallback().textContent,'＋20pt');
 h.img().load();const twenty=h.decodes.shift();h.award.show(direct(250));twenty();await Promise.resolve();assert(h.img().hidden);assert.equal(h.root().dataset.pt,'250');
 h.award.show(direct(100));h.img().load();const hundred=h.decodes.shift();h.award.clear();hundred();await Promise.resolve();assert(h.root().hidden);assert(h.img().hidden);
 assert.equal(h.award.show(direct(0)),false);
});
