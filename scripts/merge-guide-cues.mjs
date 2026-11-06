import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hashes, modelHash} from './rtp-current.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = process.argv[2];
if (!directory) throw Error('Expected measurement directory');
const currentHash = modelHash(hashes(root));
const settings = [1,2,3,4,5,6].map(setting => {
  const row = JSON.parse(fs.readFileSync(path.join(directory, `guide-${setting}.json`), 'utf8'));
  if (row.setting !== setting || row.modelHash !== currentHash || row.games !== 10_000_000) {
    throw Error(`Invalid or stale guide measurement: setting ${setting}`);
  }
  for (const key of ['normalGames','czGames','bbInitials','atInitials','atGames','directSevens','stockSevens','sortieStarts']) {
    if (!Number.isSafeInteger(row[key]) || row[key] < 0) throw Error(`Invalid ${key}`);
  }
  return row;
});
fs.writeFileSync(path.join(root, 'docs/guide-bonus-frequencies.json'), JSON.stringify({modelHash:currentHash,gamesPerSetting:10_000_000,settings}, null, 2)+'\n');
console.log('Validated guide measurements for all six settings');
