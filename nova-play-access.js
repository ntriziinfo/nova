(function(root){
  'use strict';
  // A browser-owned lock survives background throttling and disappears on crashes.
  // Never expire a live tab's ownership based on a timer.
  function create(key, {locks=root.navigator?.locks, blocked=()=>{}}={}){
    let active=false, closed=false, release=null, started=false;
    return {
      owned:()=>active && !closed,
      close(){closed=true;active=false;release?.();},
      start(boot){
        if(started)return;
        started=true;
        if(!locks?.request){blocked('unsupported');return;}
        return locks.request('nova-play:'+key,{mode:'exclusive',ifAvailable:true},async lock=>{
          if(closed)return;
          if(!lock){blocked('occupied');return;}
          active=true;
          const held=new Promise(resolve=>{release=resolve;});
          try{await boot();await held;}
          finally{active=false;release=null;}
        }).catch(error=>{active=false;blocked('error',error);});
      }
    };
  }
  root.NovaPlayAccess=Object.freeze({create});
})(globalThis);
