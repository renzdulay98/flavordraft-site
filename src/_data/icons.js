/* The line icons in src/assets/img/doodles/ (Lucide, ISC; see SOURCES.txt), read once
   at build time so a template can set one inline, in the text's own colour. Each
   value is the icon's paths; brand.njk's icon() macro wraps them in the <svg>. */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/img/doodles");
const icons = {};
for (const file of readdirSync(dir)) {
  if (!file.endsWith(".svg")) continue;
  const svg = readFileSync(join(dir, file), "utf8");
  const inner = svg.slice(svg.indexOf(">", svg.indexOf("<svg")) + 1, svg.lastIndexOf("</svg>"));
  icons[file.replace(/\.svg$/, "")] = inner.replace(/\s+/g, " ").trim();
}
export default icons;
