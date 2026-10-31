const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function outputConfig(config,overrides={}){
 const routes=[];
 for(const row of config.redirects||[]){routes.push({src:'^'+escape(row.source)+'$',status:row.permanent?308:307,headers:{Location:row.destination}});}
 for(const row of config.headers||[]){
  if(row.source!=='/nova-rtp-current.:ext(json|js)')throw Error('Unsupported header pattern: '+row.source);
  routes.push({src:'^/nova-rtp-current\\.(json|js)$',headers:Object.fromEntries(row.headers.map(h=>[h.key,h.value])),continue:true});
 }
 for(const row of config.rewrites||[]){routes.push({src:'^'+escape(row.source)+'$',dest:row.destination});}
 routes.push({handle:'filesystem'});
 return {version:3,routes,overrides};
}
