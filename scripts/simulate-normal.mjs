import fs from 'node:fs';import vm from 'node:vm';
for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
export function simulate(setting,scale,games=1000000,seed=1234567){
 const a=NovaArt,n=NovaNormal,c={...a.defaults,setting},rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 let flow={phase:'normal'},state=n.normalize(),paid=0,count=0,freezes=0,ceilings=0,release=0,bonusG=0,bonusP=0;
 function bonus(kind,freeze=false){count++;const claim=n.claim(state,freeze,rng);if(state.impurity===100)release++;state=flow.phase==='art'?claim.state:n.afterBonus(claim.state,rng);let sets=claim.sets;for(let g=0;g<(kind==='MID'?15:30);g++){const r=a.drawBonus(rng),pay=n.pay(r);paid+=pay;count++;bonusG++;bonusP+=pay;if(r==='STRONG_NOVA')sets++;}flow=a.afterBonus(flow,c,sets);if(flow.phase==='art'&&claim.zones.length){flow.queuedZones.push(...claim.zones);if(!flow.zone)flow=a.startZone(flow,flow.queuedZones.shift(),c);}}
 while(count<games){
  if(flow.phase==='art'){if(!flow.zero)count++;const s=a.step(flow,c,rng);paid+=n.pay(s.result);flow=s.flow;if(s.internalBonus)bonus('BIG');continue;}
  count++;const t=n.spin(state,flow,setting,{scale},rng);state=t.state;paid+=n.pay(t.result);
  if(t.result==='SUPER_NOVA'){const freeze=rng()<.5;if(freeze)freezes++;flow={phase:'normal'};bonus('BIG',freeze);}
  else if(t.internalBonus){if(t.internalBonus.source.includes('天井'))ceilings++;flow={phase:'normal'};bonus(t.internalBonus.kind);}
  else if(t.direct)flow=a.enter(c);
  else if(t.entry)flow=NovaFlow.enterCZ(t.entry==='STRONG_CZ',undefined,rng);
  else flow=NovaFlow.advance(flow);
 }
 return {setting,scale,games:count,rtp:paid/(count*3),freezes,ceilings,release,bonusNet:bonusP/bonusG-3};
}
const size=Number(process.argv[2]||300000),mode=process.argv[3]||'calibrate',report=[];
for(let setting=1;setting<=6;setting++){
 if(process.argv[4] && setting!==Number(process.argv[4]))continue;
 if(mode==='calibrate'){let lo=.08,hi=.5;for(let i=0;i<9;i++){const mid=(lo+hi)/2,r=simulate(setting,mid,size);if(r.rtp<NovaBalance.targets[setting-1])lo=mid;else hi=mid;}const r=simulate(setting,(lo+hi)/2,size*3,987654+setting);report.push(r);console.log(JSON.stringify(r));}
 else {const results=[];for(let seed=0;seed<10;seed++)results.push(simulate(setting,NovaBalance.profile(setting).scale,size,(Number(process.argv[5])||1222221)+seed*98761+setting));const mean=results.reduce((s,r)=>s+r.rtp,0)/10,se=Math.sqrt(results.reduce((s,r)=>s+(r.rtp-mean)**2,0)/9/10);const r={setting,mean,ci95:[mean-2.262*se,mean+2.262*se],results};report.push(r);console.log(JSON.stringify(r));}
}
fs.writeFileSync('../../outputs/normal-'+mode+(process.argv[4]?'-'+process.argv[4]:'')+'.json',JSON.stringify(report,null,2));
