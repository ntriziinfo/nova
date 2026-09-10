import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadModel} from '../burst112/production-model.mjs';
import {distribution} from '../burst113/distribution.mjs';
loadModel();
const manifest=JSON.parse(fs.readFileSync('research/comeback115/manifest.json'));
const settings=manifest.sources.map(({setting,file})=>{
 const d=JSON.parse(fs.readFileSync(file));
 assert.equal(d.rows.length,1000);assert.equal(d.report.games,30000000);
 assert.deepEqual(d.report.sourceHashes,manifest.sourceHashes);
 const {values:sv,...stopped}=distribution(d.rows,true),{values:uv,...unlimited}=distribution(d.rows,false);
 const perGame=Object.entries(NovaArt.comebackRoleProbabilities(setting)).reduce((n,[role,p])=>n+p*NovaArt.comebackChance(role,setting),0);
 return {setting,sourceFile:file,report:d.report,stopped,unlimited,comebackTheory:1-(1-perGame)**5};
});
const parity=JSON.parse(fs.readFileSync('docs/comeback115-production-parity.json'));
assert.equal(parity.commit,manifest.commit);assert.equal(parity.complete,true);
const summary={version:115,commit:manifest.commit,generatedAt:new Date().toISOString(),measurement:{gamesPerTrial:30000,trialsPerSetting:1000,fullGames:180000000,rtp:'sum of actual payouts divided by sum of actual BET; replay makes next BET free',complete:'first net +10000pt or 30000G; full trajectories retain the stopped prefix',reset:'special mode and setting-dependent reset impurity at the start of every trial',operation:'model play, correct instructed stop order',seedBase:manifest.seedBase,seedSelection:'all prespecified 1000 seeds per setting; no tuning or selection after outcomes'},sourceHashes:manifest.sourceHashes,verification:parity,settings};
fs.writeFileSync('docs/comeback115-summary.json',JSON.stringify(summary,null,2)+'\n');
const old=JSON.parse(fs.readFileSync('docs/comeback114-summary.json')).settings;
const pct=x=>(x*100).toFixed(2)+'%',ci=x=>x.map(pct).join('〜'),signed=x=>(x>=0?'+':'')+Math.round(x).toLocaleString('en-US');
let md='# 全レア役で引き戻し確定：機械割の再試算（v115）\n\n';
md+='引き戻し5G中の全レア役を復活100%に変更した現行コードで計算。初期AT150pt、特化ゾーン性能、爆発チャレンジの突入抽選・成功50%・成功時2000pt＋Lv.5は変更していない。フリーズを爆発チャレンジに置き換える案は採用していない。\n\n';
md+='## 計算条件\n\n全設定30,000G×1,000回、計1億8,000万G。各試行は設定変更直後の特殊モードと設定別の初期穢れから開始。乱数はxoshiro128で、結果を見る前に全シードを固定し、途中調整・結果の選別はしていない。\n\n機械割＝全試行の総払い出し÷総実BET×100。リプレイの次BETは無料として計算し、各試行の機械割を単純平均していない。ナビに従うモデル上の操作を前提とする。\n\n本体条件は差枚＋10,000ptでコンプリート停止、未到達なら30,000Gで終了。停止なしは比較用に全試行を30,000Gまで続けた値。到達率は途中で一度でも差枚＋10,000ptに達した割合で、払い出し累計10,000ptではない。95%区間は機械割が試行単位の比率推定、到達率・勝率がWilson区間。有限期間のシミュレーション推定値であり、無限期間の定常機械割や型式試験の適合を示す値ではない。\n\n';
md+='## 全設定の結果\n\n|設定|機械割・停止あり|95%区間|機械割・停止なし|95%区間|＋10,000pt到達率|到達率95%区間|勝率・停止あり|平均差枚・停止あり|\n|---|---:|---|---:|---|---:|---|---:|---:|\n';
for(const r of settings)md+=`|${r.setting}|${pct(r.report.stoppedRtp.value)}|${ci(r.report.stoppedRtp.ci)}|${pct(r.report.rtp.value)}|${ci(r.report.rtp.ci)}|${pct(r.report.completeRate)}|${ci(r.report.completeCI)}|${pct(r.stopped.winRate)}|${signed(r.stopped.mean)}pt|\n`;
md+='\n## 前回との比較\n\n両方とも各設定30,000G×1,000回。異なるシードであり、差には標本誤差を含む。\n\n|設定|変更前の機械割・停止あり|今回|差（ポイント）|変更前の到達率|今回の到達率|\n|---|---:|---:|---:|---:|---:|\n';
for(const r of settings){const o=old[r.setting-1].report,delta=100*(r.report.stoppedRtp.value-o.stoppedRtp.value);md+=`|${r.setting}|${pct(o.stoppedRtp.value)}|${pct(r.report.stoppedRtp.value)}|${delta>=0?'+':''}${delta.toFixed(2)}|${pct(o.completeRate)}|${pct(r.report.completeRate)}|\n`;}
md+='\n## 引き戻し実測\n\n実測回数はコンプリート後も含む全30,000Gの集計。試行終了時に未消化の5Gは突入回数へ含まれる。全レア役について成立回数と復活回数の一致も確認。\n\n|設定|5G復活率・理論|実測|突入回数|復活回数|\n|---|---:|---:|---:|---:|\n';
for(const r of settings){const c=r.report.comeback;md+=`|${r.setting}|${pct(r.comebackTheory)}|${pct(c.wins/c.entries)}|${c.entries.toLocaleString('en-US')}|${c.wins.toLocaleString('en-US')}|\n`;}
md+='\n## 再現用データ\n\n- 計算元コミット：`'+manifest.commit+'`。実行中に本体ソースが変わっていないことをハッシュで照合。\n- 実行：`node research/comeback115/run.mjs`。レポート：`node research/comeback115/report.mjs`。\n- シードとソースハッシュ：`research/comeback115/manifest.json`。各試行：`docs/comeback115-run-1.json`〜`docs/comeback115-run-6.json`。\n- 集計：`docs/comeback115-summary.json`。前回：`docs/comeback114-summary.json`。\n- キャッシュ最適化なしの本体コアとの軌跡照合：`node research/comeback115/verify-production.mjs`。\n';
md+='\n全6設定の計'+parity.reports.reduce((n,r)=>n+r.trials,0)+'試行・'+parity.reports.reduce((n,r)=>n+r.games,0).toLocaleString('en-US')+'Gをキャッシュ最適化なしで再計算し、BET・払い出し・特化・引き戻し・爆発・到達時点の収支が一致。さらに各設定1試行を実際に＋10,000ptで打ち切り、保存した停止時点の値と一致することを確認した。\n';
fs.writeFileSync('docs/comeback115-rtp-report.md',md);
console.log(JSON.stringify(settings.map(r=>({setting:r.setting,stoppedRtp:r.report.stoppedRtp.value,stoppedCI:r.report.stoppedRtp.ci,unlimitedRtp:r.report.rtp.value,reach:r.report.completeRate,win:r.stopped.winRate,net:r.stopped.mean,recovery:r.report.comeback.wins/r.report.comeback.entries})),null,2));
