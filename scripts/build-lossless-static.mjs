// Transport-only, lossless delivery. Original assets and all game code stay untouched.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {pathToFileURL} from 'node:url';
import {outputConfig} from './lossless-output-config.mjs';
const exec=promisify(execFile),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fallback=new Set(['assets/media/nova/sortie-award-duo.wav','assets/media/jag/premium_big_second.wav']);
const webpArchive={url:'https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-1.6.0-linux-x86-64.tar.gz',sha256:'1c5ffab71efecefa0e3c23516c3a3a1dccb45cc310ae1095c6f14ae268e38067'};
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>{if(item.isSymbolicLink())throw Error('Unexpected symlink');return item.isDirectory()?walk(path.join(dir,item.name)):[path.join(dir,item.name)];});
async function command(executable,args){return (await exec(executable,args,{windowsHide:true,maxBuffer:16*1024*1024})).stdout.trim();}
async function setupTools(temporary){
 let ffmpeg=process.env.FFMPEG_BINARY;
 if(!ffmpeg){try{await command('ffmpeg',['-version']);ffmpeg='ffmpeg';}catch{ffmpeg=(await import('ffmpeg-static')).default;}}
 let cwebp=process.env.CWEBP_BINARY;
 if(!cwebp){
  if(process.platform!=='linux'||process.arch!=='x64')throw Error('Set CWEBP_BINARY for this platform');
  const response=await fetch(webpArchive.url);if(!response.ok)throw Error('WebP tool download failed: '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());if(sha(bytes)!==webpArchive.sha256)throw Error('WebP tool checksum mismatch');
  const archive=path.join(temporary,'libwebp.tar.gz');fs.writeFileSync(archive,bytes);await command('tar',['-xzf',archive,'-C',temporary]);
  cwebp=path.join(temporary,'libwebp-1.6.0-linux-x86-64/bin/cwebp');
 }
 return {ffmpeg,cwebp};
}
export async function buildLossless(root=process.cwd()){
 const output=path.join(root,'.vercel/output'),staticRoot=path.join(output,'static');
 if(fs.existsSync(staticRoot)&&fs.readdirSync(staticRoot).length)throw Error('Build output must be fresh; refusing to replace existing files');
 fs.mkdirSync(staticRoot,{recursive:true});
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'nova-lossless-'));
 const cacheRoot=process.env.NOVA_COMPRESSED_CACHE?path.resolve(process.env.NOVA_COMPRESSED_CACHE):null;
 const cache=cacheRoot?JSON.parse(fs.readFileSync(path.join(cacheRoot,'asset-map.json'),'utf8')):{};
 let tools;const toolsReady=()=>tools??=setupTools(temporary);
 const entries=[],overrides={},keptOriginal=[];let index=0,completed=0;
 const assetFiles=walk(path.join(root,'assets'));
 async function worker(){while(index<assetFiles.length){
  const filename=assetFiles[index++],relative=path.relative(root,filename).split(path.sep).join('/'),raw=fs.readFileSync(filename),sourceSha=sha(raw),ext=path.extname(relative).toLowerCase();
  if(raw.length<1024&&raw.toString('utf8').startsWith('version https://git-lfs.github.com/spec/v1'))throw Error('Unresolved asset pointer: '+relative);
  let bytes=raw,type,method='original';
  if(!fallback.has(relative)&&['.wav','.png'].includes(ext)){
   const cached=cache[relative];
   if(cached?.verified&&cached.sourceSha256===sourceSha&&['lossless-audio','lossless-image'].includes(cached.kind)){
    const encoded=fs.readFileSync(path.join(cacheRoot,cached.file));if(sha(encoded)!==cached.sha256)throw Error('Corrupt compression cache: '+relative);
    bytes=encoded;type=cached.type;method=cached.kind;
   }else{
    const {ffmpeg,cwebp}=await toolsReady(),converted=path.join(temporary,sourceSha+(ext==='.wav'?'.flac':'.webp'));
    const ff=args=>command(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-threads','1',...args]);
    try{
     if(ext==='.wav')await ff(['-y','-i',filename,'-map','0:a:0','-c:a','flac','-compression_level','8',converted]);
     else await command(cwebp,['-quiet','-lossless','-exact','-q','75','-m','4','-metadata','all',filename,'-o',converted]);
     const candidate=fs.readFileSync(converted);
     if(candidate.length<raw.length){
      const digest=file=>ff(ext==='.wav'?['-i',file,'-map','0:a:0','-c:a','pcm_s32le','-f','hash','-hash','sha256','-']:['-i',file,'-frames:v','1','-pix_fmt','rgba','-f','hash','-hash','sha256','-']);
      const [before,after]=await Promise.all([digest(filename),digest(converted)]);
      if(before===after){bytes=candidate;type=ext==='.wav'?'audio/flac':'image/webp';method=ext==='.wav'?'lossless-audio':'lossless-image';}
      else keptOriginal.push({path:relative,reason:'Decoded data mismatch'});
     }
    }catch(error){keptOriginal.push({path:relative,reason:String(error.message).slice(0,160)});}
   }
  }
  const target=path.join(staticRoot,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  if(type)overrides[relative]={contentType:type};
  entries.push({path:relative,sourceSha256:sourceSha,sha256:sha(bytes),originalBytes:raw.length,bytes:bytes.length,method,...(type?{contentType:type}:{})});
  completed++;if(completed%100===0)console.log('Lossless assets: '+completed+'/'+assetFiles.length);
 }}
 await Promise.all([worker(),worker(),worker()]);
 const rootFiles=[];
 for(const item of fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()&&/\.(js|css|html|json|webmanifest|ico)$/i.test(e.name)&&!['package.json','package-lock.json','vercel.json','deploy-assets.json'].includes(e.name))){const bytes=fs.readFileSync(path.join(root,item.name));fs.writeFileSync(path.join(staticRoot,item.name),bytes);rootFiles.push({path:item.name,sha256:sha(bytes),bytes:bytes.length});}
 const report={schema:'nova-lossless-delivery/v1',sourceCommit:process.env.VERCEL_GIT_COMMIT_SHA||await command('git',['rev-parse','HEAD']),gameCodeChanged:false,assetPaths:entries.length,originalAssetBytes:entries.reduce((s,e)=>s+e.originalBytes,0),servedAssetBytes:entries.reduce((s,e)=>s+e.bytes,0),losslessAudio:entries.filter(e=>e.method==='lossless-audio').length,losslessImages:entries.filter(e=>e.method==='lossless-image').length,originalWavFallbacks:[...fallback],keptOriginal,gameFiles:rootFiles,assets:entries.sort((a,b)=>a.path.localeCompare(b.path))};
 fs.writeFileSync(path.join(staticRoot,'nova-compression-status.json'),JSON.stringify(report));
 fs.writeFileSync(path.join(output,'config.json'),JSON.stringify(outputConfig(JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8')),overrides),null,2));
 console.log(JSON.stringify({assetPaths:report.assetPaths,originalAssetBytes:report.originalAssetBytes,servedAssetBytes:report.servedAssetBytes,losslessAudio:report.losslessAudio,losslessImages:report.losslessImages,keptOriginal:report.keptOriginal.length,codeFilesUnchanged:rootFiles.length}));
 // Temporary codec outputs are deliberately not deleted here; never remove repository assets.
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildLossless();
