import fs from 'node:fs';
import path from 'node:path';
import {hashes,valid,sameSources,REQUIRED_OPTIONS} from './rtp-current.mjs';

const [directory,output]=process.argv.slice(2);
if(!directory||!output)throw Error('Usage: merge-rtp-current.mjs INPUT_DIRECTORY OUTPUT_JSON');
const reports=fs.readdirSync(directory).filter(name=>/^setting-[1-6]\.json$/.test(name)).map(name=>JSON.parse(fs.readFileSync(path.join(directory,name),'utf8')));
if(reports.length!==6)throw Error('All six completed setting reports are required');
const current=hashes();
for(const report of reports){
 if(report.gamesPerSetting!==1_000_000_000||report.results?.length!==1)throw Error('Incomplete setting');
 if(!sameSources(report.sourceHashes,current))throw Error('Stale simulation source');
 // All shards must record the same actual source. Do not relabel old trial
 // hashes as current merely because a reviewed presentation change is allowed.
 if(Object.keys(current).some(file=>report.sourceHashes[file]!==reports[0].sourceHashes[file]))throw Error('Mixed simulation sources');
 if(Object.entries(REQUIRED_OPTIONS).some(([key,value])=>report.options?.[key]!==value))throw Error('Wrong simulation conditions');
}
const merged={schema:'nova-rtp-parallel/v1',gamesPerSetting:1_000_000_000,options:REQUIRED_OPTIONS,sourceHashes:reports[0].sourceHashes,results:reports.flatMap(report=>report.results).sort((a,b)=>a.setting-b.setting)};
if(!valid(merged,current))throw Error('Invalid aggregate; no RTP will be published');
fs.writeFileSync(output,JSON.stringify(merged,null,2)+'\n');
