/* Synchronous, durable saves: suppress identical writes, never defer a spin. */
globalThis.NovaStateStorage=(()=>{
  'use strict';
  function create({read,write,serialize=JSON.stringify}){
    const cache=new Map(),metrics={writes:0,skips:0,failures:0};
    function save(key,value){
      try{
        const {savedAt,...state}=value;
        const body=serialize({savedAt:0,...state});
        const previous=cache.get(key);
        // Check the actual storage: another tab, reset, or quota recovery may
        // remove/replace an entry without this page receiving a storage event.
        if(previous?.body===body&&read(key)===previous.serialized){metrics.skips++;return true;}
        const serialized=body.replace(/^\{"savedAt":0/,()=>'{"savedAt":'+JSON.stringify(savedAt));
        if(!write(key,serialized)){metrics.failures++;return false;}
        metrics.writes++;cache.set(key,{body,serialized});return true;
      }catch{metrics.failures++;return false;}
    }
    return Object.freeze({save,metrics:()=>({...metrics})});
  }
  return Object.freeze({create});
})();
