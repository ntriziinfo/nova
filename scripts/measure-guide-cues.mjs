// Count successful entry cues without drawing additional random numbers.
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {loadModel, simulate} from './zone-v2-model.mjs';
import {hashes, modelHash} from './rtp-current.mjs';

const root = new URL('../', import.meta.url);
const setting = Number(process.argv[2]);
if (!Number.isInteger(setting) || setting < 1 || setting > 6) throw Error('Expected setting 1–6');

loadModel();
vm.runInThisContext(fs.readFileSync(new URL('nova-stock-entry.js', root), 'utf8'));
const engine = globalThis.NovaArt;
const normal = globalThis.NovaNormal;
let bbInitials = 0;
let atBonuses = 0;
globalThis.NovaNormal = {
  ...normal,
  spin(...args) {
    const spin = normal.spin(...args);
    if (spin.result === 'SUPER_NOVA' || spin.internalBonus) bbInitials++;
    return spin;
  }
};
let directSevens = 0;
let stockSevens = 0;
let queuedEntry = false;
globalThis.NovaArt = {
  ...engine,
  prepareBet(flow, ...args) {
    const progress = NovaProgress.snapshot();
    queuedEntry = !progress.pending && !!flow.queuedZones?.length && NovaStockEntry.eligible(flow, progress);
    return engine.prepareBet(flow, ...args);
  },
  step(flow, ...args) {
    const result = engine.step(flow, ...args);
    if (result.internalBonus) atBonuses++;
    if (flow.entryStage === 'seven' && result.result === 'BIG' && result.flow.entryStage === 'roulette') directSevens++;
    if (queuedEntry && result.zoneStartFlow) stockSevens++;
    return result;
  }
};
const seed = 2026110500 + setting;
const row = simulate(setting, 10_000_000, seed, {rng:'xoshiro128', exactGames:true, stopAtComplete:false, completeLimitPt:0, completeMyLimitPt:0});
if (bbInitials + atBonuses !== row.counts.BIG) throw Error('BB origin counts do not reconcile');
console.log(JSON.stringify({
  setting, seed, modelHash:modelHash(hashes(fileURLToPath(root))),
  normalGames:row.counts.normal, czGames:row.counts.cz, bbInitials, atInitials:row.counts.artEntries,
  games:row.games, atGames:row.counts.at + row.counts.zone, directSevens, stockSevens, sortieStarts:row.rare.started
}));
