/* Read-only cabinet renderer: no game entrypoint, storage, sound or controls. */
(()=>{
  'use strict';
  const source=new URLSearchParams(location.search).get('parent');
  const allowed=/^https:\/\/(?:(?:nebula-control|vertex-debug)(?:-[a-z0-9-]+)?\.vercel\.app)$/.test(source||'')||/^http:\/\/127\.0\.0\.1:\d+$/.test(source||'');
  if(!allowed)return;
  const stage=document.getElementById('mirrorStage');
  const tags=new Set(['div','section','span','p','b','strong','small','em','i','br','img','picture','video','button','h2','h3','output']);
  const privateId=/(?:debug|setting|password|token|session|layoutEdit|audioDock|soundPanel|odds|resultText|subMessage|lcd)/i;
  let elements=new Map(),oldVars=[],bodyAttrs=[],root;
  function release(el){if(el.localName==='video'){el.pause();el.removeAttribute('src');el.load();}}
  function clear(){for(const el of elements.values())release(el);stage.replaceChildren();elements.clear();root=null;}
  function asset(raw){try{const u=new URL(raw,location.href);return u.origin===location.origin&&u.pathname.startsWith('/assets/')&&/\.(png|webp|jpg|jpeg|gif|svg|mp4|webm)$/i.test(u.pathname)?(u.search='',u.hash='',u.href):'';}catch{return '';}}
  function style(raw){return /url\s*\(|[@<>\\]|expression|javascript|behavior|-moz-binding/i.test(raw)?raw.replace(/url\(([^)]*)\)/gi,(_,u)=>{const safe=asset(u.trim().replace(/^['"]|['"]$/g,''));return safe?`url("${safe}")`:'none';}).replace(/[@<>\\]/g,''):raw;}
  function attrs(el,values){
    const next={};
    for(const [key,value]of Object.entries(values||{})){
      if(typeof value!=='string')continue;
      if(key==='id'&&!privateId.test(value))next[key]=value;
      else if(key==='class')next[key]=value.replace(/\b(?:debugMode|debugOpen|layoutEditOpen)\b/g,'');
      else if(key==='style'&&!/expression|javascript|behavior|-moz-binding/i.test(value))next[key]=style(value);
      else if((key==='src'||key==='poster')&&asset(value))next[key]=asset(value);
      else if(key==='disabled'&&value==='')next[key]='';
      else if(/^data-[a-z0-9-]{1,50}$/.test(key)&&!privateId.test(key))next[key]=value;
    }
    for(const a of Array.from(el.attributes))if(!(a.name in next))el.removeAttribute(a.name);
    for(const [k,v]of Object.entries(next))if(el.getAttribute(k)!==v)el.setAttribute(k,v);
    if(el.localName==='button'){el.tabIndex=-1;}
  }
  function render(frame){
    if(frame?.v!==1||frame.root?.tag!=='section'||frame.root?.attrs?.id!=='machine')return;
    const next=new Map();let count=0;
    function build(node,depth=0){
      if(++count>1800||depth>32)throw Error('screen too large');
      if(typeof node==='string')return document.createTextNode(node.slice(0,300));
      if(!node||!tags.has(node.tag)||privateId.test(node.attrs?.id||''))return document.createTextNode('');
      let el=elements.get(node.key);if(!el||el.localName!==node.tag||next.has(node.key))el=document.createElement(node.tag);
      next.set(node.key,el);attrs(el,node.attrs);
      const children=(node.children||[]).map(n=>build(n,depth+1));
      // Keep existing videos and their playback alive between snapshots.
      children.forEach((child,i)=>{if(el.childNodes[i]!==child)el.insertBefore(child,el.childNodes[i]||null);});
      while(el.childNodes.length>children.length)el.lastChild.remove();
      if(node.tag==='video'){
        el.muted=true;el.defaultMuted=true;el.playsInline=true;el.controls=false;el.loop=!!node.media?.loop;
        const time=Math.max(0,Math.min(86400,Number(node.media?.time)||0));
        if(el.readyState&&Math.abs(el.currentTime-time)>1.8)el.currentTime=time;
        if(node.media?.paused)el.pause();else el.play().catch(()=>{});
      }
      return el;
    }
    const cabinet=build(frame.root);
    for(const key of oldVars)document.documentElement.style.removeProperty(key);
    oldVars=[];for(const [key,value]of Object.entries(frame.vars||{}))if(/^--[a-z0-9-]{1,70}$/i.test(key)&&typeof value==='string'&&!/[@<>\\]|expression|javascript|behavior/i.test(value)){document.documentElement.style.setProperty(key,style(value));oldVars.push(key);}
    for(const key of bodyAttrs)document.body.removeAttribute(key);
    attrs(document.body,frame.body);bodyAttrs=Array.from(document.body.attributes,a=>a.name);
    if(root!==cabinet){stage.replaceChildren(cabinet);root=cabinet;}
    for(const [key,el]of elements)if(next.get(key)!==el)release(el);
    elements=next;
    document.documentElement.style.setProperty('--mirror-width',`${Number(frame.width)||960}px`);
    document.documentElement.style.setProperty('--mirror-height',`${Number(frame.height)||1610}px`);
  }
  window.addEventListener('message',e=>{
    if(e.source!==parent||e.origin!==source)return;
    try{if(e.data?.type==='nova-monitor-frame')render(e.data.screen);
      else if(e.data?.type==='nova-monitor-clear')clear();}
    catch{clear();}
  });
  document.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
  document.addEventListener('keydown',e=>e.preventDefault(),true);
  parent.postMessage({type:'nova-monitor-renderer-ready'},source);
})();
