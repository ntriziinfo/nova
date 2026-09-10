import fs from 'node:fs';
import vm from 'node:vm';
import {fork,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {loadModel,simulate} from '../burst112/production-model.mjs';
import {summarize} from '../burst113/trial.mjs';
const files=['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','research/burst112/production-model.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
export function loadCandidate(c){
 loadModel();
 if(c.burstFactor!=null){
  const entry=NovaArt.burstRules.entry.map(p=>p*c.burstFactor);
  const source=fs.readFileSync('nova-art.js','utf8');
  assert.match(source,/entry:Object.freeze\(\[[\d.,]+\]\)/);
  vm.runInThisContext(source.replace(/entry:Object.freeze\(\[[\d.,]+\]\)/,`entry:Object.freeze(${JSON.stringify(entry)})`));
 }
 if(c.base!=null){
  const source=fs.readFileSync('nova-normal.js','utf8');assert(source.includes('50/27.5'));
  vm.runInThisContext(source.replace('50/27.5',`50/${c.base}`));
 }
}
if(process.argv[2]==='worker'){
 const c=JSON.parse(process.argv[3]),start=Date.now(),sourceHashes=hashes();loadCandidate(c);
 const rows=[],art=c.weights?{atLevelWeights:c.weights}:{};
 for(const role of NovaArt.comebackRules.guaranteedRoles)assert.equal(NovaArt.comebackChance(role,c.setting),1);
 for(let i=0;i<c.trials;i++){
  const row=simulate(c.setting,30000,c.seedBase+c.setting*100003+i*7919,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false,art});
  assert.equal(row.games,30000);rows.push(row);
  if((i+1)%100===0)console.log(`${c.tag} S${c.setting}: ${i+1}/${c.trials} × 30,000G (${Math.round((Date.now()-start)/1000)}s)`);
 }
 assert.deepEqual(hashes(),sourceHashes);
 const report=summarize(rows,{...c,sourceHashes,entry:NovaArt.burstRules.entry,award:NovaArt.burstRules.award,comebackRules:NovaArt.comebackRules,weights:c.weights||NovaArt.atLevelRules.weights[c.setting-1]});
 report.reachWithoutBurst=rows.filter(r=>r.firstComplete&&!r.firstComplete.burstWins).length/c.trials;
 report.elapsedSeconds=(Date.now()-start)/1000;
 fs.writeFileSync(`docs/balance117-${c.tag}-${c.setting}.json`,JSON.stringify({report,rows},null,2)+'\n');
 console.log(JSON.stringify({setting:c.setting,tag:c.tag,rtp:report.stoppedRtp.value,unlimited:report.rtp.value,reach:report.completeRate,noBurstReach:report.reachWithoutBurst,base:c.base,burstFactor:c.burstFactor,burstAttempts:report.burstAttempts,burstWins:report.burstWins}));
}else if(process.argv[2]){
 const jobs=JSON.parse(fs.readFileSync(process.argv[2]));
 fs.writeFileSync(`research/balance117/${jobs[0].tag}-manifest.json`,JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:hashes(),startedAt:new Date().toISOString(),jobs},null,2)+'\n');
 async function lane(){while(jobs.length){const c=jobs.shift();await new Promise((resolve,reject)=>{const child=fork(fileURLToPath(import.meta.url),['worker',JSON.stringify(c)],{stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(String(code))));});}}
 await Promise.all(Array.from({length:4},lane));
}
