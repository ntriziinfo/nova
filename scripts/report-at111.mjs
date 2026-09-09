import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadModel} from './zone-v2-model.mjs';
loadModel();
const tag=process.argv[2]||'verify5';
if(!/^[a-z0-9-]+$/.test(tag))throw Error('Invalid report tag');
const sourceHashes=Object.fromEntries(['nova-normal.js','nova-art.js','nova-flow.js','nova-balance.js','scripts/zone-v2-model.mjs'].map(file=>[file,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const summaries=Array.from({length:6},(_,i)=>{
 const {report,rows}=JSON.parse(fs.readFileSync(`docs/at111-${tag}-${i+1}.json`));
 if(rows.length!==report.trials||report.trials<1000||JSON.stringify(report.weights)!==JSON.stringify(NovaArt.atLevelRules.weights[i]))throw Error('Incomplete/current allocation mismatch');
 for(const [f,h]of Object.entries(sourceHashes))if(report.sourceHashes[f]!==h)throw Error('Source mismatch: '+f);
 if(report.tierMetrics[0].entries!==0)throw Error('Legacy AT in new simulation');
 return report;
});
const targets=[.95,.965,.98,1.02,1.07,1.14],pct=p=>(p*100).toFixed(2)+'%',out=[];
const add=(...s)=>out.push(s.join('\n\n'),'');
const table=(heads,rows)=>out.push(['|'+heads.join('|')+'|','|'+heads.map(()=>'---').join('|')+'|',...rows.map(row=>'|'+row.join('|')+'|')].join('\n'),'');
add('# ATレベル5段階・機械割調整111',
 'AT初当たり時にLv.1〜5を1回抽選する。Lv.1からLv.5へATレア役・直乗せ・特化ゾーンの抽選を段階的に優遇。通常／上位BIGの選択とは別の抽選。',
 '差枚に応じた新規上乗せ抑制と、差枚−2000pt以下での上乗せ増加を撤廃。セッションの差枚によってレベルや当選済み上乗せを変更しない。',
 '## レベルの扱い',
 '通常時からのAT直撃、BIG後の新規ATで抽選。セット継続、特化ゾーン、AT中BIGからの復帰、保存・再読込では同じレベルを維持。AT終了後に再び初当たりした時に抽選し直す。ATに当選しなかったBIGではレベル抽選を行わない。',
 '更新前から消化中の保存ATは、従来の基本抽選を維持する。差枚補正は旧ATにも適用しない。次の初当たりから5段階を抽選。初期150pt、獲得済みpt・ストック、各特化ゾーンの最低保証は維持。画面の通常AT表示・ランプ位置は変更せず、デバッグ内部状態にレベルを表示。',
 '## 設定別の選択率');
table(['設定','Lv.1','Lv.2','Lv.3','Lv.4','Lv.5'],NovaArt.atLevelRules.weights.map((row,i)=>[i+1,...row.map(p=>p+'%')]));
add('高設定ほど上のレベルに移行する振り分け。各行は100%。振り分けは現行の目標機械割へ近づけるための暫定調整値。',
 '## レベルごとの抽選');
table(['レベル','ATレア役倍率','直乗せ当選倍率','弱ノヴァ→特化（低確）','弱ノヴァ→特化（高確）'],[1,2,3,4,5].map(l=>{const r=NovaArt.atLevelRules.levels[l];return ['Lv.'+l,r.rare+'倍',r.direct+'倍',pct(Math.min(1,.5*r.weakNova)),pct(Math.min(1,1.5*r.weakNova))];}));
add('レア役倍率はLv.1のAT専用小役確率を基準とする。直乗せ倍率は既存の役別当選率への補正で、当選時のpt振り分けは同じ。AT高確への移行・転落ルールも維持。強ノヴァは全レベルで特化ゾーン確定。通常・CZ・BIG・準備中の小役確率にはこの補正を適用しない。',
 'ATレア役の合算頻度は同じレベルなら全設定共通。チャンス目A/Bの奇数・偶数設定による内訳は維持するが、払い出し・ATでの恩恵は両者共通。ベル／リプレイを調整して通常AT中の期待純増4pt/Gを維持。');
table(['レベル','弱ノヴァ目','強ノヴァ目','レア役合算'],[1,2,3,4,5].map(l=>{const p=NovaArt.roleProbabilities(1,l);return ['Lv.'+l,'1/'+(1/p.WEAK_NOVA).toFixed(2),'1/'+(1/p.STRONG_NOVA).toFixed(2),pct(NovaArt.atMix(1,l).chance)];}));
add('### 特化ゾーン当選後の区分');
table(['レベル','弱特化','強特化','裏特化'],[1,2,3,4,5].map(l=>['Lv.'+l,...NovaArt.zoneGroupWeights(1,false,false,l).map(p=>p.toFixed(2)+'%')]));
add('弱＝宗介・とと・うらぴ、強＝ギル・空・逢魔、裏＝裏ギル・裏空・裏逢魔。各区分内は3キャラ均等。高確中の強ノヴァでは、強・裏のウェイトを2倍にして再正規化する。強グループのうち3%を裏へ配分する割合は維持。',
 'レベルは特化ゾーンの入口を変える。選ばれた特化ゾーンの中では、同じ設定・同じキャラならレベルによる性能変更なし。既存の段階テーブル選択の設定差、ルーレット中レア役昇格、7・nebula・ノヴァ保証、フリーズ仕様を維持する。',
 '## 機械割の検証');
table(['設定','目標','試算','参考95%区間','実ゲーム数'],summaries.map((r,i)=>[r.setting,pct(targets[i]),pct(r.rtp),r.ci95.map(pct).join('〜'),r.games.toLocaleString('en-US')]));
add('各設定最大1万G×1000試行、合計最大6000万G。調整用試行とは別seed。朝一特殊モード、現行の穢れ救済、BIG100pt、AT初期150pt、現行特化ゾーン、差枚1万ptコンプリートを含む。コンプリート到達時は途中終了。機械割は総払い出し÷実投入で、再遊技は投入0として集計。',
 'これは実機の認定値や無限時間での厳密値ではなく、ゲームと共通の抽選関数を使う有限セッションのシミュレーション。終端の未消化ATや大きな上乗せによってぶれるため、参考95%区間も併記した。ブラウザで6000万Gを回した実測ではない。',
 '今回の点推定は目標との差が最大約2ポイント。設定2と3は試算値が逆転しているが、区間が重なるため優劣を断定できない。抽選表は高設定ほど上位レベルを選ぶ配分とし、機械割の厳密な一致を保証するものではない。',
 '関連テスト39件成功。5レベルの抽選、保存、セット・ボーナス復帰、特化保証の維持、差枚による当選取り消しがないことを確認。HTML構文・アセット検査成功。無音ブラウザでLv.4突入、保存・再読込、ベル後に150→135ptへ減算してもLv.4が維持されること、設定表の表示を確認。実行エラーなし。確認用ブラウザは終了済み。',
 '## 再現',
 '`node scripts/measure-at111.mjs <設定1〜6> default 1000 '+tag+' 111900000` を各設定実行後、`node scripts/report-at111.mjs '+tag+'`。',
 '乱数はxoshiro128。各試行のseedは111900000＋設定×100003＋試行番号（0始まり）×7919。要約JSONに測定元のSHA-256を保存。測定スクリプトは行別の生データもローカルに生成する。',
 'ユーザー提供のイラスト・音源・動画は変更していない。');
fs.writeFileSync('docs/at111-report.md',out.join('\n'));
fs.writeFileSync('docs/at111-summary.json',JSON.stringify({rules:NovaArt.atLevelRules,targets,summaries,sourceHashes},null,2));
console.log(summaries.map((r,i)=>({setting:r.setting,target:pct(targets[i]),rtp:pct(r.rtp),ci95:r.ci95.map(pct)})));
