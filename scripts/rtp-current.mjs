import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

// Keep settlement and stop handling monitored. Reviewed presentation-only
// revisions may reuse evidence, but an unknown source change still fails closed.
export const INPUTS=['nova-complete.js','nova-decrement.js','nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','nova-progress.js','nova-game.js','nova-stock-entry.js','nova-spin-resume.js','nova-bell-navi.js','nova-reel-sheet-data.js','scripts/zone-v2-model.mjs','scripts/zone-v2-rng.mjs','scripts/report-rtp-parallel.mjs'];
export const EVIDENCE='docs/rtp-current-1b.json';
export const REQUIRED_OPTIONS=Object.freeze({
 rng:'xoshiro128',exactGames:true,completeLimitPt:0,completeMyLimitPt:0,
 stopAtComplete:false,rareSortie:true,atBetRefund:true,replayRefund:true,
 checkpointQuiet:true,netGuard:true,decrement:true,recordBlocks:1_000_000
});
export const GAMES_PER_SETTING=100_000_000;
// Retain verified historical billion-game evidence without relabeling its size.
export const EVIDENCE_GAMES=Object.freeze([GAMES_PER_SETTING,1_000_000_000]);
const BET_PER_GAME=3;
export function presentationAliases(registry){
 if(registry?.schema!=='nova-rtp-presentation-equivalence/v1'||!Array.isArray(registry.changes))throw Error('Invalid presentation equivalence registry');
 const aliases=new Map();
 for(const change of registry.changes){
  if(!INPUTS.includes(change.file)||![change.sourceHash,change.presentationHash].every(h=>/^[a-f0-9]{64}$/.test(h))||change.sourceHash===change.presentationHash||
   ![change.sourceCommit,change.presentationCommit].every(h=>/^[a-f0-9]{40}$/.test(h))||!change.reason?.trim()||!change.tests?.length||change.tests.some(t=>!/^tests\/[\w.-]+\.test\.mjs$/.test(t)))throw Error('Incomplete presentation-only review');
  const key=change.file+':'+change.presentationHash;
  if(aliases.has(key))throw Error('Duplicate presentation equivalence');
  aliases.set(key,change.sourceHash);
 }
 for(const change of registry.changes)if(aliases.has(change.file+':'+change.sourceHash))throw Error('Chained presentation equivalence is not permitted');
 return aliases;
}
const aliases=presentationAliases(JSON.parse(fs.readFileSync(new URL('./rtp-presentation-equivalence.json',import.meta.url),'utf8')));
function behaviorHash(file,hash){return aliases.get(file+':'+hash)??hash;}
export function sameSources(expected,current){
 return INPUTS.every(file=>typeof expected?.[file]==='string'&&expected[file].length>0&&typeof current?.[file]==='string'&&current[file].length>0&&behaviorHash(file,expected[file])===behaviorHash(file,current[file]));
}
export function hashes(root='.'){
 return Object.fromEntries(INPUTS.map(file=>[file,createHash('sha256').update(fs.readFileSync(`${root}/${file}`,'utf8').replace(/\r\n/g,'\n')).digest('hex')]));
}
export function modelHash(current){
 return createHash('sha256').update(JSON.stringify(INPUTS.map(file=>[file,behaviorHash(file,current[file])]))).digest('hex');
}
export function evidenceRows(report){
 if(EVIDENCE_GAMES.includes(report?.gamesPerSetting)&&Array.isArray(report.results))return report.results;
 if(report?.totalGamesPerSetting===1_000_000_000&&Array.isArray(report.settings))return report.settings;
 return null;
}
function closeEnough(actual,expected,tolerance=5e-10){
 return Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance;
}
function resultValid(row,setting,games){
 if(row?.setting!==setting||row.games!==games||row.totalBet!==row.games*BET_PER_GAME)return false;
 if(!Number.isSafeInteger(row.totalPaid)||row.totalPaid<0||row.net!==row.totalPaid-row.totalBet)return false;
 const rtp=row.totalPaid/row.totalBet;
 if(row.rtp!==undefined&&!closeEnough(row.rtp,rtp))return false;
 if(row.rtpPct!==undefined&&!closeEnough(row.rtpPct,rtp*100,5e-6))return false;
 const ci=row.ci95,values=[ci?.meanPct,ci?.lowPct,ci?.highPct,ci?.halfWidthPct];
 if(ci?.blocks!==games/REQUIRED_OPTIONS.recordBlocks||ci?.blockGames!==REQUIRED_OPTIONS.recordBlocks||values.some(value=>!Number.isFinite(value)))return false;
 if(ci.lowPct>ci.meanPct||ci.meanPct>ci.highPct||ci.halfWidthPct<0)return false;
 if(!closeEnough(ci.meanPct,rtp*100,5e-6))return false;
 return closeEnough((ci.highPct-ci.lowPct)/2,ci.halfWidthPct,2e-6);
}
function pooledValid(report,rows){
 if(rows!==report.settings)return true;
 if(report.chunksPerSetting!==4||report.gamesPerChunk!==250_000_000||report.chunksPerSetting*report.gamesPerChunk!==report.totalGamesPerSetting)return false;
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
 if(!sameSources(report.sourceHashes,current))return false;
 const games=report.gamesPerSetting??report.totalGamesPerSetting;
 if(![1,2,3,4,5,6].every(n=>rows.filter(r=>r.setting===n).length===1&&resultValid(rows.find(r=>r.setting===n),n,games)))return false;
 return pooledValid(report,rows);
}
export function currentReport(report,current,commit){
 const ready=valid(report,current);
 const evidence=ready?evidenceRows(report):[];
 const pooled=ready&&evidence===report.settings;
 const games=ready?(report.gamesPerSetting??report.totalGamesPerSetting):GAMES_PER_SETTING;
 const rows=evidence.toSorted((a,b)=>a.setting-b.setting);
 const presentationChanges=ready?INPUTS.filter(file=>report.sourceHashes[file]!==current[file]).map(file=>({file,simulationHash:report.sourceHashes[file],currentHash:current[file]})):[];
 return {schema:'nova-current-rtp/v1',status:ready?'ready':'pending',modelHash:modelHash(current),commit,sourceCommit:ready?report.sourceCommit:null,generatedAt:ready?report.generatedAt:null,sourceVerification:ready?{kind:presentationChanges.length?'reviewed-presentation-only':'identical',presentationChanges}:null,gamesPerSetting:games,conditions:pooled?'2.5億G×4系列合算・MY／差枚停止なし':`${games/100_000_000}億G連続・MY／差枚停止なし`,settings:rows.map(r=>({setting:r.setting,rtp:r.totalPaid/r.totalBet,rtpPct:r.totalPaid/r.totalBet*100,ci95:r.ci95}))};
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
  if(!valid(report,hashes()))throw Error('Evidence does not match the current game behavior or required trial conditions');
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
