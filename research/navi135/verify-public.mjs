import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const base='https://nova-eta-jet-30.vercel.app',dir='assets/design/nova-navi-alert-v1',manifest=JSON.parse(fs.readFileSync(dir+'/manifest.json'));
const files=['jag.html','assets/media/nova/bell-navi.wav',...manifest.images.map(x=>dir+'/'+x.file)];
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources=await Promise.all(files.map(async file=>{
 const response=await fetch(base+'/'+file+'?navi135='+Date.now(),{headers:{'Cache-Control':'no-cache'}});assert.equal(response.status,200,file);
 const remote=Buffer.from(await response.arrayBuffer()),local=fs.readFileSync(file),normalize=b=>file.endsWith('.html')?b.toString('utf8').replace(/\r\n/g,'\n'):b;
 assert.equal(hash(normalize(remote)),hash(normalize(local)),file);return {file,matches:true};
}));
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};});
 await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForSelector('#bellNaviAdjustBtn');
 const decoded=await page.evaluate(async({dir,images})=>{
  const sizes=await Promise.all(images.map(async item=>{const img=new Image();img.src=dir+'/'+item.file;await img.decode();return {file:item.file,width:img.naturalWidth,height:img.naturalHeight};}));
  const audio=new Audio('assets/media/nova/bell-navi.wav');audio.muted=true;await audio.play();const duration=audio.duration;audio.pause();return {images:sizes,audioDuration:duration};
 },{dir,images:manifest.images});
 for(const [i,item]of decoded.images.entries()){assert.equal(item.width,manifest.images[i].width);assert.equal(item.height,773);}assert(decoded.audioDuration>0);assert.deepEqual(errors,[]);
 const result={url:base+'/jag.html?debug=1',sources,decoded,pageErrors:errors,silent:true,isolated:true};fs.writeFileSync('research/navi135/public-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
