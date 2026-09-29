import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadModel} from '../../scripts/zone-v2-model.mjs';
const dir='research/release-173',validation=JSON.parse(fs.readFileSync(dir+'/validation.json'));
const earlier=JSON.parse(fs.readFileSync('research/replay-base-20260929/fine-micro.json'));
const a=validation.summary.micro5,b=validation.summary.selected5;
const pct=x=>(x*100).toFixed(2)+'%',f=x=>x.toFixed(1),ci=xs=>xs.map(pct).join('〜');
loadModel();
const config={version:NovaTuning.version,baselineCommit:'95667d573e61463c9754c65f13b30daba3174676',settings:Array.from({length:6},(_,i)=>{
 const setting=i+1;NovaDecrement.reset(setting,[1,2,3,4]);
 return {setting,profile:NovaTuning.profile(setting),normalRoles:NovaNormal.normalRoleProbabilities(setting),extraNormalAt: Object.fromEntries(['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B'].map(role=>[role,NovaArt.extraZoneChance(setting,role)]))};
}),hashes:Object.fromEntries(['nova-tuning.js','nova-art.js','nova-normal.js','nova-decrement.js','nova-progress.js'].map(name=>[name,createHash('sha256').update(fs.readFileSync(name,'utf8').replaceAll('\r\n','\n')).digest('hex')]))};
fs.writeFileSync(dir+'/applied-config.json',JSON.stringify(config,null,2));
let text=`# v173 小幅案の適用と設定5の調整

ユーザーが承認した「通常リプレイ−1ポイント、通常ATの弱スイカ・チャンス目特化抽選1%、強スイカ2%」を全設定へ適用する。上位ATはそれぞれ1.5%、3%。設定5だけCZ係数を2.45→2.60（約6.12%増）へ調整する。係数の適用後に100%で上限処理するため、各役の当選率が全て一律6.12%増えるわけではない。強ノヴァ目のCZ確定は維持する。

通常リプレイは設定順に43.64%、43.82%、44.00%、44.18%、44.36%、53.00%。差分をハズレへ移し、ベルナビ・ベル・レア役は維持。CZ、準備、ボーナス、AT、引き戻しの小役表は維持する。追加AT抽選は既存のノヴァ目抽選と独立した対象役で、既存の減算係数と上位倍率を各1回だけ適用する。設定5/6の係数適用前パラメータは4%（×0.25で1%）。

既存の特化性能、初期pt、出陣、上位チャレンジ、減算区間、獲得済みptとストック、音声修正を維持する。保存データのリセットや減算区間の再抽選はしない。

## 設定5：独立検証

予備試算は各30,000G×200回で、CZ係数2.45/2.60/2.80/3.00を比較。2.60を選択してから、別の乱数シードで変更前後それぞれ30,000G×1,000回、計6,000万Gを検証した。

| 指標 | 小幅案・CZ係数2.45 | 採用案・CZ係数2.60 |
|---|---:|---:|
| コンプリート停止込み機械割 | ${pct(a.stopped.rtp)} | ${pct(b.stopped.rtp)} |
| 同・近似95%区間 | ${ci(a.stopped.rtpCi95)} | ${ci(b.stopped.rtpCi95)} |
| 勝率 | ${pct(a.stopped.winRate)} | ${pct(b.stopped.winRate)} |
| 30,000G内の＋1万pt到達率 | ${pct(a.reach)} | ${pct(b.reach)} |
| 到達率の95%区間 | ${ci(a.reachCi95)} | ${ci(b.reachCi95)} |
| 停止なし機械割 | ${pct(a.uncapped.rtp)} | ${pct(b.uncapped.rtp)} |
| 停止なし勝率 | ${pct(a.uncapped.winRate)} | ${pct(b.uncapped.winRate)} |
| 通常ゲーム数/CZ初当たり | 1/${f(a.normalCzDenominator)} | 1/${f(b.normalCzDenominator)} |
| 通常ゲーム数/AT初当たり | 1/${f(a.normalAtDenominator)} | 1/${f(b.normalAtDenominator)} |

採用案の機械割は目標105〜106%内の点推定。ただし保証値ではない。＋1万pt到達率と勝率は少し上昇しており、以前の目安（設定5の到達率約10%、勝率60〜65%）に同時一致したという意味ではない。通常Gを分母にしたAT初当たりには、通常からの出陣・直撃・差枚チェックポイント経由も含む。

前回提示の設定5「103.94%」は300試行の値。今回の同じ小幅案の1,000試行では${pct(a.stopped.rtp)}だった。したがってCZ調整の比較は103.94%からではなく、同一条件での${pct(a.stopped.rtp)}→${pct(b.stopped.rtp)}（${((b.stopped.rtp-a.stopped.rtp)*100).toFixed(2)}ポイント増）を用いる。

## 適用後の設定別参考値

| 設定 | 試行数 | 停止込み機械割 | ＋1万pt到達率 | 勝率 |
|---|---:|---:|---:|---:|
`;
for(let setting=1;setting<=6;setting++){
 const r=setting===5?b:earlier.summary['micro'+setting];
 text+=`| ${setting} | ${r.n} | ${pct(r.stopped.rtp)} | ${pct(r.reach)} | ${pct(r.stopped.winRate)} |\n`;
}
text+=`\n設定1〜4・6は前回承認案の300試行値を再掲。設定5とは試行数とシードが異なる。1試行は全て30,000G。＋1万pt到達は累計差枚で、一撃AT払い出しではない。停止込みは初回到達時の帳簿で停止する集計。機械割＝実払い出し合計÷実BET合計、リプレイの無料BETは投入0、未払いの予約ptは出玉に含めない。実機検定結果ではない。

## 実装と検証

- 本体の通常専用リプレイ低減・追加特化抽選・設定5CZ係数を更新。HTMLの3スクリプト参照をv173へ変更。
- 新しい本体と承認案モデルが各設定30,000Gで全ての記録まで完全一致するテストを通過。
- 各対象役の実抽選を設定1/5/6・通常/上位で各100,000回、計240万回検査。
- 新旧の共有小役表、ベルナビ、全特化の性能、保存済み減算状態、獲得済みpt/ストックを比較。
- v167/v169/v170の回帰テストは新しい2項目を0にし、設定5CZ係数を2.45に戻した条件で旧帳簿を維持することを検査。
- 対象テスト33件とHTML/配信設定の検査が成功。追加特化の当選も通常の3〜5G前兆→7揃い→ルーレットへ進むことを検査。
- 追加で実行した古いテスト2件は変更前の固定ソースでも失敗した（\`nova-art-reset.test.mjs\`の残り0直後に即通常復帰する期待と、\`nova-art.test.mjs\`のノヴァ目から前兆なしで7待機に入る期待）。現行の引き戻し/前兆仕様より古い期待値であり、今回は本体を旧挙動に戻さない。全テスト成功とするものではない。

再現：\`node research/release-173/run.mjs plan=research/release-173/validation-plan.json trials=1000 output=validation seed=NOVA-173-independent-validation workers=4\`。スナップショットは\`baseline/\`、集計は\`validation.json\`。全試行の生データはローカルの\`validation-rows.json\`に保存。小役・調整項目は\`applied-config.json\`。\`proposalOnly\`は試算ハーネスが本体を変更しない意味であり、採用案は別途本体に実装している。\n`;
fs.writeFileSync('docs/fine-balance173-report.md',text);
console.log(JSON.stringify({setting5:{before:a.stopped,after:b.stopped,reach:b.reach,reachCi95:b.reachCi95}}));
