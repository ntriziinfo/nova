import fs from 'node:fs';
import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {baseEntry,run} from './trial.mjs';
const files=['nova-art.js','nova-flow.js','nova-normal.js','nova-balance.js'];
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const [mode='pilot',settingArg,configArg]=process.argv.slice(2);
if(mode==='worker'){
 const config=JSON.parse(configArg),setting=Number(settingArg),start=Date.now(),out=run(setting,config.trials,config);
 out.report.elapsedSeconds=(Date.now()-start)/1000;out.report.sourceHashes=Object.fromEntries(files.map(f=>[f,hash(`research/burst113/baseline112/${f}`)]));
 const path=`docs/burst113-${config.tag}-${setting}.json`;fs.writeFileSync(path,JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify({path,setting,entry:config.entry[setting-1],trials:config.trials,complete:out.report.completeRate,rtp:out.report.rtp.value,stoppedRtp:out.report.stoppedRtp.value,attempts:out.report.burstAttempts,wins:out.report.burstWins,burst:out.report.burst}));
}else{
 const dir='research/burst113/baseline112';fs.mkdirSync(dir,{recursive:true});for(const f of files){const p=`${dir}/${f}`;if(!fs.existsSync(p))fs.copyFileSync(f,p);}
 let jobs;
 if(mode==='pilot')jobs=[...[2,4].flatMap(multiplier=>[1,3,6].map(setting=>({setting,tag:`pilot${multiplier}`,trials:200,award:2000,entry:baseEntry.map(e=>e*multiplier),seedBase:113100000}))),{setting:6,tag:'pilot1',trials:200,award:2000,entry:baseEntry,seedBase:113100000}];
 else if(mode==='batch')jobs=JSON.parse(fs.readFileSync(settingArg,'utf8'));
 else throw Error('Unknown mode');
 const initial=jobs.slice();
 async function lane(){while(jobs.length){const config=jobs.shift();await new Promise((resolve,reject)=>{const child=fork(fileURLToPath(import.meta.url),['worker',String(config.setting),JSON.stringify(config)],{stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`setting ${config.setting}: ${code}`)));});}}
 await Promise.all(Array.from({length:4},lane));
 console.log(JSON.stringify(initial.map(c=>JSON.parse(fs.readFileSync(`docs/burst113-${c.tag}-${c.setting}.json`)).report).map(r=>({tag:r.tag,s:r.setting,n:r.trials,reach:r.completeRate,ci:r.completeCI,stop:r.stoppedRtp.value,rtp:r.rtp.value,entry:r.entry[r.setting-1],burstMean:r.burst.mean,censored:r.burst.censored,burstDone:r.burst.completed}))));
}
