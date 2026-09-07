/* Regenerative reward calculation. Excludes manual overrides and complete-stop truncation. */
globalThis.NovaBalance=(()=>{
 const targets=[.95,.965,.985,1.01,1.05,1.10];
 const normal=[[354.112628,570.311235,6.592194,128,7.464630],[335.340933,496.870459,6.554256,192,7.482946],[318.675842,391.096799,6.455407,124,7.452119],[295.728558,359.759320,6.248231,184,7.301746],[288.226978,283.780845,6.120643,120,7.250883],[276.519476,276.524590,5.897360,176,7.245667]];
 function giruMean(setting){let survival=1,mean=0;for(let k=0;k<6;k++){const g=5*2**k,p=NovaArt.giruChance(g,setting);mean+=survival*(1-p)*g;survival*=p;}const p=NovaArt.giruChance(320,setting);return mean+survival*320*(1-p)/(1-2*p);}
 function calculate(setting,scale){
  const c=NovaArt.defaults,row=normal[setting-1],bbRatio=row[1]/(row[0]+row[1]),normalPay=8*(1/row[2]+1/row[3])+3/row[4];
  // Ordinary BIG can promote to a two-BIG PBB chain at 3%; each is now 30G.
  const bGames=30*1.03,bPay=bGames*5.5,bArt=bGames*NovaArt.bonusSpecial*c.initial,bExtra=bGames+.03;
  const weights=NovaArt.zoneWeights[setting-1].map(x=>x/100);
  const zG=[20,30,40,giruMean(setting),0,109.5],zD=[3,5,5,1,10,5],zP=[12.6,21,12.6,0,0,8.4];
  let zoneG=0,zoneD=0,zoneP=0;
  for(let i=0;i<6;i++){const stocks=i===4?2.5:0;zoneG+=weights[i]*(zG[i]+stocks*bArt);zoneD+=weights[i]*(zD[i]+stocks*(2+bExtra));zoneP+=weights[i]*(zP[i]+stocks*bPay);}
  const offspring=c.rare*(c.big*bArt+c.zone*zoneG);
  if(offspring>=1)throw Error('ART expected duration diverges');
  const artGames=(1+c.rare*(c.big*(1+bExtra)+c.zone*zoneD))/(1-offspring);
  const artPay=(5.5+c.rare*(c.big*bPay+c.zone*zoneP))/(1-offspring);
  const bonusD=bbRatio*(1+bExtra+bArt*artGames)+(1-bbRatio)*(1+15+15*NovaArt.bonusSpecial*c.initial*artGames);
  const bonusP=bbRatio*(bPay+bArt*artPay)+(1-bbRatio)*(15*5.5+15*NovaArt.bonusSpecial*c.initial*artPay);
  const d=scale/c['direct'+setting],cz=(1-d)*scale/120,strong=(1-d)*scale/600;
  const success=cz*.4+strong*.7;
  const games=1+(cz+strong)*10+success*((1-c.czArt)*bonusD+c.czArt*c.initial*artGames)+d*c.initial*artGames;
  const payout=(1-d-cz-strong)*normalPay+(cz+strong)*10*normalPay+success*((1-c.czArt)*bonusP+c.czArt*c.initial*artPay)+d*c.initial*artPay;
  return {setting,scale,rtp:payout/(3*games),artGames,artPay,offspring,giruMean:giruMean(setting),directDenom:c['direct'+setting]/scale,czDenom:120/scale,strongDenom:600/scale};
 }
 const profiles=targets.map((target,i)=>{let lo=0,hi=20;for(let n=0;n<80;n++){const mid=(lo+hi)/2;if(calculate(i+1,mid).rtp<target)lo=mid;else hi=mid;}return Object.freeze({...calculate(i+1,(lo+hi)/2),target});});
 const profile=setting=>profiles[Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1))];
 return {targets,normal,calculate,profiles,profile,giruMean};
})();
