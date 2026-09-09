import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadModel} from './zone-v2-model.mjs';

loadModel();
const summaries = Array.from({length:6}, (_, i) => {
  const {report, rows} = JSON.parse(fs.readFileSync(`docs/bonus110-setting-${i+1}.json`));
  if(rows.length !== 200 || report.REG !== 0) throw Error('Incomplete BIG-only run');
  return report;
});
const pct = x => (100*x).toFixed(2)+'%';
const out = [];
const add = (...lines) => out.push(...lines, '');
const table = (heads, rows) => add('|'+heads.join('|')+'|', '|'+heads.map(()=>'---').join('|')+'|', ...rows.map(row=>'|'+row.join('|')+'|'));
add('# BIG一本化・ネビュラAT抽選110',
  'REGを廃止し、通常BIGと上位BIGの2種類に変更。いずれも規定払い出し100pt。これはBET消費を引いた差枚ではなく、ボーナス中の払い出し累計。最後のベルは残りptに合わせ、90pt到達後は10ptを払い出して100ptで終了する。',
  '提供画像は仕様・数値の参照にのみ使用。ユーザー提供の画像・音源・動画ファイルへの変更なし。名称はNOVAの「通常BIG」「上位BIG」を使用。',
  '## 種類と期待度',
  '通常52%は指定値。上位80%・上位選択率10%は、未指定部分に置いた仮値。全設定共通。');
table(['種類','選択率','規定払い出し','AT期待度','ランプ'], [
  ['通常BIG','90%','100pt','52%','白点滅'],
  ['上位BIG','10%（仮）','100pt','80%（仮）','赤点滅']
]);
add('期待度は、100ptを払い出すまでにネビュラを1回以上引く確率。穢れ解放・準備中抽選・フリーズによる既存のAT保証は別枠で維持。2種類のネビュラ経由の加重平均は54.8%。複数回揃った場合は従来どおり1回につきATを1SET獲得する。AT初期1SETは150pt。',
  '上位はBIG開始時に一度だけ選択し、セーブ・ロードで引き直さない。旧REG当選・消化中データはBIGへ移行。過去のREG回数は上位BIG回数に転用しない。REG連続による穢れ加算は廃止し、ボーナス後AT非突入の穢れ加算は維持。',
  '## ネビュラを狙え演出',
  'とと・空・裏空と共通のネビュラ動画を、同じランプ／シャッター枠に表示。BETで動画と色別SEを開始し、動画は第三停止までループ。ランプの配置は変更せず、通常／上位の点滅色を切り替える。',
  '右から停止すると中段にネビュラを引き込む。右→左→中も対応。右以外から停止した場合、内部当選は保持するが図柄は揃わない。成功・失敗の演出はボタン押下時ではなく最後の図柄が停止した時に発生。',
  '揃い成功時は既存のネビュラ確定動画・SEを再生し、3秒間BET不可。次のBETから再生中SEを3秒でフェードアウト。ハズレでナビを出す割合は50%。ナビ付きハズレは第三停止でモノクロ＋ﾎﾞｼｭﾝ。AUTOは既存の逆押し・演出待機処理を使用。',
  '表示されたナビの色別期待度は青20%・赤80%・虹100%。ハズレの半分をナビなしにする分も含めて抽選を合わせている。',
  '## ボーナス中の抽選',
  'ベル7回（15pt×6回＋10pt）より先に1回以上ネビュラを引く確率を、種類ごとのAT期待度に一致させる。各Gの抽選は独立。レア役などの強制デバッグを使用しない通常遊技を対象とする。');
table(['種類','ネビュラ','ハズレ','ベル','リプレイ'], ['normal','upper'].map(tier => {
  const p = NovaArt.bonusRoleProbabilities(1,tier);
  return [NovaArt.bonusLabel(tier), ...['NEBULA','MISS','BELL','REPLAY'].map(k=>pct(p[k]))];
}));
add('## 確認結果',
  '対象テスト49件成功。通常／上位それぞれ10万回のBIGで52%／80%および色別期待度を確認。HTML構文・アセット検査も成功。',
  '無音ブラウザで通常の白点滅、上位の赤点滅、ネビュラ動画、逆押し揃い、3秒待機、ハズレのモノクロ表示、100pt終了、AT150pt突入、上位種類の保存・復元を確認。ブラウザ実行エラーなし。確認用ブラウザは終了済み。',
  '## 全体試算');
table(['設定','機械割','参考95%区間','BIG回数','AT初当たり回数'], summaries.map(r=>[
  r.setting,pct(r.rtp),r.ci95.map(pct).join('〜'),r.BIG,r.artEntries
]));
add('各設定最大1万G×200試行、合計最大1200万G。朝一特殊モード、穢れ救済、現行特化ゾーン性能、差枚抑制、差枚1万ptコンプリートを含む。総払い出し／実投入の比率。ブラウザによる1200万Gの実測ではなく、ゲームと共通の抽選関数を使用するシミュレーション。',
  '現状66.1〜71.5%と低く、出玉調整は未完了。今回の100pt化・AT期待度変更などを含む試算であり、100pt化単独の影響を分離した比較ではない。設定別の初当たり・CZ・規定G・AT直撃・引き戻しを示す今回の添付数値は、次の調整用の参考として扱い、今回は適用していない。',
  '再現: `node scripts/measure-bonus110.mjs <設定1〜6>` を各設定実行後、`node scripts/report-bonus110.mjs`。seedは測定スクリプトに固定。');
fs.writeFileSync('docs/bonus110-report.md',out.join('\n'));
fs.writeFileSync('docs/bonus110-summary.json',JSON.stringify({
  rules:NovaArt.bonusRules,
  summaries,
  sourceHashes:Object.fromEntries(['nova-normal.js','nova-art.js','nova-flow.js','nova-balance.js','scripts/zone-v2-model.mjs'].map(file=>[file,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]))
},null,2));
console.log(summaries.map(r=>({setting:r.setting,rtp:pct(r.rtp),REG:r.REG})));
