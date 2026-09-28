import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';const src=fs.readFileSync('nova-beat-lamps.js','utf8');
test('beat detector reacts to low-frequency peaks and limits rapid flashes',()=>{const c=vm.createContext({});vm.runInContext(src,c);const d=c.NovaBeatLamps.detector();assert.equal(d(0,0).beat,false);assert.equal(d(.7,100).beat,true);assert.equal(d(.9,150).beat,false);for(let t=200;t<600;t+=30)d(.01,t);assert.equal(d(.7,650).beat,true);});
test('each media element is connected once; stopped playback falls back',()=>{let created=0,cb;const layer={dataset:{},style:{setProperty(){},removeProperty(){}}};const c=vm.createContext({Uint8Array,document:{body:{dataset:{gamePhase:'art'}},querySelector:()=>layer},requestAnimationFrame:f=>{cb=f;return 1}});vm.runInContext(src,c);const ctx={state:'running',sampleRate:48000,createAnalyser:()=>({frequencyBinCount:512,connect(){},getByteFrequencyData(d){d.fill(150)}}),createMediaElementSource(){created++;return {connect(){}}},destination:{}};const audio={paused:false,ended:false,muted:false,volume:1};c.NovaBeatLamps.attach(audio,ctx);c.NovaBeatLamps.attach(audio,ctx);assert.equal(created,1);cb(1000);assert.equal(layer.dataset.musicBeat,'true');audio.paused=true;cb(1100);assert.equal(layer.dataset.musicBeat,'false');});
test('light peak moves across the row and isolated frequency bands react independently',()=>{const c=vm.createContext({});vm.runInContext(src,c);const a=c.NovaBeatLamps;for(let head=0;head<6;head++){const levels=Array.from({length:6},(_,i)=>a.lightLevel(i,head));assert.equal(levels.indexOf(Math.max(...levels)),head);assert.ok(Math.min(...levels)<.3);}const data=new Uint8Array(512);data[2]=255;assert.ok(a.bandEnergy(data,50,[40,150])>0);assert.equal(a.bandEnergy(data,50,[1500,4000]),0);});
test('sequence follows all four six-lamp orders then alternating groups and three all-lamp flashes and repeats',()=>{const c=vm.createContext({});vm.runInContext(src,c);const sequence=c.NovaBeatLamps.sequence;assert.deepEqual(Array.from({length:24},(_,i)=>sequence(i*340).index+1),[1,2,3,4,5,6,6,5,4,3,2,1,1,3,5,2,4,6,6,4,2,5,3,1]);assert.deepEqual(Array.from({length:6},(_,i)=>sequence((36+i)*340).all),[true,false,true,false,true,false]);assert.equal(sequence(42*340).index,0);});
test('bonus horizontal motion is smooth; odd and even groups flash together',()=>{const c=vm.createContext({});vm.runInContext(src,c);const a=c.NovaBeatLamps;assert.ok(Math.abs(a.sequence(3*340,'bonus').head-2.5)<1e-10);assert.equal(a.sequence(6*340,'bonus').head,5);assert.ok(Math.abs(a.sequence(9*340,'bonus').head-2.5)<1e-10);for(const [step,expected]of [[24,[0,2,4]],[25,[]],[26,[1,3,5]],[27,[]]]){const cue=a.sequence(step*340,'bonus');assert.deepEqual(Array.from({length:6},(_,i)=>i).filter(i=>a.sequenceLight(i,cue)>.8),expected);}assert.equal(a.sequence(42*340,'bonus').head,0);assert.equal(a.sequence(3*340,'art').index,3);});
test('eight lamps all participate in travel, bonus sweep and alternating flashes',()=>{
 const c=vm.createContext({});vm.runInContext(src,c);const a=c.NovaBeatLamps;
 for(const phase of ['art','bonus']){
  for(const start of [16,24]){
   const lit=Array.from({length:8},(_,i)=>a.sequence((start+i)*340,phase,8).index);
   assert.deepEqual([...lit].sort((x,y)=>x-y),[0,1,2,3,4,5,6,7]);
  }
  const first=a.sequence(32*340,phase,8),second=a.sequence(34*340,phase,8);
  for(let i=0;i<8;i++)assert.notEqual(a.sequenceLight(i,first)>.8,a.sequenceLight(i,second)>.8);
  assert.deepEqual(Array.from({length:6},(_,i)=>a.sequence((44+i)*340,phase,8).all),[true,false,true,false,true,false]);
 }
 assert.equal(a.sequence(8*340,'bonus',8).head,7);
 assert.equal(a.sequence(50*340,'bonus',8).head,0);
 assert.equal(a.sequence(50*340,'art',8).index,0);
});
