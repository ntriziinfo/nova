/* Provided character originals stay separate from the CSS background and result text. */
globalThis.NovaResults=(()=>{
 const chars=['sosuke','toto','urapi','giru','sora','ouma'];
 const initialChars=['kushuri','nito','kushuri_nito'];
 const names={sosuke:'宗介',toto:'とと',urapi:'うらぴ',giru:'ギル',sora:'空',ouma:'逢魔',kushuri:'くしゅり',nito:'にと',kushuri_nito:'くしゅり＆にと',boss:'ボス集合'};
 function pick(kind,zone,setting,rng=Math.random){
  if(kind==='at'){
   // Reuse the existing single result draw; presentation never consumes an extra game draw.
   const roll=rng(),s=Number(setting),bossRate=(Number.isInteger(s)&&s>=2&&s<=6)?0.10:0;
   if(roll<bossRate)return {character:'boss',color:'blue'};
   const n=Math.min(11,Math.floor((roll-bossRate)/(1-bossRate)*12));
   return {character:chars[Math.floor(n/2)],color:n%2?'blue':'red'};
  }
  return {character:chars.includes(zone)||initialChars.includes(zone)?zone:'sosuke',color:initialChars.includes(zone)?'initial':rng()<(Number(setting)%2?.6:.4)?'red':'blue'};
 }
 function transition(before,after,setting,rng=Math.random){
  if(before?.zone&&!after?.zone)return {kind:'zone',...pick('zone',before.zone,setting,rng),pt:String(after?.award??before.award??0)};
  return null;
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
 const characterImages={sosuke:'lamps-20260916/sosuke.png',toto:'lamps-20260916/toto.png',urapi:'lamps-20260916/urapi.png',giru:'lamps-20260916/giru1.png',sora:'lamps-20260916/sora1.png',ouma:'lamps-20260916/ouma1.png',kushuri:'lamps-20260928/kushuri.png',nito:'lamps-20260928/nito.png',kushuri_nito:'lamps-20260928/nito.png',boss:'result-boss.png'};
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
 const key=()=>active?active.character+'-'+active.color:'sosuke-red';
 const layout=()=>({...defaults,...(active?.character==='all'?{x:14,y:28,w:72,h:36,numberX:20,numberY:80,numberW:60,numberH:13,font:8}:{}),...positions[key()]});
 function loadImage(character,color){
  const src='assets/illustrations/'+(characterImages[character]||characterImages.sosuke),cached=images.get(src);
  if(cached&&!cached.failed)return cached;
  const img=new Image();img.draggable=false;img.decoding='async';
  const entry={img,ready:false,failed:false};images.set(src,entry);
  entry.loaded=new Promise(resolve=>{
   const finish=ready=>{entry.ready=ready;entry.failed=!ready;resolve(entry);};
   img.onload=()=>{Promise.resolve().then(()=>img.decode?.()).then(()=>finish(true),()=>finish(img.naturalWidth>0));};
   img.onerror=()=>finish(false);img.src=src;
  });
  return entry;
 }
 function apply(){if(!active||!root)return;const p=layout();card.style.cssText=`left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%;`;
  const cw=card.clientWidth,duo=active.character==='kushuri_nito',all=active.character==='all';
  art.style.cssText=`left:${(all?4:duo?-5:1)+p.imageX}%;top:${(all?23:3)+p.imageY}%;width:${(all?92:duo?57:46)*p.scale/100}%;height:${(all?56:94)*p.scale/100}%;`;
  const chained=active.totalPt!=null,mainHeight=p.numberH*(chained?.65:1);
  const font=Math.min(cw*p.font/100,cw*p.numberW/100/((String(active.pt).length+2)*.72),chained?card.clientHeight*mainHeight/100*.95:Infinity);
  fallback.querySelector('output').style.cssText=`left:${p.numberX}%;top:${p.numberY}%;width:${p.numberW}%;height:${mainHeight}%;font-size:${font}px;`;
  const total=fallback.querySelector('.novaResultTotal');
  if(total)total.style.cssText=`left:${p.numberX}%;top:${p.numberY+mainHeight}%;width:${p.numberW}%;height:${p.numberH-mainHeight}%;font-size:${Math.min(cw*.035,cw*p.numberW/100/((String(active.totalPt||0).length+7)*.75))}px;`;
  for(const [selector,scale] of [['strong',.048],['span',.034],['.novaResultNext',.032]])fallback.querySelector(selector).style.fontSize=all?cw*scale+'px':'';
 }
 function init(){if(root)return;const machine=document.getElementById('machine');if(!machine)return;
  root=document.createElement('div');root.className='novaResultsLayer';root.hidden=true;
  root.innerHTML='<div class="novaResultCard"><div class="novaResultArt"><img draggable="false" alt=""><output class="novaResultNumber"></output><img class="novaResultPartner" src="assets/illustrations/lamps-20260928/kushuri.png" alt="くしゅり" draggable="false" hidden><div class="novaResultEnsemble" hidden></div></div><div class="novaResultFallback" role="status"><strong>RESULT</strong><span></span><output></output><small class="novaResultTotal" hidden></small><small class="novaResultNext" hidden>次のBETで上位ATチャレンジ</small></div></div>';
  machine.append(root);card=root.firstElementChild;art=card.firstElementChild;num=art.querySelector('output');fallback=card.querySelector('.novaResultFallback');
  // Both background colors share the same unmodified character image.
  for(const character of chars)for(const color of ['red','blue'])loadImage(character,color);
  for(const character of initialChars)loadImage(character,'initial');
  loadImage('boss','blue');
  const ensemble=art.querySelector('.novaResultEnsemble');
  for(const character of ['kushuri','nito',...chars]){const img=document.createElement('img');img.src='assets/illustrations/'+characterImages[character];img.alt=names[character];img.draggable=false;ensemble.append(img);}
  const button=document.createElement('button');button.id='novaResultAdjust';button.textContent='リザルト調整';document.body.append(button);
  panel=document.createElement('dialog');panel.className='novaResultSettings';panel.innerHTML='<h3>リザルト配置</h3><label>確認画像 <select id="novaResultSelect"></select></label><div class="novaResultFields"></div><button type="button" id="novaResultReset">この画像を初期位置へ</button> <button type="button" id="novaResultClose">閉じる</button><p>変更はこのブラウザに画像別で自動保存します。画像は縦横比を維持します。</p>';document.body.append(panel);
  select=panel.querySelector('select');select.innerHTML=chars.flatMap(id=>['red','blue'].map(c=>`<option value="${id}-${c}">${names[id]}・${c==='red'?'赤':'青'}</option>`)).join('')+initialChars.map(id=>`<option value="${id}-initial">${names[id]}・初期pt</option>`).join('')+'<option value="boss-blue">ボス集合・設定2以上</option><option value="all-gold">全キャラ・有利区間終了</option>';
  const fields={x:'表示枠 X（%）',y:'表示枠 Y（%）',w:'表示枠 幅（%）',h:'表示枠 高さ（%）',imageX:'画像 X（%）',imageY:'画像 Y（%）',scale:'画像倍率（%）',numberX:'獲得pt X（%）',numberY:'獲得pt Y（%）',numberW:'獲得pt 幅（%）',numberH:'獲得pt 高さ（%）',font:'数字サイズ（%）'};
  panel.querySelector('.novaResultFields').innerHTML=Object.entries(fields).map(([k,label])=>`<label>${label}<input type="number" step="0.5" data-field="${k}"></label>`).join('');
  const fill=()=>panel.querySelectorAll('input').forEach(el=>el.value=layout()[el.dataset.field]);
  button.onclick=()=>{if(!active){preview=true;show({kind:'preview',character:'sosuke',color:'red',pt:'1234'});}select.value=key();fill();panel.show();};
  select.onchange=()=>{preview=true;const [character,color]=select.value.split('-');show({kind:'preview',character,color,pt:'1234'});fill();};
  panel.oninput=e=>{const k=e.target.dataset.field;if(!k)return;let v=Number(e.target.value);if(!Number.isFinite(v))return;v=Math.max(['x','y','imageX','imageY','numberX','numberY'].includes(k)?-100:1,Math.min(200,v));positions[key()]={...layout(),[k]:v};try{localStorage.setItem('nova_result_layout_v2',JSON.stringify(positions));}catch{}apply();};
  panel.querySelector('#novaResultReset').onclick=()=>{delete positions[key()];localStorage.setItem('nova_result_layout_v2',JSON.stringify(positions));apply();fill();};
  panel.querySelector('#novaResultClose').onclick=()=>{panel.close();if(preview){preview=false;hide();}};
  new ResizeObserver(apply).observe(machine);window.addEventListener('resize',apply);
 }
 function show(value){
  init();if(!root)return;
  const request=++imageRequest;active=value;root.hidden=false;root.dataset.loading='true';
  const all=value.character==='all';
  root.dataset.initial=String(value.color==='initial');
  root.dataset.color=all?'gold':value.color==='red'?'red':'blue';
  root.dataset.all=String(all);
  root.dataset.duo=String(value.character==='kushuri_nito');
  const ensemble=art.querySelector('.novaResultEnsemble');if(ensemble)ensemble.hidden=!all;
  const partner=art.querySelector('.novaResultPartner');if(partner)partner.hidden=value.character!=='kushuri_nito';
  const label=all?'有利区間終了 / 累計差枚':value.character==='boss'?'AT総獲得':`${names[value.character]} ${value.color==='initial'?'AT初期pt':value.kind==='at'?'AT総獲得':value.totalPt!=null?'ゾーン / 今回':'上乗せ'}`;
  const next=fallback.querySelector('.novaResultNext');if(next)next.hidden=!all;
  const total=fallback.querySelector('.novaResultTotal');if(total){total.hidden=value.totalPt==null;total.textContent=value.totalPt==null?'':'連続特化 合計 '+value.totalPt+'pt';}
  num.textContent=String(value.pt);num.setAttribute('aria-label',value.pt+'pt');
  fallback.querySelector('span').textContent=label;fallback.querySelector('output').textContent=(all&&Number(value.pt)>=0?'+':'')+value.pt+'pt';
  if(all){
   apply();
   // Decode the originals before revealing the ensemble, including on a cold reload.
   const originals=Array.from(ensemble?.querySelectorAll?.('img')||[]);
   Promise.allSettled(originals.map(img=>img.decode())).then(()=>{if(request===imageRequest&&active===value)delete root.dataset.loading;});
   return;
  }
  const entry=loadImage(value.character,value.color);
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
 return {pick,transition,chain,show,hide,get visible(){return !!active},get editing(){return !!panel?.open}};
})();
