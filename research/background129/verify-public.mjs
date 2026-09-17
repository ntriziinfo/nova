import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='https://nova-eta-jet-30.vercel.app';
const files=['jag.html','nova-clock.js','nova-clock-worker.js','nova-reel-motion.js','nova-aim-presentation.js','nova-ladder-presentation.js','nova-art.js','nova-normal.js','nova-flow.js','nova-balance.js'];
const hash=text=>createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex');
const results=await Promise.all(files.map(async file=>{
 const response=await fetch(base+'/'+file+'?background129='+Date.now(),{headers:{'Cache-Control':'no-cache'}});assert.equal(response.status,200,file);
 const sha256=hash(await response.text());assert.equal(sha256,hash(fs.readFileSync(file,'utf8')),file);return {file,sha256,matches:true};
}));
fs.writeFileSync('research/background129/public-sources.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
