/* Free presentation for an already awarded queue item; never steps the engine. */
globalThis.NovaStockEntry=(()=>{
 let panel;
 const visualRandom=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
 function drawFake(chance,won,rng=visualRandom){return !won&&chance>0&&chance<1&&rng()<Math.min(1,2*chance/(1-chance));}
 function cueColor(fake=false,rng=visualRandom){const r=rng();return r<1/3?'blue':r<2/3||fake?'red':'rainbow';}
 function fakeReady(flow,progress,pending){return pending>0&&!progress?.sorties&&!flow?.queuedZones?.length&&!Number(flow?.stock||0)&&['normal','art'].includes(flow?.phase)&&!flow.zone&&!flow.initialStage&&!flow.entryStage&&!flow.atPrelude&&!flow.researchSortieLeft&&!flow.burstPending&&!flow.researchChallengeActive&&!flow.comebackLeft&&!flow.comebackConfirmed;}
 function sortieReady(flow,progress){return progress?.sorties>0&&NovaProgress.ready(flow);}
 function eligible(flow,progress,pending=0){return fakeReady(flow,progress,pending)|| sortieReady(flow,progress)||flow?.phase==='art'&&flow.queuedZones?.length>0&&!flow.zone&&!flow.initialStage&&!flow.entryStage&&!flow.atPrelude&&!flow.researchSortieLeft&&!flow.burstPending&&!flow.researchChallengeActive&&!flow.comebackLeft;}
 function prepare(flow,progress,pending=0){return sortieReady(flow,progress)?{kind:'sortie',zone:'sortie',count:progress.sorties,stage:'prepare'}:fakeReady(flow,progress,pending)?{kind:'sortieFake',zone:'sortie',count:pending,stage:'prepare'}:{zone:flow.queuedZones[0]==='fixed50_sosuke'?'sosuke':flow.queuedZones[0],fixed50:flow.queuedZones[0]==='fixed50_sosuke',count:flow.queuedZones.length,stage:'prepare'};}
 function matches(entry,flow,progress,pending=0){
  if(!entry||!eligible(flow,progress,pending))return false;
  const next=prepare(flow,progress,pending);
  return entry.kind===next.kind&&entry.zone===next.zone&&!!entry.fixed50===!!next.fixed50&&entry.count===next.count&&['prepare','seven','ready'].includes(entry.stage);
 }
 function spin(entry,flow,columns){return {result:entry.kind==='sortieFake'?'MISS':entry.kind==='sortie'?'NEBULA':'BIG',lineRow:1,grid:[0,1,2].map(r=>columns.map(c=>c[r])),stopped:[false,false,false],pendingStopColumns:[null,null,null],visualStopping:[false,false,false],auditPressOrder:[],auditStopOrder:[],resolved:{stockEntry:true,sortieEntry:['sortie','sortieFake'].includes(entry.kind),sortieFake:entry.kind==='sortieFake',sortieCueColor:entry.color||'rainbow',reward:0,flowBefore:{...flow,phase:'art',entryStage:'seven',pendingZone:entry.zone},flowAfter:{...flow,entryStage:'roulette',pendingZone:entry.zone}}};}
 function message(entry){return entry?.kind==='sortieFake'?'出陣チャンス / 次のBETでネビュラを狙え':entry?.kind==='sortie'?(entry.stage==='ready'?'出陣チャレンジ / 次のBETで開始':'出陣チャンス / 次のBETでネビュラを狙え'):entry?.stage==='ready'?NovaArt.zoneName(entry.zone)+'ゾーン / 次のBETで開始':'特化ゾーン準備中 / 次のBETで7を狙え';}
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
 return {drawFake,cueColor,eligible,matches,prepare,spin,message,show,hide};
})();
