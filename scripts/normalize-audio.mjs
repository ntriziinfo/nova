// Local-only mastering of game copies. Never overwrite supplied/source assets.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outputRoot='assets/media/normalized-20261012';
const voiceOutputRoot='assets/media/normalized-voices-20261013';
const voiceMeasurementVersion=2;
const speechFilter='silenceremove=start_periods=1:start_duration=0.02:start_threshold=-40dB:stop_periods=-1:stop_duration=0.08:stop_threshold=-40dB';
const target={bgm:-18,voice:-14,sfx:-16,payout:-18,movie:-18};
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'nova-voice-catalog.js'),'utf8'),context);
const voices=new Set(context.NovaVoiceCatalog.CHARACTER_VOICE_SRCS.map(s=>s.split('?')[0]));
const bgm=new Set(['sosuke-bgm','toto-bgm','urapi-bgm','sora-bgm','giru-bgm','oumafreez','initial-duo-bgm','sortie-bgm','RUSH','upper-at-bgm','BIG','audiostock_860274','audiostock_1117081','audiostock_862200','audiostock_933855','audiostock_932814','NovaREG','rush-confirm-bgm','result-eyecatch','bonus_art_end','bonus_end','big_1','big_2','big_50g','reg_bonus','premium_big_first','premium_big_second']);
const payout=new Set(['bell','bell_payout','replay','cherry','special_symbol','premium_piero_symbol']);
const category=src=>voices.has(src)||/\/(?:setting_voice_|premium_.*(?:voice|bb2_bgm)|bar_wo_nerae|big_kakutei|reg_kakutei)/.test(src)?'voice':bgm.has(path.parse(src).name)?'bgm':payout.has(path.parse(src).name)?'payout':src.endsWith('.mp4')?'movie':'sfx';
const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(dir+'/'+item.name):[dir+'/'+item.name]);
const sources=walk('assets/media/nova').concat(walk('assets/media/jag')).filter(s=>/\.(wav|mp3)$/.test(s));
// Other movie players are intentionally muted and use separate audio tracks.
sources.push('assets/media/jag/premium_big_confirm_movie.mp4');
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function run(exe,args){const r=spawnSync(exe,args,{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(r.error||r.status!==0)throw Error(r.error||r.stderr);return r;}
function probe(file){const s=JSON.parse(run('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=sample_rate,channels,duration,duration_ts,time_base','-of','json',file]).stdout).streams[0];if(!s)return null;return {rate:+s.sample_rate,channels:s.channels,duration:+s.duration};}
function measure(file,I,speechOnly=false){const r=run('ffmpeg',['-hide_banner','-nostdin','-i',file,'-vn','-af',`${speechOnly?speechFilter+',':''}apad=pad_dur=1,loudnorm=I=${I}:TP=-1:dual_mono=true:print_format=json`,'-f','null','-']);const data=JSON.parse(r.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0]||'null');if(!data||!Number.isFinite(+data.input_i))throw Error('Unmeasurable audio '+file);return {lufs:+data.input_i,peakDbtp:+data.input_tp,rangeLu:+data.input_lra};}
fs.mkdirSync(path.join(root,outputRoot),{recursive:true});
const reportFile=path.join(root,'audio-normalization.json');
const previous=fs.existsSync(reportFile)?JSON.parse(fs.readFileSync(reportFile,'utf8')).files:[];
const report={version:2,targetsLufs:target,truePeakCeilingDbtp:-1,measurement:'ITU loudness via FFmpeg loudnorm, dual mono, 1 second measurement-only silence padding. Voice v2 measures audible speech after measurement-only -40dB silence removal; delivery retains all original pauses and duration',processing:'Constant gain; oversampled peak limiting only where necessary. Original duration and sample rate retained. No training or external audio processing.',files:[]};
for(const src of sources.sort()){
 const input=path.join(root,src),sourceSha256=hash(input),group=category(src),I=target[group];
 const old=previous.find(f=>f.src===src&&f.sourceSha256===sourceSha256&&f.targetLufs===I&&(group!=='voice'||f.measurementVersion===voiceMeasurementVersion));
 if(old&&fs.existsSync(path.join(root,old.output))&&hash(path.join(root,old.output))===old.outputSha256){report.files.push(old);continue;}
 const format=probe(input);if(!format)continue;
 const ext=src.endsWith('.mp4')?'.mp4':group==='bgm'&&format.duration>15?'.mp3':'.wav';
 const output=(group==='voice'?voiceOutputRoot:outputRoot)+'/'+src.replace('assets/media/','').replace(/\.[^.]+$/,ext),out=path.join(root,output);
 fs.mkdirSync(path.dirname(out),{recursive:true});
 const speechOnly=group==='voice',before=measure(input,I,speechOnly);let gainDb=I-before.lufs,after,low=null,high=null;
 const limit=10**(-2/20);
 for(let pass=0;pass<18;pass++){
  const filter=`apad=pad_dur=1,aresample=192000,volume=${gainDb}dB,alimiter=limit=${limit}:level=false:latency=true:attack=5:release=20,aresample=${format.rate},atrim=end_sample=${Math.round(format.duration*format.rate)}`;
  const codec=ext==='.mp3'?['-c:a','libmp3lame','-b:a','192k']:ext==='.mp4'?['-c:v','copy','-c:a','aac','-b:a','192k']:['-c:a','pcm_s16le'];
  run('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-i',input,...(ext==='.mp4'?['-map','0:v:0','-map','0:a:0']:['-vn']),'-af',filter,'-ar',String(format.rate),'-ac',String(format.channels),...codec,'-map_metadata','-1',out]);
  after=measure(out,I,speechOnly);const delta=I-after.lufs;if(Math.abs(delta)<=.15)break;
  // Near a short clip's loudness gate, full-step correction can oscillate.
  // Bracket the gain instead of repeatedly overshooting in opposite directions.
  if(delta>0)low=gainDb;else high=gainDb;
  gainDb=low!==null&&high!==null?(low+high)/2:gainDb+delta;
 }
 if(Math.abs(after.lufs-I)>.3||after.peakDbtp>-1)throw Error('Normalization outside tolerance: '+src+' '+JSON.stringify(after));
 const delivered=probe(out);if(Math.abs(delivered.duration-format.duration)>.06)throw Error('Duration changed: '+src);
 if(hash(input)!==sourceSha256)throw Error('Source modified: '+src);
 report.files.push({src,category:group,...(speechOnly?{measurementVersion:voiceMeasurementVersion,fileLoudness:measure(out,I)}:{}),targetLufs:I,output,sourceSha256,outputSha256:hash(out),...format,outputDuration:delivered.duration,gainDb:+gainDb.toFixed(3),before,after});
 fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
 console.log(`${report.files.length}/${sources.length} ${group} ${src}: ${before.lufs} -> ${after.lufs} LUFS, peak ${after.peakDbtp}`);
}
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(root,'nova-audio-manifest.js'),'// Generated by scripts/normalize-audio.mjs. Source recordings stay untouched.\n'+'globalThis.NovaAudioManifest=Object.freeze('+JSON.stringify(Object.fromEntries(report.files.map(f=>[f.src,{src:f.output,category:f.category}])) ,null,2)+');\n');
console.log(`Verified ${report.files.length} normalized copies. Originals unchanged.`);
