/**
 * Writes the responsive screenshot set the site uses.
 *
 * Reads scripts/screens.json, crops and resizes each source capture with cwebp
 * (libwebp, `brew install webp`) and writes src/assets/img/screens/<name>-<w>.webp.
 * Outputs are committed, so `npm run build` never needs the source captures or
 * this tool; run it only when a screenshot changes.
 *
 *   SCREENS_SRC=/path/to/extracted/Archive npm run screens
 *
 * SCREENS_SRC is the root of the extracted screenshot archive (the folder that
 * contains screenshot-source/ and screenshots/). It defaults to ./screenshot-assets,
 * which is gitignored.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, process.env.SCREENS_SRC || "screenshot-assets");
const out = resolve(root, "src/assets/img/screens");

const manifest = JSON.parse(await readFile(resolve(root, "scripts/screens.json"), "utf8"));

if (!existsSync(src)) {
  console.error(`Source folder not found: ${src}\nSet SCREENS_SRC to the extracted screenshot archive.`);
  process.exit(1);
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

let count = 0;
for (const image of manifest.images) {
  const from = resolve(src, image.from);
  if (!existsSync(from)) {
    console.error(`Missing source for "${image.name}": ${from}`);
    process.exit(1);
  }
  for (const width of image.widths) {
    const target = resolve(out, `${image.name}-${width}.webp`);
    const args = ["-quiet", "-q", String(image.quality ?? 80), "-m", "6", "-sharp_yuv", "-af"];
    if (image.crop) args.push("-crop", ...image.crop.map(String));
    args.push("-resize", String(width), "0", from, "-o", target);
    await run("cwebp", args);
    count++;
  }
  console.log(`${image.name}  ${image.widths.join(" · ")}${image.crop ? `  (crop ${image.crop.join(",")})` : ""}`);
}
console.log(`\n${count} files written to src/assets/img/screens/`);
