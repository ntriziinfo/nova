import fs from 'node:fs';
// Read-only comparison of the same tests against the pinned pre-v173 engines.
const original=fs.readFileSync;
const files=new Set(['nova-tuning.js','nova-decrement.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','nova-progress.js']);
fs.readFileSync=function(path,...rest){const name=typeof path==='string'?path.replaceAll('\\','/').split('/').at(-1):'';return original.call(this,files.has(name)?'research/release-173/baseline/'+name:path,...rest);};
