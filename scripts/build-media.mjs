/**
 * Writes the site's video into src/assets/media/.
 *
 * 1. The iPhone Duo film: Track B of the Duo showcase ("PUBLIC CANDIDATE": FlavorDraft's
 *    real screens, no Apple hardware). Its 1920 HEVC, VP9 and H.264 web encodes (the ones
 *    web/EMBED.md describes) are copied unchanged, names shortened; for narrow screens the
 *    loop's middle 4:3 is cut at 1200 × 900 (see below), in place of EMBED.md's 720p file.
 * 2. The Cook View page turn: two seconds of the same film (step 16 at rest, Next pressed,
 *    the real recorded page turn, step 17 landed), cropped to the screen at the crop of
 *    Track B's stills/paper-animation-frames/, so those stills are this clip's first and
 *    last frames. Nothing is interpolated or redrawn. Encoded once as H.264 and VP9.
 *
 * 3. The iPhone Duo showcase page's film (/duo-showcase/): Track A of the Duo showcase, the
 *    Duo Studio cinematic of Apple's own 3D iPhone Duo model, "INTERNAL ONLY" in the
 *    showcase's rights review (web/EMBED.md, rights/APPLE_DUO_ASSET_USAGE_REVIEW.md). On the
 *    owner's explicit instruction of 2026-10-20 its web encodes (1080p HEVC, VP9 and H.264,
 *    and the 720p file for phones) are copied unchanged; the 4K masters stay out of the repo.
 *
 *   npm run media                       # sources in ./flavordraft-app-docs
 *   SCREENS_SRC=/path/to/docs npm run media
 *
 * Needs ffmpeg with libx264, libx265 and libvpx-vp9.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { copyFile, mkdir, readFile, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, process.env.SCREENS_SRC || "flavordraft-app-docs");
const trackB = join(src, "app-store/2.0/duo-showcase/track-b-public-candidate");
const trackA = join(src, "app-store/2.0/duo-showcase");
const out = resolve(root, "src/assets/media");

const film = [
  ["web/flavordraft-duo-screens_trackB_web_1920x1080_60fps_hevc.mp4", "duo/duo-film-1920.hevc.mp4"],
  ["web/flavordraft-duo-screens_trackB_web_1920x1080_60fps.webm", "duo/duo-film-1920.vp9.webm"],
  ["web/flavordraft-duo-screens_trackB_web_1920x1080_60fps_h264.mp4", "duo/duo-film-1920.h264.mp4"]
];
const showcase = [
  ["web/flavordraft-duo-showcase_web_1920x1080_60fps_hevc.mp4", "showcase/duo-showcase-1920.hevc.mp4"],
  ["web/flavordraft-duo-showcase_web_1920x1080_60fps.webm", "showcase/duo-showcase-1920.vp9.webm"],
  ["web/flavordraft-duo-showcase_web_1920x1080_60fps_h264.mp4", "showcase/duo-showcase-1920.h264.mp4"],
  ["web/flavordraft-duo-showcase_web_1280x720_h264.mp4", "showcase/duo-showcase-720.h264.mp4"]
];

// The page turn in the 4K master: frames 780-899 (13.00-14.98 s); the screen sits at
// x 1260, y 130, 1322 × 1880 (the crop of stills/paper-animation-frames/, measured
// against frame 807). The Cook View device's display (cook-duo in scripts/screens.json)
// is frame 780 of the same master at the same crop, so the clip starts on the still.
const master = "renders/flavordraft-duo-screens_trackB_nomination_3840x2160_60fps_h264.mp4";
const turn = { start: 13.0, frames: 120, crop: "1322:1880:1260:130", width: 660, height: 938 };
const colour = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "iec61966-2-1", "-color_range", "tv"];

if (!existsSync(trackB)) {
  console.error(`Track B not found: ${trackB}\nSet SCREENS_SRC to the FlavorDraft app documentation folder.`);
  process.exit(1);
}

await rm(out, { recursive: true, force: true });
await mkdir(join(out, "duo"), { recursive: true });
await mkdir(join(out, "cook"), { recursive: true });
await mkdir(join(out, "showcase"), { recursive: true });

const size = async (file) => ((await stat(file)).size / 1e6).toFixed(2) + " MB";

for (const [from, to] of film) {
  await copyFile(join(trackB, from), join(out, to));
  console.log(`${to.padEnd(32)} ${await size(join(out, to))}  (copied: ${from})`);
}

const input = ["-v", "error", "-y", "-ss", String(turn.start), "-i", join(trackB, master), "-frames:v", String(turn.frames), "-an"];
const filter = ["-vf", `crop=${turn.crop},scale=${turn.width}:${turn.height}:flags=lanczos`];

await run("ffmpeg", [
  ...input, ...filter,
  "-c:v", "libx264", "-preset", "veryslow", "-crf", "20", "-profile:v", "high", "-pix_fmt", "yuv420p",
  ...colour, "-movflags", "+faststart",
  join(out, "cook/cook-turn.h264.mp4")
]);
await run("ffmpeg", [
  ...input, ...filter,
  "-c:v", "libvpx-vp9", "-crf", "33", "-b:v", "0", "-deadline", "good", "-cpu-used", "1", "-row-mt", "1", "-pix_fmt", "yuv420p",
  ...colour,
  join(out, "cook/cook-turn.vp9.webm")
]);
for (const name of ["cook/cook-turn.h264.mp4", "cook/cook-turn.vp9.webm"]) {
  console.log(`${name.padEnd(32)} ${await size(join(out, name))}  (Track B frames 780-899, cropped to the screen)`);
}

// Narrow screens show only the film's middle 4:3 (home.css), where every screen in
// it sits whole, so phones get that crop at 1200 × 900: the same frames, half the
// bytes of the 1920 file they would otherwise download. Cut from the web loop's
// H.264 (the loop is its own edit; the 4K master is the nomination edit). The film
// is mostly still interface and is never seeked, so a keyframe every 10 s is
// enough: the loop restarts on one, and phones (which Safari gives no Save-Data
// signal) download a third less.
const loop = join(trackB, "web/flavordraft-duo-screens_trackB_web_1920x1080_60fps_h264.mp4");
const narrow = ["-v", "error", "-y", "-i", loop, "-an", "-vf", "crop=1440:1080:240:0,scale=1200:900:flags=lanczos"];
await run("ffmpeg", [
  ...narrow,
  "-c:v", "libx265", "-preset", "slow", "-crf", "25", "-tag:v", "hvc1", "-pix_fmt", "yuv420p",
  "-x265-params", "keyint=600:min-keyint=600:log-level=error",
  ...colour, "-movflags", "+faststart",
  join(out, "duo/duo-film-narrow.hevc.mp4")
]);
await run("ffmpeg", [
  ...narrow,
  "-c:v", "libx264", "-preset", "veryslow", "-crf", "24", "-profile:v", "high", "-pix_fmt", "yuv420p", "-g", "600",
  ...colour, "-movflags", "+faststart",
  join(out, "duo/duo-film-narrow.h264.mp4")
]);
for (const name of ["duo/duo-film-narrow.hevc.mp4", "duo/duo-film-narrow.h264.mp4"]) {
  console.log(`${name.padEnd(32)} ${await size(join(out, name))}  (the loop's middle 4:3, for narrow screens)`);
}

// The showcase page's film: Track A's web encodes, copied unchanged (see the header).
for (const [from, to] of showcase) {
  await copyFile(join(trackA, from), join(out, to));
  console.log(`${to.padEnd(32)} ${await size(join(out, to))}  (copied: ${from})`);
}

// The rights of what was written are recorded in scripts/screens.json ("media"),
// beside the images', and the site build repeats any that are not cleared.
const { media = [] } = JSON.parse(await readFile(resolve(root, "scripts/screens.json"), "utf8"));
const uncleared = media.filter((item) => item.rights !== "owned").map((item) => `${item.name} (${item.files})`);
if (uncleared.length) {
  console.warn(`\nNot cleared for marketing use (scripts/screens.json says why): ${uncleared.join(", ")}`);
}
