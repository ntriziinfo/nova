import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Source-inspection tests and audio maintenance used to read the inline page.
// Reconstruct only the extracted page assets, in their original positions.
// This is a development helper; the browser loads the real files directly.
export function readGameSource(root = projectRoot) {
  let html = fs.readFileSync(path.join(root, 'jag.html'), 'utf8');
  html = html.replace(/<link rel="stylesheet" href="nova-game\.css(?:\?[^"<>]*)?">/,
    () => `<style>${fs.readFileSync(path.join(root, 'nova-game.css'), 'utf8')}</style>`);
  return html.replace(/<script src="nova-game\.js(?:\?[^"<>]*)?"><\/script>/,
    () => `<script>${fs.readFileSync(path.join(root, 'nova-game.js'), 'utf8')}</script>`);
}
