/* Only timer IDs cross this boundary; game state and random draws stay in the page. */
const timers=new Map();
self.onmessage=({data})=>{
 clearTimeout(timers.get(data.id));timers.delete(data.id);
 if(data.type!=='arm')return;
 timers.set(data.id,setTimeout(()=>{
  timers.delete(data.id);self.postMessage({id:data.id,token:data.token});
 },data.delay));
};
