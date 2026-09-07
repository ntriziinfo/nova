/* Licensed originals: never crop, recolor, filter, redraw or encode these images.
 * Only layout coordinates and proportional display width may be changed. */
(() => {
  'use strict';
  const originals = ['ouma1','sora1','sosuke','toto','urapi','giru1'];
  const defaults = Object.fromEntries(originals.map((id,i)=>[id,{x:i%2?81:5,y:[34,47,77][Math.floor(i/2)],w:14}]));
  const key = 'nova_licensed_artwork_layout_v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  let positions = clone(defaults), selected = originals[0], dragging = null;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    for(const id of originals) for(const field of ['x','y','w']) {
      const value = saved?.[id]?.[field];
      if(typeof value === 'number' && Number.isFinite(value)) positions[id][field]=clamp(value,field==='w'?4:0,field==='w'?45:96);
    }
  } catch {}
  const layer=document.createElement('div'); layer.className='novaArtLayer';
  const items=new Map();
  for(const id of originals){
    const item=document.createElement('div'); item.className='novaArtItem'; item.dataset.artwork=id;
    const img=document.createElement('img'); img.src=`assets/illustrations/originals/${id}.png`; img.alt=id; img.draggable=false;
    img.addEventListener('load',()=>render(id));
    item.append(img); layer.append(item); items.set(id,item);
  }
  document.getElementById('machine').append(layer);
  const toggle=document.createElement('button'); toggle.id='novaArtToggle'; toggle.type='button'; toggle.textContent='イラスト'; toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-controls','novaArtPanel');
  document.body.append(toggle);
  const panel=document.createElement('section'); panel.id='novaArtPanel'; panel.hidden=true; panel.setAttribute('aria-label','イラスト配置');
  panel.innerHTML=`<h2>イラスト配置</h2><label>画像<select id="novaArtSelect">${originals.map(id=>`<option value="${id}">${id}</option>`).join('')}</select></label><p>画像をドラッグして移動できます。大きさは縦横比を保って変更します。</p><label>横位置 (%)<input id="novaArtX" type="number" min="0" max="96" step="0.1"></label><label>縦位置 (%)<input id="novaArtY" type="number" min="0" max="96" step="0.1"></label><label>表示幅 (%)<input id="novaArtW" type="number" min="4" max="45" step="0.1"></label><div class="novaArtActions"><button type="button" id="novaArtSave">保存</button><button type="button" id="novaArtReset">選択画像を戻す</button><button type="button" id="novaArtClose">閉じる</button></div><output role="status" id="novaArtStatus"></output><p>保存先はこのブラウザーです。原本画像は変更しません。</p>`;
  document.body.append(panel);
  const status=panel.querySelector('#novaArtStatus');
  const fields={x:panel.querySelector('#novaArtX'),y:panel.querySelector('#novaArtY'),w:panel.querySelector('#novaArtW')};
  function render(id){
    const item=items.get(id),p=positions[id],img=item.querySelector('img');
    const width=layer.clientWidth,height=layer.clientHeight;
    const ratio=img.naturalWidth?img.naturalHeight/img.naturalWidth:1;
    p.w=clamp(p.w,4,45); p.x=clamp(p.x,0,100-p.w);
    p.y=clamp(p.y,0,Math.max(0,100-p.w*width*ratio/height));
    item.style.left=p.x+'%';item.style.top=p.y+'%';item.style.width=p.w+'%';
  }
  function sync(){
    panel.querySelector('#novaArtSelect').value=selected;
    for(const [field,input] of Object.entries(fields)) input.value=positions[selected][field].toFixed(1);
    for(const [id,item] of items) item.classList.toggle('selected',id===selected);
  }
  function setOpen(open){panel.hidden=!open;layer.classList.toggle('editing',open);toggle.setAttribute('aria-expanded',String(open));sync();}
  toggle.addEventListener('click',event=>{event.stopPropagation();setOpen(panel.hidden)});
  panel.addEventListener('click',event=>event.stopPropagation());
  panel.querySelector('#novaArtSelect').addEventListener('change',event=>{selected=event.target.value;sync();status.textContent='';});
  for(const [field,input] of Object.entries(fields)) input.addEventListener('input',()=>{
    if(input.value===''||!Number.isFinite(input.valueAsNumber))return;
    positions[selected][field]=input.valueAsNumber;render(selected);status.textContent='未保存';
  });
  panel.querySelector('#novaArtSave').addEventListener('click',()=>{try{localStorage.setItem(key,JSON.stringify(positions));status.textContent='6点の配置を保存しました';}catch{status.textContent='保存できませんでした。このブラウザーの保存設定を確認してください';}});
  panel.querySelector('#novaArtReset').addEventListener('click',()=>{positions[selected]=clone(defaults[selected]);render(selected);sync();status.textContent='未保存';});
  panel.querySelector('#novaArtClose').addEventListener('click',()=>setOpen(false));
  layer.addEventListener('pointerdown',event=>{
    const item=event.target.closest('.novaArtItem');if(!item||!layer.classList.contains('editing'))return;
    event.preventDefault();event.stopPropagation();selected=item.dataset.artwork;sync();
    dragging={pointer:event.pointerId,x:event.clientX,y:event.clientY,start:{...positions[selected]}};
    layer.setPointerCapture(event.pointerId);
  });
  layer.addEventListener('pointermove',event=>{
    if(!dragging||event.pointerId!==dragging.pointer)return;
    const rect=layer.getBoundingClientRect();
    positions[selected].x=dragging.start.x+(event.clientX-dragging.x)/rect.width*100;
    positions[selected].y=dragging.start.y+(event.clientY-dragging.y)/rect.height*100;
    render(selected);sync();status.textContent='未保存';
  });
  const endDrag=()=>{dragging=null;};
  layer.addEventListener('pointerup',endDrag);layer.addEventListener('pointercancel',endDrag);
  window.addEventListener('resize',()=>{for(const id of originals)render(id)});
  for(const id of originals)render(id);sync();
})();
