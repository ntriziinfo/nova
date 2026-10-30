import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

// Include browser settlement and stop handling too: changes there can affect
// actual awards even when the simulation modules have not changed.
export const INPUTS=['nova-complete.js','nova-decrement.js','nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','nova-progress.js','nova-game.js','nova-stock-entry.js','nova-spin-resume.js','nova-bell-navi.js','nova-reel-sheet-data.js','scripts/zone-v2-model.mjs','scripts/zone-v2-rng.mjs','scripts/report-rtp-parallel.mjs'];
export const EVIDENCE='docs/rtp-current-1b.json';
export const REQUIRED_OPTIONS=Object.freeze({
 rng:'xoshiro128',exactGames:true,completeLimitPt:0,completeMyLimitPt:0,
 stopAtComplete:false,rareSortie:true,atBetRefund:true,replayRefund:true,
 checkpointQuiet:true,netGuard:true,decrement:true,recordBlocks:1_000_000
});
const GAMES_PER_SETTING=1_000_000_000;
const BET_PER_GAME=3;
export function hashes(root='.'){
 return Object.fromEntries(INPUTS.map(file=>[file,createHash('sha256').update(fs.readFileSync(`${root}/${file}`,'utf8').replace(/\r\n/g,'\n')).digest('hex')]));
}
export function modelHash(current){
 return createHash('sha256').update(JSON.stringify(INPUTS.map(file=>[file,current[file]]))).digest('hex');
}
export function evidenceRows(report){
 if(report?.gamesPerSetting===GAMES_PER_SETTING&&Array.isArray(report.results))return report.results;
 if(report?.totalGamesPerSetting===GAMES_PER_SETTING&&Array.isArray(report.settings))return report.settings;
 return null;
}
function closeEnough(actual,expected,tolerance=5e-10){
 return Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance;
}
function resultValid(row,setting){
 if(row?.setting!==setting||row.games!==GAMES_PER_SETTING||row.totalBet!==row.games*BET_PER_GAME)return false;
 if(!Number.isSafeInteger(row.totalPaid)||row.totalPaid<0||row.net!==row.totalPaid-row.totalBet)return false;
 const rtp=row.totalPaid/row.totalBet;
 if(row.rtp!==undefined&&!closeEnough(row.rtp,rtp))return false;
 if(row.rtpPct!==undefined&&!closeEnough(row.rtpPct,rtp*100,5e-6))return false;
 const ci=row.ci95,values=[ci?.meanPct,ci?.lowPct,ci?.highPct,ci?.halfWidthPct];
 if(ci?.blocks!==1_000||ci?.blockGames!==1_000_000||values.some(value=>!Number.isFinite(value)))return false;
 if(ci.lowPct>ci.meanPct||ci.meanPct>ci.highPct||ci.halfWidthPct<0)return false;
 if(!closeEnough(ci.meanPct,rtp*100,5e-6))return false;
 return closeEnough((ci.highPct-ci.lowPct)/2,ci.halfWidthPct,2e-6);
}
function pooledValid(report,rows){
 if(rows!==report.settings)return true;
 if(report.chunksPerSetting!==4||report.gamesPerChunk!==250_000_000||report.chunksPerSetting*report.gamesPerChunk!==GAMES_PER_SETTING)return false;
 return rows.every(row=>{
  if(!Array.isArray(row.seeds)||row.seeds.length!==report.chunksPerSetting||new Set(row.seeds).size!==row.seeds.length)return false;
  if(!Array.isArray(row.chunkResults)||row.chunkResults.length!==report.chunksPerSetting)return false;
  let games=0,bet=0,paid=0;
  for(let index=0;index<row.chunkResults.length;index++){
   const chunk=row.chunkResults[index];
   if(chunk.chunk!==index+1||chunk.seed!==row.seeds[index]||chunk.games!==report.gamesPerChunk||chunk.totalBet!==chunk.games*BET_PER_GAME)return false;
   if(!Number.isSafeInteger(chunk.totalPaid)||chunk.totalPaid<0||chunk.net!==chunk.totalPaid-chunk.totalBet)return false;
   if(chunk.rtp!==undefined&&!closeEnough(chunk.rtp,chunk.totalPaid/chunk.totalBet))return false;
   games+=chunk.games;bet+=chunk.totalBet;paid+=chunk.totalPaid;
  }
  return games===row.games&&bet===row.totalBet&&paid===row.totalPaid;
 });
}
export function valid(report,current){
 const rows=evidenceRows(report);
 if(!rows||rows.length!==6||rows.some(r=>!r))return false;
 const o=report.options??{};
 if(Object.entries(REQUIRED_OPTIONS).some(([key,value])=>o[key]!==value))return false;
 if(INPUTS.some(f=>report.sourceHashes?.[f]!==current[f]))return false;
 if(![1,2,3,4,5,6].every(n=>rows.filter(r=>r.setting===n).length===1&&resultValid(rows.find(r=>r.setting===n),n)))return false;
 return pooledValid(report,rows);
}
export function currentReport(report,current,commit){
 const ready=valid(report,current);
 const evidence=ready?evidenceRows(report):[];
 const pooled=ready&&evidence===report.settings;
 const rows=evidence.toSorted((a,b)=>a.setting-b.setting);
 return {schema:'nova-current-rtp/v1',status:ready?'ready':'pending',modelHash:modelHash(current),commit,sourceCommit:ready?report.sourceCommit:null,generatedAt:ready?report.generatedAt:null,gamesPerSetting:GAMES_PER_SETTING,conditions:pooled?'2.5億G×4系列合算・MY／差枚停止なし':'10億G連続・MY／差枚停止なし',settings:rows.map(r=>({setting:r.setting,rtp:r.totalPaid/r.totalBet,rtpPct:r.totalPaid/r.totalBet*100,ci95:r.ci95}))};
}
function main(){
 const command=process.argv[2]||'build';
 const commit=process.env.VERCEL_GIT_COMMIT_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(command==='adopt'){
  const source=fs.readFileSync(process.argv[3]);
  const sourceReportSha256=createHash('sha256').update(source).digest('hex');
  const report=JSON.parse(source.toString('utf8').replace(/^\uFEFF/,''));
  const sourceCommit=process.argv[4]||commit;
  // Windows checkouts may use CRLF. Canonicalize only when the raw report
  // hash matches the exact local source; never accept different code.
  const canonical=hashes();
  for(const file of INPUTS){
   const raw=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
   if(report.sourceHashes?.[file]===raw)report.sourceHashes[file]=canonical[file];
  }
  if(!valid(report,hashes()))throw Error('Evidence does not match the current simulation inputs or billion-game conditions');
  fs.writeFileSync(EVIDENCE,JSON.stringify({...report,sourceReportSha256,sourceCommit,generatedAt:new Date().toISOString()},null,2)+'\n');
 }
 const report=fs.existsSync(EVIDENCE)?JSON.parse(fs.readFileSync(EVIDENCE,'utf8')):null;
 const data=currentReport(report,hashes(),commit);
 if(command==='check'){console.log(data.status);return;}
 fs.writeFileSync('nova-rtp-current.json',JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync('nova-rtp-current.js','globalThis.NovaRtpCurrent='+JSON.stringify(data)+';\n');
 console.log(`Current RTP: ${data.status} (${commit.slice(0,7)})`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
