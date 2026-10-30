import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const js=fs.readFileSync('nova-data-counter.js','utf8');
const load=()=>{const c=vm.createContext({});vm.runInContext(js+';Math.random=()=>{throw Error("history consumed game RNG")}',c);return c.NovaDataCounter;};

test('challenge entry is recorded once, excluding waiting and direct upper AT, and survives reload',()=>{
 const d=load(),stats={totalSpins:200,totalFee:600,totalPaid:800,atFirstCount:1};
 const wait={phase:'art',burstPending:true,researchChallengeSource:'threshold'};
 d.adopt(stats,wait);d.zone(stats,wait);assert.equal(stats.dataHitSeq,undefined);
 for(let i=0;i<3;i++){d.spin(stats,wait);stats.totalSpins++;}
 const active=Object.freeze({...wait,researchChallengeActive:true,burstLeft:9});
 d.zone(stats,active);d.zone(stats,active);
 assert.equal(stats.dataHits.length,1);assert.equal(stats.dataHits[0].zone,'supernova_challenge');
 assert.equal(stats.dataHits[0].kind,'ZONE');assert.equal(stats.dataHits[0].games,3);
 const saved=JSON.parse(JSON.stringify(stats));d.adopt(saved,active);d.zone(saved,active);
 assert.equal(saved.dataHits.length,1);
 d.zone(saved,{phase:'art',researchUpper:true});assert.equal(saved.dataHits.length,1);
 d.zone(saved,{phase:'art',zone:'sora'});d.zone(saved,wait);d.zone(saved,active);
 assert.deepEqual(Array.from(saved.dataHits,h=>h.zone),['supernova_challenge','sora','supernova_challenge']);
 assert.equal(saved.atFirstCount,1);assert.equal(saved.totalFee,600);assert.equal(saved.totalPaid,800);
 assert.equal(active.burstLeft,9);
 const legacy={totalSpins:300};d.adopt(legacy,active);d.zone(legacy,active);
 assert.equal(legacy.dataHits,undefined,'do not fabricate an entry when loading a previously active challenge');
});

test('challenge is labelled independently, keeps the minimum one-step bar and renders yellow',()=>{
 const node=()=>({dataset:{},children:[],setAttribute(){},addEventListener(){},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;}});
 const bars=node(),root={querySelector:s=>s==='.novaHitBars'?bars:null};
 const c=vm.createContext({document:{createElement:node}});vm.runInContext(js,c);
 c.NovaDataCounter.render(root,{current:0,hits:[{kind:'AT',games:0},{kind:'ZONE',zone:'supernova_challenge',games:0}]},{totalSpins:200});
 const column=bars.children[1];assert.equal(column.dataset.zone,'supernova_challenge');
 assert.equal(column.title,'スーパーノヴァチャレンジ / 0G');assert.equal(column.children[1].textContent,'上');
 assert.equal(column.children[0].children.filter(c=>c.className==='lit').length,1);
 assert.equal(bars.children[2].children[1].textContent,'AT');
 assert.match(fs.readFileSync('nova-data-counter.css','utf8'),/\.novaHitColumn\[data-kind=ZONE\]\[data-zone=supernova_challenge\]\{color:#ffd84d;\}/);
});
