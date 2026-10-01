import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-results.js','utf8'),c);const r=c.NovaResults;
test('parity favors red 60/40 for odd and blue 60/40 for even',()=>{for(let s=1;s<=6;s++){let red=0;for(let i=0;i<1000;i++)if(r.pick('zone','giru',s,()=>i/1000).color==='red')red++;assert.equal(red,s%2?600:400);}});
test('AT uniformly selects all 12 and is independent of setting',()=>{const choices=new Set();for(let i=0;i<12;i++){const a=r.pick('at','',1,()=>(i+.5)/12),b=r.pick('at','',6,()=>(i+.5)/12);assert.deepEqual(a,b);choices.add(a.character+a.color);}assert.equal(choices.size,12);});
test('zone result includes final increment and preserves large point values',()=>{const before={zone:'ouma',award:'100'},after={zone:'',award:'300'};assert.equal(r.transition(before,after,1,()=>0).pt,'300');assert.equal(r.transition(before,{zone:'ouma',award:'300'},1),null);assert.equal(r.transition(before,{zone:'',award:'9007199254740999'},1).pt,'9007199254740999');});
function presenter(){
 const source=fs.readFileSync('nova-results.js','utf8'),images=[],shown=[],fields={span:{},output:{},'.novaResultTotal':{}};
 const c=vm.createContext({root:{hidden:true,dataset:{}},art:{querySelector:()=>({replaceWith:img=>shown.push(img.src)})},num:{setAttribute(){}},fallback:{querySelector:tag=>fields[tag]},names:{sora:'空',ouma:'逢魔'},init(){},apply(){},Image:class{constructor(){images.push(this);this.naturalWidth=100;}decode(){return Promise.resolve();}}});
 vm.runInContext(source.match(/ const characterImages=.*;/)[0]+'const images=new Map();let imageRequest=0,active=null;'+source.slice(source.indexOf(' function loadImage('),source.indexOf(' function apply('))+source.slice(source.indexOf(' function show(value)'),source.indexOf(" if(typeof document")),c);
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 return {c,images,shown,fields,flush};
}
test('decoded result images show synchronously and cold/error requests show the current points',async()=>{
 const {c,images,shown,fields,flush}=presenter();
 c.show({character:'sora',color:'blue',pt:'750'});assert.equal(c.num.textContent,'750');assert.equal(fields.output.textContent,'750pt');assert.equal(fields.span.textContent,'空 上乗せ');
 images[0].onload();await flush();assert.equal(c.root.dataset.loading,undefined);
 c.show({character:'sora',color:'blue',pt:'800'});assert.equal(c.root.dataset.loading,undefined);assert.equal(c.num.textContent,'800');assert.equal(images.length,1);assert.equal(shown.length,2);
 c.show({character:'sora',color:'red',pt:'900'});assert.equal(c.root.dataset.color,'red');assert.equal(images.length,1);assert.equal(c.root.dataset.loading,undefined);
 c.show({character:'ouma',color:'red',pt:'1000'});images[1].onerror();await flush();assert.equal(c.root.dataset.loading,'true');assert.equal(fields.output.textContent,'1000pt');
 c.show({character:'ouma',color:'red',pt:'1200'});assert.equal(images.length,3);assert.equal(fields.output.textContent,'1200pt');images[2].onload();await flush();assert.equal(c.root.dataset.loading,undefined);
});

test('consecutive zones total actual awards across a save, including the final zone, without changing prizes or RNG',()=>{
 const before={phase:'art',zone:'sora',award:'200'},after={phase:'art',zone:'',award:'300',queuedZones:['toto']};
 let draws=0;const rng=()=>{draws++;return .5;};
 const first=r.chain(null,before,after,r.transition(before,after,3,rng));
 assert.equal(first.card.pt,'300');assert.equal(first.card.totalPt,'300');assert.equal(first.card.zoneCount,1);
 const saved=JSON.parse(JSON.stringify(first.state));
 const secondBefore={phase:'art',zone:'toto',award:'400'},secondAfter={phase:'art',zone:'',award:'500',queuedZones:[]};
 const second=r.chain(saved,secondBefore,secondAfter,r.transition(secondBefore,secondAfter,3,rng));
 assert.equal(second.card.pt,'500');assert.equal(second.card.totalPt,'800');assert.equal(second.card.zoneCount,2);assert.equal(second.state.open,false);
 assert.equal(draws,2);assert.equal(after.award,'300');assert.equal(secondAfter.award,'500');
 const resumed=r.chain(second.state,{phase:'art'},secondAfter,null);assert.equal(resumed.state,null);
 const later=r.chain(resumed.state,before,{...after,queuedZones:[]},r.transition(before,after,3,rng));assert.equal(later.card.totalPt,undefined);
});

