/* Visual observation only. Never reads storage, settings, RNG or game state. */
(()=>{
  'use strict';
  const tags=new Set(['div','section','span','p','b','strong','small','em','i','br','img','picture','video','button','h2','h3','output']);
  const privateId=/(?:debug|setting|password|token|session|layoutEdit|audioDock|soundPanel|odds|resultText|subMessage|lcd)/i;
  const keys=new WeakMap();let serial=0,options,token='',until=0,timer=0,busy=false,closed=true,controller;
  function capture(){
    const machine=document.getElementById('machine');if(!machine)return null;
    let count=0;
    function visit(el){
      if(++count>1800)throw Error('large screen');
      if(el.nodeType===3)return el.textContent.trim()?el.textContent.slice(0,300):null;
      if(el.nodeType!==1||!tags.has(el.localName)||privateId.test(el.id)||el.hidden||getComputedStyle(el).display==='none')return null;
      if(!keys.has(el))keys.set(el,String(++serial));
      const attrs={};
      for(const a of el.attributes)if(['id','class','style','src','poster'].includes(a.name)||a.name.startsWith('data-')&&!privateId.test(a.name))attrs[a.name]=a.value;
      if(el.localName==='img')attrs.src=el.currentSrc||el.src;
      if(el.localName==='video')attrs.src=el.currentSrc||el.src;
      // Controls are visible cabinet artwork, but never operable in the mirror.
      if(el.localName==='button'&&el.disabled)attrs.disabled='';
      const node={key:keys.get(el),tag:el.localName,attrs,children:Array.from(el.childNodes,visit).filter(v=>v!==null)};
      if(el.localName==='video')node.media={time:el.currentTime,paused:el.paused,loop:el.loop};
      return node;
    }
    const vars={};for(const key of document.documentElement.style)if(key.startsWith('--'))vars[key]=document.documentElement.style.getPropertyValue(key);
    const body={class:document.body.className};for(const a of document.body.attributes)if(a.name.startsWith('data-')&&!privateId.test(a.name))body[a.name]=a.value;
    return {v:1,width:machine.offsetWidth,height:machine.offsetHeight,body,vars,root:visit(machine)};
  }
  function schedule(){if(!closed)timer=setTimeout(tick,1000);}
  async function tick(){
    if(closed)return;
    if(!token){window.parent.postMessage({type:'nova-monitor-ready'},options.server);schedule();return;}
    if(busy||until<Date.now()||!options.canPublish()){schedule();return;}
    busy=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),6000);
    try{
      const screen=capture();if(screen&&JSON.stringify(screen).length<210000){
        const response=await fetch(options.server+'/api/machines/'+encodeURIComponent(options.machineId)+'/monitor/frame',{
          method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':token},
          body:JSON.stringify({sessionId:options.sessionId,screen}),signal:controller.signal
        });
        if(response.status===401||response.status===409){token='';until=0;}
      }
    }catch{/* Observation must never interrupt play. */}
    finally{clearTimeout(timeout);busy=false;controller=null;schedule();}
  }
  function message(event){
    const msg=event.data;
    if(closed||event.source!==window.parent||event.origin!==options.server||msg?.type!=='nova-monitor-session')return;
    if(msg.machineId!==options.machineId||msg.sessionId!==options.sessionId||typeof msg.token!=='string')return;
    token=msg.token;
  }
  function close(){closed=true;clearTimeout(timer);controller?.abort();window.removeEventListener('message',message);token='';until=0;}
  window.NovaMonitorPublisher=Object.freeze({
    start(config){
      if(!config.enabled||!config.server||window.parent===window)return;
      close();options={...config,server:new URL(config.server).origin};closed=false;
      window.addEventListener('message',message);tick();
    },
    lease(value){until=Number(value)||0;},close
  });
})();
