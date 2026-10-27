import {loadModel,simulate} from './zone-v2-model.mjs';

const DEFAULT_WINDOWS=[3000,10000,30000];
const DEFAULT_TRIALS=100;
const DEFAULT_SEED=174002027;
const SIMULATION_OPTIONS=Object.freeze({
 rng:'xoshiro128',
 exactGames:true,
 completeLimitPt:0,
 completeMyLimitPt:0,
 stopAtComplete:false,
 rareSortie:true,
 atBetRefund:true,
 replayRefund:true,
 checkpointQuiet:true,
 netGuard:true,
 decrement:true
});

function usage(){
 return `Usage: node scripts/report-parity-balance.mjs [options]

Options:
  --trials <n>          Trials per setting and window (default: ${DEFAULT_TRIALS})
  --seed <n>            Base unsigned integer seed (default: ${DEFAULT_SEED})
  --windows <csv>       Game windows (default: ${DEFAULT_WINDOWS.join(',')})
  --format <markdown|json>
                        Output format (default: markdown)
  --help                Show this help

Examples:
  node scripts/report-parity-balance.mjs --trials 100 --seed 174002027
  node scripts/report-parity-balance.mjs --trials 2 --windows 3000 --format json`;
}

function positiveInteger(value,label){
 const number=Number(value);
 if(!Number.isSafeInteger(number)||number<=0)throw new Error(`${label} must be a positive integer: ${value}`);
 return number;
}

function unsignedSeed(value){
 const number=Number(value);
 if(!Number.isSafeInteger(number)||number<0||number>0xffffffff)throw new Error(`--seed must be an unsigned 32-bit integer: ${value}`);
 return number;
}

function parseArguments(argv){
 const config={trials:DEFAULT_TRIALS,seed:DEFAULT_SEED,windows:[...DEFAULT_WINDOWS],format:'markdown'};
 for(let index=0;index<argv.length;index++){
  const argument=argv[index];
  if(argument==='--help'||argument==='-h')return {...config,help:true};
  const [name,inlineValue]=argument.split('=',2);
  const readValue=()=>inlineValue??argv[++index];
  if(name==='--trials')config.trials=positiveInteger(readValue(),'--trials');
  else if(name==='--seed')config.seed=unsignedSeed(readValue());
  else if(name==='--windows'){
   const raw=readValue();
   if(!raw)throw new Error('--windows requires a comma-separated list');
   config.windows=[...new Set(raw.split(',').map(value=>positiveInteger(value.trim(),'--windows')))];
  }else if(name==='--format'){
   config.format=String(readValue()??'').toLowerCase();
   if(!['markdown','json'].includes(config.format))throw new Error('--format must be markdown or json');
  }else throw new Error(`Unknown option: ${argument}`);
 }
 config.windows.sort((a,b)=>a-b);
 return config;
}

function quantile(sorted,p){
 if(sorted.length===0)return null;
 return sorted[Math.floor(p*(sorted.length-1))];
}

function trialSeed(baseSeed,windowIndex,setting,trial){
 return (baseSeed+Math.imul(windowIndex+1,100000000)+Math.imul(setting,1000003)+Math.imul(trial,7919))>>>0;
}

function styleFor(setting){
 const style=globalThis.NovaTuning?.balanceProfile?.(setting)?.style;
 if(style==='rough')return '荒波';
 if(style==='steady')return '安定';
 return setting%2===1?'奇数':'偶数';
}

function summarize(games,setting,runs){
 const nets=runs.map(row=>row.net).toSorted((a,b)=>a-b);
 const drawdowns=runs.map(row=>row.maxDrawdown).filter(Number.isFinite).toSorted((a,b)=>a-b);
 const p10=quantile(nets,.10),p90=quantile(nets,.90);
 const totalBet=runs.reduce((sum,row)=>sum+row.totalBet,0);
 const totalPaid=runs.reduce((sum,row)=>sum+row.totalPaid,0);
 return {
  games,
  setting,
  style:styleFor(setting),
  trials:runs.length,
  rtp:totalBet>0?totalPaid/totalBet:null,
  netP10:p10,
  netP90:p90,
  netP10P90Width:p10===null||p90===null?null:p90-p10,
  maxDrawdownP90:drawdowns.length===runs.length?quantile(drawdowns,.90):null,
  maxDrawdownAvailable:drawdowns.length===runs.length
 };
}

