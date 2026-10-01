/* Sortie reel presentation only. The engine's role, payout and stock draw stay intact. */
globalThis.NovaSortie=(()=>{
 const order=Object.freeze([2,1,0]);
 let root,host,drop=null,freezeWait=null;
 const eligible=spin=>!!spin?.resolved?.researchSortie;
 const freezeDelay=(spin,now=Date.now())=>eligible(spin)?Math.max(0,Math.min(1800,(Number(spin.resolved.sortieFreezeUntil)||0)-now)):0;
 function waitFreeze(spin){
  const delay=freezeDelay(spin);if(!delay)return Promise.resolve(true);
  if(host)host.dataset.sortieFreeze='true';
  if(root)root.firstChild.textContent='ノヴァ出陣チャレンジ';
  return new Promise(resolve=>{
   const end=completed=>{clearTimeout(timer);freezeWait=null;if(host)delete host.dataset.sortieFreeze;if(completed&&root)render(spin);resolve(completed);};
   const timer=setTimeout(()=>end(true),delay);freezeWait=()=>end(false);
  });
 }
 function target(spin,index,strips){
  if(!eligible(spin))return null;
  const presses=spin.auditPressOrder||[],aligned=!!spin.resolved.researchSortie.won&&presses.length===3&&order.every((n,i)=>presses[i]===n);
  const strip=strips[index],top=strip.findIndex((s,n)=>[0,1,2].every(row=>strip[(n+row)%strip.length]===`NOVA_${index}_${row}`));
  if(top<0)throw Error('Missing sortie NOVA column');
  const windowAt=n=>[0,1,2].map(row=>strip[((n+row)%strip.length+strip.length)%strip.length]);
  const shift=index===0&&!aligned;
  return {aligned,drop:shift,top,column:windowAt(top-(shift?1:0)),landing:windowAt(top)};
 }
 function init(){
  if(root)return true;
  host=document.getElementById('machine');if(!host)return false;
  root=document.createElement('div');root.id='novaSortieGuide';root.hidden=true;root.setAttribute('role','status');
  const title=document.createElement('strong');title.textContent='逆押しでノヴァを狙え';root.append(title);
  for(const [i,name]of ['左','中','右'].entries()){const cell=document.createElement('span');cell.dataset.reel=String(i);cell.textContent=`${3-i} ${name}`;root.append(cell);}
  host.append(root);return true;
 }
 function layout(){
  if(!root||root.hidden)return;
  const reels=host.querySelector('.reels'),base=host.getBoundingClientRect(),r=reels.getBoundingClientRect(),scale=base.width/host.offsetWidth||1;
  const w=r.width/scale,h=w*.11;
  Object.assign(root.style,{left:(r.left-base.left)/scale+'px',top:(r.top-base.top)/scale-h-3+'px',width:w+'px',height:h+'px',fontSize:w*.026+'px'});
 }
 function render(spin){
  if(!eligible(spin)||!init())return;
  root.hidden=false;
  const stopped=spin.stopped||[],next=order.find(i=>!stopped[i]);
  if(stopped.length===3&&stopped.every(Boolean)&&spin.resolved.researchSortie.won)flash(spin.resolved.researchSortie.zone);
  root.firstChild.textContent=stopped.every(Boolean)?(spin.resolved.researchSortie.won?'特化ゾーン獲得！':'ノヴァ不揃い'):'逆押しでノヴァを狙え';
  for(const cell of root.querySelectorAll('[data-reel]')){const i=Number(cell.dataset.reel);cell.dataset.stopped=String(!!stopped[i]);cell.dataset.next=String(i===next);}
  for(const reel of host.querySelectorAll('.reel')){const i=Number(reel.dataset.reel);reel.classList.toggle('sortieStopped',!!stopped[i]);reel.style.setProperty('--ouma-rattle-speed',[35,41.5,30.5][i]+'ms');reel.style.setProperty('--ouma-rattle-delay',[0,-15.5,-8.5][i]+'ms');}
  layout();
 }
 function clear(){
  if(freezeWait)freezeWait();
  if(host)delete host.dataset.sortieFreeze;
  if(root)root.hidden=true;
  if(drop){const cancel=drop;drop=null;cancel();}
  if(typeof document!=='undefined')document.querySelectorAll('.reel.sortieStopped').forEach(reel=>reel.classList.remove('sortieStopped'));
  flash('');
 }
 function flash(zone){
  if(typeof document==='undefined')return;
  const base=String(zone||'').replace(/^(ura_|normal_)/,''),artwork={giru:'giru1',sora:'sora1',ouma:'ouma1'},id=artwork[base]||base;
  document.querySelectorAll('.novaArtItem').forEach(lamp=>{lamp.dataset.sortieWon=String(lamp.dataset.artwork===id||(id==='kushuri_nito'&&['kushuri','nito'].includes(lamp.dataset.artwork)));});
 }
 function begin(spin){clear();render(spin);}
 function dropLeft(reel,strip,top,html,motion){
  return new Promise(resolve=>{
   const start=performance.now();
   drop=()=>{motion.clear(0);resolve(false);};
   motion.start(0,reel,strip,top,false,html,{duration:180,steps:1,clock:()=>Math.max(0,performance.now()-start)/1000,done:()=>{drop=null;resolve(true);}});
  });
 }
 if(typeof window!=='undefined')window.addEventListener('resize',layout);
 return {eligible,target,begin,stop:render,clear,dropLeft,flash,freezeDelay,waitFreeze};
})();
