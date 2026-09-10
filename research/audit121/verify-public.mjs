import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files=['jag.html','nova-audit.js','nova-audit-ui.js','nova-audit.css','nova-art.js','nova-normal.js','nova-flow.js','nova-balance.js'],norm=s=>s.replace(/\r\n/g,'\n');
await Promise.all(files.map(async file=>{const response=await fetch('https://nova-eta-jet-30.vercel.app/'+file+'?verify='+commit);assert.equal(response.status,200,file);assert.equal(norm(await response.text()),norm(fs.readFileSync(file,'utf8')),file);}));
console.log(JSON.stringify({commit,matched:files}));
