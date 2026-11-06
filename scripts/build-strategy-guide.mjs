// Build read-only analysis tables from the same default rules as the game.
// Never imports nova-game.js or accesses a player's saved settings/state.
import fs from 'node:fs';
import {EVIDENCE, evidenceRows, hashes, modelHash, valid} from './rtp-current.mjs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sources=['nova-tuning.js','nova-normal.js','nova-flow.js','nova-art.js','nova-progress.js','nova-decrement.js','nova-results.js','nova-complete.js'];
const c=vm.createContext({console});
for(const file of sources){
 let source=fs.readFileSync(path.join(root,file),'utf8');
 if(file==='nova-results.js')source=source.replace(' return {pick,transition,bonus,',' globalThis.GuideResultHints={settingHints,bonusModeHints,names};\n return {pick,transition,bonus,');
 vm.runInContext(source,c,{filename:file});
}
const N=c.NovaNormal,F=c.NovaFlow,A=c.NovaArt,T=c.NovaTuning,P=c.NovaProgress,R=c.NovaResults;
const settings=[1,2,3,4,5,6];
const names={...A.names,...c.GuideResultHints.names,WEAK_SUICA:'スイカ',WEAK_NOVA:'弱チェリー',STRONG_NOVA:'強チェリー',SUPER_NOVA:'スーパーノヴァ',STRONG_SUICA:'旧・強スイカ',CHANCE_A:'旧・チャンス目A',CHANCE_B:'旧・チャンス目B',REPLAY:'リプレイ',BELL:'8ptベル',BELL15:'15ptベル',NAVI_BELL:'押し順8ptベル',MISS:'ハズレ',ONE_COIN:'1pt役',NEBULA:'ネビュラ',START_REPLAY_RIGHT:'開始リプレイ（右→中→左）',START_REPLAY_MIDDLE:'開始リプレイ（中→右→左）',START_REPLAY_LEFT:'開始リプレイ（左→中→右）',kushuri:'くしゅり',nito:'にと',giru1:'ギル',sora1:'空',ouma1:'逢魔'};
const esc=x=>String(x??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const num=(v,d=4)=>Number(v).toFixed(d).replace(/\.?0+$/,'');
const pct=v=>num(v*100)+'%';
const rate=v=>v>0?pct(v)+' / 約1/'+num(1/v,3):'0%';
const text=s=>'<p>'+s+'</p>';
const note=s=>'<p class="novaGuideNote">'+s+'</p>';
const h=s=>'<h4>'+s+'</h4>';
function table(headers,rows){return '<div class="novaGuideTableWrap"><table><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
const st=(headers,fn)=>table(['設定',...headers],settings.map(s=>[s,...fn(s)]));
const roleTable=(title,fn)=>h(title)+table(['成立役',...settings.map(s=>'設定'+s)],Object.keys(fn(1)).map(role=>[names[role]||role,...settings.map(s=>rate(fn(s)[role]))]));
const bySetting=(title,headers,fn)=>h(title)+st(headers,fn);
const sections=[];
function add(id,title,body){sections.push({id,title,html:'<section id="guide-analysis-'+id+'" class="novaGuideSection novaGuideAnalysis" aria-labelledby="guide-analysis-'+id+'-title"><h3 id="guide-analysis-'+id+'-title" tabindex="-1">'+title+'</h3>'+body+'</section>'});}
const rtp=JSON.parse(fs.readFileSync(path.join(root,'nova-rtp-current.json'),'utf8'));
// Keep the guide's published PAY column distinct from the continuous model results.
const publishedPay = [95, 97, 99, 103, 111, 116];
const cues = JSON.parse(fs.readFileSync(path.join(root, 'docs/guide-bonus-frequencies.json'), 'utf8'));
const currentHashes = hashes(root);
const report = JSON.parse(fs.readFileSync(path.join(root, EVIDENCE), 'utf8'));
const verifiedRows = valid(report, currentHashes) ? evidenceRows(report) : [];
const cueRows = cues.modelHash === modelHash(currentHashes) ? cues.settings : [];
const frequency = (games, hits) => Number.isSafeInteger(games) && Number.isSafeInteger(hits) && hits > 0 && games >= hits
  ? '1/' + (games / hits).toLocaleString('ja-JP', {minimumFractionDigits:1, maximumFractionDigits:1})
  : '未集計';
const cueRow = setting => cueRows.find(row => row.setting === setting);
const bbFrequency = row => frequency(row?.normalGames + row?.czGames, row?.bbInitials);
const initialBasis = 'BB・AT初当たりの分母は、通常G＋通常時に入ったCZの消化G（成功・失敗ともに加算）。BBは通常・CZからの当選、ATは新たに始まった初当たりを数えます。BB・準備中・AT・特化ゾーンの消化Gは分母から除きます。';
const specs = st(['BB初当たり確率','AT初当たり確率','機械割（掲載値）'], setting => {
  const row = cueRow(setting);
  const counts = verifiedRows.find(entry => entry.setting === setting)?.counts;
  return [bbFrequency(row), frequency(counts?.normal + counts?.cz, counts?.artEntries), publishedPay[setting - 1] + '%'];
}) + text('本機は純増約4pt/Gの「ノヴァラッシュ」を搭載したAT機。ノヴァラッシュへはビッグボーナス（50pt）中のネビュラ揃いを経由して突入する。さらに、爆発契機の「出陣チャレンジ」を搭載。')
   + note(initialBasis + ' 各設定の試算はBBが' + cues.gamesPerSetting.toLocaleString('ja-JP') + 'G、ATが' + (report.gamesPerSetting ?? report.totalGamesPerSetting).toLocaleString('ja-JP') + 'Gです。');
const bonusRates = st(['BB初当たり（通常＋CZ）','赤７揃い（上乗せ特化ゾーン）確率'], setting => {
  const row = cueRow(setting);
  return [bbFrequency(row), frequency(row?.atGames, row && row.directSevens + row.stockSevens)];
}) + note('赤７は、通常AT・上位ATの全消化G（0G連を除く）を合算し、初期特化・ストック放出を含む特化ゾーン突入告知の回数で割った値です。')
   + bySetting('出陣揃い確率',['通常・AT合算'], setting => {
     const row = cueRow(setting);
     return [frequency(row?.normalGames + row?.atGames, row?.sortieStarts)];
   })
   + note('通常時・通常AT・上位ATの消化G数の合計 ÷ 出陣開始回数の合計。CZ・BBの消化Gと0G連、フェイクは除きます。CZ・BB中などに予約された出陣は、実際に開始したときに1回計上します。')
   + h('出陣揃いの抽選内訳')
   + st(['スイカ成立時','弱チェリー成立時','強チェリー成立時'], setting =>
     ['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA'].map(role => pct(P.sortieChance(setting, role))))
   + text('抽選対象のゲームで各小役を引いたときの出陣当選率。当選すると「中リールにNOVAを狙え！」でNOVA・チェリー・NOVAが止まり、出陣チャレンジへ。狙え演出の抽選比率は本前兆1に対してフェイク2。')
   + note('上表は小役成立後の当選率です。小役自体の出現率は「小役確率・払い出しの全表」に通常時・CZ中・通常AT中・上位AT中の別表で掲載しています。')
   + note('赤7・出陣の出現頻度は各設定' + cues.gamesPerSetting.toLocaleString('ja-JP') + 'Gの連続試算（コンプリート打ち切りなし）。');
function guideRatesSection(id, title, body) {
  return '<section id="guide-' + id + '" class="novaGuideSection novaGuideRates" aria-labelledby="guide-' + id + '-title">\n<h3 id="guide-' + id + '-title" tabindex="-1">' + title + '</h3>\n' + body + '\n</section>';
}
const rateSections = [
  guideRatesSection('features', 'スロットノヴァのスペックと特徴', specs),
  guideRatesSection('bonus-rates', 'ボーナス確率', bonusRates)
];
const plain=x=>JSON.parse(JSON.stringify(x,(_k,v)=>typeof v==='bigint'?v.toString():v));
const hints=c.GuideResultHints;
const data={schema:'nova-strategy-values/v1',edition:'2026-11-05',scope:'Standard source rules; not per-machine overrides',sources:Object.fromEntries(sources.map(f=>[f,createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),current:{settings:settings.map(s=>({setting:s,tuning:T.profile(s),balance:T.balanceProfile(s),normalRoles:N.normalRoleProbabilities(s),czRoles:N.roleProbabilities(s),cz:F.forSetting({},s),atRoles:A.roleProbabilities(s),upperRoles:A.roleProbabilities(s,true),comebackRoles:A.comebackRoleProbabilities(s),preparationRoles:A.preparationProbabilities(s),decrement:c.NovaDecrement.rules(s)})),resultHints:hints},exportedReference:{NovaNormal:plain(N),NovaFlow:plain(F),NovaArt:plain(A),NovaComplete:plain(c.NovaComplete)}};
const file=path.join(root,'jag.html');const originalHtml=fs.readFileSync(file,'utf8');let html=originalHtml;
const settingIntro=html.match(/<section id="guide-setting"[\s\S]*?<\/section>/)?.[0];
if(!settingIntro)throw Error('Setting guide missing');
html=html.replace(settingIntro+'\n','').replace(settingIntro,'');
html=html.replace(/(<!-- NOVA GUIDE RATES START -->)[\s\S]*?(<!-- NOVA GUIDE RATES END -->)/, (_match,start,end)=>[start,...rateSections,end].join('\n'));
// Keep the introductory index and reading order aligned.
const introOrder=['spec','features','setting','bonus-rates','play','flow','normal','cz','bb','at','zones','premium'];
const introLabels=['基本スペック','スロットノヴァのスペックと特徴','設定推測・やめどき','ボーナス確率','打ち方・狙え','ゲームフロー','通常時・天井・ゾーン','CZ・強CZ','BB・穢れ解放','AT・引き戻し','キャラ特化ゾーン','出陣・上位AT'];
html=html.replace('<section id="guide-bonus-rates"',settingIntro+'\n<section id="guide-bonus-rates"');
let normalIntro=html.match(/<section id="guide-normal"[\s\S]*?<\/section>/)?.[0];
const originalNormalIntro=normalIntro;
normalIntro=normalIntro.replace('通常時・モード・天井','通常時・天井・ゾーン');
normalIntro=normalIntro.replace(/<!-- NOVA ZONE GUIDE START -->[\s\S]*?<!-- NOVA ZONE GUIDE END -->/,'');
const zones=h('モード別のCZゾーン・天井')+table(['モード','100G','200G','300G','400G','500G','600G','700G','天井'],N.modes.map((mode,i)=>[mode,...Array.from({length:7},(_,j)=>{const g=(j+1)*100;return g>=N.ceilings[i]?'—':pct(N.gameZoneRates[mode][g]||0);}),N.ceilings[i]+'G']))+note('表はCZ入口の基礎抽選率。実際は設定別入口補正を掛け、上限100%。BB当選率ではありません。天井が優先され、朝一リセット後の初回BBまではA・Bの天井が600Gになります。通常＋CZの内部ゲーム数が基準です。')+h('ゾーン前後の挙動で分かること')+table(['挙動','示唆・読み取り方'],[['50G付近のCZ','天国・天国ループは100%、A・B・Cは10%でフェイクCZへ。天国系に期待できるが確定ではない'],['100GのCZ','実抽選に外れてもフェイクCZへ入るため、突入だけではモードを判別できない'],['200G以降のCZ','モード別の入口率に差あり。レア役契機もあるため、CZ出現だけでモード確定とはしない'],['フェイクCZ','成功・書き換えなし。CZに入ったこととBB当選は分けて判断']])+h('終了画面のぬいぐるみで次のゾーンを確認')+table(['ぬいぐるみ','モード示唆','次の確認ポイント'],[['くしゅり・とと','デフォルト','モードを絞り込めない'],['にと・宗介','B以上示唆','Bの300G・500Gなどに注目。Aの可能性も残る'],['うらぴ・ねこ','C以上示唆','Cの100G・300Gなどに注目。A・Bの可能性も残る'],['やまだ','B以上確定','天井は通常時最大700G。朝一の短縮は別途適用'],['にご','C以上確定','天井は400G以内'],['ギル・そら・おうま','天国以上確定','天井は200G以内']])+note('通常へ戻るBB終了画面、および通常へ戻るAT終了画面の次回モード示唆です。BBからATへ進む画面は次回モードを示しません。「示唆」と「確定」は区別し、示唆を確認したら、<a href="#guide-setting">設定推測・やめどき</a>もあわせて確認しましょう。');
normalIntro=normalIntro.replace('</section>','<!-- NOVA ZONE GUIDE START -->'+zones+'<!-- NOVA ZONE GUIDE END --></section>');
html=html.replace(originalNormalIntro,normalIntro);
const introNavStart=html.indexOf('<nav aria-label="攻略情報の目次">');
const introNavEnd=html.indexOf('</nav>',introNavStart);
if(introNavStart<0||introNavEnd<0)throw Error('Intro index missing');
html=html.slice(0,introNavStart)+'<nav aria-label="攻略情報の目次">'+introOrder.map((id,i)=>'<a href="#guide-'+id+'"><span>'+String(i+1).padStart(2,'0')+'</span>'+introLabels[i]+'</a>').join('')+html.slice(introNavEnd);
html=html.replace(/\n?<!-- NOVA FULL ANALYSIS START -->[\s\S]*?<!-- NOVA FULL ANALYSIS END -->/,'');
html=html.replace(/<!-- NOVA FULL INDEX START -->[\s\S]*?<!-- NOVA FULL INDEX END -->/,'');
// Detailed analysis appendix is intentionally removed from the player guide.
html=html.replace('成功で裏ギル・裏空・裏逢魔のいずれかを獲得し、上位ATにつながる。','成功報酬は契機で異なり、上位ATにつながる。初回・差枚節目から成功した場合は、上位ATの特化選択表を使用。');
if(html.replace(/\r/g,'')!==originalHtml.replace(/\r/g,''))fs.writeFileSync(file,html);fs.writeFileSync(path.join(root,'nova-strategy-values.json'),JSON.stringify(data,null,2)+'\n');
if(settings.some(s=>Math.abs(Object.values(N.normalRoleProbabilities(s)).reduce((a,b)=>a+b,0)-1)>1e-9))throw Error('Invalid guide tables');
console.log(JSON.stringify({analysisSections:sections.length,sourceModules:sources.length,htmlBytes:Buffer.byteLength(html),dataBytes:fs.statSync(path.join(root,'nova-strategy-values.json')).size}));
