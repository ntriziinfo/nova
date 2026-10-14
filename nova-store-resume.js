/* Authenticated entry-page handoff. No credentials or state in the URL. */
globalThis.NovaStoreResume=(()=>{
  function connect({enabled,origin,sessionId,prepare,ready}){
    if(!enabled)return Promise.resolve(null);
    return new Promise((resolve,reject)=>{
      let received=false;
      const send=()=>parent.postMessage({type:'nova-store-ready',sessionId},origin);
      const interval=setInterval(send,500);
      const timeout=setTimeout(()=>{clearInterval(interval);if(!received)reject(Error('台の保存状態を受信できませんでした'));},15000);
      addEventListener('message',event=>{
        const msg=event.data;
        if(event.source!==parent||event.origin!==origin||msg?.sessionId!==sessionId)return;
        if(msg.type==='nova-store-bootstrap'&&!received){
          received=true;clearInterval(interval);clearTimeout(timeout);resolve(msg.resumeState||null);
        }
        if(msg.type==='nova-store-prepare-end'&&received&&ready()){
          const snapshot=prepare();
          parent.postMessage({type:'nova-store-end-ready',sessionId,requestId:msg.requestId,snapshot},origin);
        }
      });
      send();
    });
  }
  return {connect};
})();
