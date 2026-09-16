import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {loadModel} from '../burst112/production-model.mjs';
import {summarize} from '../burst113/trial.mjs';
const baseline='3e99d5f56377a6cb961de0a520e16b8ea0e72173';
const pct=n=>(100*n).toFixed(2)+'%',fmt=n=>Math.round(n).toLocaleString('en-US');
const mean=(rows,key)=>rows.reduce((n,r)=>n+r[key],0)/rows.length;
const hash=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const balanceRules=s=>s.replace(/\/\/[^\n]*/g,'').replace(/const targets=\[[^\]]+\];/,'const targets=[];').replace(/verifiedModel:[^\n}]*previousVerifiedModel:[^\n}]*}/,'verifiedModel:null}').replace(/\s+/g,'');
const jobs=JSON.parse(fs.readFileSync('research/role128/verify.json'));
const samples=jobs.map(job=>{
 const data=JSON.parse(fs.readFileSync(`research/role128/${job.tag}-${job.setting}.json`));
 assert.equal(data.rows.length,job.trials);assert.equal(data.report.seedBase,job.seedBase);
 for(const f of ['nova-art.js','nova-balance.js','nova-normal.js','nova-flow.js']){
  const current=fs.readFileSync(f,'utf8');
  if(hash(current)===data.report.canonicalSourceHashes[f])continue;
  assert.equal(f,'nova-balance.js','Measured gameplay changed: '+f);
  const measured=execFileSync('git',['show',`${baseline}:${f}`],{encoding:'utf8',windowsHide:true});
  assert.equal(hash(measured),data.report.canonicalSourceHashes[f]);
  assert.equal(balanceRules(current),balanceRules(measured),'Only display estimates may change after measurement');
 }
 return data;
});
const allRows=samples.flatMap(s=>s.rows);
assert.equal(new Set(allRows.map(r=>r.seed)).size,allRows.length);
assert(allRows.every(r=>r.games<=30000&&r.net===r.totalPaid-r.totalBet));
loadModel();
const prior=JSON.parse(fs.readFileSync('docs/start126-summary.json')).settings;
prior[5]=JSON.parse(fs.readFileSync('docs/s6-127-summary.json')).setting6;
const priorMetrics=JSON.parse(fs.readFileSync('research/role128/previous-metrics.json')).settings;
const settings=[1,2,3,4,5,6].map(setting=>{
 const rows=allRows.filter(r=>r.setting===setting),r=summarize(rows,{tag:'role128-holdout'});
 assert(rows.every(r=>r.counts.gameCzEntries===0&&r.counts.backgroundCzEntries===0&&r.initialMode==='通常'));
 const episodes=rows.flatMap(r=>r.atEpisodes),done=episodes.filter(e=>!e.censored),values=done.map(e=>e.paid).sort((a,b)=>a-b),average=mean(done,'paid');
 const cluster=rows.map(r=>{const es=r.atEpisodes.filter(e=>!e.censored);return {count:es.length,paid:es.reduce((n,e)=>n+e.paid,0)};});
 const se=Math.sqrt(cluster.reduce((n,x)=>n+(x.paid-average*x.count)**2,0)/(rows.length-1)/rows.length)/(done.length/rows.length);
 const bins=[[0,500],[500,800],[800,1000],[1000,1500],[1500,2000],[2000,3000],[3000,4000],[4000,10000],[10000,Infinity]];
 r.episodes={completed:done.length,censored:episodes.length-done.length,mean:average,netMean:mean(done,'net'),meanCI:[average-1.96*se,average+1.96*se],median:values[Math.floor(values.length/2)],mid:done.filter(e=>e.paid>=800&&e.paid<1500).length/done.length};
 r.distribution=bins.map(([lo,hi])=>{const count=done.filter(e=>e.paid>=lo&&e.paid<hi).length;return {lo,hi:Number.isFinite(hi)?hi:null,count,rate:count/done.length};});
 assert.equal(r.distribution.reduce((n,b)=>n+b.count,0),done.length);
 r.win=rows.filter(r=>r.net>0).length/rows.length;r.netMean=mean(rows,'net');
 r.atFirstDenom=r.games/r.atEntries;r.normalAtDenom=r.normalGames/r.atEntries;r.czNormalDenom=r.normalGames/r.czEntries;
 r.czSuccess=rows.reduce((n,r)=>n+r.counts.czWins,0)/r.czEntries;
 r.czSources=Object.fromEntries(['rareCzEntries','ceilingCzEntries','gameCzEntries','backgroundCzEntries'].map(k=>[k,rows.reduce((n,r)=>n+r.counts[k],0)]));
 r.meanMaxDrawdown=mean(rows,'maxDrawdown');r.prior={rtp:prior[setting-1].rtp.value,mean:prior[setting-1].episodes.mean,netMean:priorMetrics[setting-1].netMean,normalAtDenom:prior[setting-1].normalAtDenom,atFirstDenom:prior[setting-1].atFirstDenom,meanMaxDrawdown:priorMetrics[setting-1].meanMaxDrawdown,reach:prior[setting-1].completeRate};
 const edges=[-Infinity,-10000,-5000,0,2000,5000,10000,Infinity];r.netDistribution=edges.slice(0,-1).map((lo,i)=>({lo:Number.isFinite(lo)?lo:null,hi:Number.isFinite(edges[i+1])?edges[i+1]:null,count:rows.filter(r=>r.net>=lo&&r.net<edges[i+1]).length}));
 r.canonicalSourceHashes=samples[0].report.canonicalSourceHashes;
 return r;
});
const normalLottery={...NovaNormal.lotteryRules,rates:[1,2,3,4,5,6].map(setting=>({setting,cz:NovaFlow.forSetting({},setting),roles:Object.fromEntries(Object.keys(NovaNormal.rare).map(role=>[role,{low:NovaNormal.roleCzRate({},role,setting),high:NovaNormal.roleCzRate({level:'high'},role,setting)}]))}))};
const summary={generatedAt:new Date().toISOString(),baseline,method:'Production core; 1000 independent holdout sessions for each S1-5, 3000 for S6. Maximum 30000G each, stop at cumulative net +10000pt. RTP=actual payouts/actual charged bets. Unspent quota is not payout. AT gross/net means and distributions use completed AT episodes including zones and 5G revival; censored episodes counted separately. RNG xoshiro128; seed=seedBase+setting*100003+i*7919 (i=0..999). Session-clustered 95% intervals for RTP and AT gross mean; Wilson reach interval.',jobs,entry:{values:[500,750,1000],weights:[25,50,25],mean:750},normalLottery,qa:JSON.parse(fs.readFileSync('research/role128/qa.json')),tests:JSON.parse(fs.readFileSync('research/role128/test-results.json')),parity:JSON.parse(fs.readFileSync('research/role128/parity.json')),settings};
fs.writeFileSync('docs/role128-summary.json',JSON.stringify(summary,null,2)+'\n');
const lines=['# 小役CZ抽選とまとまったAT払い出し（v128）','',
'通常A/B/C・チャンス・天国準備・天国・設定変更時の特殊モードを撤廃。規定GのCZ抽選、ガセ前兆、モード示唆、AT駆け抜け後のB以上移行も終了。通常時は全レア小役でCZを抽選する。低確／高確は残し、スイカ・チャンス目で高確を抽選、高確中のCZ当選率は低確の2倍。強ノヴァは強CZ確定。通常スーパーノヴァ目・フリーズと穢れ救済は維持する。','',
'朝一を含め天井は共通800G＋前兆3～8G。恩恵はBIG／突破確定の強CZを各50%。進行中のCZは先に解決し、当選済みの旧前兆も引き継ぐ。小役抽選だけに絞るのは通常CZの入口であり、天井・プレミア当選は残す。','',
'AT初当たり時に初期枠500pt＝25%、750pt＝50%、1,000pt＝25%を1回抽選する（平均750pt）。上乗せは別途加算し、上限は設けない。平均払い出しの目標は1,000～1,200ptへ変更。ATレベルは廃止したまま。BIG50pt・追加SET150pt・AT小役・特化性能・裏ゾーン獲得チャレンジ・5G引き戻しの抽選は維持。獲得済み残りpt・旧SET単価・ストック・予約特化は保持する。','',
'## 30,000G試算','',
'設定1～5は各1,000台、設定6は3,000台。すべて調整用試行と別の乱数seed。各台最大30,000Gで累計差枚＋10,000ptに到達すると停止するため、到達台の消化Gは30,000G未満。未消化の残りptは機械割へ加算しない。','',
'|設定|機械割（95%区間）|AT平均総払い出し（95%区間）|AT800～1,499pt|累計＋1万pt到達率|勝率|','|---|---:|---:|---:|---:|---:|',
...settings.map(s=>`|${s.setting}|${pct(s.rtp.value)} (${s.rtp.ci.map(pct).join('～')})|${s.episodes.mean.toFixed(1)}pt (${s.episodes.meanCI.map(x=>x.toFixed(1)).join('～')})|${pct(s.episodes.mid)}|${pct(s.completeRate)}|${pct(s.win)}|`),'',
'AT平均は投入を引く前の総払い出し。AT分布の分母は終了AT件数、累計＋1万pt到達率と勝率の分母は試打台数。設定6の114%目標を優先した調整で、以前の「＋1万pt到達20%」を同時に満たしたという意味ではない。','',
'|設定|AT初当たり（全消化G分母）旧→新|通常G÷AT初当たり件数 旧→新|CZ（通常G分母）|CZ実測突破率|終了AT／途中AT|実消化G|','|---|---:|---:|---:|---:|---:|---:|',
...settings.map(s=>`|${s.setting}|1/${s.prior.atFirstDenom.toFixed(1)} → 1/${s.atFirstDenom.toFixed(1)}|${s.prior.normalAtDenom.toFixed(1)}G → ${s.normalAtDenom.toFixed(1)}G|1/${s.czNormalDenom.toFixed(1)}|${pct(s.czSuccess)}|${fmt(s.episodes.completed)}／${fmt(s.episodes.censored)}|${fmt(s.games)}|`),'',
'「通常G÷AT初当たり件数」は、CZやボーナス中を除いた通常滞在の集計値。1回の連続ハマリの期待値ではない。','',
'## 大きな上下に向けた変化','',
'|設定|AT平均総払い出し 旧→新|AT平均差枚 旧→新|1台の最大下落幅の平均 旧→新|','|---|---:|---:|---:|',
...settings.map(s=>`|${s.setting}|${fmt(s.prior.mean)} → ${fmt(s.episodes.mean)}pt|${fmt(s.prior.netMean)} → ${fmt(s.episodes.netMean)}pt|${fmt(s.prior.meanMaxDrawdown)} → ${fmt(s.meanMaxDrawdown)}pt|`),'',
'最大下落幅は試打中の累計差枚の過去最高点からその後の底まで。変更前後は独立試行であり、同一台の未来予測ではない。抽選間隔が広がりAT1回の戻りが増えるが、早い当たりや小さな上下がなくなる仕様ではない。','',
'## AT払い出し分布（終了AT）','',
'|設定|500未満|500～799|800～999|1,000～1,499|1,500～1,999|2,000～2,999|3,000～3,999|4,000～9,999|10,000以上|','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
...settings.map(s=>`|${s.setting}|${s.distribution.map(b=>pct(b.rate)).join('|')}|`),'',
'## 通常時の抽選率','',
'各小役成立時のCZ当選率。スイカ・チャンス目の高確昇格抽選とCZ抽選は別々で、CZは成立前の内部状態を使う。','',
'|設定|弱スイカ 低／高|強スイカ 低／高|チャンス目A/B 低／高|弱ノヴァ 低／高|強ノヴァ|CZ開始時成功抽選|','|---|---:|---:|---:|---:|---:|---:|',
...normalLottery.rates.map(r=>`|${r.setting}|${['WEAK_SUICA','STRONG_SUICA','CHANCE_A','WEAK_NOVA'].map(k=>pct(r.roles[k].low)+'／'+pct(r.roles[k].high)).join('|')}|100%（強CZ）|${pct(r.cz.czChance)}|`),'',
'強ノヴァによる強CZは低確で成功85%、高確で100%。天井CZは100%。CZ中のレア役書き換えを含む実測突破率は上表の開始時抽選率とは異なる。通常ベースは33.5G/50ptで維持。','',
'## 確認と再現','',
'- `node research/role128/run.mjs research/role128/verify.json`：本番コアで計測。8,000台のseed重複なし。全台で規定GのCZと旧背景CZが0件であることを確認。','- `node research/role128/check-parity.mjs`：小役・ランプ配分の計算キャッシュ有無で、設定1・6の同一seed全結果が一致。乱数呼出しは変えない。','- `node research/role128/report.mjs`：集計・ソースSHA256照合。計測後は機械割表示値・証跡メタデータだけ更新可能。','- 無音の隔離ブラウザーで手動・AUTO・高速試打、旧セーブの移行、50GでCZが発生しないこと、800G天井、裏チャレンジを確認。ページ例外なし。','',
'変更箇所に関係する73テストは全件成功。全体293テストは248成功・45失敗で、失敗名はすべて以前の全体テストにも存在する。新仕様に伴う古い期待値・初期150pt固定のゾーン試験用データは更新済み。全体テストが成功したとは扱わない。HTML構文・アセット参照・Vercel設定のチェックは成功。','',
'これは実装したシミュレーターの試算であり、検定値や厳密な理論値ではない。変更前は設定1～5がv126、設定6がv127。'];
fs.writeFileSync('docs/role128-report.md',lines.join('\n')+'\n');
console.log(JSON.stringify(settings.map(s=>({s:s.setting,rtp:s.rtp,mean:s.episodes.mean,mid:s.episodes.mid,reach:s.completeRate,win:s.win,normalPerAt:s.normalAtDenom,oldNormal:s.prior.normalAtDenom,dd:s.meanMaxDrawdown,oldDD:s.prior.meanMaxDrawdown}))));
