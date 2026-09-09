import fs from 'node:fs';import {createHash} from 'node:crypto';import {runBurstTrial} from './burst112-trial-model.mjs';
const [settingArg='1',trialsArg='200',tag='pilot',configArg='{}']=process.argv.slice(2),setting=Number(settingArg),trials=Number(trialsArg);
if(!/^[a-z0-9-]+$/.test(tag)||!Number.isInteger(setting)||setting<1||setting>6||!Number.isInteger(trials)||trials<2)throw Error('Invalid trial arguments');
const started=Date.now(),sourceHashes=Object.fromEntries(['nova-art.js','nova-flow.js','nova-normal.js','nova-balance.js','scripts/burst112-trial-model.mjs','research/burst112/session-model.mjs'].map(file=>[file,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const inputConfig=JSON.parse(configArg),outputPath=`docs/burst112-${tag}-${setting}.json`;
// A concurrently dispatched identical job may already own this output.
// Wait for its complete JSON rather than re-running the same seeded trials.
if(fs.existsSync(outputPath+'.running')){
 const deadline=Date.now()+30*60*1000;
 while(!fs.existsSync(outputPath)&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,1000));
 if(!fs.existsSync(outputPath))throw Error('Timed out waiting for running trial: '+outputPath);
}
if(fs.existsSync(outputPath)){
 const cached=JSON.parse(fs.readFileSync(outputPath,'utf8')).report;
 if(cached.setting===setting&&cached.trials===trials&&JSON.stringify(cached.inputConfig)===JSON.stringify(inputConfig)&&JSON.stringify(cached.sourceHashes)===JSON.stringify(sourceHashes)){
  console.log(JSON.stringify({...cached,cached:true}));process.exit(0);
 }
}
const out=runBurstTrial(setting,trials,inputConfig);out.report.inputConfig=inputConfig;
out.report.sourceHashes=sourceHashes;out.report.elapsedSeconds=(Date.now()-started)/1000;
out.report.completeByGame=Object.fromEntries([10000,20000,30000].filter(g=>g<=out.report.maxGames).map(g=>[g,out.rows.filter(r=>r.firstComplete?.games<=g).length/trials]));
const stopped=out.rows.map(r=>r.firstComplete??r),stoppedSum=k=>stopped.reduce((s,r)=>s+r[k],0);
out.report.stoppedRtp=stoppedSum('totalPaid')/stoppedSum('totalBet');out.report.stoppedGames=stoppedSum('games');
const stoppedSe=Math.sqrt(stopped.reduce((s,r)=>s+(r.totalPaid-out.report.stoppedRtp*r.totalBet)**2,0)/(trials-1)/trials)/(stoppedSum('totalBet')/trials);
out.report.stoppedRtpCI=[out.report.stoppedRtp-1.96*stoppedSe,out.report.stoppedRtp+1.96*stoppedSe];
if(out.rows.some(r=>r.games!==out.report.maxGames))throw Error('A trial ended before its full game budget');
fs.writeFileSync(outputPath,JSON.stringify(out,null,2));console.log(JSON.stringify(out.report));
