import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']}),page=await browser.newPage();
await page.route('**/*',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Isolated audit storage check</title>'}));
try{
 await page.goto('https://nova-audit.test/');await page.addScriptTag({content:fs.readFileSync('nova-audit.js','utf8')});
 const result=await page.evaluate(async()=>{
  const state=(run,game)=>({run,game,bet:game*3,paid:game*5,setting:6,bonus:{active:false},internal:{mode:'通常A',impurity:0},flow:{phase:'art',remaining:'300',atLevel:1},config:{version:120}});
  const rec=new NovaAudit.Recorder({scope:'long'});await rec.ready;
  for(let i=0;i<=30000;i++){rec.record(state('long-run',i),{kind:i?'spin':'checkpoint',result:'BELL'});if(i%500===0)await rec.flush();}
  const all=await rec.export('long-run'),last=await rec.scan('long-run',{offset:30000}),range=await rec.export('long-run',{from:14000,to:16000});
  // Another active recorder must neither steal its pending journal nor overwrite it.
  rec.record(state('long-run',30001),{kind:'spin',result:'BELL'});rec.journal();const raw=localStorage.getItem(rec.journalKey);
  const active=new NovaAudit.Recorder({scope:'long'});await active.ready;const activeJournalUntouched=localStorage.getItem(rec.journalKey)===raw&&active.queue.length===0&&active.journalKey!==rec.journalKey;
  // Simulate a tab ending before its last IndexedDB transaction: its journal alone survives.
  clearTimeout(rec.timer);rec.timer=null;rec.releaseWriter();const recovered=new NovaAudit.Recorder({scope:'long'});await recovered.ready;const recovery=await recovered.export('long-run');
  const a=new NovaAudit.Recorder({scope:'conflict'}),b=new NovaAudit.Recorder({scope:'conflict'});await Promise.all([a.ready,b.ready]);a.record(state('same-run',1),{kind:'spin'});await a.flush();b.record(state('same-run',9),{kind:'spin'});await b.flush();const conflict=await b.export('same-run');
  return {records:all.records.length,spins:all.records.filter(r=>r.kind==='spin').length,bet:all.summary.bet,paid:all.summary.paid,lastSeq:last.rows[0].seq,rangeRows:range.records.length,rangeBet:range.summary.bet,rangePaid:range.summary.paid,activeJournalUntouched,recoveredRows:recovery.records.length,recoveredGame:recovery.records.at(-1).game,conflictPreservesBoth:conflict.records.length===2&&!!conflict.error};
 });
 assert.equal(result.records,30001);assert.equal(result.spins,30000);assert.equal(result.bet,90000);assert.equal(result.paid,150000);assert.equal(result.lastSeq,30001);assert.equal(result.rangeRows,2001);assert.equal(result.rangeBet,6003);assert.equal(result.rangePaid,10005);assert(result.activeJournalUntouched);assert.equal(result.recoveredRows,30002);assert.equal(result.recoveredGame,30001);assert(result.conflictPreservesBoth);
 fs.writeFileSync('docs/audit121-storage-verification.json',JSON.stringify({silent:true,isolated:true,...result},null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
