/* Resolve mastered game copies without changing logical source IDs or playback timing. */
globalThis.NovaAudioAssets=(()=>{
 'use strict';
 const adopted=new WeakSet();
 function entry(src){
  try{const url=new URL(src,document.baseURI),base=new URL('.',document.baseURI);
   if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return null;
   return globalThis.NovaAudioManifest?.[decodeURIComponent(url.pathname.slice(base.pathname.length))]||null;
  }catch{return null;}
 }
 function resolve(src){return entry(src)?.src||src;}
 function adopt(audio){
  if(!audio||adopted.has(audio))return audio;adopted.add(audio);
  const get=audio.getAttribute.bind(audio),set=audio.setAttribute.bind(audio),remove=audio.removeAttribute.bind(audio),clone=audio.cloneNode.bind(audio);
  let logical=get('src');
  const change=value=>{logical=String(value);set('src',resolve(logical));};
  Object.defineProperty(audio,'src',{configurable:true,get:()=>logical?new URL(logical,document.baseURI).href:'',set:change});
  audio.getAttribute=name=>String(name).toLowerCase()==='src'?logical:get(name);
  audio.setAttribute=(name,value)=>String(name).toLowerCase()==='src'?change(value):set(name,value);
  audio.removeAttribute=name=>{if(String(name).toLowerCase()==='src')logical=null;remove(name);};
  audio.cloneNode=deep=>{const copy=clone(deep);if(logical!==null)copy.setAttribute('src',logical);return adopt(copy);};
  if(logical!==null)change(logical);
  return audio;
 }
 return Object.freeze({entry,resolve,adopt});
})();
