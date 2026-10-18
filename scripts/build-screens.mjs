/**
 * Writes the homepage's responsive image set.
 *
 * Reads scripts/screens.json. For each image, scripts/lib/render_image.py (Pillow)
 * crops, masks and resizes the source and writes AVIF; cwebp (libwebp) writes the
 * WebP fallback from the same pixels. Everything lands in src/assets/img/screens/
 * as <name>-<width>.avif|webp, and src/_data/screens.json records each image's
 * shape, widths and rights status for the templates. Outputs are committed, so
 * `npm run build` never needs the sources or these tools.
 *
 *   npm run screens                       # sources in ./flavordraft-app-docs
 *   SCREENS_SRC=/path/to/docs npm run screens
 *
 * Needs python3 with Pillow 11.3+ (AVIF support), cwebp (`brew install webp`), and
 * ffmpeg/ffprobe for the posters cut from video frames.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, process.env.SCREENS_SRC || "flavordraft-app-docs");
const out = resolve(root, "src/assets/img/screens");
const data = resolve(root, "src/_data/screens.json");
const tmp = join(tmpdir(), "flavordraft-screens");

const manifest = JSON.parse(await readFile(resolve(root, "scripts/screens.json"), "utf8"));

if (!existsSync(src)) {
  console.error(`Source folder not found: ${src}\nSet SCREENS_SRC to the FlavorDraft app documentation folder.`);
  process.exit(1);
}

await rm(out, { recursive: true, force: true });
await rm(tmp, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const shapes = {};
// A video source names one of its frames. It is decoded the way a browser shows it
// (BT.709, limited range to full), so a poster and the film's first frame match.
async function frameOf(video, frame, name) {
  await mkdir(tmp, { recursive: true });
  const png = join(tmp, `${name}-frame.png`);
  const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", video]);
  const [num, den] = stdout.trim().split("/").map(Number);
  await run("ffmpeg", [
    "-v", "error", "-y", "-ss", String(frame / (num / (den || 1))), "-i", video, "-frames:v", "1",
    "-vf", "scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24", png
  ]);
  return png;
}

let count = 0;
for (const image of manifest.images) {
  // `"base": "repo"` reads a file this repository generates (the page-turn clip from
  // `npm run media`, so run that first) instead of one in the app documentation.
  let from = resolve(image.base === "repo" ? root : src, image.from);
  if (!existsSync(from)) {
    console.error(`Missing source for "${image.name}": ${from}`);
    process.exit(1);
  }
  if (image.frame != null) from = await frameOf(from, image.frame, image.name);
  const spec = {
    src: from,
    crop: image.crop ?? null,
    bands: image.bands ?? null,
    radius: image.radius ?? null,
    continuous: image.continuous ?? false,
    exponent: image.exponent ?? 5,
    widths: image.widths,
    quality: image.quality ?? 55,
    out,
    tmp,
    name: image.name
  };
  const { stdout } = await run("python3", ["-I", resolve(root, "scripts/lib/render_image.py"), JSON.stringify(spec)]);
  const shape = JSON.parse(stdout);

  for (const width of image.widths) {
    const png = join(tmp, `${image.name}-${width}.png`);
    const webp = join(out, `${image.name}-${width}.webp`);
    await run("cwebp", ["-quiet", "-q", String(image.webpQuality ?? 80), "-m", "6", "-sharp_yuv", "-af", "-alpha_q", "100", png, "-o", webp]);
    count += 2;
  }

  shapes[image.name] = { ...shape, widths: image.widths, rights: image.rights };
  console.log(`${image.name.padEnd(24)} ${shape.w}×${shape.h}  ${image.widths.join(" · ")}${image.rights === "owned" ? "" : `  [${image.rights}]`}`);
}

// The video's rights are recorded beside the images', so the build's warning
// (eleventy.config.js) covers everything the homepage shows.
const media = Object.fromEntries((manifest.media ?? []).map(({ name, files, rights }) => [name, { files, rights }]));

await writeFile(
  data,
  JSON.stringify({ _generated: "by scripts/build-screens.mjs from scripts/screens.json; do not edit by hand", _media: media, ...shapes }, null, 2) + "\n"
);
await rm(tmp, { recursive: true, force: true });

const uncleared = [...Object.entries(shapes), ...Object.entries(media)].filter(([, s]) => s.rights !== "owned").map(([name]) => name);
console.log(`\n${count} files written to src/assets/img/screens/, shapes to src/_data/screens.json`);
if (uncleared.length) {
  console.warn(`\nNot cleared for marketing use (publisher photographs on screen): ${uncleared.join(", ")}`);
}
