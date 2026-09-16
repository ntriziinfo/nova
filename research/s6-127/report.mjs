import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {summarize} from '../burst113/trial.mjs';

const baseline='8d95cfff19f69a2348572650d7c2ae04ff0e5d0f';
const pct=n=>(100*n).toFixed(2)+'%',nfmt=n=>Math.round(n).toLocaleString('en-US');
const hash=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
// Only these display metadata may change after measuring the production rules.
const balanceRules=s=>s.replace(/\/\/[^\n]*/g,'').replace(/const targets=\[[^\]]+\];/,'const targets=[];').replace(/verifiedModel:[^\n}]*previousVerifiedModel:[^\n}]*}/,'verifiedModel:null}').replace(/\s+/g,'');
const jobs=JSON.parse(fs.readFileSync('research/s6-127/verify.json'));
const samples=jobs.map(job=>{
 const data=JSON.parse(fs.readFileSync(`research/s6-127/${job.tag}-${job.setting}.json`));
 assert.equal(data.rows.length,job.trials);
 assert.equal(data.report.seedBase,job.seedBase);
 for(const f of ['nova-art.js','nova-balance.js','nova-normal.js','nova-flow.js']){
  const current=fs.readFileSync(f,'utf8');
  if(hash(current)===data.report.canonicalSourceHashes[f])continue;
  assert.equal(f,'nova-balance.js','Measured gameplay source changed: '+f);
  const measured=execFileSync('git',['show',`${baseline}:${f}`],{encoding:'utf8',windowsHide:true});
  assert.equal(hash(measured),data.report.canonicalSourceHashes[f]);
  assert.equal(balanceRules(current),balanceRules(measured),'Only display estimates may change after measurement');
 }
 return data;
});
const rows=samples.flatMap(s=>s.rows);
assert.equal(new Set(rows.map(r=>r.seed)).size,rows.length);
assert(rows.every(r=>r.games<=30000&&r.net===r.totalPaid-r.totalBet));
const r=summarize(rows,{tag:'s6-127-holdout',setting:6,seedBases:jobs.map(j=>j.seedBase)});
const episodes=rows.flatMap(r=>r.atEpisodes),done=episodes.filter(e=>!e.censored),paid=done.map(e=>e.paid).sort((a,b)=>a-b);
const mean=done.reduce((n,e)=>n+e.paid,0)/done.length;
const cluster=rows.map(r=>{const e=r.atEpisodes.filter(e=>!e.censored);return {count:e.length,paid:e.reduce((n,e)=>n+e.paid,0)};});
const se=Math.sqrt(cluster.reduce((n,x)=>n+(x.paid-mean*x.count)**2,0)/(rows.length-1)/rows.length)/(done.length/rows.length);
const bins=[[0,500],[500,1000],[1000,2000],[2000,3000],[3000,4000],[4000,10000],[10000,Infinity]];
r.episodes={completed:done.length,censored:episodes.length-done.length,mean,meanCI:[mean-1.96*se,mean+1.96*se],median:paid[Math.floor(paid.length/2)]};
r.distribution=bins.map(([lo,hi])=>({lo,hi:Number.isFinite(hi)?hi:null,count:done.filter(e=>e.paid>=lo&&e.paid<hi).length,rate:done.filter(e=>e.paid>=lo&&e.paid<hi).length/done.length}));
r.win=rows.filter(r=>r.net>0).length/rows.length;
r.atFirstDenom=r.games/r.atEntries;r.normalAtDenom=r.normalGames/r.atEntries;r.czNormalDenom=r.normalGames/r.czEntries;
r.netMean=rows.reduce((n,r)=>n+r.net,0)/rows.length;
r.canonicalSourceHashes=samples[0].report.canonicalSourceHashes;
const previous=JSON.parse(fs.readFileSync('docs/start126-summary.json')).settings[5];
const parity=JSON.parse(fs.readFileSync('research/s6-127/parity.json'));
const summary={generatedAt:new Date().toISOString(),baseline,method:'Setting 6 production core; 3000 independent holdout trials, maximum 30000G, stop at cumulative net +10000pt. RTP=actual payouts/actual charged bets. Completed AT payout includes zones and 5G revival; unfinished AT is counted separately. RNG xoshiro128; seed=seedBase+6*100003+i*7919, i=0..999 per batch. Session-clustered 95% intervals for RTP and AT mean; Wilson interval for reach.',change:{setting:6,normalBoost:[.536,.584],unchangedSettings:[1,2,3,4,5],entryQuotaUnchanged:true,atPerformanceUnchanged:true},jobs,parity,previous,setting6:r};
fs.writeFileSync('docs/s6-127-summary.json',JSON.stringify(summary,null,2)+'\n');
const lines=['# 設定6の機械割114%への調整（v127）','',
'設定6だけ通常時の当選補正を0.536から0.584へ変更。規定Gゾーンの当選・天国移行・CZ開始時の突破抽選を軽くする。設定1～5、AT初期枠の振り分け、AT中の小役・上乗せ・特化ゾーン・裏ゾーン獲得チャレンジは変更しない。ATレベル・直接pt報酬チャレンジは廃止したまま。','',
'通常CZの開始時突破抽選は61.44%→63.36%、強CZは80.72%→81.68%。これはレア役での書き換え等を含む最終実測突破率とは別。初期枠は150pt=93%、500pt=2%、1,000pt=1%、2,000pt=4%で共通。','',
'## 検証結果','',
'各台最大30,000G、累計差枚＋10,000ptでコンプリート停止。変更後は調整用試行とは別の3,000台、変更前はv126の1,000台。機械割は実際の払い出し÷実際の投入で、未消化の残りptを払い出しへ加算しない。','',
'|指標|変更前|変更後|変更後95%区間|','|---|---:|---:|---:|',
`|機械割|${pct(previous.rtp.value)}|${pct(r.rtp.value)}|${r.rtp.ci.map(pct).join('～')}|`,
`|AT1回の平均総払い出し|${previous.episodes.mean.toFixed(1)}pt|${mean.toFixed(1)}pt|${r.episodes.meanCI.map(x=>x.toFixed(1)).join('～')}pt|`,
`|累計差枚＋10,000pt到達率|${pct(previous.completeRate)}|${pct(r.completeRate)}|${r.completeCI.map(pct).join('～')}|`,
`|勝率|${pct(previous.win)}|${pct(r.win)}|—|`,
`|AT初当たり（全消化G分母）|1/${previous.atFirstDenom.toFixed(1)}|1/${r.atFirstDenom.toFixed(1)}|—|`,
`|CZ（通常G分母）|1/${previous.czNormalDenom.toFixed(1)}|1/${r.czNormalDenom.toFixed(1)}|—|`,'',
`実消化${nfmt(r.games)}G、終了AT ${nfmt(done.length)}件、途中AT ${nfmt(episodes.length-done.length)}件。平均払い出し・以下の分布は終了ATで集計し、＋10,000pt到達は試打全体の累計差枚で集計する。両者の分母は異なる。`,'',
'|AT総払い出し|割合|','|---|---:|',
...r.distribution.map(b=>`|${b.hi==null?b.lo.toLocaleString('en-US')+'pt以上':b.lo.toLocaleString('en-US')+'～'+(b.hi-1).toLocaleString('en-US')+'pt'}|${pct(b.rate)}|`),'',
`114%を優先して初当たりを軽くしたため、累計＋10,000pt到達率は${pct(previous.completeRate)}から${pct(r.completeRate)}へ増加。以前の20%目標を同時に満たしたという意味ではない。AT1回の平均約500ptは維持する。これはコンプリート停止を含むシミュレーター試算であり、検定値や厳密な理論値ではない。`,'',
'## 再現と確認','',
'- `node research/s6-127/run.mjs research/s6-127/verify.json`：3,000台の本番コア試算。全バッチのseedを重複チェック。','- `node research/s6-127/check-parity.mjs`：設定1～5は旧版と同一seed・最大30,000Gの全結果一致。設定6は計算キャッシュ有無の全結果一致。','- `node research/s6-127/report.mjs`：集計。本番抽選ソースのSHA256を照合し、計測後の機械割表示値・証跡名の更新だけを許容する。','- 試算後は設定6の表示値を実測値に更新する。設定1～5はv126の実測値を維持。','',
'ATの初期枠抽選・セーブ互換の詳細は [v126](start126-report.md) を参照。'];
fs.writeFileSync('docs/s6-127-report.md',lines.join('\n')+'\n');
console.log(JSON.stringify({s:6,rtp:r.rtp,at:r.episodes,reach:r.completeRate,reachCI:r.completeCI,win:r.win,atFirst:r.atFirstDenom,cz:r.czNormalDenom,games:r.games}));
