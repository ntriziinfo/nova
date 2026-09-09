/* Display-only lamp state. Original artwork and saved positions are untouched. */
globalThis.NovaComeback=(()=>{
 const lamps={sosuke:'sosuke',toto:'toto',urapi:'urapi',giru:'giru1',sora:'sora1',ouma:'ouma1'};
 function scene(flow,spinning=false){
  if(flow?.phase!=='art')return {mode:'',lamp:'',ura:false};
  if(flow.comebackConfirmed&&flow.entryStage==='confirmed')return {mode:'won',lamp:lamps[NovaArt.baseZone(flow.pendingZone)]||'',ura:flow.pendingZone.startsWith('ura_')};
  if(!flow.comebackLeft)return {mode:'',lamp:'',ura:false};
  return {mode:spinning&&flow.comebackLamp?'blink':'waiting',lamp:lamps[NovaArt.baseZone(flow.comebackLamp)]||'',ura:flow.comebackLamp?.startsWith('ura_')||false};
 }
 function sync(flow,spinning=false){
  const state=scene(flow,spinning),body=document.body;
  body.dataset.comeback=state.mode;body.dataset.comebackUra=String(state.ura);
  for(const item of document.querySelectorAll('.novaArtItem'))item.dataset.comebackSelected=String(!!state.lamp&&item.dataset.artwork===state.lamp);
 }
 return {scene,sync};
})();
