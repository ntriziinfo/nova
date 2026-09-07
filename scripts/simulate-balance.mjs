import fs from 'node:fs';import vm from 'node:vm';
for(const f of ['nova-art.js','nova-balance.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const cycles=Number(process.argv[2]||200000);const report=[];
for(let setting=1;setting<=6;setting++){
 let seed=0x123456+setting;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const a=NovaArt,c={...a.defaults,setting},p=NovaBalance.profile(setting),row=NovaBalance.normal[setting-1],bbRatio=row[1]/(row[0]+row[1]);
 const normalRole=()=>{const r=rng();return r<1/row[2]+1/row[3]?8:r<1/row[2]+1/row[3]+1/row[4]?3:0;};
 let totalCost=0,totalPay=0,sumX2=0,sumY2=0,sumXY=0,artCount=0,artPay=0,bonusCount=0,bonusPay=0;
 for(let cycle=0;cycle<cycles;cycle++){
  let cost=3,pay=0,flow={phase:'normal'},firstBonus='';
  if(rng()<1/p.directDenom)flow=a.enter(c);
  else {const r=rng();const isStrong=r<1/p.strongDenom,isCZ=r<1/p.strongDenom+1/p.czDenom;
   if(isCZ){const success=rng()<(isStrong?.7:.4);for(let g=0;g<10;g++){cost+=3;pay+=normalRole();}if(success){if(rng()<c.czArt)flow=a.enter(c);else firstBonus=rng()<bbRatio?'BIG':'MID';}}
   else pay+=normalRole();
  }
  function bonus(kind){const count=kind==='BIG'&&rng()<.03?2:1;for(let b=0;b<count;b++){cost+=3;let sets=0;for(let g=0;g<(kind==='MID'?15:30);g++){const role=a.drawBonus(rng);const reward=role==='BELL'?15:role==='REPLAY'?3:0;cost+=3;pay+=reward;bonusCount++;bonusPay+=reward;if(role==='STRONG_NOVA')sets++;}flow=a.afterBonus(flow,c,sets);}}
  if(firstBonus)bonus(firstBonus);
  while(flow.phase==='art'){
   const wasZone=!!flow.zone;if(!flow.zero)cost+=3;
   const step=a.step(flow,c,rng);const reward=step.result==='BELL'?8:step.result==='REPLAY'?3:0;
   pay+=reward;if(!wasZone&&!step.internalBonus?.source?.includes('ストック')){artCount++;artPay+=reward;}
   flow=step.flow;if(step.internalBonus)bonus('BIG');
  }
  totalCost+=cost;totalPay+=pay;sumX2+=cost*cost;sumY2+=pay*pay;sumXY+=cost*pay;
 }
 const ratio=totalPay/totalCost,variance=(sumY2-2*ratio*sumXY+ratio*ratio*sumX2)/(cycles-1),se=Math.sqrt(variance/cycles)/(totalCost/cycles);
 report.push({...p,cycles,paidGames:totalCost/3,measured:ratio,ci95:[ratio-1.96*se,ratio+1.96*se],artNet:artPay/artCount-3,bonusNet:bonusPay/bonusCount-3});
 console.log(JSON.stringify(report.at(-1)));
}
fs.mkdirSync('../../outputs',{recursive:true});fs.writeFileSync('../../outputs/balance-verification.json',JSON.stringify({conditions:'Normal renewal cycles; complete-stop and forced/debug outcomes excluded; fixed PRNG seeds.',report},null,2));
