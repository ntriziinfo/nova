import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const pct=n=>(100*n).toFixed(2)+'%',nfmt=n=>Math.round(n).toLocaleString('en-US');
const previous=JSON.parse(fs.readFileSync('docs/common125-summary.json')).settings;
const hash=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const settings=[1,2,3,4,5,6].map(setting=>{
 const {report:r,rows}=JSON.parse(fs.readFileSync(`research/start126/verify-${setting}.json`));
 for(const f of ['nova-art.js','nova-balance.js','nova-normal.js','nova-flow.js']){
  let source=fs.readFileSync(f,'utf8');
  if(hash(source)!==r.canonicalSourceHashes[f]){
   if(f==='nova-art.js')source=source.replace('No persistent performance class. These rules apply to every AT.','No entry lottery or persistent performance class. These rules apply to every AT.');
   if(f==='nova-balance.js')source=source.replace('v126 measured estimates; full results are in docs/start126-report.md.','v126 RTP targets retained from v125; measured results are in docs/start126-report.md.').replace(/const targets=\[[^\]]+\];/,'const targets=[0.954392,0.972260,0.990637,1.032068,1.070743,1.092388];');
  }
  assert.equal(hash(source),r.canonicalSourceHashes[f],f);
 }
 assert.equal(rows.length,1000);assert(rows.every(r=>r.games<=30000&&r.net===r.totalPaid-r.totalBet));
 const done=rows.flatMap(r=>r.atEpisodes).filter(e=>!e.censored),v=done.map(e=>e.paid).sort((a,b)=>a-b);
 const cluster=rows.map(r=>{const e=r.atEpisodes.filter(e=>!e.censored);return {count:e.length,paid:e.reduce((s,e)=>s+e.paid,0)};});
 const mean=r.episodes.mean,avgCount=done.length/rows.length,se=Math.sqrt(cluster.reduce((s,x)=>s+(x.paid-mean*x.count)**2,0)/(rows.length-1)/rows.length)/avgCount;
 const bounds=[-Infinity,-10000,-5000,0,2000,5000,10000,Infinity],netDistribution=bounds.slice(0,-1).map((lo,i)=>({lo:Number.isFinite(lo)?lo:null,hi:Number.isFinite(bounds[i+1])?bounds[i+1]:null,count:rows.filter(r=>r.net>=lo&&r.net<bounds[i+1]).length}));
 assert.equal(netDistribution.reduce((n,b)=>n+b.count,0),rows.length);
 return {...r,meanCI:[mean-1.96*se,mean+1.96*se],median:v[Math.floor(v.length/2)],atFirstDenom:r.games/r.atEntries,normalAtDenom:r.normalGames/r.atEntries,czNormalDenom:r.normalGames/r.czEntries,netMean:rows.reduce((n,r)=>n+r.net,0)/rows.length,netDistribution,prior:{mean:previous[setting-1].episodes.mean,rtp:previous[setting-1].rtp.value,reach:previous[setting-1].completeRate,atFirstDenom:previous[setting-1].games/previous[setting-1].atEntries},rawFile:`research/start126/verify-${setting}.json`};
});
const qa=JSON.parse(fs.readFileSync('research/start126/qa.json')),parity=JSON.parse(fs.readFileSync('research/start126/parity.json'));
const summary={qa,parity,generatedAt:new Date().toISOString(),method:'Production core; 1000 independent trials per setting, maximum 30000G, stop at cumulative net +10000pt. RNG xoshiro128, seed=126600000+setting*100003+i*7919. AT means and bands use completed AT episodes only, revival remains the same AT. RTP=actual payouts/actual charged bets; unspent quota is not payout. Mean CI is clustered by independent session, reach CI is Wilson.',entry:{values:[150,500,1000,2000],weights:[93,2,1,4],mean:239.5},settings};
fs.writeFileSync('docs/start126-summary.json',JSON.stringify(summary,null,2)+'\n');
const lines=['# AT開始時の初期枠抽選・平均約500ptへの調整（v126）','',
'AT初当たり時に1回だけ初期枠を抽選する。150pt=93%、500pt=2%、1,000pt=1%、2,000pt=4%。初期枠の平均は239.5pt。選んだ枠を開始時から残りptへ反映し、上乗せ・特化ゾーン・引き戻しの払い出しを合わせたAT1回の平均を約500ptへ調整。500ptは平均の目標であり保証額・上限ではない。','',
'ATレベルは復活させない。小役確率・途中の抽選は初期枠に依存しない。途中の当選分は初期枠を超えて加算。BIGは50pt、追加SETは150pt。裏ゾーン獲得チャレンジ（3G・成功50%）と5G引き戻し（レア役100%復活）は維持。','',
'共通AT：直乗せ抽選倍率1.2→0.6、弱ノヴァ特化当選率は低確40%→17.5%、高確100%→52.5%。強ノヴァは特化確定。小役確率・特化ゾーン自体の報酬性能は維持。通常時の規定G当選・CZ突破・天国移行の補正を設定別に強化し、旧機械割へ近づけた。通常時33.5G/50ptは維持。','',
'開始時の抽選結果は履歴に記録。保存・復帰や5G引き戻しでの再抽選なし。更新前の獲得済み残りpt・追加SET単価・ストック・予約特化を保持する。','',
'## 検証条件','',
'各設定1,000台、最大30,000G／台。累計差枚＋10,000pt到達時に停止。平均AT払い出しは終了まで観測したATのみで集計し、途中ATは別途数える。AT払い出しは投入を引く前の総額、到達率はセッション累計差枚であり別指標。','',
'|設定|AT平均pt（95%区間）|機械割（95%区間）|累計＋1万pt到達（95%区間）|勝率|',
'|---|---:|---:|---:|---:|',
...settings.map(s=>`|${s.setting}|${s.episodes.mean.toFixed(1)} (${s.meanCI.map(x=>x.toFixed(1)).join('–')})|${pct(s.rtp.value)} (${s.rtp.ci.map(pct).join('–')})|${pct(s.completeRate)} (${s.completeCI.map(pct).join('–')})|${pct(s.win)}|`),'',
'|設定|AT初当たり（全消化G分母）旧→新|CZ（通常G分母）|実消化G|終了AT数|途中AT数|',
'|---|---:|---:|---:|---:|---:|',
...settings.map(s=>`|${s.setting}|1/${s.prior.atFirstDenom.toFixed(1)} → 1/${s.atFirstDenom.toFixed(1)}|1/${s.czNormalDenom.toFixed(1)}|${nfmt(s.games)}|${s.episodes.completed}|${s.episodes.censored}|`),'',
'## AT1回の払い出し分布（終了ATのみ）','',
'|設定|500未満|500～999|1,000～1,999|2,000～2,999|3,000～3,999|4,000～9,999|10,000以上|',
'|---|---:|---:|---:|---:|---:|---:|---:|',
...settings.map(s=>`|${s.setting}|${s.distribution.map(b=>pct(b.rate)).join('|')}|`),'',
'## 試打終了時の累計差枚分布','',
'|設定|−10,000未満|−10,000～−5,001|−5,000～−1|0～1,999|2,000～4,999|5,000～9,999|＋10,000到達|',
'|---|---:|---:|---:|---:|---:|---:|---:|',
...settings.map(s=>`|${s.setting}|${s.netDistribution.map(b=>pct(b.count/s.trials)).join('|')}|`),'',
'## 再現','',
'`node research/start126/run.mjs research/start126/verify.json` で再試算。`node research/start126/report.mjs` で集計。入力4コアのSHA256はJSONへ保存。計測では小役配分とCZランプ配分の純粋計算をキャッシュするが乱数呼出しは変えない。キャッシュ有無の同一シード全結果一致を設定1・6で確認する。','',
'画面・手動成功／失敗・AUTO・高速試打・旧セーブ復元を無音の隔離ブラウザーで確認。残りpt・旧SET単価・ストックを保持し、ページ例外なし。変更箇所に関係する38テスト成功。全体297テストは初回50失敗（47は既存失敗名、3は変更した仕様の古い期待値）。この3件は期待値・比較メタデータを更新して関連11テストで成功確認。全体成功とは扱わない。', '',
'計測後にnova-balance.jsの表示用推定値とコメントのみ更新。抽選値は変更せず、集計時は元の文字列を再構成して入力SHA256との一致を検証する。', '',
'これはシミュレーターの試算であり、各台の出玉や以前の累計＋1万pt率への完全一致を保証しない。'];
fs.writeFileSync('docs/start126-report.md',lines.join('\n')+'\n');
console.log(JSON.stringify(settings.map(s=>({s:s.setting,mean:s.episodes.mean,rtp:s.rtp.value,reach:s.completeRate,win:s.win,initial:s.atFirstDenom}))));
