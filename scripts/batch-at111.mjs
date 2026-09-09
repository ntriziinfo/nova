import {execFile} from 'node:child_process';
const jobs=JSON.parse(process.argv[2]);
async function lane(){while(jobs.length){const args=jobs.shift();await new Promise((resolve,reject)=>execFile(process.execPath,['scripts/measure-at111.mjs',...args.map(String)],{windowsHide:true},(error,stdout,stderr)=>{if(error){process.stderr.write(stderr);reject(error);}else{process.stdout.write(stdout);resolve();}}));}}
await Promise.all(Array.from({length:Math.min(3,jobs.length)},lane));
