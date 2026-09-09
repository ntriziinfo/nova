import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const n=NovaNormal,a=NovaArt;
let seed=109;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
test('image zone ranks map to exact mode/game table',()=>{
 const rows={通常A:[0,0,0,.55,0,0,.55,0],通常B:[0,.55,0,0,0,.55,0,.8],通常C:[0,.55,0,.55,0,.55,.55,0],チャンス:[.15,.55,.15,.55,.15,.8,0,0],天国準備:[.15,.55,.15,.8,0,0,0,0],天国:[.55,0,0,0,0,0,0,0]};
 for(const [mode,row]of Object.entries(rows))assert.deepEqual([50,100,150,200,250,300,400,500].map(g=>n.zoneRate({mode,games:g-1})),row);
 for(const g of [350,450,550])assert.equal(n.zonePoint(g),false);
});
test('presentation observations obey all image mode hints',()=>{
 const seen=new Set();
 for(const mode of n.modes.slice(0,6))for(const g of [50,100,150,200,250,300,400,500,600]){
  if(g>n.ceiling({mode}))continue;
  for(let i=0;i<300;i++){
   const t=n.spin({mode,games:g-1},{phase:'normal'},1,{},rng,'BELL'),p=t.state.prelude,stage=p?.presentation||'none',hit=p&&p.kind!=='fake',rank=n.modes.indexOf(mode);seen.add(g+':'+stage);
   if(g===50&&stage==='pre')assert.ok(rank>=3);
   if(g===50&&stage==='main'&&!hit)assert.equal(mode,'天国');
   if(g===100&&stage==='pre')assert.equal(mode,'天国準備');
   if(g===150&&stage==='pre')assert.ok(rank>=1);
   if([150,250].includes(g)&&stage==='main')assert.ok(hit);
   if(g===200&&stage==='none')assert.equal(mode,'天国準備');
   if(g===250&&stage==='pre')assert.ok(rank>=2);
   if([300,500].includes(g)&&stage==='pre')assert.equal(mode,'チャンス');
   if(g===400&&stage==='none')assert.equal(mode,'通常C');
   if(g===600&&stage==='pre')assert.ok(hit);
   if(p)assert.deepEqual(n.normalize(JSON.parse(JSON.stringify(t.state))).prelude,p);
  }
 }
 for(const key of ['50:pre','50:main','100:pre','150:main','200:none','250:main','300:pre','400:none','500:pre','600:pre'])assert.ok(seen.has(key),key);
});
test('AT exits redraw modes, dry exits exclude A and all exits exclude special',()=>{
 const dry=new Set(),normal=new Set();
 for(let i=0;i<100;i++){
  for(const isDry of [false,true]){
   const s=n.afterArt({mode:'特殊',games:120,impurity:20},{phase:'art'},{phase:'normal',dryAtEnd:isDry},{},()=>i/100);
   assert.equal(s.games,0);assert.equal(s.impurity,isDry?22:20);assert.notEqual(s.mode,'特殊');(isDry?dry:normal).add(s.mode);
  }
 }
 assert.deepEqual([...normal],n.modes.slice(0,6));assert.deepEqual([...dry],n.modes.slice(1,6));
 assert.equal(n.afterArt({mode:'通常A'},{phase:'art'},{phase:'art'},{},()=>.99).mode,'通常A');
});
test('old pending real prelude is retained without inventing a new hint',()=>{
 const s=n.normalize({prelude:{kind:'cz',left:1}});assert.equal(s.prelude.presentation,'legacy');
 const t=n.spin(s,{phase:'normal'},1,{},()=>.99,'BELL');assert.equal(t.entry,'CZ');
});
