import {fileURLToPath} from 'node:url';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {loadModel,simulate} from './zone-v2-model.mjs';
import {INPUTS,hashes} from './rtp-current.mjs';

const DEFAULT_GAMES=100_000_000;
const DEFAULT_SEED='nova-rtp-v175-20261030';
const BLOCK_GAMES=1_000_000;
const SIMULATION_OPTIONS=Object.freeze({
 rng:'xoshiro128',
 exactGames:true,
 completeLimitPt:0,
 completeMyLimitPt:0,
 stopAtComplete:false,
 rareSortie:true,
 atBetRefund:true,
 replayRefund:true,
 checkpointQuiet:true,
 netGuard:true,
 decrement:true,
 recordBlocks:BLOCK_GAMES
});

function usage(){
 return `Usage: node scripts/report-rtp-parallel.mjs [options]

Options:
  --games <n>  Games per setting (default: ${DEFAULT_GAMES})
  --seed <s>   Deterministic base seed (default: ${DEFAULT_SEED})
  --setting <n> Run one setting (1-6), for independent CI workers
  --help       Show this help`;
}

function positiveInteger(value,label){
 const number=Number(value);
 if(!Number.isSafeInteger(number)||number<=0)throw new Error(`${label} must be a positive integer: ${value}`);
 return number;
}

function parseArguments(argv){
 const config={games:DEFAULT_GAMES,seed:DEFAULT_SEED};
 for(let index=0;index<argv.length;index++){
  const argument=argv[index];
  if(argument==='--help'||argument==='-h')return {...config,help:true};
  const separator=argument.indexOf('=');
  const name=separator===-1?argument:argument.slice(0,separator);
  const inlineValue=separator===-1?undefined:argument.slice(separator+1);
  const readValue=()=>inlineValue??argv[++index];
  if(name==='--games')config.games=positiveInteger(readValue(),'--games');
  else if(name==='--setting'){
   config.setting=positiveInteger(readValue(),'--setting');
   if(config.setting>6)throw new Error('--setting must be 1-6');
  }
  else if(name==='--seed'){
   const value=readValue();
   if(value===undefined||value==='')throw new Error('--seed requires a non-empty value');
   config.seed=String(value);
  }else throw new Error(`Unknown option: ${argument}`);
 }
 return config;
}

function settingSeed(baseSeed,setting){
 return `${baseSeed}|setting=${setting}`;
}

function round(value,digits=6){
 if(!Number.isFinite(value))return null;
 const scale=10**digits;
 return Math.round(value*scale)/scale;
}

function blockCi95(blocks){
 const samples=(blocks??[])
  .filter(block=>Number(block.totalBet)>0)
  .map(block=>Number(block.totalPaid)/Number(block.totalBet))
  .filter(Number.isFinite);
 const count=samples.length;
 if(count===0)return {blocks:0,blockGames:BLOCK_GAMES,meanPct:null,lowPct:null,highPct:null,halfWidthPct:null};
 const mean=samples.reduce((sum,value)=>sum+value,0)/count;
 if(count===1)return {blocks:1,blockGames:BLOCK_GAMES,meanPct:round(mean*100),lowPct:null,highPct:null,halfWidthPct:null};
 const variance=samples.reduce((sum,value)=>sum+(value-mean)**2,0)/(count-1);
 const standardError=Math.sqrt(variance/count);
 const halfWidth=1.96*standardError;
 return {
  blocks:count,
  blockGames:BLOCK_GAMES,
  meanPct:round(mean*100),
  lowPct:round((mean-halfWidth)*100),
  highPct:round((mean+halfWidth)*100),
  halfWidthPct:round(halfWidth*100)
 };
}

function summarize(result,elapsedSeconds){
 return {
  setting:result.setting,
  seed:result.seed,
  games:result.games,
  rtp:result.totalPaid/result.totalBet,
  rtpPct:round(result.rtp*100),
  totalBet:result.totalBet,
  totalPaid:result.totalPaid,
  net:result.net,
  maxDrawdown:result.maxDrawdown,
  atPayoutBins:result.atPayoutBins,
  counts:result.counts,
  ci95:blockCi95(result.blocks),
  elapsedSeconds:round(elapsedSeconds,3)
 };
}

function sourceHashes(){
 return hashes(fileURLToPath(new URL('../',import.meta.url)));
}

async function runWorker({setting,games,seed}){
 const started=performance.now();
 loadModel();
 const result=simulate(setting,games,seed,SIMULATION_OPTIONS);
 return summarize(result,(performance.now()-started)/1000);
}

function spawnWorker(setting,config){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL(import.meta.url),{
   workerData:{setting,games:config.games,seed:settingSeed(config.seed,setting)}
  });
  let settled=false;
  worker.once('message',message=>{
   settled=true;
   if(message?.error)reject(new Error(`setting ${setting}: ${message.error}`));
   else resolve(message);
  });
  worker.once('error',error=>{settled=true;reject(error);});
  worker.once('exit',code=>{
   if(!settled&&code!==0)reject(new Error(`setting ${setting} worker exited with code ${code}`));
   else if(!settled)reject(new Error(`setting ${setting} worker exited without a result`));
  });
 });
}

async function main(){
 const config=parseArguments(process.argv.slice(2));
 if(config.help){process.stdout.write(`${usage()}\n`);return;}
 const started=performance.now();
 const inputs=sourceHashes();
 const results=(await Promise.all((config.setting?[config.setting]:[1,2,3,4,5,6]).map(setting=>spawnWorker(setting,config))))
  .toSorted((left,right)=>left.setting-right.setting);
 const after=sourceHashes();
 if(INPUTS.some(file=>inputs[file]!==after[file]))throw new Error('Source changed during simulation; discard this result');
 const report={
  schema:'nova-rtp-parallel/v1',
  gamesPerSetting:config.games,
  baseSeed:config.seed,
  options:SIMULATION_OPTIONS,
  sourceHashes:inputs,
  results,
  elapsedSeconds:round((performance.now()-started)/1000,3)
 };
 process.stdout.write(`${JSON.stringify(report)}\n`);
}

if(isMainThread){
 main().catch(error=>{
  process.stderr.write(`${error.stack??error.message}\n\n${usage()}\n`);
  process.exitCode=1;
 });
}else{
 runWorker(workerData)
  .then(result=>parentPort.postMessage(result))
  .catch(error=>parentPort.postMessage({error:error.stack??error.message}));
}
