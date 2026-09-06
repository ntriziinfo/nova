import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync("vercel.json", "utf8"));
if (config.outputDirectory !== ".") throw new Error("vercel outputDirectory must remain static root");
if (!Array.isArray(config.rewrites)) throw new Error("vercel rewrites are missing");

const routes = new Map(config.rewrites.map((row) => [row.source, row.destination]));
for (const route of ["/", "/nova", "/jag"]) {
  if (routes.get(route) !== "/jag.html") throw new Error(`${route} must serve jag.html`);
}

console.log("Vercel static routes OK");
