/**
 * Regenerates the raster icons and the social-share image.
 *
 * Everything here is derived from assets that already exist in the repo — the
 * approved 2.0 app icon (src/assets/img/appicon-1024.png, the master from the
 * approved icon bundle, only resampled), the share card's page in scripts/og/,
 * which is laid out with the site's own tokens and typeface, and the approved
 * wordmark raster, also only resampled. Nothing is drawn by hand.
 *
 * macOS + Google Chrome only; this is a local authoring tool, not part of the
 * production build. Its outputs are committed, so `npm run build` never runs it.
 *
 *   npm run icons
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pen from "../src/_data/pen.js";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* A page may hold <!--pen:name--> markers: each becomes that mark of the red pen
   from src/_data/pen.js, finished (the share card shows the hero's ring and
   underline as they end up). The filled page is rendered from a sibling file. */
async function withPen(from) {
  const source = await readFile(resolve(root, from), "utf8");
  if (!source.includes("<!--pen:")) return from;
  const filled = source.replace(/<!--pen:([a-z]+)-->/g, (_, name) => {
    const mark = pen[name];
    if (!mark) throw new Error(`${from}: no mark "${name}" in src/_data/pen.js`);
    const paths = mark.strokes.map((stroke) => `<path d="${stroke.shape}"/>`).join("");
    const fit = name === "underline" ? "none" : "xMidYMid meet";
    return `<svg viewBox="${mark.viewBox}" preserveAspectRatio="${fit}" aria-hidden="true">${paths}</svg>`;
  });
  const rendered = from.replace(/\.html$/, ".render.html");
  await writeFile(resolve(root, rendered), filled);
  return rendered;
}

/* Headless Chrome on macOS refuses to open a window narrower than 500px and
   silently crops instead of scaling, so anything smaller than that is rendered
   large and resampled down. */
const MIN_WINDOW = 500;

const targets = [{ from: "scripts/og/og.html", to: "src/assets/img/og.png", w: 1200, h: 630 }];

for (const { from, to, w, h } of targets) {
  const out = resolve(root, to);
  await mkdir(dirname(out), { recursive: true });

  const scale = Math.max(1, Math.ceil(MIN_WINDOW / Math.min(w, h)));
  const shot = scale === 1 ? out : `${out}.render.png`;
  const page = await withPen(from);

  await run(CHROME, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "--virtual-time-budget=5000",
    `--window-size=${w * scale},${h * scale}`,
    `--screenshot=${shot}`,
    pathToFileURL(resolve(root, page)).href
  ]);

  if (page !== from) await rm(resolve(root, page));
  if (scale !== 1) {
    await run("sips", ["-z", String(h), String(w), shot, "--out", out]);
    await rm(shot);
  }

  console.log(`${to}  ${w}×${h}${scale === 1 ? "" : `  (rendered ${scale}×)`}`);
}

/* The app icon: the approved master, square and unrounded (iOS rounds the touch icon
   itself), resampled to the favicon and touch-icon sizes. */
const ICON = "src/assets/img/appicon-1024.png";
for (const [width, to] of [[180, "src/root/apple-touch-icon.png"], [32, "src/root/favicon-32.png"], [16, "src/root/favicon-16.png"]]) {
  // Pillow (already needed for `npm run screens`): a Lanczos resample and an optimised
  // PNG, opaque (the master's ground is its cream; iOS rounds the touch icon itself).
  await run("python3", ["-I", "-c", "import sys; from PIL import Image; w=int(sys.argv[2]); Image.open(sys.argv[1]).convert('RGB').resize((w, w), Image.LANCZOS).save(sys.argv[3], optimize=True)", resolve(root, ICON), String(width), resolve(root, to)]);
  console.log(`${to}  ${width}×${width}`);
}

/* The approved wordmark (wordmark_handoff/README.md) ships as one 1193 px raster.
   It is resampled, never redrawn, to 1×, 2× and 3× of the 140 px header and the
   152 px footer, so a page fetches the pixels it shows; brand.njk's wordmark()
   serves them by srcset. */
const WORDMARK = "src/assets/img/wordmark-flavordraft.png";
for (const width of [140, 280, 420, 560]) {
  const to = WORDMARK.replace(/\.png$/, `-${width}.png`);
  await run("sips", ["--resampleWidth", String(width), resolve(root, WORDMARK), "--out", resolve(root, to)]);
  console.log(`${to}  ${width}w`);
}
