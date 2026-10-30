/* Fail closed on stale/missing measurements; never substitute a target or old rate. */
globalThis.NovaRtpClient=(()=>{
 const conditions=new Set(['10億G連続・MY／差枚停止なし','2.5億G×4系列合算・MY／差枚停止なし']);
 function verified(data,expectedModelHash){
  return data?.schema==='nova-current-rtp/v1'&&data.status==='ready'
   &&data.gamesPerSetting===1_000_000_000&&/^[a-f0-9]{40}$/.test(data.commit||'')
   &&/^[a-f0-9]{64}$/.test(data.modelHash||'')&&(!expectedModelHash||data.modelHash===expectedModelHash)
   &&conditions.has(data.conditions)&&Array.isArray(data.settings)&&data.settings.length===6
   &&[1,2,3,4,5,6].every(setting=>{
    const rows=data.settings.filter(row=>row.setting===setting);
    return rows.length===1&&Number.isFinite(rows[0].rtpPct)&&rows[0].rtpPct>=0;
   });
 }
 function start({url,expectedModelHash,onUpdate,intervalMs=60000}){
  let busy=false,closed=false,controller=null;
  async function refresh(){
   if(busy||closed)return;
   busy=true;controller=new AbortController();
   const timeout=setTimeout(()=>controller?.abort(),10000);
   let report=null;
   try{
    const response=await fetch(url,{cache:'no-store',signal:controller.signal});
    const data=response.ok?await response.json():null;
    if(verified(data,expectedModelHash))report=data;
   }catch{}finally{
    clearTimeout(timeout);busy=false;
    if(!closed)onUpdate(report);
   }
  }
  const onVisible=()=>{if(!document.hidden)void refresh();};
  const timer=setInterval(onVisible,intervalMs);
  document.addEventListener('visibilitychange',onVisible);
  void refresh();
  return {refresh,stop(){closed=true;clearInterval(timer);controller?.abort();document.removeEventListener('visibilitychange',onVisible);}};
 }
 return Object.freeze({verified,start});
})();
