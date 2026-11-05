import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hashes, modelHash} from '../scripts/rtp-current.mjs';

const evidence = JSON.parse(fs.readFileSync('docs/guide-bonus-frequencies.json', 'utf8'));
const guide = fs.readFileSync('jag.html', 'utf8');
const section = guide.split('<section id="guide-bonus-rates"')[1].split('</section>')[0];
const tables = [...section.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].map(([,body]) =>
  [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([,row]) =>
    [...row.matchAll(/<td>([^<]*)<\/td>/g)].map(([,cell]) => cell)));
const odds = (games, count) => '1/' + (games / count).toLocaleString('ja-JP', {
  minimumFractionDigits:1, maximumFractionDigits:1
});

test('ordinary and upper AT counters account for every recorded red seven, sortie and AT game', () => {
  assert.deepEqual(evidence.settings.map(row => row.setting), [1,2,3,4,5,6]);
  for (const row of evidence.settings) {
    const {normal, upper} = row.atByTier;
    assert.equal(row.games, evidence.gamesPerSetting);
    assert.equal(normal.games + upper.games, row.atGames);
    assert.equal(normal.directSevens + upper.directSevens, row.directSevens);
    assert.equal(normal.stockSevens + upper.stockSevens, row.stockSevens);
    assert.equal(row.normalSortieStarts + normal.sortieStarts + upper.sortieStarts, row.sortieStarts);
  }
});

test('guide uses the eligible game count for each published BB, special-entry seven and sortie frequency', () => {
  assert.equal(tables.length, 3);
  const currentModel = modelHash(hashes());
  for (const [i,row] of evidence.settings.entries()) {
    if (evidence.modelHash !== currentModel) {
      assert.deepEqual(tables[0][i].slice(1), Array(3).fill('未集計'));
      assert.deepEqual(tables[1][i].slice(1), Array(3).fill('未集計'));
      continue;
    }
    const {normal, upper} = row.atByTier;
    assert.deepEqual(tables[0][i], [
      String(row.setting), odds(row.normalGames + row.czGames, row.bbInitials),
      odds(normal.games, normal.directSevens + normal.stockSevens), odds(upper.games, upper.directSevens + upper.stockSevens)
    ]);
    assert.deepEqual(tables[1][i], [
      String(row.setting), odds(row.normalGames,row.normalSortieStarts), odds(normal.games,normal.sortieStarts),
      odds(upper.games,upper.sortieStarts) + '（' + upper.sortieStarts + '回）'
    ]);
  }
});
