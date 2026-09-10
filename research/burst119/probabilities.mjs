import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-art.js','utf8'),ctx);const a=ctx.NovaArt;
const summary=JSON.parse(fs.readFileSync('docs/balance118-final-summary.json'));
const settings=summary.settings.map(s=>({setting:s.setting,fullGames:s.report.games,attempts:s.report.burstAttempts,wins:s.report.burstWins,observedGamesPerAttempt:s.report.games/s.report.burstAttempts,observedGamesPerWin:s.report.games/s.report.burstWins,observedSuccess:s.report.burstWins/s.report.burstAttempts,roleChances:Object.fromEntries(Object.keys(a.burstRules.roles).map(r=>[r,a.burstChance(r,s.setting)])),eligibleChanceByLevel:[1,2,3,4,5].map(l=>Object.entries(a.roleProbabilities(s.setting,l)).reduce((sum,[r,p])=>sum+p*a.burstChance(r,s.setting),0))}));
const result={simulationCommit:summary.commit,successPerChallenge:a.burstRules.success,successPerGame:1-(1-a.burstRules.success)**(1/a.burstRules.games),games:a.burstRules.games,award:a.burstRules.award,levelAfterSuccess:5,settings};
fs.writeFileSync('docs/burst119-probabilities.json',JSON.stringify(result,null,2)+'\n');
const p=n=>(100*n).toFixed(4).replace(/0+$/,'').replace(/\.$/,'')+'%',den=n=>'約1/'+Math.round(n).toLocaleString('en-US');
let md='# 爆発チャレンジ：強制フラグと現在の確率\n\n「デバッグ → 次回転の出目指定 → 爆発チャレンジ（3G・成功抽選）→ 次回だけ適用」で予約。通常時は150ptのATから開始、AT中は残りpt・ストックを保持。特化中は終了後、ボーナス中は消化後まで予約を保持。適用回転で突入を告知し、次BETから3G。成功は強制せず通常の50%抽選。再指定で再試行可能。\n\n強制指定を使わない自然抽選・機械割はv118から変更していない。デバッグ操作を混ぜた試打は自然抽選の統計として扱わない。\n\n## 成功抽選\n\n- 3G合計50%。各G '+p(result.successPerGame)+'、成功した時点で終了。\n- 成功時は残りptへ＋2,000pt、AT Lv.5に昇格。\n- 自然発生は通常AT中の対応レア役で抽選し、1ATに1回まで。特化と同時当選した場合は特化終了後に開始する。\n\n## 全状態合算の観測頻度\n\n各設定30,000G×3,000試行、停止なしの比較軌跡。通常・CZ・BIG・AT・特化などを含む総G÷実際に開始したチャレンジ回数。AT中だけの1G抽選確率ではない。0G連はG数に含めない。成功到達の分母も観測値で、理論成功率は全設定50%。\n\n|設定|発生頻度|成功到達頻度|発生回数／成功回数|\n|---|---:|---:|---:|\n';
for(const s of settings)md+=`|${s.setting}|${den(s.observedGamesPerAttempt)}|${den(s.observedGamesPerWin)}|${s.attempts}／${s.wins}|\n`;
md+='\n## 成立役ごとの突入抽選\n\n未使用の通常AT中に、その役が成立した場合の条件付き確率。\n\n|設定|弱スイカ|強スイカ|チャンス目A・B|弱ノヴァ|強ノヴァ|\n|---|---:|---:|---:|---:|---:|\n';
for(const s of settings){const r=s.roleChances;md+=`|${s.setting}|${p(r.WEAK_SUICA)}|${p(r.STRONG_SUICA)}|${p(r.CHANCE_A)}|${p(r.WEAK_NOVA)}|${p(r.STRONG_NOVA)}|\n`;}
md+='\nその他の役はこの突入抽選の対象外。\n\n## 抽選可能なAT通常1Gあたり\n\nチャレンジ未使用・特化やルーレットや引き戻しではない通常ATの1Gについて、小役確率×役別突入率を合算した理論値。既に1回挑戦したATや、ボーナス・特化の待機を含む観測頻度とは区別する。\n\n|設定|Lv.1|Lv.2|Lv.3|Lv.4|Lv.5|\n|---|---:|---:|---:|---:|---:|\n';
for(const s of settings)md+=`|${s.setting}|${s.eligibleChanceByLevel.map(v=>den(1/v)).join('|')}|\n`;
fs.writeFileSync('docs/burst119-probabilities.md',md);console.log(JSON.stringify(result,null,2));
