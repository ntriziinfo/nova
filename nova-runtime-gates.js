/* Presentation-only wait observation. Never changes a hold or releases a lock. */
globalThis.NovaRuntimeGates=(()=>{
  'use strict';
  let read=()=>({}),clock=()=>performance.now();
  const since=new Map();
  const labels={sortie:'出陣の演出・音声',ladder:'突破型ゾーン演出',aim:'狙え演出',award:'上乗せ演出',bonusAudio:'ボーナス音声',reverse:'逆回転演出',audioGate:'出陣停止待ち',czPush:'CZのPUSH',ending:'終了保存中',access:'遊技権限の確認',reels:'リール回転中'};
  const scopes={bet:['sortie','ladder','aim','award'],sortie:['sortie']};
  function configure(reader,now){read=reader;if(now)clock=now;since.clear();}
  function inspect(){
    const state=read(),now=clock(),waits=[];
    for(const [key,label]of Object.entries(labels)){
      if(state[key]){if(!since.has(key))since.set(key,now);waits.push({key,label,elapsedMs:Math.max(0,now-since.get(key))});}
      else since.delete(key);
    }
    return waits;
  }
  function busy(scope){const keys=scopes[scope];if(!keys)throw Error('Unknown wait scope');const state=read(scope);return keys.some(key=>!!state[key]);}
  return Object.freeze({configure,inspect,busy});
})();
