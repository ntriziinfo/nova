import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const flowContext=vm.createContext({});vm.runInContext(fs.readFileSync('nova-flow.js','utf8'),flowContext);const f=flowContext.NovaFlow;

test('CZ spreads the eight lamps across games and all landed stops in the requested order',()=>{
 assert.deepEqual([...f.lampCharacters],['kushuri','nito','sosuke','toto','urapi','giru1','sora1','ouma1']);
 for(const total of [15,16,17,18,19,20]){
  const seen=[],stops=new Set();let previous=0;
  for(let remaining=total;remaining>=1;remaining--)for(let stop=1;stop<=3;stop++){
   const display=f.lampDisplayAtStop({stage:6,totalGames:total,remaining},stop);
   assert(display.stage>=previous);
   if(display.stage>previous){stops.add(stop);for(let i=previous;i<display.stage;i++)seen.push(f.lampCharacters[i]);}
   previous=display.stage;
  }
  assert.equal(stops.size,3);assert.deepEqual(seen,[...f.lampCharacters]);
  assert(f.lampDisplayAtStop({stage:6,totalGames:total,remaining:total},3).stage<=1);
 }
});

test('extra lamps never change confidence tiers, guaranteed completion game or failed-CZ outcome',()=>{
 for(let total=1;total<=100;total++)for(let remaining=1;remaining<=total;remaining++)for(let stage=1;stage<=6;stage++){
  const lamp={stage,totalGames:total,remaining};
  assert.equal(f.lampDisplayAtStop(lamp,3).stage===8,f.lampAtStop(lamp,3).stage===6);
  if(remaining===1)assert.equal(f.lampDisplayAtStop(lamp,3).stage,stage+2);
  if(stage<6)for(let stop=1;stop<=3;stop++)assert(f.lampDisplayAtStop(lamp,stop).stage<8);
 }
 const rainbow={stage:5,totalGames:20,remaining:19,rainbow:true,rainbowAt:2};
 assert.equal(f.lampDisplayAtStop(rainbow,2).rainbow,false);assert.equal(f.lampDisplayAtStop(rainbow,3).rainbow,true);
 assert.equal(f.lampDisplayAtStop(rainbow,0),null);
});

function imagesHarness(){
 const created=[],decodes=[];
 class Element{
  constructor(tag){this.tag=tag;this.dataset={};this.style={};this.children=[];this.attrs={};this.hidden=false;created.push(this);}
  append(x){this.children.push(x);}get firstChild(){return this.children[0];}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}
  set src(v){this.attrs.src=v;this.complete=false;}get src(){return this.attrs.src;}
  querySelector(){return null;}decode(){return new Promise(resolve=>decodes.push(resolve));}
  load(){this.complete=true;this.naturalWidth=2000;this.onload?.();}
 }
 const host=new Element('host');
 const c=vm.createContext({document:{getElementById:()=>host,createElement:t=>new Element(t),addEventListener(){}},Image:class extends Element{constructor(){super('img');}},window:{addEventListener(){}}});
 vm.runInContext(fs.readFileSync('nova-bell-navi.js','utf8'),c);
 return {n:c.NovaBellNavi,created,decodes,root:()=>host.firstChild,imgs:()=>host.firstChild.children.map(x=>x.firstChild)};
}
const spin=result=>({result,stopped:[false,false,false],resolved:{flowBefore:{phase:'art'}}});

test('cold rare sprites cannot paint the previous bell bitmap, even with stale decode completions',async()=>{
 const h=imagesHarness();h.n.begin(spin('BELL'),()=>.1);h.imgs().forEach(i=>i.load());h.decodes.splice(0).forEach(r=>r());await Promise.resolve();
 assert(h.imgs().every(i=>!i.hidden));
 h.n.begin(spin('WEAK_SUICA'));assert(h.imgs().every(i=>i.hidden));assert.equal(h.root().dataset.kind,'rare');
 h.imgs().forEach(i=>i.load());const stale=h.decodes.splice(0);
 h.n.begin(spin('CHANCE_B'),()=>0);stale.forEach(r=>r());await Promise.resolve();assert(h.imgs().every(i=>i.hidden));
 h.imgs().forEach(i=>i.load());h.decodes.splice(0).forEach(r=>r());await Promise.resolve();
 assert(h.imgs().every(i=>!i.hidden&&i.src.endsWith('navi-purple-double.png')));
 h.n.begin(spin('SUPER_NOVA'));h.imgs().forEach(i=>i.onerror());assert(h.imgs().every(i=>i.hidden));
});

test('layout preview does not inject a bell order into a non-navigation spin',()=>{
 const h=imagesHarness();h.n.preview(true);assert.equal(h.root().hidden,false);
 h.n.begin(spin('REPLAY'));assert.equal(h.root().hidden,true);
});

test('initial-zone music stays within the shared three-game zone and uses the BGM mixer',()=>{
 const html=fs.readFileSync('jag.html','utf8'),constants=[...html.matchAll(/  const \w+_ZONE_BGM_SRC = "[^"]+";/g)].map(m=>m[0]).join('\n');
 const c=vm.createContext({session:{active:false},normalState:{flow:{}},NOVA_ART_BGM_SRC:'at',CZ_BGM_SRC:'cz',DEFAULT_NORMAL_BGM_SRC:'normal',speedToBonusActive:false,isHighMode:()=>false});
 vm.runInContext(constants+'\n'+html.match(/  function normalBgmSrc\([^]*?\n  }/)[0],c);
 for(const zone of ['kushuri_nito','kushuri','nito']){
  c.normalState.flow={phase:'art',zone,initialStage:'zone'};assert.equal(c.normalBgmSrc(),'assets/media/nova/initial-duo-bgm.mp3');
  c.normalState.flow.initialStage='wait';assert.equal(c.normalBgmSrc(),'at');
 }
 c.normalState.flow={phase:'art',zone:''};assert.equal(c.normalBgmSrc(),'at');
 c.normalState.flow={phase:'cz'};assert.equal(c.normalBgmSrc(),'cz');
});
