/* Read-only counters: never normalize, advance, or draw from the game state. */
globalThis.NovaRemainingCounters=(()=>{
 const defaults=Object.freeze({
  remainingcounter:Object.freeze({x:21.7,y:85.8,w:15.9,h:11}),
  zoneaward:Object.freeze({x:45,y:22.6,w:9.4,h:11.8,labelsize:8,valuesize:20,unitsize:10,textgap:4})
 });
 const textProperties=['labelsize','valuesize','unitsize','textgap'];
 const unit=(target,prop)=>target==='zoneaward'&&textProperties.includes(prop)?'px':'%';
 function migrateLayout(raw){
  const old=raw?.zoneaward;
  if(!old||old.x!==60||old.y!==20||old.w!==18||old.h!==11)return raw;
  return {...raw,zoneaward:{...old,x:45,y:22.6,w:9.4,h:11.8}};
 }
 const titles={remainingcounter:'共通カウンター（BB・AT・CZ・ゾーン）',zoneaward:'今回の特化ゾーン獲得pt'};
 const empty=(label,unit)=>({label,value:'—',unit,active:false,hold:false});
 const games=value=>String(Math.max(0,Math.floor(Number(value)||0)));
 function points(value){try{return BigInt(/^\d+$/.test(String(value))?value:0).toLocaleString('ja-JP');}catch{return '0';}}
 function leverFlow(flow,spin){
  const r=spin?.resolved;
  if(!r||r.stockEntry||r.aTypeBonusGame)return flow;
  const before=r.zoneStartFlow||r.flowBefore;
  if(!before)return flow;
  const shown={...before},dec=k=>shown[k]=Math.max(0,Number(shown[k]||0)-1);
  if(['cz','strong_cz'].includes(shown.phase)&&!r.czIntro&&!r.bonusPendingAtStart)dec('remaining');
  if(shown.phase==='art'){
   if(shown.researchSortieLeft&&r.researchSortie)dec('researchSortieLeft');
   else if(shown.zone&&r.zoneSpin&&!shown.zero&&!r.oumaFreeze)dec('zoneLeft');
   else if(r.researchChallenge){
    if(r.researchChallenge.started){shown.researchChallengeActive=true;shown.burstLeft=10;}
    if(!r.researchChallenge.priorAim&&r.researchChallenge.role==='MISS')dec('burstLeft');
   }
   else if(shown.comebackLeft&&['continue','success','failure'].includes(r.comebackEvent))dec('comebackLeft');
   else if(shown.initialStage==='wait'&&r.initialPreparationSpin&&shown.initialPreparationVersion!==NovaArt.preparationRules.version)dec('initialWait');
  }
  return shown;
 }
 function snapshot(flow,options={}){
  const result={atcounter:empty('AT残り','pt'),czcounter:empty('CZ残り','G'),zonecounter:empty('ゾーン残り','G')};
  const resolved=options.spin?.resolved;
  const base=resolved?.zoneStartFlow||resolved?.flowBefore||flow||{};
  const shown=leverFlow(flow,options.spin)||{};
  if(flow?.phase==='art')result.atcounter={...result.atcounter,value:points(flow.remaining),active:true};
  if(options.checkpointStatus?.gold&&result.atcounter.active)result.atcounter={label:'スーパーノヴァチャレンジまで',value:points(options.checkpointStatus.left||0),unit:'pt',active:true,hold:false};
  if(options.bonus)return result; // An interrupted AT keeps its banked points visible.
  if(['cz','strong_cz'].includes(flow?.phase)&&!options.czPrelude&&!options.bonusPending){
   result.czcounter={...result.czcounter,label:flow.phase==='strong_cz'?'強CZ残り':'CZ残り',value:games(shown.remaining),active:true};
  }
  if(shown.phase!=='art')return result;
  let label='',left=0,hold=false;
  if(base.researchSortieLeft){label='出陣チャレンジ';left=shown.researchSortieLeft;}
  else if(shown.zone){label=NovaArt.zoneName(shown)+'ゾーン';left=shown.zoneLeft;hold=!!(shown.zero||resolved?.oumaFreeze);}
  else if(shown.researchChallengeActive||shown.burstLeft||resolved?.researchChallenge?.started){
   label='スーパーノヴァチャレンジ';left=shown.burstLeft;hold=!!shown.researchAim;
  }
  else if(base.comebackLeft){label='引き戻しチャレンジ';left=shown.comebackLeft;}
  else if(shown.initialStage==='wait'){
   if(shown.initialPreparationVersion===NovaArt.preparationRules.version)result.zonecounter={label:'AT準備',value:'開始リプレイ待ち',unit:'',active:true,hold:false};
   else {label='AT準備';left=shown.initialWait;}
  }
  else if(shown.entryStage||shown.burstPending){result.zonecounter.label=shown.burstPending?'上位AT準備':'特化ゾーン準備';}
  if(label)result.zonecounter={label,value:games(left),unit:'G',active:true,hold};
  return result;
 }
 function current(flow,options={}){
  if(options.bonus&&options.bonusRemaining!==undefined)return {mode:'bonus',label:'BB残り',value:points(options.bonusRemaining),unit:'pt',active:true,hold:false};
  const values=snapshot(flow,options);
  // The current zone takes priority over the AT points banked behind it.
  if(values.zonecounter.active||values.zonecounter.label!=='ゾーン残り')return {mode:'zone',...values.zonecounter};
  if(values.czcounter.active)return {mode:'cz',...values.czcounter};
  if(values.atcounter.active)return {mode:'at',...values.atcounter};
  return {mode:'idle',...empty(options.bonus?'ボーナス中':options.bonusPending?'ボーナス準備':options.czPrelude?'CZ前兆':'通常時','')};
 }
 function zoneAward(flow,options={}){
  if(options.bonus)return null;
  const card=options.zoneResult;
  if(!options.spin&&card?.kind==='zone')return {label:'今回の特化 獲得',value:points(card.pt)};
  const r=options.spin?.resolved;
  const shown=r?.zoneStartFlow||r?.flowBefore||flow;
  if(!shown?.zone||shown.entryStage)return null;
  return {label:(shown.initialStage==='zone'?'初期pt':'今回の特化')+' 獲得',value:points(shown.award)};
 }
 let node,awardNode;
 function renderAward(flow,options){
  if(!awardNode){
   const machine=document.getElementById('machine');if(!machine)return;
   // Use reel coordinates outside its stacking context, above character lamps.
   const host=document.createElement('div');host.className='novaZoneAwardLayer';machine.append(host);
   awardNode=document.createElement('div');awardNode.id='nova-zoneaward';awardNode.className='novaRemainingCounter novaZoneAward';
   awardNode.innerHTML='<span data-counter-label></span><div class="novaCounterReading"><b data-counter-value>0</b><span data-counter-unit>pt</span></div>';host.append(awardNode);
  }
  const value=zoneAward(flow,options);awardNode.dataset.active=String(!!value);
  if(!value)return;
  for(const key of ['label','value']){const el=awardNode.querySelector('[data-counter-'+key+']');if(el.textContent!==value[key])el.textContent=value[key];}
  awardNode.setAttribute('aria-label',value.label+' '+value.value+'pt');
 }
 function render(flow,options){
  renderAward(flow,options);
  node ||= document.getElementById('nova-remainingcounter');if(!node)return;
  const value=current(flow,options);
  node.dataset.checkpoint=String(value.mode==='at'&&!!options?.checkpointStatus?.gold);
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
   const fields=[['x','X',0,95],['y','Y',0,120],['w','幅',4,70],['h','高さ',2,30]];
   if(key==='zoneaward')fields.push(['labelsize','見出し文字',4,40],['valuesize','pt数字',8,100],['unitsize','pt単位',4,40],['textgap','上下の間隔',-12,40]);
   for(const [prop,label,min,max]of fields){
    const row=document.createElement('label');row.className='layoutEditRow';
    const name=document.createElement('span');name.textContent=label;
    const input=document.createElement('input');input.className='layoutEditInput';input.type='range';input.min=min;input.max=max;input.step='.1';input.dataset.layoutTarget=key;input.dataset.layoutProp=prop;input.setAttribute('aria-label',title+' '+label);
    const view=document.createElement('b');view.className='layoutEditValue';view.dataset.layoutView=key+'-'+prop;
    row.append(name,input,view);rows.append(row);
   }
   const metrics=document.createElement('p');metrics.className='novaCounterMetrics';metrics.dataset.counterMetrics=key;group.append(metrics);
   const help=document.createElement('small');help.textContent=key==='zoneaward'?'連続特化でも各ゾーン単位で表示。文字サイズ・上下の間隔は枠サイズと独立して調整できます。変更は自動保存されます。':'滞在状態に合わせて表示を自動切替。位置・サイズは全表示で共通です。変更は自動保存されます。';group.append(help);host.append(group);
  }
  const machine=document.getElementById('machine');
  if(machine&&globalThis.ResizeObserver)new ResizeObserver(measure).observe(machine);
 }
 return Object.freeze({defaults,unit,migrateLayout,leverFlow,snapshot,current,zoneAward,render,addLayoutControls,measure});
})();
