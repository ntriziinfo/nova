import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup(){
 const elements=[],animations=[];let draws=0;
 function element(tag){
  const classes=new Set(),e={tag,children:[],style:{setProperty(){}},dataset:{},offsetWidth:1000,hidden:false,
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
 const context=vm.createContext({crypto:{getRandomValues(a){draws++;a[0]=0;return a;}},document:{getElementById:()=>host,createElement:element,querySelectorAll:s=>s==='.novaArtItem'?lamps:reels},window:{addEventListener(){}},matchMedia:()=>({matches:false})});
 vm.runInContext(fs.readFileSync('nova-sortie-presentation.js','utf8'),context);
 vm.runInContext('Math.random=()=>{throw Error("Presentation must not consume game RNG")}',context);
 return {api:context.NovaSortie,animations,lamps,draws:()=>draws,view:()=>elements.find(e=>e.id==='novaSortieCharacter')};
}
function spin(won,zone='sora',finished=false){return {stopped:[false,false,false],resolved:{researchSortie:Object.freeze({won,zone:won?zone:'',finished}),reward:8,flowAfter:{remaining:'600',queuedZones:won?[zone]:[]}}};}
const visible=t=>t.view().children.filter(e=>e.tag==='img'&&!e.hidden).map(e=>e.dataset.character);

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
