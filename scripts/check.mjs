import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";

const htmlFiles = ["index.html", "jag.html"];
let scriptCount = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const scripts = html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    const attributes = match[1] || "";
    const source = match[2] || "";
    if (/\bsrc\s*=/.test(attributes) || !source.trim()) continue;
    if (/\btype\s*=\s*["'](?:application\/ld\+json|application\/json)["']/i.test(attributes)) continue;
    new vm.Script(source, { filename: `${file}#script-${++scriptCount}` });
  }
}

for (const asset of ["assets/logo/nova_logo.svg", "assets/hero/kv_vertical_copy_nova.svg"]) {
  if (!existsSync(asset)) throw new Error(`Missing NOVA asset: ${asset}`);
}

const game = readFileSync("jag.html", "utf8");
for (const required of [
  "NovaNormal.spin",
  "NovaArt.step",
  "NovaFlow.afterBonus",
  "nova_slot_state_v1_"
]) {
  if (!game.includes(required)) throw new Error(`Missing NOVA implementation marker: ${required}`);
}

console.log(`HTML syntax and NOVA assets OK (${scriptCount} inline scripts)`);
