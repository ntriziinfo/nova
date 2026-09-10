import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadModel} from '../burst112/production-model.mjs';
import {distribution} from '../burst113/distribution.mjs';
loadModel();
const manifest=JSON.parse(fs.readFileSync('research/comeback116/selected-data.json'));
const reachTargets=[.02,.04,.06,.10,.15,.20];
const settings=manifest.jobs.map(({setting,file,manifest:sourceManifest})=>{
 const d=JSON.parse(fs.readFileSync(file)),source=JSON.parse(fs.readFileSync(sourceManifest));
 assert.equal(d.rows.length,1000);assert.equal(d.report.games,30000000);
 assert.deepEqual(d.report.sourceHashes,source.sourceHashes);
 assert.deepEqual(d.report.weights,NovaArt.atLevelRules.weights[setting-1]);
 const {values:sv,...stopped}=distribution(d.rows,true),{values:uv,...unlimited}=distribution(d.rows,false);
 const perGame=Object.entries(NovaArt.comebackRoleProbabilities(setting)).reduce((n,[role,p])=>n+p*NovaArt.comebackChance(role,setting),0);
 return {setting,sourceFile:file,sourceManifest,sourceCommit:source.commit,reachTarget:reachTargets[setting-1],report:d.report,stopped,unlimited,comebackTheory:1-(1-perGame)**5};
});
const parity=JSON.parse(fs.readFileSync('docs/comeback116-production-parity.json'));
assert.equal(parity.commit,manifest.commit);assert.equal(parity.complete,true);
const pilot=[1,2,3,4,5,6].map(setting=>{
 const d=JSON.parse(fs.readFileSync(`docs/comeback116-pilot-${setting}.json`));
 return {setting,trials:d.report.trials,weights:d.report.weights,stoppedRtp:d.report.stoppedRtp,completeRate:d.report.completeRate,completeCI:d.report.completeCI};
});
const rejected6=JSON.parse(fs.readFileSync('docs/comeback116-verify-6.json')).report;
const summary={version:116,commit:manifest.commit,generatedAt:new Date().toISOString(),measurement:{gamesPerTrial:30000,trialsPerSetting:1000,fullGames:180000000,rtp:'sum of actual payouts divided by sum of actual BET; replay makes next BET free',complete:'first net +10000pt or 30000G; full trajectories retain the stopped prefix',reset:'special mode and setting-dependent reset impurity at the start of every trial',operation:'model play, correct instructed stop order',seedFormula:'settings 1-5: 116900000 + setting * 100003 + trialIndex * 7919; setting 6: 117900000 + setting * 100003 + trialIndex * 7919',seedSelection:'each adopted candidate uses all 1000 prespecified independent verification seeds; pilot and rejected setting-6 candidate excluded and retained separately'},sourceHashes:manifest.sourceHashes,verification:parity,pilot,rejectedSetting6:{trials:rejected6.trials,weights:rejected6.weights,stoppedRtp:rejected6.stoppedRtp,completeRate:rejected6.completeRate,completeCI:rejected6.completeCI},settings};
fs.writeFileSync('docs/comeback116-summary.json',JSON.stringify(summary,null,2)+'\n');
const old=JSON.parse(fs.readFileSync('docs/comeback115-summary.json')).settings;
const pct=x=>(x*100).toFixed(2)+'%',ci=x=>x.map(pct).join('〜'),signed=x=>(x>=0?'+':'')+Math.round(x).toLocaleString('en-US');
let md='# 引き戻し100%を維持したATレベル振り分け調整（v116）\n\n';
md+='引き戻し5G中のレア役は復活100%のまま、AT初当たり時のLv.3振り分けをLv.1・Lv.2へ移した。通常ATの伸びを抑え、30,000G以内の差枚＋10,000pt到達率を設定1〜6で約2%・4%・6%・10%・15%・20%へ近づける調整。\n\n';
md+='初期AT150pt、CZ・AT初当たり抽選、各レベルの小役確率と上乗せ性能、特化ゾーン性能、爆発チャレンジの突入抽選・成功50%・成功時2000pt＋Lv.5は変更していない。差枚抑制や2000pt上限は設けない。フリーズを爆発チャレンジに置き換える案も採用していない。既に始まっているATのレベルは維持し、新たなAT初当たりから新しい振り分けを使う。\n\n';
md+='## AT初当たり時の振り分け\n\nLv.4・5の初期選択は0%。爆発成功でLv.5へ昇格する仕様は継続。\n\n|設定|Lv.1|Lv.2|Lv.3|Lv.3を下げた量|\n|---|---:|---:|---:|---:|\n';
for(const s of settings){const w=s.report.weights;md+=`|${s.setting}|${w[0]}%|${w[1]}%|${w[2]}%|${s.setting<=4?12:s.setting===5?14:24}ポイント|\n`;}
md+='\n## 計算条件\n\n全設定30,000G×1,000回、計1億8,000万G。各試行は設定変更直後の特殊モードと設定別の初期穢れから開始。乱数はxoshiro128。各300回の予備試算後、設定5・6のLv.3振り分けをさらに調整し、別シードの確認試算を開始する前に候補を固定した。初回確認で設定6の到達率が24.7%だったため、設定6のみ振り分けを設定5と同じに変更し、新たな別シードで30,000G×1,000回を再確認した。各候補の確認中は条件を固定。最終集計は設定1〜5の初回確認と設定6の再確認の全試行を使用し、予備試算と不採用になった設定6の初回確認を混ぜていない。採用分は計1億8,000万G、追加の確認試算は3,000万G、予備試算は5,400万G。\n\n機械割＝全試行の総払い出し÷総実BET×100。リプレイの次BETは無料として計算し、各試行の機械割を単純平均していない。ナビに従うモデル上の操作を前提とする。\n\n本体条件は差枚＋10,000ptでコンプリート停止、未到達なら30,000Gで終了。停止なしは比較用に全試行を30,000Gまで続けた値。到達率は途中で一度でも差枚＋10,000ptに達した割合で、払い出し累計10,000ptではない。95%区間は機械割が試行単位の比率推定、到達率・勝率がWilson区間。有限期間のシミュレーション推定値であり、無限期間の定常機械割や型式試験への適合を示す値ではない。\n\n';
md+='## 全設定の結果\n\n|設定|機械割・停止あり|95%区間|機械割・停止なし|到達率の目安|＋10,000pt到達率|到達率95%区間|勝率・停止あり|平均差枚・停止あり|\n|---|---:|---|---:|---:|---:|---|---:|---:|\n';
for(const r of settings)md+=`|${r.setting}|${pct(r.report.stoppedRtp.value)}|${ci(r.report.stoppedRtp.ci)}|${pct(r.report.rtp.value)}|${pct(r.reachTarget)}|${pct(r.report.completeRate)}|${ci(r.report.completeCI)}|${pct(r.stopped.winRate)}|${signed(r.stopped.mean)}pt|\n`;
md+='\n停止なし機械割の95%区間、差枚の分位点・分布・勝率の区間は `docs/comeback116-summary.json` に収録。\n\n';
md+='## v115からの変化\n\n両方とも各設定30,000G×1,000回。異なるシードであり、差には標本誤差を含む。\n\n|設定|変更前の機械割・停止あり|今回|変更前の到達率|今回の到達率|\n|---|---:|---:|---:|---:|\n';
for(const r of settings){const o=old[r.setting-1].report;md+=`|${r.setting}|${pct(o.stoppedRtp.value)}|${pct(r.report.stoppedRtp.value)}|${pct(o.completeRate)}|${pct(r.report.completeRate)}|\n`;}
md+='\n## 引き戻し・爆発の実測\n\n実測回数はコンプリート後も含む全30,000Gの集計。試行終了時に未消化の5Gも突入回数へ含まれる。全レア役について成立回数と復活回数の一致を確認。爆発成功率の仕様値は全設定50%。\n\n|設定|5G復活率・理論|5G復活率・実測|爆発突入回数|爆発成功回数|爆発成功率・実測|\n|---|---:|---:|---:|---:|---:|\n';
for(const r of settings){const c=r.report.comeback;md+=`|${r.setting}|${pct(r.comebackTheory)}|${pct(c.wins/c.entries)}|${r.report.burstAttempts}|${r.report.burstWins}|${pct(r.report.burstWins/r.report.burstAttempts)}|\n`;}
md+='\n## 再現と検証\n\n- 計算元コミット：`'+manifest.commit+'`。実行中に本体ソースが変わっていないことをハッシュで照合。\n- 実行：`node research/comeback116/run.mjs research/comeback116/verify.json` と `node research/comeback116/run.mjs research/comeback116/confirm6.json`。各manifestの計算元コミットで実行する。レポート：`node research/comeback116/report.mjs`。\n- 採用データとソースハッシュ：`research/comeback116/selected-data.json` およびそこから参照する各manifest。採用試行：`docs/comeback116-verify-1.json`〜`docs/comeback116-verify-5.json`、`docs/comeback116-confirm6-6.json`（大容量のためローカル保存）。\n- 集計：`docs/comeback116-summary.json`。予備試算と不採用になった設定6の初回確認も分けて収録。\n- キャッシュ最適化なしの本体コアとの照合：`node research/comeback116/verify-production.mjs`。\n';
md+='\n全6設定の計'+parity.reports.reduce((n,r)=>n+r.trials,0)+'試行・'+parity.reports.reduce((n,r)=>n+r.games,0).toLocaleString('en-US')+'Gをキャッシュ最適化なしで再計算し、BET・払い出し・特化・引き戻し・爆発・到達時点の収支が一致。さらに各設定1試行を実際に＋10,000ptで打ち切り、保存した停止時点の値と一致することを確認した。\n';
fs.writeFileSync('docs/comeback116-rtp-report.md',md);
console.log(JSON.stringify(settings.map(r=>({setting:r.setting,stoppedRtp:r.report.stoppedRtp.value,stoppedCI:r.report.stoppedRtp.ci,unlimitedRtp:r.report.rtp.value,reach:r.report.completeRate,reachCI:r.report.completeCI,win:r.stopped.winRate,net:r.stopped.mean})),null,2));
