import fs from 'node:fs';
const dir='research/replay-base-20260929',out='research/replay-fine-20260930';
const read=name=>JSON.parse(fs.readFileSync(`${dir}/${name}.json`));
const d=read('fine-validation'),m=read('fine-micro');
const pct=x=>(100*x).toFixed(2)+'%',f=x=>x.toFixed(1),ci=x=>x.map(pct).join('〜');
const records=s=>[d.summary['base'+s],d.summary['candidate'+s],m.summary['micro'+s]];
let text=`# リプレイと特化当選の小幅な配分変更

試算のみ。公開済みのv172はiPhone/iPad音声修正だけで、出玉・抽選確率を変更していない。

前案はリプレイを全設定13.70%へ一気に下げ、ATの追加特化抽選を16〜31%程度に上げたため、特化への依存と＋1万pt到達率を大幅に高めた。今回、そのまま採用しない判断とし、次の2段階に縮小して比較した。

## 今回の候補

- A案：通常リプレイを2.5パーセントポイント減らす。通常ATで弱スイカ・チャンス目A/Bに3%（設定5のみ3.5%）、強スイカにその2倍の特化当選を追加。
- B案：通常リプレイを1パーセントポイント減らす。通常ATで弱スイカ・チャンス目A/Bに全設定1%、強スイカに2%の特化当選を追加。
- 上位ATは追加抽選も1.5倍。上記は既存のAT減算係数を適用した後の値。設定5・6のプランファイルでは係数0.25適用前の値を記載している。
- 変更する小役表は通常状態（CZ前兆を含む）だけ。減らしたリプレイをハズレへ移す。ベル、ベルナビ、レア役の確率は維持。
- CZ・ボーナス準備・ボーナス・引き戻し・ATの小役表、既存ノヴァ目特化抽選、特化の種類と性能、初期pt、直乗せ、出陣、上位チャレンジ、減算区間は維持。
- 通常高確の転落対象となる役内訳が変わるため、CZ/初当たりの抽選係数は据え置きでも実測の間隔は変わり得る。

## 比較方法

各設定・各案300試行、1試行30,000G。現行/A/Bの合計1億6,200万G。候補の選定に使った予備試算とは異なるシードで検証。B案はA案の検証後に範囲を小さくして追加したため、3案の比較を最終的な最適化証明とは扱わない。

コンプリートありは、30,000G以内に累計差枚＋10,000ptへ初めて達した時点で停止する帳簿。＋1万pt到達率は、その条件へ一度でも達した試行の比率。機械割＝全試行の実払い出し合計÷実BET合計。リプレイの無料BETは投入0、未払いの上乗せ予約ptは出玉に含めない。実機の検定結果ではない。

## 通常ベース

| 設定 | 現行リプレイ→B案 | 50ptあたり通常G 現行→A→B |
|---|---:|---:|
`;
for(let s=1;s<=6;s++){
 const b=d.configs['base'+s],a=d.configs['candidate'+s],c=m.configs['micro'+s];
 text+=`| ${s} | ${pct(b.roles.REPLAY)} → ${pct(c.roles.REPLAY)} | ${f(b.base50)} → ${f(a.base50)} → ${f(c.base50)}G |\n`;
}
text+='\nベースは通常状態の役確率に基づく理論値。CZ等は含まない。B案は変化量を抑える案であり、リプレイ頻発を大きく減らす案ではない。\n\n## コンプリート停止込み\n\n| 設定 | 機械割 現行→A→B | ＋1万pt到達率 現行→A→B | 勝率 現行→B |\n|---|---:|---:|---:|\n';
for(let s=1;s<=6;s++){
 const [b,a,c]=records(s);
 text+=`| ${s} | ${[b,a,c].map(x=>pct(x.stopped.rtp)).join(' → ')} | ${[b,a,c].map(x=>pct(x.reach)).join(' → ')} | ${pct(b.stopped.winRate)} → ${pct(c.stopped.winRate)} |\n`;
}
text+='\n## B案の推定幅\n\n| 設定 | 現行機械割の近似95%区間 | B案機械割の近似95%区間 | B案到達率の95%区間 |\n|---|---:|---:|---:|\n';
for(let s=1;s<=6;s++){const[b,,c]=records(s);text+=`| ${s} | ${ci(b.stopped.rtpCi95)} | ${ci(c.stopped.rtpCi95)} | ${ci(c.reachCi95)} |\n`;}
text+='\n機械割の区間は試行単位の比率推定、到達率はWilson区間。目標機械割の1ポイント程度の幅を確定するには、この300試行だけでは不十分。設定5・6は既存の長い減算区間もあり、試行間のばらつきを含む。\n\n## 特化当選頻度\n\n| 設定 | 通常AT特化 現行→A→B | 上位AT特化 現行→B | 完結ATの平均実払い出し 現行→B |\n|---|---:|---:|---:|\n';
for(let s=1;s<=6;s++){
 const [b,a,c]=records(s);
 text+=`| ${s} | ${[b,a,c].map(x=>'1/'+f(x.normalAtZoneDenominator)).join(' → ')} | 1/${f(b.upperAtZoneDenominator)} → 1/${f(c.upperAtZoneDenominator)} | ${f(b.completedAtPayout)} → ${f(c.completedAtPayout)}pt |\n`;
}
text+='\n分母は特化抽選をしたATゲーム（前兆中の追加抽選を含む）。特化消化・狙え待機等は除く。出陣、復活、ボーナスストック経由の特化は分子から除く。頻度とAT平均は停止なし30,000Gの記録。AT平均は終了済みATのみなので、未完了ATによる偏りがあり真のAT期待値ではない。\n\n## コンプリート停止なし\n\n| 設定 | 機械割 現行→A→B | 勝率 現行→B | 終了差枚中央値 現行→B |\n|---|---:|---:|---:|\n';
for(let s=1;s<=6;s++){
 const [b,a,c]=records(s).map(x=>x.uncapped);
 text+=`| ${s} | ${[b,a,c].map(x=>pct(x.rtp)).join(' → ')} | ${pct(b.winRate)} → ${pct(c.winRate)} | ${f(b.median)} → ${f(c.median)}pt |\n`;
}
text+=`\n## 判定\n\nA案でも設定6の到達率が現行${pct(d.summary.base6.reach)}から${pct(d.summary.candidate6.reach)}へ上がった。特化当選率だけを増やして補う変更は、機械割だけが近くても同じ出玉分布とはいえない。B案の設定6は${pct(m.summary.micro6.reach)}。両案とも公開反映はしていない。B案は小さな変更幅で比較するための候補であり、全設定の機械割・到達率が従来目標に調整済みという意味ではない。\n`;
text+=`\n## 再現\n\n- 現行/A：\`node research/replay-base-20260929/run.mjs plan=${out}/validation-plan.json trials=300 output=fine-validation seed=${d.seed} workers=4\`\n- B：\`node research/replay-base-20260929/run.mjs plan=${out}/micro-plan.json trials=300 output=fine-micro seed=${m.seed} workers=4\`\n- 集計/試行別記録：\`${dir}/fine-validation.json\`、\`fine-validation-rows.json\`、\`fine-micro.json\`、\`fine-micro-rows.json\`。\n- 乱数 xoshiro128**、共通シード文字列の各設定trial0〜299。抽選追加後は乱数消費経路が変わるので、同一の出玉経路をペア比較しているわけではない。\n- 各試行30,000G、収支の恒等式、シード重複なし、本体8ファイルの実行前後ハッシュ一致を検査。\n- ハーネスの変更なし再現性と追加抽選の検査は\`${dir}/verification.json\`。ノヴァ目の既存抽選を維持し、特化追加時も本体の差枚チャレンジ用ラッパーを再適用する。\n`;
fs.writeFileSync(`${out}/report.md`,text);
fs.writeFileSync(`${out}/summary.json`,JSON.stringify({proposalOnly:true,trials:300,games:30000,seed:d.seed,settings:Array.from({length:6},(_,i)=>{const setting=i+1,[current,a,b]=records(setting);return {setting,current,a,b};})},null,2));
console.log(text);
