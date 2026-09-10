import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {evaluate,goal} from './evaluate.mjs';
import {loadModel} from '../burst112/production-model.mjs';
import {dataJob,selection,verifySettingRuntime} from './selected-data.mjs';
loadModel();
const tag=process.argv[2]??'verify',settings=[];
const wilson=(k,n)=>{const p=k/n,z=1.96,d=1+z*z/n,m=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [m-h,m+h];};
for(let setting=1;setting<=6;setting++){
 const job=dataJob(tag,setting),file=job.file,{report,rows}=JSON.parse(fs.readFileSync(file));
 assert.equal(rows.length,report.trials);
 for(const r of rows){
  assert.equal(r.setting,setting);assert.equal(r.games,30000);assert.equal(r.totalPaid-r.totalBet,r.net);
  assert.equal(!!r.firstComplete,r.peak>=10000);
  if(r.firstComplete){assert(r.firstComplete.games<=30000);assert(r.firstComplete.net>=10000);assert.equal(r.firstComplete.totalPaid-r.firstComplete.totalBet,r.firstComplete.net);}
 }
 const stopped=rows.map(r=>r.firstComplete??r),wins=stopped.filter(r=>r.net>0).length,sorted=stopped.map(r=>r.net).sort((a,b)=>a-b);
 const ratio=data=>data.reduce((n,r)=>n+r.totalPaid,0)/data.reduce((n,r)=>n+r.totalBet,0);
 assert.equal(report.stoppedRtp.value,ratio(stopped));assert.equal(report.rtp.value,ratio(rows));
 const count=k=>rows.reduce((a,r)=>a+r.counts[k],0);
 const comeback=rows.reduce((a,r)=>({games:a.games+r.comeback.games,entries:a.entries+r.comeback.entries,wins:a.wins+r.comeback.wins}),{games:0,entries:0,wins:0});
 settings.push({setting,file,manifest:job.manifest,report,gate:evaluate(report,{holdout:true}),winRate:wins/rows.length,winCI:wilson(wins,rows.length),meanNet:stopped.reduce((a,r)=>a+r.net,0)/rows.length,medianNet:sorted[Math.floor(sorted.length/2)],comeback,czSuccess:count('czWins')/report.czEntries,nonAtGPerAt:(report.games-count('at')-count('zone')-count('comeback'))/report.atEntries,normalGPerCz:report.normalGames/report.czEntries,burstSuccess:report.burstWins/report.burstAttempts});
}
const sourceHashes=Object.fromEntries(['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','research/burst112/production-model.mjs','research/balance118/trial.mjs','research/balance118/cache-mix.mjs'].map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
for(const s of settings){
 for(const [f,h] of Object.entries(sourceHashes))if(f!=='nova-art.js'||tag!=='final')assert.equal(s.report.sourceHashes[f],h,`${s.setting}: ${f} changed since measurement`);
 if(tag==='final')s.runtimeProof=verifySettingRuntime(s.report,dataJob(tag,s.setting));
}
const allPass=settings.every(s=>s.gate.pass),summary={version:118,tag,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),generatedAt:new Date().toISOString(),goal,allPass,sourceHashes,fullGames:settings.reduce((a,s)=>a+s.report.games,0),configuration:{burstRules:NovaArt.burstRules,atLevelRules:NovaArt.atLevelRules,normalProbabilities:[1,2,3,4,5,6].map(s=>NovaNormal.roleProbabilities(s)),comebackRates:[1,2,3,4,5,6].map(s=>1-(1-Object.entries(NovaArt.comebackRoleProbabilities(s)).reduce((sum,[r,p])=>sum+p*NovaArt.comebackChance(r,s),0))**5)},settings};
fs.writeFileSync(`docs/balance118-${tag}-summary.json`,JSON.stringify(summary,null,2)+'\n');
const pct=p=>(p*100).toFixed(2)+'%',ci=c=>c.map(pct).join('〜'),num=n=>Math.round(n).toLocaleString('en-US');
let md=`# 到達率・停止込み機械割の同時調整（v118）\n\n判定：**${allPass?'全設定が両指標の許容差内':'未達あり・採用不可'}**。各設定30,000G×${num(settings[0].report.trials)}試行、合計${num(summary.fullGames)}G。到達率と停止込み機械割を同じ試行から算出。\n\n## 計測・採用条件\n\n- 到達率＝30,000G以内に差枚＋10,000ptへ一度でも到達する割合。累計払い出しではない。\n- 機械割＝初回到達で停止した時点の総払い出し÷総実BET。未到達は30,000G。リプレイ後のBETは無料。停止なしの値は比較用に別欄へ表示。\n- 設定変更直後の特殊モード・設定別初期穢れから開始し、正しいナビ操作を前提とする。未消化ATを払い出しへ先取りしない。\n- 調整用シードと別のシードで候補を固定して検証。全試行を集計し、有利な試行を選ばない。\n- 機械割±0.5ポイント、到達率は設定1±0.75／設定2・3±1.0／設定4〜6±1.5ポイントを有限標本の採用範囲とする。両方を満たす必要がある。95%区間も併記し、真の確率が目標に厳密一致したという意味ではない。\n- これはゲームの共通抽選コアによる有限期間試算であり、実機の型式試験への適合や無限期間の定常値を示すものではない。\n\n## 結果\n\n|設定|機械割目標|停止込み機械割|95%区間|到達目標|到達率|95%区間|両指標判定|\n|---|---:|---:|---|---:|---:|---|---|\n`;
if(tag==='final')md=md.replace('## 結果',`${selection(tag).explanation}\n\n## 結果`);
for(const s of settings)md+=`|${s.setting}|${pct(goal.rtp[s.setting-1])}|${pct(s.report.stoppedRtp.value)}|${ci(s.report.stoppedRtp.ci)}|${pct(goal.reach[s.setting-1])}|${pct(s.report.completeRate)}|${ci(s.report.completeCI)}|${s.gate.pass?'範囲内':'未達'}|\n`;
md+=`\n## 出玉・抽選の補足\n\n勝率・平均差枚は停止込み。他の頻度とAT別の払い出しは全30,000G軌跡。AT別平均は終了まで観測できたATに限り、未終了分を含む真の平均とは異なる。\n\n|設定|勝率|平均差枚|中央値|停止なし機械割|通常AT平均払い出し|通常ATの2,000pt超|爆発成功AT平均払い出し|\n|---|---:|---:|---:|---:|---:|---:|---:|\n`;
for(const s of settings)md+=`|${s.setting}|${pct(s.winRate)}|${num(s.meanNet)}pt|${num(s.medianNet)}pt|${pct(s.report.rtp.value)}|${num(s.report.ordinary.mean)}pt|${pct(s.report.ordinary.over2000)}|${num(s.report.burst.mean)}pt|\n`;
md+=`\n|設定|CZ頻度（通常G）|AT初当たり（非ATのG）|爆発回数|成功回数|観測成功率|引き戻し5Gの理論復活率|\n|---|---:|---:|---:|---:|---:|---:|\n`;
for(const s of settings)md+=`|${s.setting}|1/${s.normalGPerCz.toFixed(1)}|1/${s.nonAtGPerAt.toFixed(1)}|${num(s.report.burstAttempts)}|${num(s.report.burstWins)}|${pct(s.burstSuccess)}|${pct(summary.configuration.comebackRates[s.setting-1])}|\n`;
md+=`\n## 仕様変更\n\n通常・CZのコイン持ちを全設定共通50G／50ptへ変更。通常役のリプレイを増やし、ベル・ハズレを調整。通常時のレア役確率は維持する。リプレイ後の無料BETというルール・機械割の計算式は変更していない。引き戻しも通常役テーブルを参照するため、通常役による平均復活率の変化を試算へ含めた。\n\nAT Lv.1〜3のレア役頻度・特化当選・上位キャラ選択を穏やかにし、Lv.4はLv.3とLv.5の中間へ調整。Lv.5と選ばれた特化ゾーン自体の性能・最低保証は維持。初期150pt、5G引き戻しの全レア役100%、爆発3G・成功50%・＋2000pt・Lv.5昇格・1AT1回を維持。差枚に応じた抑制や新たな強制上限は導入しない。\n\n規定Gのゾーン位置・天井・示唆ルール、BIG100ptと通常52%／上位80%は維持。設定別の初当たり強化係数と爆発突入抽選は下表へ変更。\n\n|設定|初当たり強化係数|爆発突入係数（各レア役の重みに乗算）|\n|---|---:|---:|\n`;
for(let i=0;i<6;i++)md+=`|${i+1}|${NovaArt.burstRules.normalBoost[i]}|${NovaArt.burstRules.entry[i]}|\n`;
md+=`\n|ATレベル|弱ノヴァ目|強ノヴァ目|直乗せ抽選倍率|弱ノヴァの特化抽選倍率|弱／強／裏の選択比率|\n|---|---:|---:|---:|---:|---|\n`;
for(let level=1;level<=5;level++){const r=NovaArt.atLevelRules.levels[level],p=NovaArt.roleProbabilities(3,level);md+=`|Lv.${level}|1/${(1/p.WEAK_NOVA).toFixed(2)}|1/${(1/p.STRONG_NOVA).toFixed(2)}|${r.direct}|${r.weakNova}|${r.groups.map(n=>n.toFixed(2)+'%').join('／')}|\n`;}
md+=`\nキャラ選択比率は高確の強ノヴァによる優遇を掛ける前の値。選択後の特化性能はATレベルで変わらない。初回ATのLv.1／2／3比率は従来どおり47/45/8、42/45/13、37/45/18、32/40/28、29/35/36、29/35/36。Lv.4・5の初回選択は0%。\n\n|設定|通常・CZリプレイ|通常・CZベル|CZ初期成功率（途中書き換え前）|\n|---|---:|---:|---:|\n`;
for(let setting=1;setting<=6;setting++){const p=NovaNormal.roleProbabilities(setting);md+=`|${setting}|${pct(p.REPLAY)}|${pct(p.BELL)}|${pct(NovaFlow.forSetting({},setting).czChance)}|\n`;}
fs.writeFileSync(`docs/balance118-${tag}-report.md`,md);
console.log(JSON.stringify({allPass,fullGames:summary.fullGames,settings:settings.map(s=>s.gate)},null,2));
