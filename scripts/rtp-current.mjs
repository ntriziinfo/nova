import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const INPUTS=['nova-complete.js','nova-decrement.js','nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','nova-progress.js','scripts/zone-v2-model.mjs','scripts/zone-v2-rng.mjs','scripts/report-rtp-parallel.mjs'];
export const EVIDENCE='docs/rtp-current-1b.json';
export function hashes(root='.'){
 return Object.fromEntries(INPUTS.map(file=>[file,createHash('sha256').update(fs.readFileSync(`${root}/${file}`,'utf8').replace(/\r\n/g,'\n')).digest('hex')]));
}
export function valid(report,current){
 if(report?.gamesPerSetting!==1_000_000_000||!Array.isArray(report.results)||report.results.length!==6||report.results.some(r=>!r))return false;
 const o=report.options;
 if(!o||o.completeLimitPt!==0||o.completeMyLimitPt!==0||o.stopAtComplete!==false||o.exactGames!==true)return false;
 if(INPUTS.some(f=>report.sourceHashes?.[f]!==current[f]))return false;
 return [1,2,3,4,5,6].every(n=>{
  const rows=report.results.filter(r=>r.setting===n),r=rows[0];
  return rows.length===1&&r.games===1_000_000_000&&r.totalBet===r.games*3&&Number.isSafeInteger(r.totalPaid)&&r.totalPaid>=0&&r.net===r.totalPaid-r.totalBet;
 });
}
export function currentReport(report,current,commit){
 const ready=valid(report,current);
 return {schema:'nova-current-rtp/v1',status:ready?'ready':'pending',commit,sourceCommit:ready?report.sourceCommit:null,generatedAt:ready?report.generatedAt:null,gamesPerSetting:1_000_000_000,conditions:'10億G連続・MY／差枚停止なし',settings:ready?report.results.map(r=>({setting:r.setting,rtp:r.totalPaid/r.totalBet,rtpPct:r.totalPaid/r.totalBet*100,ci95:r.ci95})):[]};
}
function main(){
 const command=process.argv[2]||'build';
 const commit=process.env.VERCEL_GIT_COMMIT_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(command==='adopt'){
  const report=JSON.parse(fs.readFileSync(process.argv[3],'utf8').replace(/^\uFEFF/,''));
  const sourceCommit=process.argv[4]||commit;
  // Windows checkouts may use CRLF. Canonicalize only when the raw report
  // hash matches the exact local source; never accept different code.
  const canonical=hashes();
  for(const file of INPUTS){
   const raw=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
   if(report.sourceHashes?.[file]===raw)report.sourceHashes[file]=canonical[file];
  }
  if(!valid(report,hashes()))throw Error('Evidence does not match the current simulation inputs or billion-game conditions');
  fs.writeFileSync(EVIDENCE,JSON.stringify({...report,sourceCommit,generatedAt:new Date().toISOString()},null,2)+'\n');
 }
 const report=fs.existsSync(EVIDENCE)?JSON.parse(fs.readFileSync(EVIDENCE,'utf8')):null;
 const data=currentReport(report,hashes(),commit);
 if(command==='check'){console.log(data.status);return;}
 fs.writeFileSync('nova-rtp-current.json',JSON.stringify(data,null,2)+'\n');
 fs.writeFileSync('nova-rtp-current.js','globalThis.NovaRtpCurrent='+JSON.stringify(data)+';\n');
 console.log(`Current RTP: ${data.status} (${commit.slice(0,7)})`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
