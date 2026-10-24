import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c=vm.createContext({});for(const file of ['nova-tuning.js','nova-decrement.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const n=c.NovaNormal,evidence=JSON.parse(fs.readFileSync('docs/at4-mode-cz-20261025.json'));
const json=x=>JSON.parse(JSON.stringify(x));
test('reset and all AT-end mode selections reproduce the approved setting-specific allocation',()=>{
 assert.deepEqual(json(n.modeSelection),evidence.rows);
 for(let setting=1;setting<=6;setting++)for(const [key,previous]of [['initial','A'],['initial','B'],['initial','C'],['afterHeaven','天国'],['afterLoop','天国ループ']]){
  const expected=evidence.rows[key][setting-1],counts=Array(5).fill(0),resetCounts=Array(5).fill(0);
  assert(Math.abs(expected.reduce((a,b)=>a+b,0)-100)<1e-8);
  for(let i=0;i<1000;i++){
   const roll=(i+.5)/1000,state=n.normalize({mode:previous,games:188,impurity:47});let calls=0;
   const end=n.afterArt(state,{phase:'art'},{phase:'normal'},{setting},()=>{calls++;return roll;});
   assert.equal(calls,1);assert.equal(end.games,0);assert.equal(end.impurity,47);counts[n.modes.indexOf(end.mode)]++;
   if(previous==='A'){let first=true;const reset=n.reset(()=>first?(first=false,.5):roll,setting);resetCounts[n.modes.indexOf(reset.mode)]++;}
  }
  assert.deepEqual(counts,expected.map(x=>Math.round(x*10)),`setting ${setting}: ${key}`);
  if(previous==='A')assert.deepEqual(resetCounts,counts);
 }
});
test('reloading and in-progress AT preserve the saved mode without consuming a mode draw',()=>{
 for(let setting=1;setting<=6;setting++)for(const mode of n.modes){
  const s=n.normalize(JSON.parse(JSON.stringify({mode,games:199,impurity:58,fiftyChecked:true,modeChecked:1})));
  const fail=()=>{throw Error('Unexpected mode redraw');};
  assert.equal(s.mode,mode);
  for(const [before,after]of [['normal','normal'],['art','art'],['normal','art']])assert.deepEqual(json(n.afterArt(s,{phase:before},{phase:after},{setting},fail)),json(s));
 }
});
test('setting-dependent mode selection preserves ceilings and promotion-only bonus transitions',()=>{
 assert.deepEqual(json(n.ceilings),[800,700,400,200,200]);
 for(let setting=1;setting<=6;setting++)for(const [i,mode]of n.modes.entries())for(const roll of [0,.1,.3,.6,.8,.95,.999]){
  const s=n.afterBonus(n.normalize({mode,games:300}),()=>roll,setting);
  assert(n.modes.indexOf(s.mode)>=i);assert.equal(s.mode,n.afterBonus({mode},()=>roll,1).mode);
 }
});
