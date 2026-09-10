import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const normalize=s=>s.replace(/\r\n/g,'\n');
const baseline='90f739d8cbb49680acf66d17eb4e71f22d1ced7d';
const core=['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'];
for(const file of core){
  assert.equal(normalize(fs.readFileSync(file,'utf8')),normalize(execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'})),file);
}
const html=fs.readFileSync('jag.html','utf8');
for(const file of ['nova-art.js','nova-balance.js','nova-normal.js']){
  assert(html.includes(`${file}?v=20260910-balance-118-rollback`));
}
const result={baseline,coreMatches:true,cacheTagsUpdated:true};
if(process.argv.includes('--public')){
  result.commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  result.publicFiles=[...core,'jag.html','docs/balance117-rtp-report.md'];
  await Promise.all(result.publicFiles.map(async file=>{
    const response=await fetch(`https://nova-eta-jet-30.vercel.app/${file}?verify=${result.commit}`);
    assert.equal(response.status,200,file);
    assert.equal(normalize(await response.text()),normalize(fs.readFileSync(file,'utf8')),`${file}: public differs from local`);
  }));
  result.publicMatches=true;
  fs.writeFileSync('research/balance118/rollback-public-check.json',JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify(result,null,2));
