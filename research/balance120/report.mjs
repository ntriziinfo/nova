import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildArt,buildNormal,baseCommit} from './model.mjs';
import {loadModel} from '../burst112/production-model.mjs';
import {evaluate,goal} from './evaluate.mjs';
const selected=JSON.parse(fs.readFileSync('research/balance120/selected-data.json'));
const norm=s=>s.replace(/\r\n/g,'\n');
const common=s=>norm(s).replace(/normalBoost:Object.freeze\(\[[\d.,]+\]\)/,'normalBoost:PROFILE').replace(/entry:Object.freeze\(\[[\d.,]+\]\)/,'entry:PROFILE');
const profile=(s,k)=>JSON.parse(s.match(new RegExp(k+':Object.freeze\\((\\[[\\d.,]+\\])\\)'))[1]);
const current=fs.readFileSync('nova-art.js','utf8'),normal=fs.readFileSync('nova-normal.js','utf8');
assert.equal(norm(fs.readFileSync('nova-flow.js','utf8')),norm(execFileSync('git',['show',baseCommit+':nova-flow.js'],{encoding:'utf8'})));
const balanceLogic=s=>norm(s).replace(/^\s*\/\/[^\n]*$/gm,'').replace(/const targets=\[[^;]+;/,'const targets=MEASURED;').replace(/verifiedModel:'[^']+'/g,"verifiedModel:'REPORT'").replace(/previousVerifiedModel:'[^']+'/g,"previousVerifiedModel:'REPORT'");
assert.equal(balanceLogic(fs.readFileSync('nova-balance.js','utf8')),balanceLogic(execFileSync('git',['show',baseCommit+':nova-balance.js'],{encoding:'utf8'})),'Balance gameplay changed outside the candidate');
loadModel();
const pct=p=>(p*100).toFixed(2)+'%',ci=a=>a.map(pct).join('～'),num=n=>Math.round(n).toLocaleString('en-US');
const settings=[];
for(const job of selected.jobs){
 const {report:r,rows}=JSON.parse(fs.readFileSync(job.file)),manifest=JSON.parse(fs.readFileSync(job.manifest)),cfg=manifest.jobs.find(x=>x.setting===r.setting);assert(cfg);
 for(const [k,v] of Object.entries(cfg))assert.deepEqual(r[k],v);
 for(const f of ['research/balance120/model.mjs','research/balance120/trial.mjs','research/burst112/production-model.mjs','research/balance118/cache-mix.mjs'])assert.equal(r.sourceHashes[f],createHash('sha256').update(fs.readFileSync(f)).digest('hex'),f);
 const modeled=buildArt(cfg);assert.equal(common(modeled),common(current));assert.equal(norm(buildNormal(cfg)),norm(normal));
 for(const k of ['normalBoost','entry'])assert.equal(profile(modeled,k)[r.setting-1],profile(current,k)[r.setting-1]);
 assert.equal(rows.length,r.trials);
 for(const row of rows){assert.equal(row.games,30000);assert.equal(row.setting,r.setting);assert.equal(row.net,row.totalPaid-row.totalBet);assert.equal(row.blocks.reduce((n,b)=>n+b.net,0),row.net);assert.equal(!!row.firstComplete,row.peak>=10000);if(row.firstComplete)assert(row.firstComplete.games<=30000&&row.firstComplete.net>=10000);}
 assert.equal(Object.values(r.challenge.entries).reduce((a,b)=>a+b,0),r.burstAttempts);assert.equal(Object.values(r.challenge.wins).reduce((a,b)=>a+b,0),r.burstWins);assert.equal(Object.values(r.challenge.awards).reduce((a,b)=>a+b,0),r.challenge.wins.points);
 const stopped=rows.map(x=>x.firstComplete??x),sum=(rs,k)=>rs.reduce((a,x)=>a+x[k],0),net=stopped.map(x=>x.net).sort((a,b)=>a-b),count=k=>rows.reduce((a,x)=>a+x.counts[k],0);
 assert.equal(r.stoppedRtp.value,sum(stopped,'totalPaid')/sum(stopped,'totalBet'));assert.equal(r.completeRate,rows.filter(x=>x.firstComplete).length/rows.length);
 const old=JSON.parse(fs.readFileSync('docs/balance118-final-summary.json')).settings[r.setting-1];
 const oldVol=[1,6].includes(r.setting)?JSON.parse(fs.readFileSync('docs/balance120-baseline-'+r.setting+'.json')).report.volatility:null;
 settings.push({setting:r.setting,file:job.file,manifest:job.manifest,report:r,gate:evaluate(r,{holdout:true}),runtimeProof:{commonCodeMatches:true,settingCoefficientsMatch:true},meanNet:sum(stopped,'net')/rows.length,medianNet:net[Math.floor(net.length/2)],p10:net[Math.floor(net.length*.1)],p90:net[Math.floor(net.length*.9)],normalGPerCz:r.normalGames/r.czEntries,nonAtGPerAt:(r.games-count('at')-count('zone')-count('comeback'))/r.atEntries,allGPerChallenge:r.games/r.burstAttempts,atGPerChallenge:count('at')/r.burstAttempts,observedSuccess:r.burstWins/r.burstAttempts,prior:{rtp:old.report.stoppedRtp.value,reach:old.report.completeRate,ordinary:old.report.ordinary.mean,burst:old.report.burst.mean,volatility:oldVol}});
}
assert.deepEqual(settings.map(x=>x.setting),[1,2,3,4,5,6]);
const allPass=settings.every(x=>x.gate.pass),summary={version:120,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),generatedAt:new Date().toISOString(),allPass,goal,selection:selected,configuration:{initial:NovaArt.defaults.initial,bonus:NovaArt.bonusTarget(),burst:NovaArt.burstRules,normalProbabilities:[1,2,3,4,5,6].map(s=>NovaNormal.roleProbabilities(s))},settings};
fs.writeFileSync('docs/balance120-final-summary.json',JSON.stringify(summary,null,2)+'\n');
let md=`# 分散型チャレンジとBIG・AT配分（v120）\n\n判定：**${allPass?'全設定で機械割・到達率の両方が採用範囲内':'未達あり・公開不可'}**。各設定30,000G×${num(settings[0].report.trials)}試行。\n\n## 変更内容\n\nBIGは50pt、初期ATは${NovaArt.defaults.initial}pt。BIG突破は通常52%・上位80%を維持。通常・CZのコイン持ちは50ptで約${selected.shared.base}G。通常レア役、AT各レベルの小役・上乗せ性能、特化9種の保証と抽選は維持。差枚による調整・通常ATの強制上限は設けない。\n\nチャレンジは1AT中1回まで、3G合算50%で成功。発生時にpt型${pct(NovaArt.burstRules.pointShare)}／裏ゾーン型${pct(1-NovaArt.burstRules.pointShare)}へ分岐する。\n\n- pt型成功時：${NovaArt.burstRules.awards.map((v,i)=>num(v)+'pt＝'+pct(NovaArt.burstRules.awardWeights[i])).join('、')}。\n- ptと独立にレベル抽選：${NovaArt.burstRules.levelTargets.map((v,i)=>(v?'Lv.'+v:'昇格なし')+'＝'+pct(NovaArt.burstRules.levelWeights[i])).join('、')}。現在のレベルより下がらない。\n- 裏型成功時：裏ギル・裏空・裏逢魔を各1/3で獲得。pt直接加算・レベル昇格はなく、選ばれた特化での獲得結果を加算する。\n- 両タイプを試せる一度きりの強制フラグをデバッグに追加。成功・失敗は通常の50%抽選。\n\n## 測定条件\n\n機械割は実払い出し÷実BET。リプレイ後のBETは無料。差枚＋10,000pt初回到達で停止し、未到達は30,000Gで打ち切る。到達率はその30,000G内の差枚＋10,000pt到達割合で、累計払い出しではない。未消化ptを出玉に先取りしない。特殊モード・設定別初期穢れから開始し、正しいナビ操作を仮定する。\n\n独立した検証シードを使用し、各設定の全試行を集計。機械割±0.5ポイント、到達率は設定1±0.75／設定2・3±1.0／設定4～6±1.5ポイントが採用範囲。95%区間は有限試行の不確実性を示す。ゲームコアによる試算であり、実機検定への適合を示すものではない。\n\n${selected.explanation??''}\n\n|設定|機械割|95%区間|1万pt到達率|95%区間|勝率|判定|\n|---|---:|---|---:|---|---:|---|\n`;
for(const s of settings)md+=`|${s.setting}|${pct(s.report.stoppedRtp.value)}|${ci(s.report.stoppedRtp.ci)}|${pct(s.report.completeRate)}|${ci(s.report.completeCI)}|${pct(s.report.win)}|${s.gate.pass?'範囲内':'未達'}|\n`;
md+='\n勝率・差枚は停止込み。下表のAT平均は全30,000G軌跡で終了まで観測できたATのみで、未終了ATを含む無条件平均とは異なる。\n\n|設定|平均差枚|中央値|10%点|90%点|停止なし機械割|チャレンジ成功なしAT平均|成功ありAT平均|\n|---|---:|---:|---:|---:|---:|---:|---:|\n';
for(const s of settings)md+=`|${s.setting}|${num(s.meanNet)}|${num(s.medianNet)}|${num(s.p10)}|${num(s.p90)}|${pct(s.report.rtp.value)}|${num(s.report.ordinary.mean)}pt|${num(s.report.burst.mean)}pt|\n`;
md+='\n## 波形\n\n比較はコンプリート後も継続した全30,000Gの1,000G区間。旧版は設定1・6各200試行の参考値。実際の停止までの完全な1,000G区間集計もJSONのstoppedVolatilityに保存。\n\n|設定|1,000Gで500pt以上下落|500pt以上上昇|区間差枚の標準偏差|最大下落幅の中央値|旧版の下落／上昇|\n|---|---:|---:|---:|---:|---|\n';
for(const s of settings){const v=s.report.volatility,o=s.prior.volatility;md+=`|${s.setting}|${pct(v.drop500)}|${pct(v.rise500)}|${num(v.block1000.sd)}pt|${num(v.drawdown.p50)}pt|${o?pct(o.drop500)+'／'+pct(o.rise500):'—'}|\n`;}
md+='\n## 頻度\n\n全30,000G軌跡の観測値。チャレンジ頻度は通常AT・特化待機・チャレンジ中を含むATのカウントGが分母（特化・5G引き戻しは除外）。低頻度イベントのため実戦ではばらつく。\n\n|設定|通常G/CZ|非AT G/AT初当たり|AT G/チャレンジ|全G/チャレンジ|チャレンジ回数|成功率|\n|---|---:|---:|---:|---:|---:|---:|\n';
for(const s of settings)md+=`|${s.setting}|1/${s.normalGPerCz.toFixed(1)}|1/${s.nonAtGPerAt.toFixed(1)}|1/${s.atGPerChallenge.toFixed(0)}|1/${s.allGPerChallenge.toFixed(0)}|${num(s.report.burstAttempts)}|${pct(s.observedSuccess)}|\n`;
md+='\n|設定|初当たり補正|チャレンジ係数|\n|---|---:|---:|\n';for(let i=0;i<6;i++)md+=`|${i+1}|${NovaArt.burstRules.normalBoost[i]}|${NovaArt.burstRules.entry[i]}|\n`;
md+='\n未発動の通常ATで、強ノヴァ目は係数そのまま、強スイカは×0.5、チャンス目A/Bは×0.2、弱ノヴァ目は×0.1、弱スイカは×0.05でチャレンジを抽選。当選後のタイプ振分と成功率は全設定共通。\n';
fs.writeFileSync('docs/balance120-final-report.md',md);console.log(JSON.stringify({allPass,settings:settings.map(s=>s.gate)},null,2));
