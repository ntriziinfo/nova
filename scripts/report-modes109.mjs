import fs from 'node:fs';import {createHash} from 'node:crypto';import {loadModel} from './zone-v2-model.mjs';loadModel();
const n=NovaNormal,games=[50,100,150,200,250,300,400,500,600],modes=n.modes.slice(0,6),out=[];
const add=(...lines)=>out.push(...lines,'');const table=(heads,rows)=>add('|'+heads.join('|')+'|','|'+heads.map(()=>'---').join('|')+'|',...rows.map(r=>'|'+r.join('|')+'|'));
add('# 画像仕様に合わせたモード・前兆109','提供画像は仕様の参照にのみ使用。画像・音源の加工なし。外部作品の演出名は「ざわつき」「NOVA前兆」に置換。',
'## 規定Gの期待度','仮値：△15%、○55%、◎80%。★は天井到達後3〜8Gの前兆を経てBIG50%／突破確定CZ50%。「—」は規定GのCZ抽選0%だが、モード示唆用のガセ前兆が出る場合がある。');
table(['G',...modes],games.map(g=>[g,...modes.map(mode=>g>n.ceiling({mode})?'対象外':g===n.ceiling({mode})?'★':({0:'—',0.15:'△',0.55:'○',0.8:'◎'}[n.zoneRate({mode,games:g-1})]))]));
add('特殊モードは前回どおり設定変更・朝一限定。50G25%、100G60%、150G25%、200G天井。特殊は下記のモード示唆ルールの対象外。','## AT終了時のモード再抽選','全設定共通の仮値。通常の移行先から特殊を除外。');
table(['終了条件',...n.modes],Object.entries(n.atEndModeWeights).map(([k,w])=>[k==='dry'?'初期1セットで駆け抜け':'それ以外',...w.map(x=>x+'%')]));
add('駆け抜け＝初期1セットのみ・直乗せなし・特化ゾーンなし。複数セットを最初に得た場合も対象外。駆け抜け後は通常Aを除外し、通常B以上へ移行。','ボーナス開始時のモード移行は従来の108表を維持。ATに入った場合は終了時に改めて上表で再抽選。穢れ・REG連続履歴は保持し、G数・前兆・天井消化履歴はリセット。','## 規定G前兆による示唆','「ざわつき」は画像のプレ前兆、「NOVA前兆」は画像の上位前兆に対応。内部の当否を文字で公開せず、表示とその結果から推測する。現仮実装では下表の「濃厚」を例外なしの条件として扱う。');
table(['G','前兆なし','ざわつき','NOVA前兆'],[
 [50,'基本','チャンス以上','CZの可能性。ガセ終了なら天国'],[100,'基本','天国準備','基本'],[150,'基本','通常B以上','CZ以上確定'],[200,'天国準備','通常B以上の期待度上昇','基本'],[250,'基本','通常C以上','CZ以上確定'],[300,'基本','チャンス','基本'],[400,'通常C','基本','基本'],[500,'基本','チャンス','基本'],[600,'基本','本前兆確定','本前兆確定']
]);
add('判定対象は通常遊技中の当該規定G前兆。小役によるCZ直当選・ボーナス・進行中のCZなどと重なった場合、表の「前兆なし」を示唆として扱わない。保存済み旧前兆は当選を保持し「前兆中」の旧表示で消化する。',
'前兆発生の基本は、規定Gで当選なら発生、非当選なら50%でガセ。ただし示唆矛盾を防ぐため200Gは天国準備以外、400Gは通常C以外で必ず前兆を出す。禁止される表示は選ばない。150/250Gのガセは上位前兆にしない。50Gの上位ガセは天国のみ。',
'前兆は当選・ガセとも3〜8Gの均等振分。保留中の表示種別・発生G数は保存・復元する。天井前兆は既存前兆を引き継がず新規の待機G数から始める。','## 動作・試算確認');
const summaries=[];for(let setting=1;setting<=6;setting++){
 const {report:r,rows}=JSON.parse(fs.readFileSync(`docs/modes109-setting-${setting}.json`));if(rows.length!==1000)throw Error('incomplete');
 const bet=rows.reduce((s,r)=>s+r.totalBet,0),paid=rows.reduce((s,r)=>s+r.totalPaid,0),ratio=paid/bet,N=rows.length,se=Math.sqrt(rows.reduce((s,r)=>s+(r.totalPaid-ratio*r.totalBet)**2,0)/(N-1)/N)/(bet/N);
 summaries.push({...r,ci95:[ratio-1.96*se,ratio+1.96*se],gameShare:(r.gameCZ+r.ceilingCZ)/(r.gameCZ+r.ceilingCZ+r.rareCZ)});
}
const pct=x=>(x*100).toFixed(2)+'%';table(['設定','試算機械割','参考95%区間','規定G・天井経由のCZ比率'],summaries.map(r=>[r.setting,pct(r.rtp),r.ci95.map(pct).join('〜'),pct(r.gameShare)]));
add('各設定最大1万G×1,000試行。朝一特殊モード、穢れ救済107、裏ギル106、差枚制御、差枚1万ptコンプリートを含む。前回108と同じseed。総払い出し／実投入の比率。ブラウザ操作による実測ではなく共通抽選ロジックによる試算。今回の変更以外の出玉調整は実施していない。',
'現状は目標機械割を下回り、設定6が設定5を下回る。仕様反映後の仮値の試算であり、出玉調整の完了を示す結果ではない。',
'対象テスト37件とHTML・アセット検査が成功。無音のブラウザで通常Aの199Gから200Gへ進め、第三停止後の「NOVA前兆開始」とモード表示を確認。ブラウザ実行エラーなし。');
fs.writeFileSync('docs/modes109-report.md',out.join('\n'));
fs.writeFileSync('docs/modes109-summary.json',JSON.stringify({summaries,sourceHashes:Object.fromEntries(['nova-normal.js','nova-art.js','nova-flow.js','nova-balance.js','scripts/zone-v2-model.mjs'].map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]))},null,2));
console.log(summaries);
