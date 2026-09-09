// Read-only comparison of existing tests against the archived version111 sources.
const fs=require('node:fs'),path=require('node:path');
const original=fs.readFileSync;
const root=path.resolve(__dirname,'..');
const files=new Set(['nova-art.js','nova-flow.js','nova-normal.js','nova-balance.js','jag.html','nova-cabinet.css']);
let oldHtml;
fs.readFileSync=function(file,...args){
 const resolved=file instanceof URL?require('node:url').fileURLToPath(file):typeof file==='string'?path.resolve(file):'';
 if(resolved===path.join(root,'jag.html')){
  oldHtml??=require('node:child_process').execFileSync('git',['show','f28d3ae:jag.html'],{cwd:root,maxBuffer:8*1024*1024});
  const encoding=typeof args[0]==='string'?args[0]:args[0]?.encoding;
  return encoding?oldHtml.toString(encoding):Buffer.from(oldHtml);
 }
 if(path.dirname(resolved)===root&&files.has(path.basename(resolved)))file=path.join(root,'research/burst112/baseline111',path.basename(resolved));
 return original.call(this,file,...args);
};
require('node:module').syncBuiltinESMExports();
