/* Store play has no local debug/editor unlock. Administrative commands arrive
 * through the controller's authenticated command API, not through this UI. */
globalThis.NovaUiAccess=(()=>{
  'use strict';
  const params=new URLSearchParams(location.search);
  const storePlay=['controller','storeId','server','playSessionId','creditBaseline'].some(key=>params.has(key))
    || (!!params.get('machine')&&params.get('machine')!=='standalone');
  const canEdit=!storePlay;
  const selector=[
    '#vertexConnectionBadge','#debugToggleBtn','#debugDrawer','#secretPanel',
    '.side > .card:not(.oddsPublic):not(.slumpPublic)',
    '#novaSymbolPreviewOpen','#novaSymbolPreview',
    '#layoutEditToggleBtn','#layoutEditorPanel',
    '#bellNaviAdjustBtn','#novaArtToggle','#novaArtPanel',
    '#novaResultAdjust','.novaResultSettings'
  ].join(',');
  const canUse=element=>canEdit||!element?.closest?.(selector);
  if(storePlay){
    document.documentElement.classList.add('novaStorePlay');
    // Covers dynamically inserted controls too, without a per-spin DOM observer.
    for(const type of ['click','pointerdown','keydown','input','change']){
      window.addEventListener(type,event=>{
        if(canUse(event.target))return;
        event.preventDefault();event.stopImmediatePropagation();
      },{capture:true});
    }
    document.addEventListener('DOMContentLoaded',()=>{
      for(const element of document.querySelectorAll(selector)){
        element.hidden=true;element.inert=true;
      }
    });
  }
  return Object.freeze({storePlay,canEdit,canUse});
})();
