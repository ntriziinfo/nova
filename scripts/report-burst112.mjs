import fs from 'node:fs';
const tag=process.argv[2]||'verify30k';
if(!/^[a-z0-9-]+$/.test(tag))throw Error('Invalid tag');
const pct=x=>(x*100).toFixed(2)+'%';
const interval=a=>a.map(pct).join('〜');
function summarize(path){
 const {report:r,rows}=JSON.parse(fs.readFileSync(path,'utf8'));
 if(rows.some(x=>x.games!==30000))throw Error('Every trial must run exactly 30000G: '+path);
 const stopped=rows.map(x=>x.firstComplete??x),sum=k=>stopped.reduce((s,x)=>s+x[k],0),ratio=sum('totalPaid')/sum('totalBet');
 const se=Math.sqrt(stopped.reduce((s,x)=>s+(x.totalPaid-ratio*x.totalBet)**2,0)/(rows.length-1)/rows.length)/(sum('totalBet')/rows.length);
 return {...r,path,stoppedRtp:ratio,stoppedRtpCI:[ratio-1.96*se,ratio+1.96*se],stoppedGames:sum('games'),
  completeByGame:Object.fromEntries([10000,20000,30000].map(g=>[g,rows.filter(x=>x.firstComplete?.games<=g).length/rows.length])),
  reachedBeforeBurst:rows.filter(x=>x.firstComplete&&x.firstComplete.burstWins===0).length,
  sessionsWithBurst:rows.filter(x=>x.burst.wins>0).length};
}
const current=[1,2,3,4,5,6].map(s=>summarize(`docs/burst112-live30k-${s}.json`));
const trial=[1,2,3,4,5,6].map(s=>summarize(`docs/burst112-${tag}-${s}.json`));
const targets=[.02,.04,.06,.1,.15,.2],rtpTargets=[.95,.965,.98,1.02,1.07,1.14];
const summary={status:'adopted: prioritize reach rate and lower RTP target (version112)',measurement:{gamesPerTrial:30000,rtpContinuesAfterComplete:true,actualRuleRtpField:'stoppedRtp',reachTarget:'session net +10000pt within 30000G',ordinaryAtTarget:'gross paid points per AT; soft guideline, no hard cap'},current,trial};
fs.writeFileSync('docs/burst112-summary.json',JSON.stringify(summary,null,2));
const lines=[
 '# 30,000G固定・AT爆発契機の再設計試算',
 '',
 '**到達率優先として採用（version112）。** ユーザーの選択により従来の機械割目標を引き下げ、この試算の仕様をゲーム本体へ実装。初期150ptと各特化の保証は維持。更新時点で継続中のATはレベル・獲得ptを保持し、次のATから新規抽選となる。',
 '',
 '## 測定条件と旧報告の訂正',
 '',
 '全試行を30,000Gまで実行。差枚＋10,000ptに到達しても試算上は継続する。到達率は、その30,000G内に一度でも差枚＋10,000ptとなった試行数／全試行数。累計払い出し10,000ptやAT1回の払い出しとは別。',
 '',
 '「固定30,000G機械割」は＋10,000pt後も継続した総払い出し／総BET。「実機同様の停止」は、各軌跡の初回＋10,000pt到達時点で切り出した集計。到達しなかった場合は30,000Gで終了。後者は早期停止があるため、各試行が30,000Gとはならない。',
 '',
 '旧報告の約115%は最大10,000G・到達時打ち切りの条件だった。上限なしの出玉性能が114%付近と判断する根拠にはできない。停止条件が異なる数字を同一条件の機械割として比較しない。',
 '',
 '## 旧公開版111の再測定',
 '',
 '|設定|試行数|1万G以内到達|2万G以内到達|3万G以内到達|固定3万G機械割|実機同様の停止|',
 '|---|---:|---:|---:|---:|---:|---:|',
 ...current.map(r=>`|${r.setting}|${r.trials}|${pct(r.completeByGame[10000])}|${pct(r.completeByGame[20000])}|${pct(r.completeRate)}|${pct(r.rtp)}|${pct(r.stoppedRtp)}|`),
 '',
 '## 採用した再設計',
 '',
 '- AT初期150ptを維持。通常の新規ATはLv.1〜3から選択する。各特化ゾーンの最低保証・性能は既存のまま。',
 `- 通常AT中のレア役で爆発チャレンジを抽選。1回のATにつき1回まで。3Gで合計${pct(trial[0].pass)}の成功期待度。失敗時は通常ATへ戻る。`,
 `- 成功すると${trial[0].kick.toLocaleString()}ptを追加し、そのAT終了まで既存Lv.5へ移行する。成功してもセッション差枚＋10,000ptの保証はない。`,
 '- 初当たりは、規定Gの実CZ当選率・短い天井のモード選択率・CZ突破率で軽くする。規定Gの設置箇所、各モードの天井、前兆示唆、天井の恩恵は維持。',
 '- 差枚や既獲得ptに応じた抽選抑制は使わない。通常AT2,000ptの強制上限も設けない。',
 '',
 '## 採用結果',
 '',
 `**到達率を優先し、機械割目標を下げる選択を反映。** 設定6の到達率は${pct(trial[5].completeRate)}まで下がったが、実際のコンプリート停止を守った機械割は${pct(trial[5].stoppedRtp)}で、従来の114%目標より低い。固定30,000G・停止なしの${pct(trial[5].rtp)}を採用判定に使ってはならない。以後は停止込みの実測値を機械割の目安とし、旧目標への追加調整は行わない。`,
 '',
 '|設定|試行数|到達目標|実測到達率|到達率95%区間|旧機械割目標|固定3万G機械割|機械割95%区間|実機同様の停止|',
 '|---|---:|---:|---:|---|---:|---:|---|---:|',
 ...trial.map((r,i)=>`|${r.setting}|${r.trials}|${pct(targets[i])}|${pct(r.completeRate)}|${interval(r.completeCI)}|${pct(rtpTargets[i])}|${pct(r.rtp)}|${interval(r.rtpCI)}|${pct(r.stoppedRtp)}|`),
 '',
 '## 通常ATの払い出し',
 '',
 '爆発チャレンジに成功せず、測定中に終了まで観測できたATの総払い出し。AT中の上乗せ・特化中の払い出しも含む。BIGからATへ入る前のBIG払い出しは含めない。終了できたATに限るため、未終了ATを含む真の平均として扱わない。',
 '',
 '|設定|終了まで観測|平均払い出し|90%点|99%点|2,000pt以下|未終了の通常AT|',
 '|---|---:|---:|---:|---:|---:|---:|',
 ...trial.map(r=>`|${r.setting}|${r.ordinary.completed}|${r.ordinary.mean.toFixed(1)}pt|${r.ordinary.p90}pt|${r.ordinary.p99}pt|${pct(1-r.ordinary.over2000)}|${r.censoredOrdinary}|`),
 '',
 '## 調整パラメータ・初当たり',
 '',
 '|設定|通常強化係数b|爆発係数e|Lv1/2/3の比率|CZ初期成功率|通常消化G/CZ|非AT消化G/AT初当たり|',
 '|---|---:|---:|---|---:|---:|---:|',
 ...trial.map(r=>`|${r.setting}|${r.normalBoost}|${r.entry}|${r.weights.slice(0,3).join('/')}|${pct(.4+.4*r.normalBoost)}|1/${r.normalPerCz.toFixed(1)}|1/${r.nonAtPerAt.toFixed(1)}|`),
 '',
 '既存の実CZ当選率pは p＋(1−p)×b に変更する。設置されていないG数の当選率は0のまま。モード移行表は既存比率×(1−0.8b)＋天国への0.8bを合成。天国準備後の天国確定、AT駆け抜け後の通常B以上を維持。通常CZ初期成功率は0.4＋0.4b、基本強CZは0.7＋0.2b。CZ中のレア役書き換えは別途既存通り。BIGは通常52%・上位80%で不変。',
 '',
 '爆発抽選は通常ATの弱スイカで0.05e、強スイカで0.5e、チャンス目A/Bで0.2e、弱ノヴァで0.1e、強ノヴァでe。いずれも当該小役成立を条件とする確率であり、毎Gの確率ではない。当選済みの通常上乗せ・特化当選は維持。',
 '',
 '## 検証と再現',
 '',
 '`tests/burst112-trial.test.mjs`で、3G合計成功率、AT内1回制限、残り1pt時の当選保持、保存・BIG・特化を経た状態維持、差枚非依存、元ファイル未変更を確認。旧公開版111はアーカイブのソースと改行を除き一致。固定30,000Gデータの1軌跡を同じ乱数種で再実行し、BET・払い出し・到達Gまで一致した。',
 '',
 '使用乱数はxoshiro128。各JSONに試行別の乱数種と結果を保存。95%区間は到達率がWilson区間、機械割が試行単位の比率推定区間。試算値は有限サンプルによる推定であり、目標値に一致する保証ではない。',
 '',
 '採用方針：到達率を優先し、機械割目標を下げる。ゲーム本体と試算の53軌跡（各30,000G・全設定合計159万G）でBET・払い出し・初回到達G・チャレンジ回数・終了状態が一致。tests/nova-burst112.test.mjsで新規AT／既存ATの互換性と成功・失敗・残pt・設定別CZを検証。詳細はdocs/burst112-production-parity.json。',
 '',
 `試算データ：docs/burst112-${tag}-{1..6}.json。現行版データ：docs/burst112-live30k-{1..6}.json。`
 ];
fs.writeFileSync('docs/burst112-report.md',lines.join('\n')+'\n');
console.log(JSON.stringify({tag,current:current.map(r=>({setting:r.setting,rtp:r.rtp,stoppedRtp:r.stoppedRtp,reach:r.completeRate})),trial:trial.map(r=>({setting:r.setting,rtp:r.rtp,stoppedRtp:r.stoppedRtp,reach:r.completeRate}))}));
