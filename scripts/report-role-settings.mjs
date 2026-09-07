import fs from 'node:fs';import vm from 'node:vm';
for(const f of ['nova-art.js','nova-balance.js','nova-normal.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const names={BELL:'ベル',REPLAY:'リプレイ',WEAK_SUICA:'弱スイカ',STRONG_SUICA:'強スイカ',STRONG_BELL:'強ベル',CHANCE_A:'チャンス目A',CHANCE_B:'チャンス目B',WEAK_NOVA:'弱ノヴァ目',STRONG_NOVA:'強ノヴァ目'};
let out='# 小役・ART直撃の設定差\n\n小役は偶奇で分けず、設定順に緩やかに変化します。以下は通常時の基本役抽選。天井やスーパーノヴァ目などの優先処理による上書き前の確率です。\n\n|役|設定1|設定2|設定3|設定4|設定5|設定6|\n|---|---|---|---|---|---|---|\n';
for(const [role,name]of Object.entries(names))out+='|'+name+'|'+[1,2,3,4,5,6].map(s=>'1/'+(1/NovaNormal.roleProbabilities(s)[role]).toFixed(2)).join('|')+'|\n';
out+='\nART中のレア役合算も同じ緩やかな係数で変化（設定1：2.904%、設定6：3.144%）。ベル・リプレイはレア役の払い出しを含めて通常ARTの期待純増2.5pt/Gになるよう補正。特化ゾーンの上乗せ振分は VOLATILITY-SPEC.md を参照。\n\n|設定|通常時ART直撃の抽選分母|\n|---|---|\n';for(let s=1;s<=6;s++)out+='|'+s+'|1/'+NovaBalance.profile(s).directDenom.toFixed(1)+'|\n';
out+='\n直撃分母は、その抽選に到達した通常時の値です。天井・スーパーノヴァ目の優先処理やCZ滞在を含む初当たり実績の分母ではありません。\n\n## 小役出現数のばらつき\n\n独立した基本役抽選10,000回の期待回数と標準偏差（√np(1−p)）。ゲーム全体の10,000GにはART・ボーナスも含まれるため、通常時の有効サンプルはさらに少なくなります。\n\n|役|設定1 期待回数±標準偏差|設定6 期待回数±標準偏差|\n|---|---|---|\n';for(const [role,name]of Object.entries(names))out+='|'+name+'|'+[1,6].map(s=>{const p=NovaNormal.roleProbabilities(s)[role];return (10000*p).toFixed(1)+' ± '+Math.sqrt(10000*p*(1-p)).toFixed(1)}).join('|')+'|\n';
out+='\n10,000回でも小役単独の分布は大きく重なります。ただし「10,000回までは判別できない」という保証や回転数による確率切り替えはありません。ART直撃等を合わせれば早く推測できる場合もあります。\n';fs.writeFileSync('ROLE-SETTINGS.md',out);fs.writeFileSync('../../outputs/小役確率と設定差.md',out);
