import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='research/decrement-rollout-20260929';
const data=JSON.parse(fs.readFileSync(dir+'/other-settings.json'));
const rows=JSON.parse(fs.readFileSync(dir+'/other-settings-rows.json'));
const pct=x=>(100*x).toFixed(2)+'%',range=xs=>xs.map(pct).join('〜'),pt=x=>Math.round(x).toLocaleString('ja-JP');
const labels={base:'現行',fiveStyle:'設定5型',sixStyle:'設定6型'};
const table=[],uncapped=[],diffs=[];
for(let s=1;s<=4;s++){
 const baseline=data.summary['base'+s];
 for(const kind of ['base','fiveStyle','sixStyle']){
  const id=kind+s,r=data.summary[id],trials=rows[id];
  assert.equal(trials.length,1000);assert.equal(new Set(trials.map(r=>r.seed)).size,1000);
  for(const trial of trials){assert.equal(trial.games,30000);assert.equal(trial.decrement.games,30000);assert.equal(trial.net,trial.totalPaid-trial.totalBet);}
  assert.deepEqual(trials.map(r=>r.seed),rows['base'+s].map(r=>r.seed));
  table.push(`|${s}|${labels[kind]}|${pct(r.stopped.rtp)}|${pct(r.stopped.winRate)}|${pct(r.reach)}|${range(r.stopped.rtpCi95)}|${range(r.reachCi95)}|`);
  uncapped.push(`|${s}|${labels[kind]}|${pct(r.uncapped.rtp)}|${pct(r.uncapped.winRate)}|${pt(r.uncapped.meanNet)}|${pt(r.uncapped.p10)}|${pt(r.uncapped.median)}|${pt(r.uncapped.p90)}|`);
  if(kind!=='base')diffs.push({setting:s,type:labels[kind],rtpPoints:100*(r.stopped.rtp-baseline.stopped.rtp),winPoints:100*(r.stopped.winRate-baseline.stopped.winRate),reachPoints:100*(r.reach-baseline.reach)});
 }
}
const report=`# 設定1〜4への減算区間導入比較（2026-09-29）

設定5・6はv170として反映。**以下の設定1〜4は比較試算のみで、公開設定には反映していない。**

各条件で30,000G×1,000試行、4設定×3条件＝12,000試行・合計3億6,000万G。現行・設定5型・設定6型は同じ設定内で同じシード1,000本を使用。基準はv169（コミット f1111ae）の実ソースを凍結したもの。v170でも設定1〜4の公開確率は同じ。

## 比較した条件

- 現行：減算なし。
- 設定5型：初期45%で時間減算。平均滞在150,000G／区間外183,333.33G。CZ係数は減算中0.7倍・区間外2.4倍。差枚＋8,000ptから0.25倍、＋6,500pt以下で解除。
- 設定6型：初期25%で時間減算。平均滞在9,000G／区間外27,000G。CZ係数は減算中0.25倍・区間外1.8倍。差枚＋9,000ptから0.25倍、＋7,500pt以下で解除。
- 両型ともAT直乗せ・弱ノヴァ特化当選率を常時0.25倍にする。元の設定ごとのCZ・AT配分へ掛けるため、設定5・6そのものの性能になるわけではない。小役、初期pt、出陣、特化内部、確定役は元の設定のまま。
- 抑制だけの追加ではなく、区間外のCZ増加も含め、採用した各型を丸ごと移した比較。目標機械割へ個別に再調整した配分ではない。

## コンプリート停止あり

機械割＝全試行の実払い出し合計÷実BET合計。勝率＝終了差枚>0。＋1万pt率＝30,000G以内に累計差枚＋10,000ptへ到達する割合で、その初到達で停止する。未消化AT残りpt・ストックは実払い出しに含めない。

|設定|配分|機械割|勝率|＋1万pt率|機械割の近似95%区間|＋1万pt率の95%区間|
|---|---|---:|---:|---:|---|---|
${table.join('\n')}

各条件1,000試行なので、数ポイント以内の勝率・到達率の差や小さな機械割の差は乱数による振れも含む。現在公開中の設計値を示す別資料とは、基準行もシード・試行数が異なる。

## コンプリート停止なし

同じ経路を30,000Gまで継続した集計。途中＋1万ptへ到達してから差枚を減らす経路もあるため、停止ありとは機械割・勝率が異なる。

|設定|配分|機械割|勝率|平均差枚|10%点|中央値|90%点|
|---|---|---:|---:|---:|---:|---:|---:|
${uncapped.join('\n')}

## 再現

条件：\`${dir}/plan.json\`、凍結ソース：\`source.json\`と\`simulator-v169.txt\`、実行：\`run.mjs\`、抽選モデル：\`model.mjs\`、集計：\`summary.mjs\`。集計結果・シード・ソースハッシュは\`other-settings.json\`、全試行の原票はローカルの\`other-settings-rows.json\`。原票は30,000G完走、差枚恒等式、試行シード一意性を検証した。

\`node ${dir}/run.mjs plan=${dir}/plan.json trials=1000 workers=6 batch=20 seed=${data.seed} output=other-settings\`
`;
fs.writeFileSync('docs/nova-decrement-other-settings-20260929.md',report);
fs.writeFileSync(dir+'/validation.json',JSON.stringify({trials:12000,games:360000000,pairedSeeds:true,uniqueSeedsPerCondition:1000,allGamesAndLedgersValid:true,diffs},null,2)+'\n');
console.log(JSON.stringify({summary:Object.fromEntries(Object.entries(data.summary).map(([k,r])=>[k,{rtp:pct(r.stopped.rtp),win:pct(r.stopped.winRate),complete:pct(r.reach)}])),diffs},null,2));
