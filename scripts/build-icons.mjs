/**
 * Regenerates the raster icons and the social-share image.
 *
 * Everything here is derived from assets that already exist in the repo — the
 * shipped app-icon master (src/assets/img/appicon.svg, copied verbatim from the
 * design system) and the two pages in scripts/og/, which are laid out with
 * the site's own tokens and typeface. Nothing is drawn by hand.
 *
 * macOS + Google Chrome only; this is a local authoring tool, not part of the
 * production build. Its outputs are committed, so `npm run build` never runs it.
 *
 *   npm run icons
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* Headless Chrome on macOS refuses to open a window narrower than 500px and
   silently crops instead of scaling, so anything smaller than that is rendered
   large and resampled down. */
const MIN_WINDOW = 500;

const targets = [
  { from: "scripts/og/icon.html", to: "src/root/apple-touch-icon.png", w: 180, h: 180 },
  { from: "scripts/og/icon.html", to: "src/root/favicon-32.png", w: 32, h: 32 },
  { from: "scripts/og/og.html", to: "src/assets/img/og.png", w: 1200, h: 630 }
];

for (const { from, to, w, h } of targets) {
  const out = resolve(root, to);
  await mkdir(dirname(out), { recursive: true });

  const scale = Math.max(1, Math.ceil(MIN_WINDOW / Math.min(w, h)));
  const shot = scale === 1 ? out : `${out}.render.png`;

  await run(CHROME, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--virtual-time-budget=5000",
    `--window-size=${w * scale},${h * scale}`,
    `--screenshot=${shot}`,
    pathToFileURL(resolve(root, from)).href
  ]);

  if (scale !== 1) {
    await run("sips", ["-z", String(h), String(w), shot, "--out", out]);
    await rm(shot);
  }

  console.log(`${to}  ${w}×${h}${scale === 1 ? "" : `  (rendered ${scale}×)`}`);
}
