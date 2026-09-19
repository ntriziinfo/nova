// Offline asset preparation; supplied recordings are never overwritten.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!args.includes('--source-dir') || !args.includes('--output-dir')) {
  throw new Error('Use --source-dir <original asset tree> --output-dir <new output directory>');
}
const sourceDir = path.resolve(option('--source-dir'));
const outputDir = path.resolve(option('--output-dir'));
if (sourceDir.toLowerCase() === outputDir.toLowerCase() || fs.existsSync(outputDir)) {
  throw new Error('Output must be a new directory, separate from the originals.');
}
// Match the game's relatively loud music/effects mix, with safe peak headroom.
const target = { integratedLufs: -12, truePeakDbtp: -1, dualMono: true };
const html = fs.readFileSync(path.join(root, 'jag.html'), 'utf8');
const context = vm.createContext({ normalizedAudioSourceKey: src => src.split('?')[0] });
vm.runInContext(html.slice(html.indexOf('  const BELL_NAVI_VOICE_SRCS='), html.indexOf('  for(const src of CHARACTER_VOICE_SRCS)')) + ';globalThis.sources=CHARACTER_VOICE_SRCS;', context);
const sources = [...new Set(Array.from(context.sources, src => src.split('?')[0]))];
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function command(exe, argv) {
  const result = spawnSync(exe, argv, { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${exe}: ${result.error || result.stderr}`);
  return result;
}
function probe(file) {
  const data = JSON.parse(command('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,sample_rate,channels,duration_ts,time_base', '-of', 'json', file]).stdout).streams[0];
  const [num, den] = data.time_base.split('/').map(Number);
  return { codec: data.codec_name, rate: Number(data.sample_rate), channels: data.channels, samples: Math.round(data.duration_ts * num / den * Number(data.sample_rate)) };
}
const loudnorm = `loudnorm=I=${target.integratedLufs}:TP=${target.truePeakDbtp}:dual_mono=true`;
function measure(file) {
  // Pad only for gated measurement of sub-400 ms words. Delivery keeps the original sample count.
  const { stderr } = command('ffmpeg', ['-hide_banner', '-nostdin', '-i', file, '-af', `apad=pad_dur=1,${loudnorm}:print_format=json`, '-f', 'null', '-']);
  const match = stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  if (!match) throw new Error(`No loudness measurement: ${file}`);
  const data = JSON.parse(match[0]);
  if (![data.input_i, data.input_tp, data.input_thresh].every(value => Number.isFinite(Number(value)))) throw new Error(`Unmeasurable audio: ${file}`);
  return data;
}
const levels = data => ({ integratedLufs: Number(data.input_i), truePeakDbtp: Number(data.input_tp), loudnessRangeLu: Number(data.input_lra) });
const report = { target, measurementSilencePaddingSeconds: 1, method: 'Measured gain with 192 kHz look-ahead peak limiting; compensated latency; render each pass from original', sourceRevision: command('git', ['-C', root, 'rev-parse', 'HEAD']).stdout.trim(), files: [] };
for (const src of sources) {
  const input = path.join(sourceDir, src), output = path.join(outputDir, src);
  const format = probe(input), before = measure(input), inputHash = hash(input);
  if (format.codec !== 'pcm_s16le') throw new Error(`Unexpected source format: ${src}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  let gainDb = target.integratedLufs - Number(before.input_i), after;
  // Extra 0.1 dB accommodates resampling. Limiting only affects peaks that would exceed the ceiling.
  const limit = 10 ** ((target.truePeakDbtp - 0.1) / 20);
  for (let pass = 0; pass < 10; pass++) {
    const filter = `apad=pad_dur=1,aresample=192000,volume=${gainDb}dB,alimiter=limit=${limit}:level=false:latency=true:attack=5:release=20,aresample=${format.rate},atrim=end_sample=${format.samples}`;
    command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', input, '-af', filter, '-ar', String(format.rate), '-ac', String(format.channels), '-c:a', 'pcm_s16le', '-map_metadata', '-1', output]);
    after = measure(output);
    const difference = target.integratedLufs - Number(after.input_i);
    if (Math.abs(difference) <= 0.15 || pass === 9) break;
    gainDb += difference;
  }
  const outputFormat = probe(output);
  if (JSON.stringify(format) !== JSON.stringify(outputFormat)) throw new Error(`Duration/format changed: ${src}`);
  if (Math.abs(Number(after.input_i) - target.integratedLufs) > 0.5 || Number(after.input_tp) > target.truePeakDbtp + 0.1) throw new Error(`Loudness outside tolerance: ${src}: ${JSON.stringify(levels(after))}`);
  if (hash(input) !== inputHash) throw new Error(`Original changed: ${src}`);
  const row = { src, ...format, gainDb: Number(gainDb.toFixed(2)), sourceSha256: inputHash, outputSha256: hash(output), before: levels(before), after: levels(after) };
  report.files.push(row);
  console.log(JSON.stringify({ src, before: row.before, after: row.after }));
}
fs.writeFileSync(path.join(outputDir, 'character-voice-normalization.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Verified ${report.files.length} voices; originals unchanged.`);
