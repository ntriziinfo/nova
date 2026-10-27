import fs from 'node:fs';import vm from 'node:vm';
for(const f of ['nova-art.js','nova-balance.js','nova-normal.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const roles=[
 ['8ptベル',row=>row.BELL+row.NAVI_BELL],['1枚役',row=>row.ONE_COIN],['リプレイ',row=>row.REPLAY],
 ['弱スイカ',row=>row.WEAK_SUICA],['弱チェリー',row=>row.WEAK_NOVA],['強チェリー',row=>row.STRONG_NOVA],['ハズレ',row=>row.MISS]
];
const normalProbability=(setting,pick)=>pick(NovaNormal.normalRoleProbabilities(setting));
let out='# 小役・ART直撃の設定差\n\n以下は現行の通常時自然抽選です。天井やスーパーノヴァ目などの優先処理による上書き前で、8ptベルは通常ベルと押し順ベルを合算しています。強スイカ・強ベル・チャンス目A/Bは自然抽選から退役しています。\n\n|役|設定1|設定2|設定3|設定4|設定5|設定6|\n|---|---|---|---|---|---|---|\n';
for(const [name,pick]of roles)out+='|'+name+'|'+[1,2,3,4,5,6].map(s=>'1/'+(1/normalProbability(s,pick)).toFixed(2)).join('|')+'|\n';
out+='\nART中のレア役合算は全設定共通約3.9471%。ベル・リプレイはスイカ3pt・弱／強チェリー各2ptの払い出しを含め、通常／上位ATとも期待純増4pt/Gになるよう補正しています。特化ゾーンの上乗せ振分は VOLATILITY-SPEC.md を参照。\n\n|設定|通常時ART直撃の抽選分母|\n|---|---|\n';for(let s=1;s<=6;s++)out+='|'+s+'|1/'+NovaBalance.profile(s).directDenom.toFixed(1)+'|\n';
out+='\n直撃分母は、その抽選に到達した通常時の値です。天井・スーパーノヴァ目の優先処理やCZ滞在を含む初当たり実績の分母ではありません。\n\n## 小役出現数のばらつき\n\n独立した基本役抽選10,000回の期待回数と標準偏差（√np(1−p)）。ゲーム全体の10,000GにはART・ボーナスも含まれるため、通常時の有効サンプルはさらに少なくなります。\n\n|役|設定1 期待回数±標準偏差|設定6 期待回数±標準偏差|\n|---|---|---|\n';for(const [name,pick]of roles)out+='|'+name+'|'+[1,6].map(s=>{const p=normalProbability(s,pick);return (10000*p).toFixed(1)+' ± '+Math.sqrt(10000*p*(1-p)).toFixed(1)}).join('|')+'|\n';
out+='\n10,000回でも小役単独の分布は大きく重なります。ただし「10,000回までは判別できない」という保証や回転数による確率切り替えはありません。ART直撃等を合わせれば早く推測できる場合もあります。\n';fs.writeFileSync('ROLE-SETTINGS.md',out);fs.writeFileSync('../../outputs/小役確率と設定差.md',out);
