import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const base='https://nova-eta-jet-30.vercel.app',files=['jag.html','nova-art.js','nova-direct-award.js','nova-direct-award.css','assets/design/nova-award-glyphs-v1/glyphs.png'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources=await Promise.all(files.map(async file=>{
 const response=await fetch(base+'/'+file+'?zone134='+Date.now(),{headers:{'Cache-Control':'no-cache'}});assert.equal(response.status,200,file);
 const remote=Buffer.from(await response.arrayBuffer()),local=fs.readFileSync(file),normalize=b=>file.endsWith('.png')?b:b.toString('utf8').replace(/\r\n/g,'\n');
 assert.equal(hash(normalize(remote)),hash(normalize(local)),file);return {file,matches:true};
}));
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};});
 await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForSelector('#novaDirectAward',{state:'attached'});
 await page.evaluate(async()=>{const img=new Image();img.src='assets/design/nova-award-glyphs-v1/glyphs.png';await img.decode();if(img.naturalWidth!==2172)throw Error('atlas');});
 const amounts=[10,50,150,200,250,500,750,1000,1500,2000,3000];
 for(const pt of amounts){
  await page.evaluate(zoneAward=>NovaDirectAward.show({zoneAward}),pt);assert(await page.locator('#novaDirectAward').isVisible());
  assert.equal(await page.locator('#novaDirectAward').getAttribute('aria-label'),'ゾーン上乗せ ＋'+pt+'pt');
  if(![10,50].includes(pt)){assert(await page.locator('.awardGlyphs').isVisible());assert.equal(await page.locator('.awardGlyphs span').count(),String(pt).length+2);}
  const overlay=await page.locator('#novaDirectAward').boundingBox(),reels=await page.locator('.reels').boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(overlay[k]-reels[k])<1);
 }
 await page.screenshot({path:'research/zone-award134/public-3000.png'});
 await page.evaluate(()=>NovaDirectAward.clear());assert(await page.locator('#novaDirectAward').isHidden());assert.deepEqual(errors,[]);
 const result={url:base+'/jag.html?debug=1',sources,amounts,pageErrors:errors,silent:true,isolated:true};fs.writeFileSync('research/zone-award134/public-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
