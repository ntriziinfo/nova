import fs from 'node:fs';
import {fork,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {run,compact} from './trial.mjs';
const files=['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','research/burst112/production-model.mjs','research/balance118/trial.mjs','research/balance118/cache-mix.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
if(process.argv[2]==='worker'){
  const c=JSON.parse(process.argv[3]),before=hashes(),out=run(c);assert.deepEqual(hashes(),before);
  out.report.sourceHashes=before;
  fs.writeFileSync(`docs/balance118-${c.tag}-${c.setting}.json`,JSON.stringify(out)+'\n');
  console.log(JSON.stringify(compact(out.report)));
}else if(process.argv[2]){
  const jobs=JSON.parse(fs.readFileSync(process.argv[2]));
  fs.writeFileSync(process.argv[2].replace(/\.json$/,'-manifest.json'),JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:hashes(),started:new Date().toISOString(),jobs},null,2)+'\n');
  async function lane(){while(jobs.length){const job=jobs.shift();await new Promise((resolve,reject)=>{const child=fork(fileURLToPath(import.meta.url),['worker',JSON.stringify(job)],{stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',c=>c===0?resolve():reject(Error(String(c))));});}}
  await Promise.all(Array.from({length:4},lane));
}
