import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadModel,simulate} from './zone-v2-model.mjs';
loadModel();
const pilot=JSON.parse(fs.readFileSync('data/bonus-stock146-pilot.json','utf8'));
const firstValidation=JSON.parse(fs.readFileSync('data/bonus-stock146-validation.json','utf8'));
const setting6Adjustment=JSON.parse(fs.readFileSync('data/bonus-stock146-validation-s6.json','utf8'));
const setting6Validation=JSON.parse(fs.readFileSync('data/bonus-stock146-validation-s6-final.json','utf8'));
assert.equal(firstValidation.gamesPerTrial,30000);assert.equal(firstValidation.trials,1024);
assert.equal(setting6Validation.gamesPerTrial,30000);assert.equal(setting6Validation.trials,2048);
const validation={gamesPerTrial:30000,summary:[...firstValidation.summary.filter(r=>r.setting!==6),...setting6Validation.summary]};
const percent=x=>(x*100).toFixed(2)+'%',delta=x=>(x>=0?'+':'')+(x*100).toFixed(2);
const rates=[1,2,3,4,5,6].map(setting=>({setting,factor:NovaArt.bonusStockFactor(setting),tiers:Object.fromEntries(['normal','upper'].map(tier=>{
 const before=NovaArt.bonusRoleProbabilities(setting,tier),after=NovaArt.bonusRoleProbabilities(setting,tier,true);
 return [tier,{beforePerGame:before.NEBULA,afterPerGame:after.NEBULA,afterDenominator:1/after.NEBULA,initialAtChance:NovaArt.bonusRules[tier].atChance}];
}))}));
const trialRows=JSON.parse(fs.readFileSync('data/bonus-stock146-validation-rows.json','utf8'));
trialRows.tuned[6]=JSON.parse(fs.readFileSync('data/bonus-stock146-validation-s6-final-rows.json','utf8')).tuned[6];
const productionParity=[];
for(let setting=1;setting<=6;setting++)for(const index of [0,Math.floor(trialRows.tuned[setting].length/2)-1,trialRows.tuned[setting].length-1]){
 const expected=trialRows.tuned[setting][index],r=simulate(setting,30000,expected.seed,{rng:'xoshiro128',exactGames:true,completeLimitPt:10000,stopAtComplete:false}),stop=r.firstComplete;
 const actual={seed:expected.seed,bet:stop?.totalBet??r.totalBet,paid:stop?.totalPaid??r.totalPaid,games:stop?.games??r.games,complete:!!stop,fullBet:r.totalBet,fullPaid:r.totalPaid};
 assert.deepEqual(actual,expected);productionParity.push({setting,seed:expected.seed,passed:true});
}
const finalSourceHashes=Object.fromEntries(['nova-art.js','nova-normal.js','nova-flow.js','nova-balance.js','jag.html'].map(f=>[f,createHash('sha256').update(fs.readFileSync(f,'utf8').replaceAll('\r\n','\n')).digest('hex')]));
const report={version:146,scope:'Preserve pre-zone-stock (v144) RTP by changing only bonus additional-stock odds',rates,pilot,firstValidation,setting6Adjustment,setting6Validation,validation,productionParity,finalSourceHashes};
fs.writeFileSync('docs/bonus-stock146-validation.json',JSON.stringify(report,null,2)+'\n');
const rows=validation.summary.map(row=>{
 const before=row.models.baseline.stopped,after=row.models.tuned.stopped,diff=row.comparisons.tuned.stopped;
 return `| ${row.setting} | ${percent(before.rtp)} | ${percent(after.rtp)} | ${delta(diff.delta)} | ${diff.ci95.map(delta).join(' ～ ')} |`;
});
const raw=pilot.summary.map(row=>`| ${row.setting} | ${percent(row.models.baseline.stopped.rtp)} | ${percent(row.models.unadjusted.stopped.rtp)} | ${delta(row.comparisons.unadjusted.stopped.delta)} |`);
const full=validation.summary.map(row=>`| ${row.setting} | ${percent(row.models.baseline.uncapped.rtp)} | ${percent(row.models.tuned.uncapped.rtp)} | ${delta(row.comparisons.tuned.uncapped.delta)} |`);
const rateRows=[rates[0],rates[5]].map(row=>`| ${row.setting===1?'1〜5':'6'} | ${percent(row.factor)} | ${percent(row.tiers.normal.afterPerGame)}（約1/${row.tiers.normal.afterDenominator.toFixed(2)}） | ${percent(row.tiers.upper.afterPerGame)}（約1/${row.tiers.upper.afterDenominator.toFixed(2)}） |`);
const body=`# ボーナス追加ストックの確率調整（v146）

## 変更内容

追加ストックを150ptから上乗せ特化ゾーンへ変えたv145の出玉増を、AT獲得済みBIGのストック確率だけで調整する。基準は直前のv144（be0c6c6）。過去の目標機械割へ別途合わせ直す調整ではない。

変更前は通常BIG ${percent(rates[0].tiers.normal.beforePerGame)}／G、上位BIG ${percent(rates[0].tiers.upper.beforePerGame)}／G。AT獲得後だけ以下に変更する。

| 設定 | 以前の追加ストック確率に対する倍率 | 通常BIG／G | 上位BIG／G |
|---|---:|---:|---:|
${rateRows.join('\n')}

- 初回AT当選期待度は通常BIG52%・上位BIG80%。AT中BIGや準備中の保証でAT権利獲得済みなら、そのBIGは最初から追加ストック用確率を使う。
- 50pt払い出し、ベル・リプレイ確率、通常時・AT中の抽選、特化ゾーン振分・上乗せ性能は変更しない。
- ストック1個＝特化ゾーン1回。既獲得のストックは減らさない。ハズレ時のナビあり50%／なし50%を維持し、色振分を調整して表示された青20%／赤80%／虹100%を維持する。

## 独立検証：コンプリート停止込み

標準パラメータ・指示された押し順を守る前提。1試行30,000G、設定1〜5は各モデル1,024試行、設定6は各モデル2,048試行。元の150pt方式と調整後を同一の未使用seedで比較。差枚＋10,000pt到達時の累計払出／累計投入を集計し、未到達は30,000G時点で集計する。機械割は全試行の払出合計÷投入合計。試行ごとの比率の平均ではない。

| 設定 | 変更前（150pt） | 調整後（特化） | 差・ポイント | 差の95%信頼区間・ポイント |
|---|---:|---:|---:|---:|
${rows.join('\n')}

有限回数の試算なので完全一致を保証する値ではない。差の区間は同一seedの共分散を含む、30,000G試行単位の比率推定量から計算。

## コンプリートなし

同じ試行を30,000Gまで継続した値。停止前の傾向だけに合わせていないかを確認する。

| 設定 | 変更前 | 調整後 | 差・ポイント |
|---|---:|---:|---:|
${full.join('\n')}

## 予備試算：確率据え置きの影響

各設定・各モデル256試行×30,000G、独立検証とは別のseed。150ptから特化に変更し、確率を据え置いた時点では次の増加を確認した。

| 設定 | 150pt方式 | 特化・確率据え置き | 差・ポイント |
|---|---:|---:|---:|
${raw.join('\n')}

この予備試算から70.5%を選んだ。最初の独立検証では設定6だけ差が＋0.54ポイント（95%区間＋0.13〜＋0.95）残ったため66%を検証したが、差が−0.46ポイント（95%区間−0.74〜−0.17）となった。設定6は両者の中間の68.25%を採用。この2回の設定6試算は調整用に再分類し、最終表には別の新しいseed・2,048試行の独立検証を使った。以前の試算もJSONの firstValidation と setting6Adjustment に残している。

## 再現

- 予備試算：\`node scripts/measure-bonus-stock146.mjs trials=256 factors=0.6,0.6,0.6,0.6,0.6,0.6 seed=146100000 output=data/bonus-stock146-pilot\`
- 最初の独立検証：\`node scripts/measure-bonus-stock146.mjs variants=baseline,tuned trials=1024 factors=0.705,0.705,0.705,0.705,0.705,0.705 seed=146700000 output=data/bonus-stock146-validation\`
- 設定6の66%検証：\`node scripts/measure-bonus-stock146.mjs variants=baseline,tuned settings=6 trials=2048 factors=0.705,0.705,0.705,0.705,0.705,0.66 seed=146900000 output=data/bonus-stock146-validation-s6\`
- 設定6の最終独立検証：\`node scripts/measure-bonus-stock146.mjs variants=baseline,tuned settings=6 trials=2048 seed=147200000 output=data/bonus-stock146-validation-s6-final\`
- レポート：\`node scripts/report-bonus-stock146.mjs\`

実行時ソースhash・乱数・試行条件・統計は bonus-stock146-validation.json に記録。研究専用の小役比率キャッシュは設定1・6の30,000Gで未加工コードと全出力の一致を確認している。測定後にナビ色の条件付き振分・表示用の試算情報を整え、最終ソースでも各設定3試行を再実行して測定時の払出・投入・停止結果が完全一致することを確認。映像・音声は再生しない。
`;
fs.writeFileSync('docs/bonus-stock146-report.md',body);
console.log(rows.join('\n'));
