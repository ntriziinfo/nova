import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const before=JSON.parse(fs.readFileSync('research/common125/before.json'));
const pct=n=>(100*n).toFixed(2)+'%',interval=a=>a.map(pct).join('–');
const settings=[1,2,3,4,5,6].map(setting=>{
 const {report:r,rows}=JSON.parse(fs.readFileSync(`research/common125/verify-${setting}.json`)),old=before.settings[setting-1];
 for(const f of ['nova-art.js','nova-normal.js','nova-flow.js']){
  let source=fs.readFileSync(f,'utf8');
  // Settings 1–5 were measured before the setting-6-only follow-up; reconstruct
  // that exact input and reject any other unmeasured source difference.
  const hash=s=>createHash('sha256').update(r.canonicalSourceHashes?s.replace(/\r\n/g,'\n'):s).digest('hex'),expected=r.canonicalSourceHashes?.[f]??r.sourceHashes[f];
  if(hash(source)!==expected&&f==='nova-art.js'&&setting<6)source=source.replace('normalBoost:Object.freeze([0,0.014,0.025,0.06,0.105,0.153])','normalBoost:Object.freeze([0,0.014,0.025,0.06,0.105,0.168])');
  assert.equal(hash(source),expected,f);
 }
 const episodes=rows.flatMap(r=>r.atEpisodes),done=episodes.filter(e=>!e.censored),thresholds=[1000,2000,3000,4000,10000].map(pt=>({pt,observed:episodes.filter(e=>e.paid>=pt).length,rate:episodes.filter(e=>e.paid>=pt).length/episodes.length,upperBound:(episodes.filter(e=>e.paid>=pt).length+episodes.filter(e=>e.censored&&e.paid<pt).length)/episodes.length}));
 const values=done.map(e=>e.paid).sort((a,b)=>a-b),noChallenge=episodes.filter(e=>!e.burstWon);
 return {...r,median:values[Math.floor(values.length/2)],thresholds,withoutUraChallenge:{observed:noChallenge.length,reach2000:noChallenge.filter(e=>e.paid>=2000).length/noChallenge.length},prior:{reach2000:old.reach2000,mid:old.mid},rawFile:`research/common125/verify-${setting}.json`};
});
const qa=JSON.parse(fs.readFileSync('research/common125/qa.json')),parity=JSON.parse(fs.readFileSync('research/common125/parity.json'));
const summary={generatedAt:new Date().toISOString(),method:'Production core; 1000 independent trials/setting, 30000G maximum; stop at cumulative net +10000pt. Xoshiro128, seed=seedBase+setting*100003+i*7919; seedBase is 125600000 for S1-5, 125700000 for S6. S6 boost alone was reduced .168 to .153 after the first run; S6 uses new holdout seeds. S1-5 source differs only in that unused S6 boost, verified by exact reconstructed source SHA256. Actual bets and payouts; replay grants free next bet. Revival remains in same AT. Censored ATs are not treated as completed.',settings,qa,parity};
fs.writeFileSync('docs/common125-summary.json',JSON.stringify(summary,null,2)+'\n');
const lines=['# 共通ATへの変更と30,000G試算（v125）','',
 'ATレベル抽選・維持・昇格を廃止。500／1,000／2,000ptの直接報酬チャレンジを削除。裏上乗せゾーン獲得チャレンジは3G・成功期待度50%で継続し、成功時は裏ギル／裏空／裏逢魔を均等選択する。', '',
 '全AT共通：弱ノヴァ1/128、強ノヴァ1/1500。弱ノヴァ成立時の特化当選は低確40%／高確100%、強ノヴァは特化確定。通常の特化振分は弱70%／強29.1%／裏0.9%。高確の強ノヴァでは強・裏の選択ウェイトを2倍。短期の高確は残るが、AT開始時の性能ランクはない。直乗せの当選倍率は旧基準の1.2倍。', '',
 'AT初期300pt、BIG50pt、5G引き戻し・レア役100%復活は維持。通常／CZの小役ベースは50pt当たり38.5Gから33.5Gへ調整し、通常時の規定G・CZ突破・モード移行の設定補正も再配分。レア役自体の通常時確率は維持。2,000pt以降の減衰や強制上限は設けない。', '',
 '旧Lv.5を含む保存データは共通ATへ移行。獲得済みpt・ストック・ゾーンを維持し、未獲得の旧ポイントチャレンジだけ解除。旧履歴は保持し、変更後の履歴には共通ATのルールとバージョン125を記録。', '',
 '## セッション集計','',
 '各設定1,000台。1台は30,000Gまたは累計差枚＋10,000pt到達で終了。機械割＝実払い出し合計÷実BET合計。未消化の残りptは払い出しに算入しない。到達率の分母は全試行で、AT1回の払い出し到達率とは別。95%区間を併記。', '',
 '|設定|実消化G|機械割（95%区間）|累計＋1万pt到達（95%区間）|勝率|',
 '|---|---:|---:|---:|---:|',
 ...settings.map(s=>`|${s.setting}|${s.games.toLocaleString('en-US')}|${pct(s.rtp.value)} (${interval(s.rtp.ci)})|${pct(s.completeRate)} (${interval(s.completeCI)})|${pct(s.win)}|`),'',
 '## AT1回の払い出し','',
 '観測中に払い出し2,000ptに到達した率。終了済みと観測途中の全ATを分母にする。途中ATを続ければ増える可能性があるため、無制限消化時の最終到達率ではない。5G引き戻しで復活したATは同じATとして数える。旧版は各設定3,000台の同じ停止条件で比較。', '',
 '|設定|旧2,000pt到達|新2,000pt到達|旧2,000〜3,999pt終了|新2,000〜3,999pt終了|終了AT数／途中AT数|',
 '|---|---:|---:|---:|---:|---:|',
 ...settings.map(s=>`|${s.setting}|${pct(s.prior.reach2000)}|${pct(s.episodes.reach2000)}|${pct(s.prior.mid)}|${pct(s.episodes.mid)}|${s.episodes.completed} / ${s.episodes.censored}|`),'',
 '帯域ごとの終了率は終了まで観測したATのみを分母にする。途中ATの確定した最終払い出しとは扱わない。','',
 '|設定|500未満|500〜999|1,000〜1,999|2,000〜2,999|3,000〜3,999|4,000〜9,999|10,000以上|',
 '|---|---:|---:|---:|---:|---:|---:|---:|',
 ...settings.map(s=>`|${s.setting}|${s.distribution.map(b=>pct(b.rate)).join('|')}|`),'',
 '## 検証・再現','',
 '- 手動で裏チャレンジ成功／失敗、AUTO成功、高速試打と履歴、旧Lv.5・旧強制フラグの移行を無音・隔離ブラウザーで確認。ページ例外なし。',
 '- 設定1・6の30,000G上限シードで、計測用の純粋計算キャッシュ有無による全結果一致を確認。',
 '- 変更対象・履歴・表示値の50テスト成功。全体テストは変更前60件失敗、変更後57件失敗。新規失敗名なし。旧仕様値や古いDOM依存の既存失敗は今回の範囲では修正していない。',
 '- 再現：`node research/common125/run.mjs research/common125/verify.json`。集計：`node research/common125/report.mjs`。シード・入力コアのSHA256・信頼区間・打切り内訳は `docs/common125-summary.json`。',
 '- 計測後に `nova-balance.js` の表示用推定値のみ更新する。抽選に使う設定scaleは変えない。', '',
 '設定6は初回1,000台で機械割111.29%・累計＋1万pt到達23.1%となったため、設定6の通常時補正だけ0.168から0.153へ変更し、別シード1,000台で再検証した。設定1〜5に使う抽選値は変更なし。集計スクリプトは設定6以外の差分がないことを元ソースSHA256で照合する。', '',
 '以前の機械割・1万pt率の目標へ完全一致する保証はない。上表は今回の構造変更後に独立試行で測った結果であり、台ごとの結果は振れる。'];
fs.writeFileSync('docs/common125-report.md',lines.join('\n')+'\n');
console.log(JSON.stringify(settings.map(s=>({setting:s.setting,rtp:s.rtp.value,reach:s.completeRate,at2000:s.episodes.reach2000,mid:s.episodes.mid}))));