test('chain handles BIG zone stock, pending results, large totals and reset/challenge boundaries',()=>{
 const card={kind:'zone',character:'ouma',pt:'9007199254740999'},after={phase:'art',sets:'1'};
 const first=r.chain(null,{phase:'art',zone:'ouma'},after,card);
 const waiting=r.chain(first.state,{phase:'art'},{phase:'art',entryStage:'seven'},null);assert.equal(waiting.state,first.state);
 const final=r.chain(waiting.state,{phase:'art',zone:'giru'},{phase:'art'}, {...card,pt:'500'});assert.equal(final.card.totalPt,'9007199254741499');
 for(const after of [{phase:'normal'},{phase:'art',burstPending:true},{phase:'art',researchChallengeActive:true},{phase:'art',researchSortieLeft:10}])assert.equal(r.chain(first.state,{phase:'art'},after,null).state,null);
});

test('chain result renders current and total independently, and hides the total on later AT results',()=>{
 const {c,fields}=presenter();
 c.show({kind:'zone',character:'sora',color:'blue',pt:'500',totalPt:'800',zoneCount:2});
 assert.equal(fields.output.textContent,'500pt');assert.equal(fields.span.textContent,'空 ゾーン / 今回');assert.equal(fields['.novaResultTotal'].textContent,'連続特化 合計 800pt');assert.equal(fields['.novaResultTotal'].hidden,false);
 c.show({kind:'at',character:'sora',color:'red',pt:'1400'});assert.equal(fields['.novaResultTotal'].hidden,true);assert.equal(fields.output.textContent,'1400pt');
});
test('image switches hide previous art immediately and ignore stale image loads',async()=>{
 const {c,images,shown,flush}=presenter();
 c.show({character:'ouma',color:'blue',pt:'100'});images[0].onload();await flush();assert.equal(shown.length,1);
 c.show({character:'sora',color:'blue',pt:'200'});assert.equal(c.root.dataset.loading,'true');assert.equal(shown.length,1);
 c.show({character:'toto',color:'red',pt:'300'});images[1].onload();await flush();assert.equal(shown.length,1);assert.equal(c.root.dataset.loading,'true');
 images[2].onload();await flush();assert.equal(shown.at(-1),'assets/illustrations/lamps-20260916/toto.png');assert.equal(c.num.textContent,'300');assert.equal(c.root.dataset.loading,undefined);
 c.show({character:'giru',color:'red',pt:'400'});c.hide();images[3].onload();await flush();assert.equal(shown.length,2);assert.equal(c.root.hidden,true);
});

test('checkpoint result uses all characters and cumulative net; stale single-image decode cannot replace it',async()=>{
 const {c,images,shown,fields,flush}=presenter();
 c.show({character:'sora',color:'blue',pt:'100'});
 c.show({kind:'checkpoint',character:'all',color:'gold',pt:'2404'});
 assert.equal(c.root.dataset.all,'true');assert.equal(c.root.dataset.color,'gold');
 assert.equal(fields.span.textContent,'有利区間終了 / 累計差枚');assert.equal(fields.output.textContent,'+2404pt');
 images[0].onload();await flush();assert.equal(shown.length,0);assert.equal(c.root.dataset.loading,undefined);
 c.show({character:'sora',color:'blue',pt:'200'});assert.equal(c.root.dataset.all,'false');assert.equal(shown.length,1);
});
