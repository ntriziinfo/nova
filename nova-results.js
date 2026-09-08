/* User supplied result images are displayed unchanged, separate from the digits. */
globalThis.NovaResults=(()=>{
 const chars=['sosuke','toto','urapi','giru','sora','ouma'];
 const names={sosuke:'宗介',toto:'とと',urapi:'うらぴ',giru:'ギル',sora:'空',ouma:'逢魔'};
 function pick(kind,zone,setting,rng=Math.random){
  if(kind==='at'){const n=Math.min(11,Math.floor(rng()*12));return {character:chars[Math.floor(n/2)],color:n%2?'blue':'red'};}
  return {character:chars.includes(zone)?zone:'sosuke',color:rng()<(Number(setting)%2?.6:.4)?'red':'blue'};
 }
 function transition(before,after,setting,rng=Math.random){
  if(before?.zone&&!after?.zone)return {kind:'zone',...pick('zone',before.zone,setting,rng),pt:String(after?.award??before.award??0)};
  return null;
 }
 const defaults={x:22,y:34,w:56,h:23,imageX:0,imageY:0,scale:100,numberX:7,numberY:54,numberW:36,numberH:10,font:9};
 let positions={},root,card,art,num,panel,select,preview=false,active=null;
 try{positions=JSON.parse(localStorage.getItem('nova_result_layout_v1'))||{};}catch{}
 const key=()=>active?active.character+'-'+active.color:'sosuke-red';
 const layout=()=>({...defaults,...positions[key()]});
 function apply(){if(!active||!root)return;const p=layout();card.style.cssText=`left:${p.x}%;top:${p.y}%;width:${p.w}%;height:${p.h}%;`;
  const cw=card.clientWidth,ch=card.clientHeight,img=art.querySelector('img'),ratio=img.naturalWidth&&img.naturalHeight?img.naturalWidth/img.naturalHeight:1510/1365;
  const ah=Math.min(ch,cw/ratio)*p.scale/100,aw=ah*ratio;
  art.style.cssText=`width:${aw}px;height:${ah}px;left:calc(50% + ${p.imageX}%);top:calc(50% + ${p.imageY}%);transform:translate(-50%,-50%);`;
  num.style.cssText=`left:${p.numberX}%;top:${p.numberY}%;width:${p.numberW}%;height:${p.numberH}%;font-size:${aw*p.font/100}px;`;
 }
 function init(){if(root)return;const machine=document.getElementById('machine');if(!machine)return;
  root=document.createElement('div');root.className='novaResultsLayer';root.hidden=true;
  root.innerHTML='<div class="novaResultCard"><div class="novaResultArt"><img draggable="false" alt=""><output class="novaResultNumber"></output></div></div>';
  machine.append(root);card=root.firstElementChild;art=card.firstElementChild;num=art.querySelector('output');
  const button=document.createElement('button');button.id='novaResultAdjust';button.textContent='リザルト調整';document.body.append(button);
  panel=document.createElement('dialog');panel.className='novaResultSettings';panel.innerHTML='<h3>リザルト配置</h3><label>確認画像 <select id="novaResultSelect"></select></label><div class="novaResultFields"></div><button type="button" id="novaResultReset">この画像を初期位置へ</button> <button type="button" id="novaResultClose">閉じる</button><p>変更はこのブラウザに画像別で自動保存します。画像は縦横比を維持します。</p>';document.body.append(panel);
  select=panel.querySelector('select');select.innerHTML=chars.flatMap(id=>['red','blue'].map(c=>`<option value="${id}-${c}">${names[id]}・${c==='red'?'赤':'青'}</option>`)).join('');
  const fields={x:'表示枠 X（%）',y:'表示枠 Y（%）',w:'表示枠 幅（%）',h:'表示枠 高さ（%）',imageX:'画像 X（%）',imageY:'画像 Y（%）',scale:'画像倍率（%）',numberX:'数字 X（%）',numberY:'数字 Y（%）',numberW:'黒背景 幅（%）',numberH:'黒背景 高さ（%）',font:'数字サイズ（%）'};
  panel.querySelector('.novaResultFields').innerHTML=Object.entries(fields).map(([k,label])=>`<label>${label}<input type="number" step="0.5" data-field="${k}"></label>`).join('');
  const fill=()=>panel.querySelectorAll('input').forEach(el=>el.value=layout()[el.dataset.field]);
  button.onclick=()=>{if(!active){preview=true;show({kind:'preview',character:'sosuke',color:'red',pt:'1234'});}select.value=key();fill();panel.show();};
  select.onchange=()=>{preview=true;const [character,color]=select.value.split('-');show({kind:'preview',character,color,pt:'1234'});fill();};
  panel.oninput=e=>{const k=e.target.dataset.field;if(!k)return;let v=Number(e.target.value);if(!Number.isFinite(v))return;v=Math.max(['x','y','imageX','imageY','numberX','numberY'].includes(k)?-100:1,Math.min(200,v));positions[key()]={...layout(),[k]:v};try{localStorage.setItem('nova_result_layout_v1',JSON.stringify(positions));}catch{}apply();};
  panel.querySelector('#novaResultReset').onclick=()=>{delete positions[key()];localStorage.setItem('nova_result_layout_v1',JSON.stringify(positions));apply();fill();};
  panel.querySelector('#novaResultClose').onclick=()=>{panel.close();if(preview){preview=false;hide();}};
  new ResizeObserver(apply).observe(machine);window.addEventListener('resize',apply);
 }
 function show(value){init();if(!root)return;active=value;root.hidden=false;const img=art.querySelector('img');img.onload=apply;img.src=`assets/results/${value.character}-${value.color}.png`;img.alt=`${names[value.character]} ${value.kind==='at'?'AT総獲得':'上乗せ'} ${value.pt}pt`;num.textContent=String(value.pt);num.setAttribute('aria-label',value.pt+'pt');apply();}
 function hide(){if(root)root.hidden=true;active=null;}
 if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
 return {pick,transition,show,hide,get visible(){return !!active},get editing(){return !!panel?.open}};
})();
