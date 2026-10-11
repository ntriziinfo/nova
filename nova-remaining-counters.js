/* Read-only counters: never normalize, advance, or draw from the game state. */
globalThis.NovaRemainingCounters=(()=>{
 const defaults=Object.freeze({
  atcounter:Object.freeze({x:17,y:92,w:21,h:4.8}),
  czcounter:Object.freeze({x:39.5,y:92,w:21,h:4.8}),
  zonecounter:Object.freeze({x:62,y:92,w:21,h:4.8})
 });
 const titles={atcounter:'AT残りpt',czcounter:'CZ残りG',zonecounter:'ゾーン残りG'};
 const empty=(label,unit)=>({label,value:'—',unit,active:false,hold:false});
 const games=value=>String(Math.max(0,Math.floor(Number(value)||0)));
 function points(value){try{return BigInt(/^\d+$/.test(String(value))?value:0).toLocaleString('ja-JP');}catch{return '0';}}
 function snapshot(flow,options={}){
  const result={atcounter:empty('AT残り','pt'),czcounter:empty('CZ残り','G'),zonecounter:empty('ゾーン残り','G')};
  const resolved=options.spin?.resolved;
  const shown=resolved?.zoneStartFlow||flow||{};
  if(flow?.phase==='art')result.atcounter={...result.atcounter,value:points(flow.remaining),active:true};
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
 let nodes;
 function render(flow,options){
  nodes ||= Object.fromEntries(Object.keys(defaults).map(key=>[key,document.getElementById('nova-'+key)]));
  const values=snapshot(flow,options);
  for(const [key,value]of Object.entries(values)){
   const node=nodes[key];if(!node)continue;
   for(const prop of ['label','value','unit']){const target=node.querySelector('[data-counter-'+prop+']');if(target.textContent!==value[prop])target.textContent=value[prop];}
   for(const prop of ['active','hold'])if(node.dataset[prop]!==String(value[prop]))node.dataset[prop]=String(value[prop]);
  }
 }
 function measure(){
  for(const key of Object.keys(defaults)){
   const node=document.getElementById('nova-'+key),view=document.querySelector('[data-counter-metrics="'+key+'"]');
   if(node&&view)view.textContent=`X ${node.offsetLeft}px / Y ${node.offsetTop}px　幅 ${node.offsetWidth}px × 高さ ${node.offsetHeight}px（筐体基準）`;
  }
 }
 function addLayoutControls(host){
  if(!host||host.querySelector('[data-counter-metrics]'))return;
  for(const [key,title]of Object.entries(titles)){
   const group=document.createElement('div');group.className='layoutEditGroup';
   const heading=document.createElement('div');heading.className='layoutEditGroupTitle';heading.textContent='下部カウンター：'+title;group.append(heading);
   const rows=document.createElement('div');rows.className='layoutEditRows';group.append(rows);
   for(const [prop,label,min,max]of [['x','X',0,95],['y','Y',0,97],['w','幅',10,70],['h','高さ',2,18]]){
    const row=document.createElement('label');row.className='layoutEditRow';
    const name=document.createElement('span');name.textContent=label;
    const input=document.createElement('input');input.className='layoutEditInput';input.type='range';input.min=min;input.max=max;input.step='.1';input.dataset.layoutTarget=key;input.dataset.layoutProp=prop;input.setAttribute('aria-label',title+' '+label);
    const view=document.createElement('b');view.className='layoutEditValue';view.dataset.layoutView=key+'-'+prop;
    row.append(name,input,view);rows.append(row);
   }
   const metrics=document.createElement('p');metrics.className='novaCounterMetrics';metrics.dataset.counterMetrics=key;group.append(metrics);host.append(group);
  }
  const machine=document.getElementById('machine');
  if(machine&&globalThis.ResizeObserver)new ResizeObserver(measure).observe(machine);
 }
 return Object.freeze({defaults,snapshot,render,addLayoutControls,measure});
})();
