import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sourcePath = new URL('../nova-reel-sheet-data.js', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context, {filename: sourcePath.pathname});

const raw = context.NovaReelSheetData;
const data = JSON.parse(JSON.stringify(raw));

const EXPECTED_STRIPS = [
  ['🐘', '🔔', '7', '🍒', '7', '🐘', '🔔', '🍋', '🍒', 'NEBULA', '🐘', '🔔', '__BLANK__', '🍒', '🍋', '🐘', '🔔', 'BAR', '🍒', '🍋'],
  ['🔔', '🐘', '🍒', '7', '🍋', '🔔', '🐘', '🍋', '🍒', 'NEBULA', '🔔', '🐘', '🍒', '🍋', '🔔', '🐘', 'BAR', '__BLANK__', 'BAR', '🍒'],
  ['🍒', '🔔', '7', '🐘', '7', '🍋', '🔔', '🍒', '🐘', 'NEBULA', '🍋', '🔔', '__BLANK__', '🐘', '🍋', '🍒', '🔔', 'BAR', '🐘', '🍋'],
];

const EXPECTED_COUNTS = {
  MISS: 175,
  REPLAY: 64,
  BELL15: 64,
  WEAK_NOVA: 64,
  STRONG_NOVA: 48,
  NEBULA: 1,
  BAR3: 1,
  BIG: 4,
  BELL: 64,
  WEAK_SUICA: 36,
  SUPER_NOVA: 1,
};

const EXPECTED_SPECIAL_STOPS = {
  NEBULA: [
    [['🍒', '🍒', '🐘'], ['NEBULA', 'NEBULA', 'NEBULA'], ['🐘', '🔔', '🍋']],
  ],
  BAR3: [
    [['🔔', '🐘', '🔔'], ['BAR', 'BAR', 'BAR'], ['🍒', '__BLANK__', '🐘']],
  ],
  BIG: [
    [['🍒', '🍒', '🐘'], ['7', '7', '7'], ['🐘', '🍋', '🍋']],
    [['🍒', '🍒', '🔔'], ['7', '7', '7'], ['🐘', '🍋', '🐘']],
    [['🔔', '🍒', '🔔'], ['7', '7', '7'], ['🍒', '🍋', '🐘']],
    [['🔔', '🍒', '🐘'], ['7', '7', '7'], ['🍒', '🍋', '🍋']],
  ],
  SUPER_NOVA: [
    [['🔔', 'BAR', '🔔'], ['BAR', '__BLANK__', 'BAR'], ['🍒', 'BAR', '🐘']],
  ],
};

function isCyclicWindow(strip, column) {
  return strip.some((_, start) => column.every((symbol, offset) => (
    symbol === strip[(start + offset) % strip.length]
  )));
}

function assertDeepFrozen(value, path = 'NovaReelSheetData') {
  if (!value || typeof value !== 'object') return;
  assert.equal(Object.isFrozen(value), true, `${path} must be frozen`);
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${path}.${key}`);
  }
}

test('sheet source metadata is pinned to the approved workbook and ranges', () => {
  assert.ok(raw, 'nova-reel-sheet-data.js must publish NovaReelSheetData');
  assert.equal(data.version, 'google-sheet-20261027');
  assert.equal(
    data.sourceUrl,
    'https://docs.google.com/spreadsheets/d/16wF24WmveUjq2mBubo593AJC40Kx7BODwha8S2TYeNc/edit?gid=310238419',
  );
  assert.equal(data.sourceSha256, '7b38031f05a166ae5a09cd2ee2974aa85b9e8ead556c3259e0eac7106b989b4b');
  assert.equal(data.reelsRange, 'リール配列!C4:E23');
  assert.equal(data.stopsRange, '停止形一覧!A1:FP204');
});

test('reel strips match the approved twenty-symbol layout exactly', () => {
  assert.deepEqual(data.strips, EXPECTED_STRIPS);
  assert.deepEqual(data.strips.map((strip) => strip.length), [20, 20, 20]);
});

test('all 522 named stop patterns and category totals are preserved', () => {
  assert.equal(data.patternCount, 522);
  assert.deepEqual(data.counts, EXPECTED_COUNTS);
  assert.deepEqual(
    Object.fromEntries(Object.entries(data.stops).map(([role, grids]) => [role, grids.length])),
    EXPECTED_COUNTS,
  );
  assert.equal(Object.values(data.stops).reduce((sum, grids) => sum + grids.length, 0), 522);
});

test('every stop matrix is a valid cyclic three-symbol window on each reel', () => {
  for (const [role, grids] of Object.entries(data.stops)) {
    grids.forEach((grid, patternIndex) => {
      assert.equal(grid.length, 3, `${role}[${patternIndex}] must have three rows`);
      assert.deepEqual(grid.map((row) => row.length), [3, 3, 3]);
      for (let reelIndex = 0; reelIndex < 3; reelIndex += 1) {
        const column = grid.map((row) => row[reelIndex]);
        assert.equal(
          isCyclicWindow(data.strips[reelIndex], column),
          true,
          `${role}[${patternIndex}] reel ${reelIndex + 1} is not contiguous: ${column.join('/')}`,
        );
      }
    });
  }
});

test('sheet-defined NEBULA, BAR3, BIG and SUPER_NOVA layouts stay exact', () => {
  for (const [role, expected] of Object.entries(EXPECTED_SPECIAL_STOPS)) {
    assert.deepEqual(data.stops[role], expected, `${role} layout changed`);
  }
});

test('generated sheet data is deeply immutable', () => {
  assertDeepFrozen(raw);
  assert.throws(() => {
    raw.strips[0][0] = 'MUTATED';
  }, TypeError);
  assert.equal(raw.strips[0][0], '🐘');
  assert.throws(() => {
    raw.stops.BIG.push([]);
  }, (error) => error?.name === 'TypeError');
  assert.equal(raw.stops.BIG.length, 4);
});
