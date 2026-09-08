import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-results.js','utf8'),c);const r=c.NovaResults;
test('parity favors red 60/40 for odd and blue 60/40 for even',()=>{for(let s=1;s<=6;s++){let red=0;for(let i=0;i<1000;i++)if(r.pick('zone','giru',s,()=>i/1000).color==='red')red++;assert.equal(red,s%2?600:400);}});
test('AT uniformly selects all 12 and is independent of setting',()=>{const choices=new Set();for(let i=0;i<12;i++){const a=r.pick('at','',1,()=>(i+.5)/12),b=r.pick('at','',6,()=>(i+.5)/12);assert.deepEqual(a,b);choices.add(a.character+a.color);}assert.equal(choices.size,12);});
test('zone result includes final increment and preserves large point values',()=>{const before={zone:'ouma',award:'100'},after={zone:'',award:'300'};assert.equal(r.transition(before,after,1,()=>0).pt,'300');assert.equal(r.transition(before,{zone:'ouma',award:'300'},1),null);assert.equal(r.transition(before,{zone:'',award:'9007199254740999'},1).pt,'9007199254740999');});
test('image switches hide previous art immediately and ignore stale image loads',()=>{
 const source=fs.readFileSync('nova-results.js','utf8'),images=[],shown=[];
 const c=vm.createContext({root:{hidden:true,dataset:{}},art:{querySelector:()=>({replaceWith:img=>shown.push(img.src)})},num:{setAttribute(){}},names:{sora:'空',ouma:'逢魔'},init(){},apply(){},Image:class{constructor(){images.push(this);}}});
 vm.runInContext('let imageRequest=0,active=null;'+source.slice(source.indexOf(' function show(value)'),source.indexOf(" if(typeof document")),c);
 c.show({character:'ouma',color:'blue',pt:'100'});images[0].onload();assert.equal(shown.length,1);
 c.show({character:'sora',color:'blue',pt:'200'});assert.equal(c.root.dataset.loading,'true');assert.equal(shown.length,1);
 c.show({character:'sora',color:'red',pt:'300'});images[1].onload();assert.equal(shown.length,1);assert.equal(c.root.dataset.loading,'true');
 images[2].onload();assert.equal(shown.at(-1),'assets/results/sora-red.png');assert.equal(c.num.textContent,'300');assert.equal(c.root.dataset.loading,undefined);
 c.show({character:'ouma',color:'red',pt:'400'});c.hide();images[3].onload();assert.equal(shown.length,2);assert.equal(c.root.hidden,true);
});
