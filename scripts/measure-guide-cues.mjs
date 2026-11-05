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
const newTier = () => ({games:0, directSevens:0, stockSevens:0, sortieStarts:0,
  specialDrawGames:0, specialHitGames:0, countdownGames:0, initialSevens:0});
const atByTier = {normal:newTier(), upper:newTier()};
const tierOf = flow => atByTier[flow.researchUpper ? 'upper' : 'normal'];
const progressEngine = globalThis.NovaProgress;
let startingFromNormal = false;
globalThis.NovaProgress = {
  ...progressEngine,
  beginNormalSortie(...args) {
    startingFromNormal = true;
    try { return progressEngine.beginNormalSortie(...args); }
    finally { startingFromNormal = false; }
  }
};
let queuedEntry = false;
globalThis.NovaArt = {
  ...engine,
  beginResearchSortie(flow, ...args) {
    if (!startingFromNormal) tierOf(flow).sortieStarts++;
    return engine.beginResearchSortie(flow, ...args);
  },
  prepareBet(flow, ...args) {
    const progress = NovaProgress.snapshot();
    queuedEntry = !progress.pending && !!flow.queuedZones?.length && NovaStockEntry.eligible(flow, progress);
    return engine.prepareBet(flow, ...args);
  },
  step(flow, ...args) {
    const tier = tierOf(flow);
    if (!flow.zero) tier.games++;
    const result = engine.step(flow, ...args);
    if (result.internalBonus) atBonuses++;
    if (result.atOutcome?.checkpointQuiet) tier.countdownGames++;
    else if (result.atOutcome) {
      tier.specialDrawGames++;
      if (result.atOutcome.zone) tier.specialHitGames++;
    }
    if (flow.entryStage === 'seven' && result.result === 'BIG' && result.flow.entryStage === 'roulette') {
      tier.directSevens++;
      if (flow.initialStage === 'entry') tier.initialSevens++;
    }
    if (queuedEntry && result.zoneStartFlow) tier.stockSevens++;
    return result;
  }
};
const seed = 2026110500 + setting;
const row = simulate(setting, 10_000_000, seed, {rng:'xoshiro128', exactGames:true, stopAtComplete:false, completeLimitPt:0, completeMyLimitPt:0});
if (bbInitials + atBonuses !== row.counts.BIG) throw Error('BB origin counts do not reconcile');
const sum = key => atByTier.normal[key] + atByTier.upper[key];
for (const [name,tier] of Object.entries(atByTier)) {
  const measured = row.actualAtZone[name];
  if (tier.specialDrawGames + tier.countdownGames !== measured.games || tier.specialHitGames !== measured.wins) {
    throw Error('AT special-zone draw counts do not reconcile: ' + name);
  }
}
const normalSortieStarts = row.rare.newAt;
if (sum('games') !== row.counts.at + row.counts.zone || sum('sortieStarts') + normalSortieStarts !== row.rare.started) {
  throw Error('State totals do not reconcile');
}
console.log(JSON.stringify({
  setting, seed, modelHash:modelHash(hashes(fileURLToPath(root))),
  normalGames:row.counts.normal, czGames:row.counts.cz, bbInitials, atInitials:row.counts.artEntries,
  games:row.games, atGames:sum('games'), directSevens:sum('directSevens'), stockSevens:sum('stockSevens'),
  sortieStarts:row.rare.started, normalSortieStarts, atByTier
}));