function comparePair(games,odd,even){
 const widthComparison=odd.netP10P90Width===null||even.netP10P90Width===null?null:odd.netP10P90Width>=even.netP10P90Width;
 const drawdownComparison=odd.maxDrawdownP90===null||even.maxDrawdownP90===null?null:odd.maxDrawdownP90>=even.maxDrawdownP90;
 let verdict='判定不能';
 if(widthComparison!==null&&drawdownComparison!==null){
  verdict=widthComparison&&drawdownComparison?'想定どおり':widthComparison||drawdownComparison?'指標混在':'逆転';
 }
 return {
  games,
  pair:`${odd.setting}-${even.setting}`,
  oddWidth:odd.netP10P90Width,
  evenWidth:even.netP10P90Width,
  oddMaxDrawdownP90:odd.maxDrawdownP90,
  evenMaxDrawdownP90:even.maxDrawdownP90,
  oddAtLeastAsWide:widthComparison,
  oddAtLeastAsDeep:drawdownComparison,
  verdict
 };
}

function integer(value){return value===null?'n/a':Math.round(value).toLocaleString('ja-JP');}
function percent(value){return value===null?'n/a':`${(value*100).toFixed(2)}%`;}

function markdown(report){
 const lines=[
  '# 奇数荒波・偶数安定 検証レポート',
  '',
  `- 試行数: 各設定・各窓 ${report.config.trials}回`,
  `- 基準seed: ${report.config.seed}`,
  `- 窓: ${report.config.windows.map(value=>`${value.toLocaleString('ja-JP')}G`).join(' / ')}`,
  '',
  '|G数|設定|設計|RTP|差pt P10|差pt P90|P10-P90幅|最大DD P90|',
  '|---:|---:|:---:|---:|---:|---:|---:|---:|'
 ];
 for(const row of report.rows)lines.push(`|${row.games.toLocaleString('ja-JP')}|${row.setting}|${row.style}|${percent(row.rtp)}|${integer(row.netP10)}|${integer(row.netP90)}|${integer(row.netP10P90Width)}|${integer(row.maxDrawdownP90)}|`);
 lines.push(
  '',
  '## 隣接する奇数・偶数の荒さ比較',
  '',
  '|G数|設定ペア|差pt幅 奇数 / 偶数|最大DD P90 奇数 / 偶数|判定|',
  '|---:|:---:|---:|---:|:---:|'
 );
 for(const row of report.pairs)lines.push(`|${row.games.toLocaleString('ja-JP')}|${row.pair}|${integer(row.oddWidth)} / ${integer(row.evenWidth)}|${integer(row.oddMaxDrawdownP90)} / ${integer(row.evenMaxDrawdownP90)}|${row.verdict}|`);
 lines.push('', '## 集計定義と制約', '');
 for(const note of report.notes)lines.push(`- ${note}`);
 return lines.join('\n');
}

function run(config){
 loadModel();
 const rows=[];
 for(const [windowIndex,games] of config.windows.entries()){
  for(let setting=1;setting<=6;setting++){
   const runs=[];
   for(let trial=0;trial<config.trials;trial++){
    runs.push(simulate(setting,games,trialSeed(config.seed,windowIndex,setting,trial),SIMULATION_OPTIONS));
   }
   rows.push(summarize(games,setting,runs));
  }
 }
 const pairs=[];
 for(const games of config.windows){
  const windowRows=rows.filter(row=>row.games===games);
  for(const oddSetting of [1,3,5])pairs.push(comparePair(games,windowRows.find(row=>row.setting===oddSetting),windowRows.find(row=>row.setting===oddSetting+1)));
 }
 const maxDrawdownAvailable=rows.every(row=>row.maxDrawdownAvailable);
 return {
  config:{...config,simulationOptions:SIMULATION_OPTIONS},
  rows,
  pairs,
  notes:[
   'RTPは全試行の総払出pt ÷ 総投入pt（試行RTPの単純平均ではない）。',
   'P10/P90は昇順標本の floor(p × (n-1)) 番目。幅は差pt P90 - P10。',
   maxDrawdownAvailable?'最大DDはモデルが返す各試行の「期間内ピーク差ptからの最大下落」を使い、そのP90を表示。':'このモデル実行では一部の最大DDが取得できず、該当欄を n/a とした。',
   '「想定どおり」は、同じ窓の隣接設定ペアで奇数のP10-P90幅と最大DD P90がどちらも偶数以上の場合。優劣や設定看破性を直接判定する指標ではない。',
   'モデルはゲームごとの全差pt系列を返さないため、回復時間、下落継続時間、増分標準偏差などの時系列指標はこの軽量レポートでは算出しない。',
   '各試行は指定Gで打ち切るため、終了時点の未消化ストック・残りptの将来価値はRTPに含まれない。'
  ]
 };
}

try{
 const config=parseArguments(process.argv.slice(2));
 if(config.help)process.stdout.write(`${usage()}\n`);
 else{
  const report=run(config);
  process.stdout.write(config.format==='json'?`${JSON.stringify(report,null,2)}\n`:`${markdown(report)}\n`);
 }
}catch(error){
 process.stderr.write(`${error.message}\n\n${usage()}\n`);
 process.exitCode=1;
}
