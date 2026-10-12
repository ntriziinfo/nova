/* Read-only counters: never normalize, advance, or draw from the game state. */
globalThis.NovaRemainingCounters=(()=>{
 const defaults=Object.freeze({
  remainingcounter:Object.freeze({x:22,y:85.8,w:15,h:11})
 });
 const titles={remainingcounter:'共通カウンター（AT・CZ・ゾーン）'};
 const empty=(label,unit)=>({label,value:'—',unit,active:false,hold:false});
 const games=value=>String(Math.max(0,Math.floor(Number(value)||0)));
 function points(value){try{return BigInt(/^\d+$/.test(String(value))?value:0).toLocaleString('ja-JP');}catch{return '0';}}
 function snapshot(flow,options={}){
  const result={atcounter:empty('AT残り','pt'),czcounter:empty('CZ残り','G'),zonecounter:empty('ゾーン残り','G')};
  const resolved=options.spin?.resolved;
  const shown=resolved?.zoneStartFlow||flow||{};
  if(flow?.phase==='art')result.atcounter={...result.atcounter,value:points(flow.remaining),active:true};
  if(options.checkpointStatus?.gold&&result.atcounter.active)result.atcounter={label:'スーパーノヴァチャレンジまで',value:points(options.checkpointStatus.left||0),unit:'pt',active:true,hold:false};
  if(options.bonus)return result; // An interrupted AT keeps its banked points visible.
  if(['cz','strong_cz'].includes(flow?.phase)&&!options.czPrelude&&!options.bonusPending){
   result.czcounter={...result.czcounter,label:flow.phase==='strong_cz'?'強CZ残り':'CZ残り',value:games(flow.remaining),active:true};
  }
  if(shown.phase!=='art')return result;
  let label='',left=0,hold=false;
  if(shown.researchSortieLeft){label='出陣チャレンジ';left=shown.researchSortieLeft;}
  else if(shown.zone){label=NovaArt.zoneName(shown)+'ゾーン';left=shown.zoneLeft;hold=!!(shown.zero||resolved?.oumaFreeze);}
  else if(shown.researchChallengeActive||shown.burstLeft||resolved?.researchChallenge?.started){
   label='スーパーノヴァチャレンジ';left=resolved?.researchChallenge?.started?10:shown.burstLeft;hold=!!shown.researchAim;
  }
  else if(shown.comebackLeft){label='引き戻しチャレンジ';left=shown.comebackLeft;}
  else if(shown.initialStage==='wait'){label='AT準備';left=shown.initialWait;}
  else if(shown.entryStage||shown.burstPending){result.zonecounter.label=shown.burstPending?'上位AT準備':'特化ゾーン準備';}
  if(label)result.zonecounter={label,value:games(left),unit:'G',active:true,hold};
  return result;
 }
 function current(flow,options={}){
  const values=snapshot(flow,options);
  // The current zone takes priority over the AT points banked behind it.
  if(values.zonecounter.active||values.zonecounter.label!=='ゾーン残り')return {mode:'zone',...values.zonecounter};
  if(values.czcounter.active)return {mode:'cz',...values.czcounter};
  if(values.atcounter.active)return {mode:'at',...values.atcounter};
  return {mode:'idle',...empty(options.bonus?'ボーナス中':options.bonusPending?'ボーナス準備':options.czPrelude?'CZ前兆':'通常時','')};
 }
 let node;
 function render(flow,options){
  node ||= document.getElementById('nova-remainingcounter');if(!node)return;
  const value=current(flow,options);
  node.dataset.checkpoint=String(!!options?.checkpointStatus?.gold);
  for(const prop of ['label','value','unit']){const target=node.querySelector('[data-counter-'+prop+']');if(target.textContent!==value[prop])target.textContent=value[prop];}
  for(const prop of ['mode','active','hold'])if(node.dataset[prop]!==String(value[prop]))node.dataset[prop]=String(value[prop]);
  const label=value.label+' '+value.value+value.unit+(value.hold?' HOLD':'');
  if(node.getAttribute('aria-label')!==label)node.setAttribute('aria-label',label);
 }
 function measure(){
  for(const key of Object.keys(defaults)){
   const node=document.getElementById('nova-'+key),view=document.querySelector('[data-counter-metrics="'+key+'"]');
   if(node&&view)view.textContent=`X ${node.offsetLeft}px / Y ${node.offsetTop}px　幅 ${node.offsetWidth}px × 高さ ${node.offsetHeight}px（リール枠基準）`;
  }
 }
 function addLayoutControls(host){
  if(!host||host.querySelector('[data-counter-metrics]'))return;
  for(const [key,title]of Object.entries(titles)){
   const group=document.createElement('div');group.className='layoutEditGroup';
   const heading=document.createElement('div');heading.className='layoutEditGroupTitle';heading.textContent=title;group.append(heading);
   const rows=document.createElement('div');rows.className='layoutEditRows';group.append(rows);
   for(const [prop,label,min,max]of [['x','X',0,95],['y','Y',0,120],['w','幅',4,70],['h','高さ',2,30]]){
    const row=document.createElement('label');row.className='layoutEditRow';
    const name=document.createElement('span');name.textContent=label;
    const input=document.createElement('input');input.className='layoutEditInput';input.type='range';input.min=min;input.max=max;input.step='.1';input.dataset.layoutTarget=key;input.dataset.layoutProp=prop;input.setAttribute('aria-label',title+' '+label);
    const view=document.createElement('b');view.className='layoutEditValue';view.dataset.layoutView=key+'-'+prop;
    row.append(name,input,view);rows.append(row);
   }
   const metrics=document.createElement('p');metrics.className='novaCounterMetrics';metrics.dataset.counterMetrics=key;group.append(metrics);
   const help=document.createElement('small');help.textContent='滞在状態に合わせて表示を自動切替。位置・サイズは全表示で共通です。変更は自動保存されます。';group.append(help);host.append(group);
  }
  const machine=document.getElementById('machine');
  if(machine&&globalThis.ResizeObserver)new ResizeObserver(measure).observe(machine);
 }
 return Object.freeze({defaults,snapshot,current,render,addLayoutControls,measure});
})();
