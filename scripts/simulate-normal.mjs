import fs from 'node:fs';import vm from 'node:vm';
for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
export function simulate(setting,scale,games=1000000,seed=1234567,options={}){
 const a=NovaArt,n=NovaNormal,c={...a.defaults,setting},rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 let flow={phase:'normal'},state=options.initialImpurity===undefined?n.reset(rng,setting):n.normalize({impurity:options.initialImpurity}),paid=0,count=0,fee=0,replay=false,freezes=0,ceilings=0,release=0,bonusG=0,bonusP=0,bonusFee=0,peak=0,maxDrawdown=0,maxNormalGames=0,artStart=null,maxArtNet=0;
 const sessionEnd=Symbol("session end");
 const bet=()=>{track();if(options.exactGames&&count>=games)throw sessionEnd;count++;if(!replay)fee+=3;replay=false;};
 const track=()=>{const net=paid-fee;peak=Math.max(peak,net);maxDrawdown=Math.max(maxDrawdown,peak-net);if(artStart!==null)maxArtNet=Math.max(maxArtNet,net-artStart);};
 function bonus(kind,freeze=false){const prep={sets:0,zones:[]};for(let i=0,total=2+Math.floor(rng()*4);i<total;i++){const role=a.drawPreparationRole(setting,rng),won=a.drawPreparation(role,setting,rng);bet();paid+=n.pay(role);replay=role==='REPLAY';prep.sets+=won.sets;prep.zones.push(...won.zones);}bet();const claim=n.claim(state,freeze,rng);if(state.impurity===100)release++;state=flow.phase==='art'?claim.state:n.afterBonus(claim.state,rng);claim.zones.push(...prep.zones);let sets=claim.sets+prep.sets;const tier=a.drawBonusTier(rng);for(let bonusPaid=0;bonusPaid<a.bonusTarget(kind);){const r=a.drawBonus(rng,setting,tier),pay=a.bonusPayout({paid:bonusPaid},r);bonusPaid+=pay;const feeBefore=fee;bet();bonusFee+=fee-feeBefore;paid+=pay;replay=r==='REPLAY';bonusG++;bonusP+=pay;track();if(r==='NEBULA')sets++;}const beforeResume=flow;flow=a.afterBonus(flow,c,sets,rng);state=n.bonusEnd(state,kind,flow);state=n.afterArt(state,beforeResume,flow,{},rng);if(flow.phase==='art'&&claim.zones.length){flow.queuedZones.push(...claim.zones);if(!flow.zone)flow=a.startZone(flow,flow.queuedZones.shift(),{...c,allowUra:true},rng);}}
 try{while(count<games){
  track();if(flow.phase==='art'&&artStart===null)artStart=paid-fee;else if(flow.phase!=='art')artStart=null;
  if(flow.phase==='art'){flow=a.prepareBet(flow,c,rng);if(!flow.zero)bet();const s=a.step(flow,{...c,netPt:options.netGuard===false?0:paid-fee},rng);paid+=n.pay(s.result);if(s.result==='REPLAY')replay=true;state=n.afterArt(state,flow,s.flow,{},rng);flow=s.flow;if(s.internalBonus)bonus('BIG');continue;}
  bet();const t=n.spin(state,flow,setting,{scale},rng);state=t.state;maxNormalGames=Math.max(maxNormalGames,state.games);paid+=n.pay(t.result);replay=t.result==='REPLAY';
  if(t.result==='SUPER_NOVA'){const freeze=rng()<.5;if(freeze)freezes++;flow={phase:'normal'};bonus('BIG',freeze);}
  else if(t.internalBonus){if(t.internalBonus.source.includes('天井'))ceilings++;flow={phase:'normal'};bonus(t.internalBonus.kind);}
  else if(t.direct)flow=a.enter(c,rng);
  else if(t.entry)flow=NovaFlow.enterCZ(t.entry==='STRONG_CZ',t.czOptions,rng);
  else flow=NovaFlow.advance(t.czFlow);
 }
 }catch(error){if(error!==sessionEnd)throw error;}
 track();return {peak,maxDrawdown,maxNormalGames,maxArtNet,net:paid-fee,setting,scale,bias:NovaArt.biasFor(setting),bonusSpecial:NovaArt.bonusSpecialFor(setting),games:count,rtp:paid/fee,freezes,ceilings,release,totalBet:fee,bonusNet:(bonusP-bonusFee)/bonusG};
}
if(process.argv[1]?.endsWith("simulate-normal.mjs")){
const size=Number(process.argv[2]||300000),mode=process.argv[3]||'calibrate',report=[];
for(let setting=1;setting<=6;setting++){
 if(process.argv[4] && setting!==Number(process.argv[4]))continue;
 if(mode==='calibrate'){let lo=-3,hi=1.3;for(let i=0;i<10;i++){const mid=(lo+hi)/2;NovaArt.settingBias[setting-1]=mid;const r=simulate(setting,NovaBalance.profile(setting).scale,size);if(r.rtp<NovaBalance.targets[setting-1])lo=mid;else hi=mid;}NovaArt.settingBias[setting-1]=(lo+hi)/2;const r=simulate(setting,NovaBalance.profile(setting).scale,size*3,987654+setting);report.push(r);console.log(JSON.stringify(r));}
 else {const results=[];for(let seed=0;seed<10;seed++)results.push(simulate(setting,NovaBalance.profile(setting).scale,size,(Number(process.argv[5])||2222221)+seed*98761+setting));const mean=results.reduce((s,r)=>s+r.rtp,0)/10,se=Math.sqrt(results.reduce((s,r)=>s+(r.rtp-mean)**2,0)/9/10);const r={setting,mean,ci95:[mean-2.262*se,mean+2.262*se],results};report.push(r);console.log(JSON.stringify(r));}
}
fs.writeFileSync('../../outputs/normal-'+mode+(process.argv[4]?'-'+process.argv[4]:'')+'.json',JSON.stringify(report,null,2));

}
