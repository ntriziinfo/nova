// Replay the approved seeds against production code; never modifies game parameters.
// Run from repository root: node scripts/verify-50000-20261006.mjs [workers=4]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Worker,isMainThread,parentPort} from 'node:worker_threads';
import {loadModel,simulate} from './zone-v2-model.mjs';
import {summarizeTrials} from './tuning-statistics.mjs';
const prefix='docs/rtp-50000-20261006';
const options={rng:'xoshiro128',exactGames:true,completeLimitPt:10000,stopAtComplete:true,rareSortie:true,atBetRefund:true};
const modelFiles=['nova-tuning.js','nova-decrement.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','nova-progress.js','scripts/zone-v2-model.mjs','scripts/zone-v2-rng.mjs'];
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const phases=['normal','cz','prep','align','bonus','at','zone'];
if(!isMainThread){
 loadModel();
 parentPort.on('message',rows=>{
  for(const expected of rows){
   const r=simulate(expected.setting,50000,expected.seed,options);
   assert.equal(r.totalPaid-r.totalBet,r.net);
   assert.equal(r.rare.draws,r.games);
   assert.equal(phases.reduce((n,p)=>n+r.counts[p],0),r.games);
   assert(r.firstComplete||r.games===50000);
   assert.equal(!!r.firstComplete,r.peak>=10000);
   const actual={setting:expected.setting,seed:expected.seed,games:r.games,totalBet:r.totalBet,totalPaid:r.totalPaid,net:r.net,peak:r.peak,firstComplete:r.firstComplete,counts:r.counts,atEligible:r.atMetrics.eligible,atZones:r.atMetrics.zoneWins};
   assert.deepEqual(actual,expected,'Production differs from approved trial: '+expected.seed);
  }
  parentPort.postMessage(rows.length);
 });
}else{
 const started=Date.now(),rows=JSON.parse(gunzipSync(fs.readFileSync(prefix+'-rows.json.gz')));
 const hashes=Object.fromEntries(modelFiles.map(f=>[f,hash(f)]));
 const jobs=[];for(let i=0;i<rows.length;i+=10)jobs.push(rows.slice(i,i+10));
 let done=0,last=0;
 await Promise.all(Array.from({length:Math.max(1,Math.min(6,Number(process.argv[2])||4))},()=>new Promise((resolve,reject)=>{
  const worker=new Worker(new URL(import.meta.url));worker.on('error',reject);
  const next=()=>{const job=jobs.shift();if(job)worker.postMessage(job);else worker.terminate().then(resolve);};
  worker.on('message',n=>{done+=n;if(Date.now()-last>20000){last=Date.now();console.log(JSON.stringify({matched:done,total:rows.length,seconds:Math.round((Date.now()-started)/1000)}));}next();});next();
 })));
 for(const [f,h]of Object.entries(hashes))assert.equal(hash(f),h,'Source changed while replaying');
 assert.equal(done,6000);
 const settings=Array.from({length:6},(_,i)=>{
  const data=rows.filter(r=>r.setting===i+1),s=summarizeTrials(data);assert.equal(data.length,1000);assert.equal(new Set(data.map(r=>r.seed)).size,1000);
  const edges=Array.from({length:31},(_,j)=>-20000+j*1000);
  const bins=[{label:'−20,000未満',lower:null,upper:-20000},...edges.slice(0,-1).map((n,j)=>({label:n.toLocaleString('ja-JP')+'〜'+(edges[j+1]-1).toLocaleString('ja-JP'),lower:n,upper:edges[j+1]})),{label:'＋10,000以上',lower:10000,upper:null}];
  const distribution=bins.map(b=>{const count=data.filter(r=>(b.lower===null||r.net>=b.lower)&&(b.upper===null||r.net<b.upper)).length;return {...b,count,rate:count/data.length};});
  assert.equal(distribution.reduce((n,b)=>n+b.count,0),data.length);
  const thresholds=Array.from({length:10},(_,j)=>{const pt=(j+1)*1000,count=data.filter(r=>r.peak>=pt).length;return {pt,count,rate:count/data.length};});
  // These sessions actually stop at completion; no uncapped result is claimed.
  return {setting:i+1,trials:data.length,target:[.945,.965,.985,1.005,1.055,1.14][i],stopped:s.stopped,reach:s.reach,reachCi95:s.reachCi95,meanGames:data.reduce((n,r)=>n+r.games,0)/data.length,normalAtDenominator:s.normalAtDenominator,normalCzDenominator:s.normalCzDenominator,distribution,thresholds};
 });
 const report={version:'net-quota-20261006-50000g-complete-stop',createdAt:new Date().toISOString(),gamesPerTrial:50000,trialsPerSetting:1000,totalActualGames:rows.reduce((n,r)=>n+r.games,0),options,
  definitions:{rtp:'全試行の実払い出し合計 / 実際に課金されたBET合計。リプレイは無料。平均個別機械割ではない。',win:'停止時の累計差枚が0ptより大きい試行の割合。',reach:'最大50,000実ゲーム内で、累計差枚が＋10,000ptに一度でも到達した割合。AT1回の払い出しではない。',stop:'累計差枚＋10,000pt到達時に停止。未到達は50,000Gで終了。残りATpt・未消化ストックは払い出しに計上しない。',games:'ボーナス・準備・CZ・特化を含む実ゲーム数。0G連はゲーム数に含めない。',initial:'各試行は設定固定・リセット開始。標準抽選、ナビ成功を前提とするシミュレーション。',confidence:'RTPは試行単位の比率の標準誤差から計算した95%区間。勝率・到達率はWilson区間。モデル誤差は含まない。',selection:'承認済み候補の評価に使ったシードを全件再実行した再現確認。新しい独立ホールドアウト試験ではない。'},
  changes:{weakAtZone:{before:{low:.30,high:.50},after:{low:.15,high:.25}},czEntryMultipliers:[.56,.701,.645,.81,.78,.81]},
  replay:{matched:done,seconds:(Date.now()-started)/1000,referenceRowsSha256:hash(prefix+'-rows.json.gz')},sourceHashes:hashes,settings};
 fs.writeFileSync(prefix+'.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({verified:done,totalActualGames:report.totalActualGames,summary:settings.map(s=>({setting:s.setting,rtp:s.stopped.rtp*100,win:s.stopped.winRate*100,reach:s.reach*100}))},null,2));
}
