// Mobile delivery copies of generated UI assets. Never rewrites source art.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.NOVA_SHARP_MODULE||'sharp');
const inputs=[
 'assets/design/nova-cabinet-v1/cabinet-game.png',
 ...['miss','replay','bell','suika','bar'].map(name=>'assets/symbols/gang-v3/'+name+'.png'),
 ...['icon_slump_graph_blue','icon_odds_percent_blue','icon_sound_red','super-speed-gold-20261006'].map(name=>'assets/ui/'+name+'.png'),
 'assets/buttons/btn_auto_gold_transparent.png'
];
const directory='assets/mobile-20261013';fs.mkdirSync(directory,{recursive:true});
const entries=[];
for(const source of inputs){
 const target=directory+'/'+path.basename(source,'.png')+'.webp';
 const width=source.includes('cabinet-game')?1024:source.includes('/symbols/')?512:192;
 await sharp(source).resize({width,withoutEnlargement:true}).webp({quality:92,alphaQuality:100,effort:6}).toFile(target);
 entries.push({source,target,width,sourceSha256:createHash('sha256').update(fs.readFileSync(source)).digest('hex'),originalBytes:fs.statSync(source).size,bytes:fs.statSync(target).size});
}
fs.writeFileSync(directory+'/manifest.json',JSON.stringify({encoding:'mobile WebP quality 92; lossless alpha; source files preserved',entries},null,2)+'\n');
console.log(JSON.stringify(entries));
