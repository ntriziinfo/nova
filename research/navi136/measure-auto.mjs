import fs from 'node:fs';
import assert from 'node:assert/strict';
import {open} from './browser.mjs';
async function measure(config){
 const {browser,page,errors,missing}=await open(config);
 try{
  await page.evaluate(()=>{
   window.timing={spins:[],games:0,limit:181};const begin=NovaBellNavi.begin,clear=NovaBellNavi.clear;
   NovaBellNavi.begin=spin=>{const f=spin.resolved?.flowBefore;timing.spins.push({start:performance.now(),zero:!!f?.zero,result:spin.result,phase:spin.aTypeBonusActiveAtStart?'bonus':f?.zone?'zone':f?.initialStage?'initial':f?.phase,zone:f?.zone||'',initial:f?.initialStage||''});if(!f?.zero)timing.games++;return begin(spin);};
   NovaBellNavi.clear=()=>{clear();if(timing.spins.length){timing.spins.at(-1).finish=performance.now();if(timing.games>=timing.limit&&!timing.done){timing.done=true;document.querySelector('#quickAutoBtn').click();}}};
  });
  await page.locator('#quickAutoBtn').click();
  await page.waitForFunction(()=>timing.done,{},{timeout:600000,polling:250});
  const result=await page.evaluate(()=>({spins:timing.spins,setting:window.__jagAdminSnapshot().settings.setting,autoDelay:window.__jagAdminSnapshot().settings.autoDelay}));
  const rows=result.spins,elapsed=(rows.at(-1).start-rows[0].start)/1000,games=rows.slice(0,-1).filter(s=>!s.zero).length;
  const groups={};for(let i=0;i<rows.length-1;i++){const key=rows[i].zero?'zero':rows[i].phase||'unknown',g=groups[key]??={count:0,seconds:0};g.count++;g.seconds+=(rows[i+1].start-rows[i].start)/1000;}
  for(const g of Object.values(groups))g.averageSeconds=g.seconds/g.count;
  const report={config,setting:result.setting,autoDelay:result.autoDelay,games,elapsedSeconds:elapsed,perHour:games/elapsed*3600,perEightHours:games/elapsed*28800,groups,pageErrors:errors,missingAssets:missing,silent:true,isolated:true,rows};
  fs.writeFileSync('research/navi136/timing-'+(config.initial?'initial':'normal')+'.json',JSON.stringify(report,null,2));assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log(JSON.stringify({...report,rows:undefined}));
 }finally{await browser.close();}
}
await Promise.all([measure({normal:true}),measure({initial:true})]);
