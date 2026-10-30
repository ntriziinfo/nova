// Preserve the supplied animations (including arrows/text and frame timing),
// at twice their usual on-screen width. Originals remain alongside the copies.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const dir='assets/media/nova/aim',out=path.join(dir,'ready-20261030');
fs.mkdirSync(out,{recursive:true});
const files=['seven','nebula'].flatMap(s=>['blue','red','rainbow'].map(c=>s+'-'+c));
const report=[];
for(const name of files){
 const source=path.join(dir,name+'.mp4'),target=path.join(out,name+'.mp4');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-i',source,'-vf','scale=min(1086\\,iw):-2','-c:v','libx264','-preset','fast','-crf','20','-an','-movflags','+faststart',target],{stdio:'inherit'});
 // Already-compact clips must never become a larger delivery download.
 if(fs.statSync(target).size>=fs.statSync(source).size)fs.copyFileSync(source,target);
 report.push({name,originalBytes:fs.statSync(source).size,readyBytes:fs.statSync(target).size});
}
console.log(JSON.stringify(report,null,2));
