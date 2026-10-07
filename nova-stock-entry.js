/* Free presentation for an already awarded queue item; never steps the engine. */
globalThis.NovaStockEntry=(()=>{
 let panel;
 function sortieReady(flow,progress){return progress?.sorties>0&&NovaProgress.ready(flow);}
 function eligible(flow,progress){return sortieReady(flow,progress)||flow?.phase==='art'&&flow.queuedZones?.length>0&&!flow.zone&&!flow.initialStage&&!flow.entryStage&&!flow.atPrelude&&!flow.researchSortieLeft&&!flow.burstPending&&!flow.researchChallengeActive&&!flow.comebackLeft;}
 function prepare(flow,progress){return sortieReady(flow,progress)?{kind:'sortie',zone:'sortie',count:progress.sorties,stage:'prepare'}:{zone:flow.queuedZones[0],count:flow.queuedZones.length,stage:'prepare'};}
 function matches(entry,flow,progress){
  if(!entry||!eligible(flow,progress))return false;
  const next=prepare(flow,progress);
  return entry.kind===next.kind&&entry.zone===next.zone&&entry.count===next.count&&['prepare','seven','ready'].includes(entry.stage);
 }
 function spin(entry,flow,columns){return {result:entry.kind==='sortie'?'NEBULA':'BIG',lineRow:1,grid:[0,1,2].map(r=>columns.map(c=>c[r])),stopped:[false,false,false],pendingStopColumns:[null,null,null],visualStopping:[false,false,false],auditPressOrder:[],auditStopOrder:[],resolved:{stockEntry:true,sortieEntry:entry.kind==='sortie',reward:0,flowBefore:{...flow,entryStage:'seven',pendingZone:entry.zone},flowAfter:{...flow,entryStage:'roulette',pendingZone:entry.zone}}};}
 function message(entry){return entry?.kind==='sortie'?(entry.stage==='ready'?'ノヴァ出陣チャンス / 次のBETで開始':'特化ゾーン確定 / 次のBETでネビュラを狙え'):entry?.stage==='ready'?NovaArt.zoneName(entry.zone)+'ゾーン / 次のBETで開始':'特化ゾーン準備中 / 次のBETで7を狙え';}
 function show(entry){
  if(!panel){panel=document.createElement('div');panel.id='novaStockPreparation';panel.setAttribute('role','status');document.getElementById('machine').append(panel);}
  panel.hidden=!entry||entry.stage==='seven';if(panel.hidden)return;
  panel.textContent=message(entry);
  layout();
 }
 function layout(){
  if(!panel||panel.hidden)return;
  const host=document.getElementById('machine'),reels=host.querySelector('.reels'),status=document.getElementById('novaFlowStatus'),b=host.getBoundingClientRect(),r=reels.getBoundingClientRect(),scale=b.width/host.offsetWidth||1;
  const bottom=(r.top-b.top)/scale-5,top=Math.max(status?(status.getBoundingClientRect().bottom-b.top)/scale+4:0,bottom-r.width/scale*.26);
  Object.assign(panel.style,{left:(r.left-b.left)/scale+'px',top:top+'px',width:r.width/scale+'px',height:Math.max(40,bottom-top)+'px',fontSize:r.width/scale*.036+'px'});
 }
 function hide(){if(panel)panel.hidden=true;}
 if(typeof window!=='undefined')window.addEventListener('resize',layout);
 return {eligible,matches,prepare,spin,message,show,hide};
})();
