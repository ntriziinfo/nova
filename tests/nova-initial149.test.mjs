import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function presenter(){
 const elements=[];
 class Element{
  constructor(tag){this.tag=tag;this.dataset={};this.style={};this.children=[];this.offsetWidth=600;this.currentTime=0;this.paused=true;this.plays=0;elements.push(this);}
  append(...children){this.children.push(...children);}setAttribute(k,v){this[k]=v;}
  querySelector(s){return s==='.reels'?reels:null;}
  getBoundingClientRect(){return this===reels?{left:20,right:580,top:300,bottom:600,width:560,height:300}:{left:0,top:0,width:600};}
  play(){this.paused=false;this.plays++;return Promise.resolve();}pause(){this.paused=true;}
 }
 const host=new Element('host'),reels=new Element('reels'),body=new Element('body');
 const c=vm.createContext({document:{body,querySelector:()=>host,getElementById:()=>host,createElement:t=>new Element(t),addEventListener(){}},Image:class extends Element{constructor(){super('img');}},ResizeObserver:class{observe(){}},window:{addEventListener(){}}});
 vm.runInContext(fs.readFileSync('nova-initial-duo.js','utf8'),c);
 return {p:c.NovaInitialDuo,elements,body};
}
const flow=index=>({phase:'art',initialVersion:148,initialStage:'zone',zone:'kushuri_nito',initialIndex:index});
test('the three games reveal Nito, Kushuri, then both and share one uninterrupted muted loop',()=>{
 const {p,elements,body}=presenter();
 for(let game=0;game<3;game++){
  assert(p.begin({flowBefore:flow(game)}));
  const root=elements.find(x=>x.id==='novaInitialDuo'),v=elements.find(x=>x.tag==='video');
  assert.equal(root.dataset.stop,'0');assert.equal(root.dataset.game,String(game+1));assert.equal(body.dataset.initialDuoGame,String(game+1));
  const visible=root.children.filter(x=>!x.hidden).map(x=>x.dataset.character);
  assert.deepEqual(visible,[['nito'],['kushuri'],['nito','kushuri']][game]);
  for(let n=1;n<=3;n++){assert(p.stop(n));assert.equal(root.dataset.stop,String(n));assert.equal(p.stop(n),false);}
  assert.equal(v.muted,true);assert.equal(v.loop,true);assert.equal(v.plays,1);v.currentTime=game+1;
 }
 const v=elements.find(x=>x.tag==='video');assert.equal(v.currentTime,3);
 p.clear();assert.equal(v.currentTime,0);assert.equal(v.paused,true);assert.equal(v.hidden,true);assert.equal(p.stop(1),false);
});
test('restore keeps the saved game and final jump survives until result; unrelated play clears it',()=>{
 const {p,elements}=presenter();p.sync(flow(1),false);
 const root=elements.find(x=>x.id==='novaInitialDuo');assert.equal(root.dataset.game,'2');
 p.stop(3);p.sync({phase:'art',zone:''},false);assert.equal(root.hidden,false);
 assert.equal(p.begin({flowBefore:{phase:'art',zone:'sora'}}),false);assert.equal(root.hidden,true);
 assert.equal(p.eligible({...flow(0),initialVersion:131}),false);
});
test('old two-character saves merge without losing their already sealed plan or points',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-art.js','utf8'),c);const a=c.NovaArt;
 for(const old of ['kushuri','nito']){
  const saved={...a.enterInitial({},()=>.5),initialStage:'zone',zone:old,initialPlan:[50,100,50],initialIndex:1,zoneLeft:2,award:'50',remaining:'0'};
  const restored=a.normalize(saved);assert.equal(restored.zone,'kushuri_nito');assert.equal(restored.initialIndex,1);assert.deepEqual([...restored.initialPlan],[50,100,50]);assert.equal(restored.award,'50');
  let result=restored;for(let i=0;i<2;i++)result=a.step(result,{},()=>.5).flow;
  assert.equal(result.remaining,'200');assert.equal(result.zone,'');assert.equal(result.initialStage,'');
  const pending=a.normalize({...saved,initialStage:'entry',zone:'',pendingZone:old});assert.equal(pending.pendingZone,'kushuri_nito');
 }
});
