import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { readGameSource } from "./game-source.mjs";

const htmlFiles = ["index.html", "jag.html"];
let scriptCount = 0;
const externalScripts = new Set();

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const scripts = html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    const attributes = match[1] || "";
    const source = match[2] || "";
    const src = attributes.match(/\bsrc\s*=\s*["']([^"']+)["']/)?.[1];
    if (src) {
      if (/^(?:https?:)?\/\//.test(src)) continue;
      const asset = src.split(/[?#]/)[0];
      if (!existsSync(asset)) throw new Error(`Missing script: ${asset}`);
      if (!externalScripts.has(asset)) {
        new vm.Script(readFileSync(asset, "utf8"), { filename: asset });
        externalScripts.add(asset);
      }
      continue;
    }
    if (!source.trim()) continue;
    if (/\btype\s*=\s*["'](?:application\/ld\+json|application\/json)["']/i.test(attributes)) continue;
    new vm.Script(source, { filename: `${file}#script-${++scriptCount}` });
  }
  for (const match of html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    if (!/^(?:https?:)?\/\//.test(match[1]) && !existsSync(match[1].split(/[?#]/)[0])) {
      throw new Error(`Missing stylesheet: ${match[1]}`);
    }
  }
}

for (const asset of ["assets/logo/nova_logo.svg", "assets/hero/kv_vertical_copy_nova.svg"]) {
  if (!existsSync(asset)) throw new Error(`Missing NOVA asset: ${asset}`);
}

const game = readGameSource();
for (const required of [
  "NovaNormal.spin",
  "NovaArt.step",
  "NovaFlow.afterBonus",
  "nova_slot_state_v1_"
]) {
  if (!game.includes(required)) throw new Error(`Missing NOVA implementation marker: ${required}`);
}

// Page-scope functions in the game closure use two-space indentation.
const declarations = [...readFileSync("nova-game.js", "utf8").matchAll(/^  (?:async )?function (\w+)\(/gm)].map(match => match[1]);
const duplicates = declarations.filter((name, i) => declarations.indexOf(name) !== i);
if (duplicates.length) throw new Error(`Duplicate page functions: ${[...new Set(duplicates)].join(', ')}`);

const page = readFileSync("jag.html", "utf8");
const tags = [...page.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)];
const entry = tags.filter(match => match[1].split('?')[0] === 'nova-game.js');
if (entry.length !== 1 || entry[0] !== tags.at(-1) || /\b(?:async|defer|type)\s*(?:=|>)/i.test(entry[0][0])) {
  throw new Error('nova-game.js must load exactly once, synchronously after the game dependencies');
}

console.log(`HTML/JS syntax and NOVA assets OK (${scriptCount} inline, ${externalScripts.size} external scripts; no duplicate page functions)`);
