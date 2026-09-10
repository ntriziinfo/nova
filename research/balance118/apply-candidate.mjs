import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const jobs=JSON.parse(fs.readFileSync(process.argv[2])).sort((a,b)=>a.setting-b.setting);
assert.deepEqual(jobs.map(c=>c.setting),[1,2,3,4,5,6]);
const shared=jobs[0];
for(const c of jobs){assert.deepEqual(c.levels,shared.levels);assert.equal(c.base,shared.base);assert.equal(c.replay,shared.replay);assert.equal(c.weights,undefined);}
let art=fs.readFileSync('nova-art.js','utf8');
function artReplace(re,value){assert.equal([...art.matchAll(new RegExp(re.source,'g'))].length,1,re.source);art=art.replace(re,value);}
artReplace(/normalBoost:Object.freeze\(\[[\d.,]+\]\)/,`normalBoost:Object.freeze(${JSON.stringify(jobs.map(c=>c.boost))})`);
artReplace(/entry:Object.freeze\(\[[\d.,]+\]\)/,`entry:Object.freeze(${JSON.stringify(jobs.map(c=>c.entry))})`);
artReplace(/\.\.\.\[[\s\S]*?\]\s*\.map\(\(\[rare,direct,weakNova,weak\]\)/,`...${JSON.stringify(shared.levels)}.map(([rare,direct,weakNova,weak])`);
let normal=fs.readFileSync('nova-normal.js','utf8');
assert.equal([...normal.matchAll(/50\/(27\.5|50)/g)].length,1);
normal=normal.replace(/50\/(27\.5|50)/,`50/${shared.base}`).replace(/frequent(?:\/7\.452119|\*0\.55)/,`frequent*${shared.replay}`);
normal=normal.replace(/\/\/ Adopted volatility profile: normal\/CZ base is [\d.]+ games per 50pt\./,'// Joint RTP/reach profile: normal/CZ base is 50 games per 50pt; replay grants a free next BET.');
new vm.Script(art);new vm.Script(normal);
fs.writeFileSync('nova-art.js',art);fs.writeFileSync('nova-normal.js',normal);
let html=fs.readFileSync('jag.html','utf8');
for(const f of ['nova-art.js','nova-balance.js','nova-normal.js'])html=html.replace(new RegExp(f.replace('.','\\.')+'\\?v=[^"\\s]+'),`${f}?v=20260910-balance-118`);
fs.writeFileSync('jag.html',html);
fs.writeFileSync('research/balance118/selected.json',JSON.stringify({sourceConfig:process.argv[2],base:shared.base,replay:shared.replay,levels:shared.levels,boosts:jobs.map(c=>c.boost),entries:jobs.map(c=>c.entry)},null,2)+'\n');
console.log('Candidate written locally. No deployment or success claim; independent holdout required.');
