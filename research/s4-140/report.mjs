import fs from 'node:fs';
import assert from 'node:assert/strict';
import {summarize,hash,files,options,load} from './run.mjs';
const dir='research/s4-140',jobs=JSON.parse(fs.readFileSync(dir+'/holdout.json','utf8'));
const reports=jobs.map(c=>{const r=JSON.parse(fs.readFileSync(dir+'/'+c.tag+'.json','utf8'));assert.deepEqual(r.config,c);return r;});
const rows=reports.flatMap(r=>r.rows);assert.equal(rows.length,jobs.reduce((n,c)=>n+c.trials,0));assert.equal(new Set(rows.map(r=>r.seed)).size,rows.length);
for(const r of reports)assert.deepEqual(r.sources,reports[0].sources);
for(const f of files)assert.equal(hash(fs.readFileSync(f,'utf8')),reports[0].sources[f],f);
for(const r of rows){assert.equal(r.games,30000);assert.equal(r.net,r.totalPaid-r.totalBet);assert.equal(r.blocks.length,3);assert.equal(r.blocks.reduce((s,b)=>s+b.totalPaid,0),r.totalPaid);assert.equal(r.blocks.reduce((s,b)=>s+b.totalBet,0),r.totalBet);}
const summary=summarize(rows),czScale=jobs[0].czScale;assert(jobs.every(c=>c.czScale===czScale));
const pilots=JSON.parse(fs.readFileSync(dir+'/pilot.json','utf8')).map(c=>{const r=JSON.parse(fs.readFileSync(dir+'/'+c.tag+'.json','utf8'));return {config:c,summary:r.summary};});
load({czScale});
const roleRates=Object.keys(NovaNormal.rare).map(role=>({role,low:NovaNormal.roleCzRate({},role,4),high:NovaNormal.roleCzRate({level:'high'},role,4)}));
const report={generatedAt:new Date().toISOString(),setting:4,czScale,previousCzScale:.532,relativeChange:czScale/.532-1,options,sourceHashes:reports[0].sources,modelHashes:Object.fromEntries(['scripts/zone-v2-model.mjs','scripts/zone-v2-rng.mjs'].map(f=>[f,hash(fs.readFileSync(f,'utf8'))])),jobs,pilots,summary,roleRates,method:'Independent fresh starts, 30000 total paid/replay games including BIG per trial; 20000G checkpoint from the first two 10000G blocks. Full runs continue past complete; stopped totals use the exact prefix at first net +10000pt. Only actual payout and charged BET count; replay BETs free, 0G chains excluded, ending unspent AT quota excluded. Ratio of pooled payout / pooled bets; 95% cluster-by-trial confidence interval. Pilot seeds excluded from holdout validation.'};
fs.writeFileSync('docs/s4-140-summary.json',JSON.stringify(report,null,2));
const p=n=>(n*100).toFixed(2)+'%',r20=summary.horizons[20000],r30=summary.horizons[30000];
const lines=['# 設定4を100～101%へ調整（v140）','',
`通常時のCZ当選係数を設定4だけ0.532から${czScale}へ変更（相対${p(czScale/.532-1)}）。強ノヴァの強CZ確定、CZ突破抽選、初期pt、AT中の小役・上乗せ・裏チャレンジ・引き戻し、および他設定は変更しない。`,'',
`3候補を各600回・30,000Gで比較。その試行と重ならない${rows.length.toLocaleString('en-US')}個の乱数seedを使い、各30,000G、合計${(rows.length*30000).toLocaleString('en-US')}Gで最終候補を検証。20,000Gは同一試行の途中集計。`,'',
'|打ち切り条件|＋10,000ptコンプリート停止あり|95%信頼区間|停止なし|95%信頼区間|＋10,000pt到達率|',
'|---|---:|---:|---:|---:|---:|',
...[['20,000G',r20],['30,000G',r30]].map(([g,r])=>`|${g}|${p(r.stopped.rtp)}|${r.stopped.ci95.map(p).join('～')}|${p(r.full.rtp)}|${r.full.ci95.map(p).join('～')}|${p(r.completeRate)}|`),'',
`通常G基準のCZ出現率（強CZ含む）：1/${summary.czDenom.toFixed(1)}。AT初当たり：1/${summary.atDenom.toFixed(1)}。CZ成功比率：${p(summary.czSuccess)}（天井CZ含む／終了時未消化CZは成功数に含まれない）。`,'',
'機械割は全試行の実払い出し合計÷実投入合計。BIG消化を含む総回転数なので、BIG消化を除外する画面の総回転表示とは異なる。信頼区間は平均機械割の推定誤差であり、1台の出玉を100～101%の範囲へ制御するものではない。本番抽選コアのシミュレーションであり、実機検定値ではない。','',
'## 再現','',
'- node research/s4-140/run.mjs research/s4-140/pilot.json',
'- node research/s4-140/run.mjs research/s4-140/holdout.json',
'- node research/s4-140/report.mjs（採用前のソース状態で実行）',
'- docs/s4-140-summary.jsonに試行条件・採用前のソースSHA256・候補値・集計を保存。各試行の生データはresearch/s4-140/holdout-498-*.json。',''];
fs.writeFileSync('docs/s4-140-report.md',lines.join('\n'));console.log(JSON.stringify({czScale,...summary},null,2));
