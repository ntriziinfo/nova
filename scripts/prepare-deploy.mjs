// Restore the exact tracked media from our own release, without Git LFS bandwidth.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {pathToFileURL} from 'node:url';

const digestPattern=/^[a-f0-9]{64}$/;
export function validateManifest(manifest){
  if(manifest.version!==1 || !Array.isArray(manifest.files) || !manifest.files.length)throw Error('Invalid asset manifest');
  if(!/^https:\/\/github\.com\/ntriziinfo\/nova\/releases\/download\/[\w.-]+\/[\w.-]+\.tar\.gz$/.test(manifest.archive?.url))throw Error('Unexpected asset release URL');
  if(!digestPattern.test(manifest.archive.sha256) || !Number.isSafeInteger(manifest.archive.size) || manifest.archive.size<=0)throw Error('Invalid archive checksum/size');
  const paths=new Set();
  for(const file of manifest.files){
    if(!/^assets\/[A-Za-z0-9_./-]+$/.test(file.path) || file.path.split('/').some(p=>!p || p==='.' || p==='..') || paths.has(file.path))throw Error('Invalid/duplicate asset path');
    if(!digestPattern.test(file.sha256) || !Number.isSafeInteger(file.size) || file.size<0)throw Error('Invalid asset checksum/size');
    paths.add(file.path);
  }
  return manifest;
}

async function hashFile(file){
  const hash=createHash('sha256');
  for await(const chunk of fs.createReadStream(file))hash.update(chunk);
  return hash.digest('hex');
}

function pointer(file){
  if(fs.statSync(file).size>1024)return null;
  const text=fs.readFileSync(file,'utf8');
  if(!text.startsWith('version https://git-lfs.github.com/spec/v1'))return null;
  const match=text.match(/oid sha256:([a-f0-9]{64})\r?\nsize (\d+)/);
  if(!match)throw Error(`Malformed LFS pointer: ${file}`);
  return {sha256:match[1],size:Number(match[2])};
}

function walkAssets(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>{
    const file=path.join(dir,item.name);
    if(item.isSymbolicLink())throw Error(`Symlinks are not allowed in deployment assets: ${file}`);
    return item.isDirectory()?walkAssets(file):[file];
  });
}

export async function inspectAssets(root,manifest){
  validateManifest(manifest);
  const indexed=new Map(manifest.files.map(f=>[f.path,f]));
  for(const file of walkAssets(path.join(root,'assets'))){
    const p=pointer(file),relative=path.relative(root,file).split(path.sep).join('/');
    if(p && !indexed.has(relative))throw Error(`New LFS asset missing from release manifest: ${relative}`);
  }
  const missing=[];
  for(const file of manifest.files){
    const target=path.join(root,file.path);
    if(!fs.existsSync(target)){missing.push(file.path);continue;}
    const p=pointer(target);
    if(p){
      if(p.sha256!==file.sha256 || p.size!==file.size)throw Error(`Changed LFS asset requires a new release: ${file.path}`);
      missing.push(file.path);continue;
    }
    if(fs.statSync(target).size!==file.size || await hashFile(target)!==file.sha256)throw Error(`Asset checksum mismatch: ${file.path}`);
  }
  return missing;
}

export async function prepareDeploy(root=process.cwd()){
  const manifest=validateManifest(JSON.parse(fs.readFileSync(path.join(root,'deploy-assets.json'),'utf8')));
  const missing=await inspectAssets(root,manifest);
  if(!missing.length){console.log(`Verified ${manifest.files.length} local assets; no download needed.`);return;}
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'nova-assets-'));
  try{
    const bundle=path.join(temporary,'assets.tar.gz');
    const response=await fetch(manifest.archive.url,{signal:AbortSignal.timeout(300000)});
    if(!response.ok)throw Error(`Asset download failed: HTTP ${response.status}`);
    let bytes=0;const hash=createHash('sha256');
    const check=new Transform({transform(chunk,_encoding,done){
      bytes+=chunk.length;
      if(bytes>manifest.archive.size)return done(Error('Asset archive exceeds expected size'));
      hash.update(chunk);done(null,chunk);
    }});
    await pipeline(Readable.fromWeb(response.body),check,fs.createWriteStream(bundle));
    if(bytes!==manifest.archive.size || hash.digest('hex')!==manifest.archive.sha256)throw Error('Asset archive checksum mismatch');
    const entries=execFileSync('tar',['-tzf',bundle],{encoding:'utf8',maxBuffer:4*1024*1024}).trim().split(/\r?\n/);
    const expected=new Set(manifest.files.map(f=>f.path));
    if(entries.length!==expected.size || new Set(entries).size!==expected.size || entries.some(f=>!expected.has(f)))throw Error('Unexpected archive contents');
    execFileSync('tar',['-xzf',bundle,'-C',root],{stdio:'inherit'});
    if((await inspectAssets(root,manifest)).length)throw Error('Unresolved LFS pointers after asset restore');
    console.log(`Restored and verified ${manifest.files.length} assets from the deployment release.`);
  }finally{
    // Only our freshly-created private temporary directory is removed.
    if(path.dirname(fs.realpathSync(temporary))!==fs.realpathSync(os.tmpdir()) || !path.basename(temporary).startsWith('nova-assets-'))throw Error('Unexpected temporary directory');
    fs.rmSync(temporary,{recursive:true,force:true});
  }
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  await prepareDeploy();
}
