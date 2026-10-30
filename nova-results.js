/* Provided character originals stay separate from the CSS background and result text. */
globalThis.NovaResults=(()=>{
 const chars=['sosuke','toto','urapi','giru','sora','ouma'];
 const initialChars=['kushuri','nito','kushuri_nito'];
 const names={sosuke:'宗介',toto:'とと',urapi:'うらぴ',giru:'ギル',sora:'空',ouma:'逢魔',kushuri:'くしゅり',nito:'にと',kushuri_nito:'くしゅり＆にと',boss:'ボス集合',sora2:'空（私服）',ouma2:'逢魔（私服）',group:'全員集合',plush_kushuri:'くしゅりぬい',plush_toto:'ととぬい',plush_nito:'にとぬい',plush_sosuke:'宗介ぬい',plush_urapi:'うらぴぬい',plush_neko:'ねこぬい',plush_yamada:'やまだぬい',plush_nigo:'にごぬい',plush_giru:'ギルぬい',plush_sora:'そらぬい',plush_ouma:'おうまぬい'};
 const settingHints=[
  {character:'boss',color:'blue',minSetting:2,percent:10},
  {character:'sora2',color:'purple',minSetting:4,percent:3},
  {character:'ouma2',color:'gold',minSetting:5,percent:2},
  {character:'group',color:'rainbow',minSetting:6,percent:1}
 ];
 const bonusModes=['A','B','C','天国','天国ループ'];
 const bonusModeHints=[
  {id:'default',label:'デフォルト',characters:['plush_kushuri','plush_toto']},
  {id:'b-hint',label:'モードB以上示唆',characters:['plush_nito','plush_sosuke'],minimum:1,percent:20,otherPercent:10},
  {id:'c-hint',label:'モードC以上示唆',characters:['plush_urapi','plush_neko'],minimum:2,percent:15,otherPercent:5},
  {id:'b-confirmed',label:'モードB以上確定',characters:['plush_yamada'],minimum:1,percent:10,otherPercent:0},
  {id:'c-confirmed',label:'モードC以上確定',characters:['plush_nigo'],minimum:2,percent:5,otherPercent:0},
  {id:'heaven-confirmed',label:'天国以上確定',characters:['plush_giru','plush_sora','plush_ouma'],minimum:3,percent:3,otherPercent:0}
 ];
 // Migrate saved portraits by their old hint meaning, not by character name.
 // Old Ouma/Giru certified B/C; their new plush portraits certify heaven.
 const legacyModePortraits={nova:'plush_kushuri',kushuri:'plush_kushuri',toto:'plush_toto',nito:'plush_nito',sosuke:'plush_sosuke',urapi:'plush_urapi',ouma:'plush_yamada',giru:'plush_nigo',sora:'plush_sora'};
 const legacyModeLayouts={plush_kushuri:'kushuri',plush_toto:'toto',plush_nito:'nito',plush_sosuke:'sosuke',plush_urapi:'urapi',plush_neko:'urapi',plush_yamada:'ouma',plush_nigo:'giru',plush_giru:'sora',plush_sora:'sora',plush_ouma:'sora'};
 function bonusHintRates(mode){
  const index=bonusModes.indexOf(mode);if(index<0)return [];
  const hints=bonusModeHints.slice(1).map(h=>({...h,characters:[...h.characters],percent:index>=h.minimum?h.percent:h.otherPercent}));
  return [{...bonusModeHints[0],characters:[...bonusModeHints[0].characters],percent:100-hints.reduce((sum,h)=>sum+h.percent,0)},...hints];
 }
 function bonusVisualRandom(){
  // Presentation has its own randomness; never fall back to the game's Math.random.
  try{return globalThis.crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;}catch{return NaN;}
 }
 function pick(kind,zone,setting,rng=Math.random){
  if(kind==='at'){
   // Reuse the existing single result draw; presentation never consumes an extra game draw.
   const roll=rng()*100,s=Number(setting);let hintPercent=0;
   if(Number.isInteger(s)&&s>=1&&s<=6)for(const hint of settingHints){
    if(s<hint.minSetting)continue;
    hintPercent+=hint.percent;
    if(roll<hintPercent)return {character:hint.character,color:hint.color};
   }
   const n=Math.min(11,Math.floor((roll-hintPercent)/(100-hintPercent)*12));
   return {character:chars[Math.floor(n/2)],color:n%2?'blue':'red'};
  }
  return {character:chars.includes(zone)||initialChars.includes(zone)?zone:'sosuke',color:initialChars.includes(zone)?'initial':rng()<(Number(setting)%2?.6:.4)?'red':'blue'};
 }
 function transition(before,after,setting,rng=Math.random){
  if(before?.zone&&!after?.zone)return {kind:'zone',...pick('zone',before.zone,setting,rng),pt:String(after?.award??before.award??0)};
  return null;
 }
 function bonus(pt,flow,mode,rng=bonusVisualRandom){
  const result={kind:'bonus',character:'plush_kushuri',color:flow?.phase==='normal'?'mode':'blue',pt:String(pt),next:flow?.phase==='art'?'AT':'通常'};
  // AT end draws a new mode, so a BB returning to AT cannot hint the next normal mode.
  const rates=flow?.phase==='normal'?bonusHintRates(mode):[];
  let roll=rng()*100;if(!Number.isFinite(roll)||roll<0||roll>=100)return result;
  if(!rates.length)return {...result,character:roll<50?'plush_kushuri':'plush_toto'};
  for(const hint of rates){
   if(roll<hint.percent)return {...result,character:hint.characters[Math.floor(roll/hint.percent*hint.characters.length)]};
   roll-=hint.percent;
  }
  return result;
 }
 function sortie(event,flow){
  if(!event?.finished||!Number.isInteger(event.hits)||event.hits<0)return null;
  const card={kind:'sortie',character:'all',color:'gold',count:event.hits,...(flow?.sortieInitialPending?{next:'initial'}:{})};
  if(!Array.isArray(flow?.queuedZones))return card;
  // This challenge appends its awards to the queue; older stock is not part of its result.
  const earned=event.hits>0?flow?.queuedZones?.slice(-event.hits):[];
  if(!earned||earned.length!==event.hits)return card;
  const awards=new Map();
  for(const raw of earned){
   const zone=String(raw).replace(/^normal_/,''),character=zone.replace(/^ura_/,'');
   if(!chars.includes(character)&&character!=='kushuri_nito')return card;
   if(!awards.has(zone))awards.set(zone,{zone,character,ura:zone.startsWith('ura_'),count:0});
   awards.get(zone).count++;
  }
  return {...card,awards:[...awards.values()]};
 }
 function chain(previous,before,after,card){
  const points=value=>/^\d+$/.test(String(value??''))?BigInt(value):0n;
  const pending=after?.phase==='art'&&!after.burstPending&&!after.researchChallengeActive&&!after.researchSortieLeft&&!!(after.queuedZones?.length||points(after.sets)>0n||after.entryStage);
  if(!card)return {state:after?.phase==='art'&&(before?.zone||after.zone||pending)?previous||null:null,card:null};
  const totalPt=(points(card.pt)+(previous?.open?points(previous.totalPt):0n)).toString();
  const zoneCount=(previous?.open?Math.max(0,Math.floor(Number(previous.zoneCount)||0)):0)+1;
  const state={totalPt,zoneCount,open:pending};
  return {state,card:zoneCount>1||pending?{...card,totalPt,zoneCount}:card};
 }
 const characterImages={sosuke:'lamps-20260916/sosuke.png',toto:'lamps-20260916/toto.png',urapi:'lamps-20260916/urapi.png',giru:'lamps-20260916/giru1.png',sora:'lamps-20260916/sora1.png',ouma:'lamps-20260916/ouma1.png',kushuri:'lamps-20260928/kushuri.png',nito:'lamps-20260928/nito.png',kushuri_nito:'lamps-20260928/nito.png',boss:'result-boss.png',sora2:'result-sora2.png',ouma2:'result-ouma2.png',group:'result-group.png',plush_kushuri:'result-plush-20261024/kushuri.png',plush_toto:'result-plush-20261024/toto.png',plush_nito:'result-plush-20261024/nito.png',plush_sosuke:'result-plush-20261024/sosuke.png',plush_urapi:'result-plush-20261024/urapi.png',plush_neko:'result-plush-20261024/neko.png',plush_yamada:'result-plush-20261024/yamada.png',plush_nigo:'result-plush-20261024/nigo.png',plush_giru:'result-plush-20261024/giru.png',plush_sora:'result-plush-20261024/sora.png',plush_ouma:'result-plush-20261024/ouma.png'};
 const defaults={x:22,y:34,w:56,h:23,imageX:0,imageY:0,scale:100,numberX:47,numberY:51,numberW:51,numberH:30,font:10};
 const images=new Map();
 let positions={},root,card,art,num,fallback,panel,select,preview=false,active=null,imageRequest=0;
 try{
  positions=JSON.parse(localStorage.getItem('nova_result_layout_v2'));
  if(!positions){
   const previous=JSON.parse(localStorage.getItem('nova_result_layout_v1'))||{};
   // Retain the user's screen placement; baked-image digit coordinates do not fit this design.
   positions=Object.fromEntries(Object.entries(previous).map(([id,p])=>[id,Object.fromEntries(['x','y','w','h'].filter(k=>Number.isFinite(p[k])).map(k=>[k,p[k]]))]));
  }
 }catch{positions={};}
 const key=()=>active?.kind==='bonus'?'bonus-'+(active.character==='nova'?'blue':active.character):active?.kind==='sortie'?'sortie-gold':active?active.character+'-'+active.color:'sosuke-red';
 const legacyKey=()=>{const character=legacyModeLayouts[active?.character];return character?(active.kind==='bonus'?'bonus-'+character:character+'-'+active.color):'';};
 const baseLayout=()=>({...defaults,...(active?.character==='all'?{x:14,y:28,w:72,h:36,numberX:20,numberY:80,numberW:60,numberH:13,font:8}:{}),...(active?.kind==='sortie'?{numberX:4,numberW:92,font:6}:{}),...(active?.kind==='bonus'?{font:14,...positions['bonus-blue']}: {})});
 const layout=()=>({...baseLayout(),...positions[legacyKey()],...positions[key()]});
 function loadImage(character,color,prewarm=false){
  const src='assets/illustrations/'+(characterImages[character]||characterImages.sosuke),cached=images.get(src);
  if(cached&&!cached.failed)return cached;
  const img=new Image();img.draggable=false;img.decoding='async';img.fetchPriority=prewarm?'low':'high';
  const entry={img,ready:false,failed:false};images.set(src,entry);
  entry.loaded=new Promise(resolve=>{
   const finish=ready=>{entry.ready=ready;entry.failed=!ready;resolve(entry);};
   img.onload=()=>finish(img.naturalWidth>0); // Do not hide an already loaded portrait behind a stalled decode promise.
   img.onerror=()=>finish(false);img.src=src;
  });
  return entry;
 }
 function awardText(value){return value.kind==='sortie'?'特化ゾーン×'+value.count+'獲得':(value.character==='all'&&Number(value.pt)>=0?'+':'')+value.pt+'pt';}
 function renderSortieAwards(roster,awards){
  roster.replaceChildren();
  for(const award of awards){
   if(!characterImages[award.character]||!Number.isInteger(award.count)||award.count<1)continue;
   const item=document.createElement('figure'),pictures=document.createElement('div'),caption=document.createElement('figcaption'),count=document.createElement('output');
   item.className='novaResultStock';pictures.className='novaResultStockImages';
   const characters=award.character==='kushuri_nito'?['nito','kushuri']:[award.character];
   for(const character of characters){const img=document.createElement('img');img.src='assets/illustrations/'+characterImages[character];img.alt=names[character];img.draggable=false;pictures.append(img);}
   caption.textContent=(award.ura?'裏':'')+names[award.character];count.textContent='×'+award.count;
   item.dataset.ura=String(!!award.ura);item.setAttribute('aria-label',caption.textContent+' ×'+award.count);
   item.append(pictures,caption,count);roster.append(item);
  }
 }
 function apply(){if(!active||!root)return;const p=layout();card.style.cssText=`left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%;`;
  const cw=card.clientWidth,duo=active.character==='kushuri_nito',all=active.character==='all',group=active.character==='group';
  // The supplied group canvas includes empty space on its right; retain the original canvas.
  art.style.cssText=`left:${(all?4:duo?-5:1)+p.imageX}%;top:${(all?23:3)+p.imageY}%;width:${(all?92:duo?57:group?82:46)*p.scale/100}%;height:${(all?56:94)*p.scale/100}%;`;
  const roster=art.querySelector('.novaResultStocks');
  if(active.kind==='sortie'&&roster){const n=roster.childElementCount,cols=n<=3?Math.max(1,n):Math.ceil(n/2);roster.style.cssText=`--columns:${cols};--rows:${n>3?2:1};--count-font:${Math.max(14,Math.min(36,cw/cols*.27))}px;--label-font:${Math.max(9,Math.min(18,cw/cols*.10))}px;`;}
  const chained=active.totalPt!=null,mainHeight=p.numberH*(chained?.65:1);
  const textWidth=active.kind==='sortie'?awardText(active).length:(String(active.pt).length+2)*.72;
  const font=Math.min(cw*p.font/100,cw*p.numberW/100/textWidth,chained?card.clientHeight*mainHeight/100*.95:Infinity);
  fallback.querySelector('output').style.cssText=`left:${p.numberX}%;top:${p.numberY}%;width:${p.numberW}%;height:${mainHeight}%;font-size:${font}px;`;
  const total=fallback.querySelector('.novaResultTotal');
  if(total)total.style.cssText=`left:${p.numberX}%;top:${p.numberY+mainHeight}%;width:${p.numberW}%;height:${p.numberH-mainHeight}%;font-size:${Math.min(cw*.035,cw*p.numberW/100/((String(active.totalPt||0).length+7)*.75))}px;`;
  for(const [selector,scale] of [['strong',.048],['span',.034],['.novaResultNext',.032]])fallback.querySelector(selector).style.fontSize=all?cw*scale+'px':active.kind==='bonus'?cw*({strong:.07,span:.06,'.novaResultNext':.04}[selector])+'px':'';
 }
 function init(){if(root)return;const machine=document.getElementById('machine');if(!machine)return;
  root=document.createElement('div');root.className='novaResultsLayer';root.hidden=true;
  root.innerHTML='<div class="novaResultCard"><div class="novaResultArt"><img draggable="false" alt=""><output class="novaResultNumber"></output><img loading="lazy" class="novaResultPartner" src="assets/illustrations/lamps-20260928/kushuri.png" alt="くしゅり" draggable="false" hidden><div class="novaResultEnsemble" hidden></div><div class="novaResultStocks" hidden></div></div><div class="novaResultFallback" role="status"><strong>RESULT</strong><span></span><output></output><small class="novaResultTotal" hidden></small><small class="novaResultNext" hidden>次のBETでスーパーノヴァチャレンジ</small></div></div>';
  machine.append(root);card=root.firstElementChild;art=card.firstElementChild;num=art.querySelector('output');fallback=card.querySelector('.novaResultFallback');
  // Both background colors share the same unmodified character image.
  // Include mode-hint plush portraits; their first appearance must not start a burst of requests.
  if(globalThis.NovaPresentation)for(const character of Object.keys(characterImages)){
   NovaPresentation.warm('result:'+character,()=>loadImage(character,undefined,true).loaded);
  }
  const ensemble=art.querySelector('.novaResultEnsemble');
  for(const character of ['kushuri','nito',...chars]){const img=document.createElement('img');img.loading='lazy';img.src='assets/illustrations/'+characterImages[character];img.alt=names[character];img.draggable=false;ensemble.append(img);}
  if(globalThis.NovaUiAccess?.canEdit === true){
  const button=document.createElement('button');button.id='novaResultAdjust';button.textContent='リザルト調整';document.body.append(button);
  panel=document.createElement('dialog');panel.className='novaResultSettings';panel.innerHTML='<h3>リザルト配置</h3><label>確認画像 <select id="novaResultSelect"></select></label><div class="novaResultFields"></div><button type="button" id="novaResultReset">この画像を初期位置へ</button> <button type="button" id="novaResultClose">閉じる</button><p>変更はこのブラウザに画像別で自動保存します。画像は縦横比を維持します。</p>';document.body.append(panel);
  select=panel.querySelector('select');select.innerHTML=chars.flatMap(id=>['red','blue'].map(c=>`<option value="${id}-${c}">${names[id]}・${c==='red'?'赤':'青'}</option>`)).join('')+initialChars.map(id=>`<option value="${id}-initial">${names[id]}・初期pt</option>`).join('')+settingHints.map(h=>`<option value="${h.character}-${h.color}">${names[h.character]}・設定${h.minSetting}${h.minSetting===6?'確定':'以上'}</option>`).join('')+'<option value="all-gold">全キャラ・有利区間終了</option>';
  const fields={x:'表示枠 X（%）',y:'表示枠 Y（%）',w:'表示枠 幅（%）',h:'表示枠 高さ（%）',imageX:'画像 X（%）',imageY:'画像 Y（%）',scale:'画像倍率（%）',numberX:'獲得pt X（%）',numberY:'獲得pt Y（%）',numberW:'獲得pt 幅（%）',numberH:'獲得pt 高さ（%）',font:'数字サイズ（%）'};
  panel.querySelector('.novaResultFields').innerHTML=Object.entries(fields).map(([k,label])=>`<label>${label}<input type="number" step="0.5" data-field="${k}"></label>`).join('');
  const fill=()=>panel.querySelectorAll('input').forEach(el=>el.value=layout()[el.dataset.field]);
  button.onclick=()=>{if(!active){preview=true;show({kind:'preview',character:'sosuke',color:'red',pt:'1234'});}select.value=key();fill();panel.show();};
  select.insertAdjacentHTML('beforeend','<option value="sortie-gold">出陣チャレンジ・獲得数</option>');
  select.insertAdjacentHTML('beforeend','<option value="bonus-blue">BB終了・共通</option>');
  select.insertAdjacentHTML('beforeend',bonusModeHints.flatMap(h=>h.characters.map(id=>`<option value="bonus-${id}">BB終了・${names[id]}／${h.label}</option>`)).join(''));
  select.onchange=()=>{preview=true;const [character,color]=select.value.split('-');show(character==='bonus'?{...bonus('150',{phase:'normal'}),character:color==='blue'?'plush_kushuri':color}:character==='sortie'?sortie({finished:true,hits:5},{queuedZones:['sora','sora','ura_sora','giru','kushuri_nito']}):{kind:'preview',character,color,pt:'1234'});fill();};
  panel.oninput=e=>{const k=e.target.dataset.field;if(!k)return;let v=Number(e.target.value);if(!Number.isFinite(v))return;v=Math.max(['x','y','imageX','imageY','numberX','numberY'].includes(k)?-100:1,Math.min(200,v));positions[key()]={...layout(),[k]:v};try{localStorage.setItem('nova_result_layout_v2',JSON.stringify(positions));}catch{}apply();};
  panel.querySelector('#novaResultReset').onclick=()=>{if(legacyKey())positions[key()]=baseLayout();else delete positions[key()];localStorage.setItem('nova_result_layout_v2',JSON.stringify(positions));apply();fill();};
  panel.querySelector('#novaResultClose').onclick=()=>{panel.close();if(preview){preview=false;hide();}};
  }
  new ResizeObserver(apply).observe(machine);window.addEventListener('resize',apply);
 }
 function show(value){
  // Replace saved BB / normal-return AT art without rerolling its hint or payout.
  if((value?.kind==='bonus'||value?.kind==='at'&&value.color==='mode')&&legacyModePortraits[value.character])value={...value,character:legacyModePortraits[value.character]};
  if(value?.kind==='bonus'&&value.next==='通常')value={...value,color:'mode'};
  init();if(!root)return;
  const request=++imageRequest;active=value;root.hidden=false;root.dataset.loading='true';
  const all=value.character==='all',isSortie=value.kind==='sortie',isBonus=value.kind==='bonus';
  root.dataset.kind=value.kind||'';
  root.dataset.initial=String(value.color==='initial');
  root.dataset.color=all?'gold':['red','purple','gold','rainbow','mode'].includes(value.color)?value.color:'blue';
  root.dataset.all=String(all);
  root.dataset.duo=String(value.character==='kushuri_nito');
  const ensemble=art.querySelector('.novaResultEnsemble');if(ensemble)ensemble.hidden=!all||isSortie;
  const roster=art.querySelector('.novaResultStocks');if(roster){roster.hidden=!isSortie||!value.awards?.length;if(isSortie&&value.awards?.length)renderSortieAwards(roster,value.awards);}
  const partner=art.querySelector('.novaResultPartner');if(partner){partner.hidden=value.character!=='kushuri_nito';if(!partner.hidden)partner.loading='eager';}
  const atLabel='AT総獲得';
  const label=isBonus?'BB獲得':isSortie?'出陣チャレンジ':all?'有利区間終了 / 累計差枚':settingHints.some(h=>h.character===value.character)?atLabel:`${names[value.character]} ${value.color==='initial'?'AT初期pt':value.kind==='at'?atLabel:value.totalPt!=null?'ゾーン / 今回':'上乗せ'}`;
  const next=fallback.querySelector('.novaResultNext');if(next){next.hidden=!value.recall&&!all&&!isBonus&&value.color!=='mode';next.textContent=value.recall?'モード示唆の確認 / 次のBETで閉じる':value.color==='mode'?'次回モード示唆 / 次のBETで通常へ':isBonus?'次のBETで'+(value.next==='AT'?'ATへ':'通常へ'):isSortie?'次のBETで'+(value.next==='initial'?'初期ポイントゾーン準備':'特化ゾーン準備'):'次のBETでスーパーノヴァチャレンジ';}
  const total=fallback.querySelector('.novaResultTotal');if(total){total.hidden=value.totalPt==null;total.textContent=value.totalPt==null?'':'連続特化 合計 '+value.totalPt+'pt';}
  num.textContent=String(isSortie?value.count:value.pt);num.setAttribute('aria-label',awardText(value));
  fallback.querySelector('span').textContent=label;fallback.querySelector('output').textContent=awardText(value);
  if(all){
   apply();
   // Make the visible ensemble eager; each original can arrive independently.
   const originals=Array.from((isSortie?roster:ensemble)?.querySelectorAll?.('img')||[]);
   for(const img of originals)img.loading='eager';
   // Reveal available portraits progressively: one slow/missing image must not hide the roster.
   delete root.dataset.loading;
   return;
  }
  const entry=loadImage(value.character,value.color);entry.img.fetchPriority='high';
  const reveal=()=>{
   if(request!==imageRequest||active!==value)return;
   if(!entry.ready)return; // A failed/slow request keeps the readable RESULT and pt.
   entry.img.alt=`${label} ${value.pt}pt`;art.querySelector('img').replaceWith(entry.img);
   apply();delete root.dataset.loading;
  };
  apply();if(entry.ready)reveal();else entry.loaded.then(reveal);
 }
 function hide(){imageRequest++;if(root)root.hidden=true;active=null;}
 if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
 return {pick,transition,bonus,bonusHintRates,sortie,chain,show,hide,get visible(){return !!active},get editing(){return !!panel?.open}};
})();
