import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('history paging reaches the first hit, anchors older pages during updates, and renders at most 21 columns',()=>{
 const node=()=>({dataset:{},children:[],setAttribute(){},addEventListener(){},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;}});
 const bars=node(),buttons=Object.fromEntries(['latest','newer','older','oldest'].map(k=>[k,node()])),page=node();
 const root={querySelector:s=>s==='.novaHitBars'?bars:s==='[data-counter="page"]'?page:buttons[s.match(/data-hit-page="(\w+)"/)?.[1]]};
 const c=vm.createContext({document:{createElement:node}});vm.runInContext(fs.readFileSync('nova-data-counter.js','utf8'),c);
 const hits=Array.from({length:10000},(_,i)=>({seq:i+1,kind:'BIG',games:i===0?800:100,spin:i*100})),view={hits,current:0};
 const render=()=>c.NovaDataCounter.render(root,view,{totalSpins:1e6});render();
 assert.equal(bars.children.length,21);assert.equal(page.textContent,'9981–10000 / 10,000件');
 buttons.older.onclick();assert.equal(bars.children.length,20);assert.equal(page.textContent,'9961–9980 / 10,000件');
 view.hits.push({seq:10001,kind:'AT',games:0});render();assert.equal(page.textContent,'9961–9980 / 10,001件','new wins must not move a historical page');
 buttons.oldest.onclick();assert.equal(page.textContent,'1–20 / 10,001件');assert.equal(buttons.older.disabled,true);
 assert.equal(bars.children.at(-1).title,'BIG / 800G');assert.equal(bars.children.at(-1).children[0].children.length,8);
 assert(bars.children.at(-1).children[0].children.every(x=>x.className==='lit'));
 buttons.newer.onclick();assert.equal(page.textContent,'21–40 / 10,001件');
 buttons.latest.onclick();assert.equal(bars.children.length,21);assert.equal(buttons.newer.disabled,true);
 assert.equal(view.hits.length,10001);
});

test('authenticated bootstrap delivers long display history only from the matching parent and session',async()=>{
 let listener,received,cleared=0;
 const parent={postMessage(){}},c=vm.createContext({parent,addEventListener:(n,f)=>listener=f,setInterval:()=>1,setTimeout:()=>2,clearInterval:()=>cleared++,clearTimeout:()=>cleared++});
 vm.runInContext(fs.readFileSync('nova-store-resume.js','utf8'),c);
 const promise=c.NovaStoreResume.connect({enabled:true,origin:'https://control.invalid',sessionId:'qa',ready:()=>true,display:base=>received=base});
 const base={totalSpins:50000,dataHits:Array.from({length:1000},(_,i)=>({seq:i+1}))};
 const data={type:'nova-store-bootstrap',sessionId:'qa',resumeState:{state:{x:1}},machineDisplayBaseline:base};
 listener({source:{},origin:'https://control.invalid',data});assert.equal(received,undefined);
 listener({source:parent,origin:'https://evil.invalid',data});assert.equal(received,undefined);
 listener({source:parent,origin:'https://control.invalid',data:{...data,sessionId:'wrong'}});assert.equal(received,undefined);
 listener({source:parent,origin:'https://control.invalid',data});assert.deepEqual(await promise,data.resumeState);assert.equal(received.dataHits.length,1000);assert.equal(cleared,2);
});
