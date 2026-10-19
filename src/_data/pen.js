/**
 * The red pen's marks, worked out once at build time.
 *
 * The stroke model is the App Store campaign's own pen (creative/shared/js/kit.js,
 * `FD.ink`): a filled shape whose width follows the pen's pressure — a quick attack,
 * a body that breathes a little, a tapered lift. The hero's ring and underline go
 * further, as a hand does: a pressure that changes along the stroke (heavier where
 * the pen slows in a turn, lighter where it runs), a line that wanders a little, an
 * end that overshoots its start and lifts away thin. Here every mark is computed in
 * its finished state only; the page draws it on by revealing it along its centre
 * line (a CSS mask, see `ink()` in brand.njk and the `.ink` rules in home.css), so
 * no script runs and a reader who prefers reduced motion simply sees the finished mark.
 *
 * Each mark: `viewBox`, `maskBox`, and its strokes, drawn in order: `line` (the centre
 * line, an SVG path of M and C commands), `shape` (the filled outline), `reveal` (the
 * mask stroke's width, a little wider than the widest point of the shape). The same
 * seed always gives the same stroke. Templates read these as `pen.<name>`.
 */

/* ---- geometry: cubic Bézier paths measured by arc length ---------------- */

function parse(d) {
  const tokens = d.match(/[MC]|-?\d*\.?\d+(?:e-?\d+)?/gi);
  const segments = [];
  let i = 0, cmd = null, cur = null;
  while (i < tokens.length) {
    if (/[MC]/i.test(tokens[i])) cmd = tokens[i++].toUpperCase();
    if (cmd === "M") { cur = [+tokens[i++], +tokens[i++]]; cmd = "C"; continue; }
    const b = [+tokens[i++], +tokens[i++]], c = [+tokens[i++], +tokens[i++]], e = [+tokens[i++], +tokens[i++]];
    segments.push([cur, b, c, e]);
    cur = e;
  }
  return segments;
}

function cubic([a, b, c, d], t) {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]);
}

function measure(d, steps = 400) {
  const segments = parse(d);
  const table = [{ len: 0, pt: segments[0][0] }];
  let len = 0, prev = segments[0][0];
  for (const s of segments) {
    for (let k = 1; k <= steps; k++) {
      const pt = cubic(s, k / steps);
      len += Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
      table.push({ len, pt });
      prev = pt;
    }
  }
  const at = (L) => {
    L = Math.max(0, Math.min(len, L));
    let lo = 0, hi = table.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (table[m].len < L) lo = m; else hi = m; }
    const A = table[lo], B = table[hi], q = B.len === A.len ? 0 : (L - A.len) / (B.len - A.len);
    return [A.pt[0] + (B.pt[0] - A.pt[0]) * q, A.pt[1] + (B.pt[1] - A.pt[1]) * q];
  };
  return { total: len, at };
}

/* ---- the pen (kit.js `ink`, finished state) ------------------------------ */

// A closed outline through points, drawn as quadratic curves through the points'
// midpoints: smooth with far fewer samples than straight segments would need.
function smooth(points) {
  const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${f(mid(points[points.length - 1], points[0]))}`;
  for (let i = 0; i < points.length; i++) {
    d += `Q${f(points[i])} ${f(mid(points[i], points[(i + 1) % points.length]))}`;
  }
  return d + "Z";
}

// 72 samples keep every outline within a quarter of a unit of a dense sampling
// (under half a device pixel at the sizes the marks are drawn) at a third fewer
// bytes inline in the page.
function pen(line, options = {}) {
  const o = { width: 14, attack: 0.05, lift: 0.14, breathe: 0.14, seed: 1, samples: 72, min: 0.28, ...options };
  const { total, at } = measure(line);
  const n = o.samples, pts = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, a = at(total * s);
    const b = at(total * Math.min(1, s + 0.002)), c = at(total * Math.max(0, s - 0.002));
    let nx = -(b[1] - c[1]), ny = b[0] - c[0];
    const m = Math.hypot(nx, ny) || 1;
    nx /= m; ny /= m;
    const up = Math.min(1, s / o.attack), down = Math.min(1, (1 - s) / o.lift);
    const body = 1 + o.breathe * (0.6 * Math.sin(s * 9.1 + o.seed * 1.7) + 0.4 * Math.sin(s * 23.3 + o.seed * 4.1));
    const w = o.width * body * Math.max(o.min, Math.pow(up, 0.6) * Math.pow(down, 0.75));
    pts.push({ x: a[0], y: a[1], nx, ny, w });
  }
  const left = pts.map((p) => [p.x + (p.nx * p.w) / 2, p.y + (p.ny * p.w) / 2]);
  const right = pts.map((p) => [p.x - (p.nx * p.w) / 2, p.y - (p.ny * p.w) / 2]);
  const tip = pts[n], fx = tip.ny, fy = -tip.nx, cap = [];
  for (let k = 1; k < 8; k++) {
    const a = (Math.PI * k) / 8;
    cap.push([tip.x + ((tip.nx * Math.cos(a) + fx * Math.sin(a)) * tip.w) / 2, tip.y + ((tip.ny * Math.cos(a) + fy * Math.sin(a)) * tip.w) / 2]);
  }
  return {
    shape: smooth(left.concat(cap, right.reverse())),
    widest: Math.max(...pts.map((p) => p.w))
  };
}

/* ---- the hand: a stroke from points, with pressure ------------------------ */

// Smooth, repeatable unevenness: a few sines that never line up, from a seed.
function wander(s, seed, amount) {
  return amount * (0.55 * Math.sin(s * 6.3 + seed * 1.3) + 0.3 * Math.sin(s * 15.1 + seed * 2.9) + 0.15 * Math.sin(s * 31.7 + seed * 4.7));
}

// A pressure curve from keypoints [s, weight], read smoothly between them.
function envelope(keys) {
  return (s) => {
    for (let i = 1; i < keys.length; i++) {
      if (s <= keys[i][0]) {
        const [a, va] = keys[i - 1], [b, vb] = keys[i];
        const t = (s - a) / (b - a || 1), k = t * t * (3 - 2 * t);
        return va + (vb - va) * k;
      }
    }
    return keys[keys.length - 1][1];
  };
}

/* A stroke the way a hand lays it: `points` is a dense centre line, `pressure(s)` the
   weight along it (1 = `width`), and the pen is heavier where the line turns tightly
   (it slows there) and lighter where it runs straight. The edges are a little rough. */
function gesture(points, pressure, { width = 5, min = 0.22, seed = 1, rough = 0.16, turn = 0.5 } = {}) {
  const n = points.length - 1, pts = [];
  const lens = [0];
  for (let i = 1; i <= n; i++) lens.push(lens[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const total = lens[n];
  for (let i = 0; i <= n; i++) {
    const s = lens[i] / total;
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const m = Math.hypot(nx, ny) || 1;
    nx /= m; ny /= m;
    // how sharply the line turns here, from the angle change over a few points
    const p0 = points[Math.max(0, i - 3)], p1 = points[i], p2 = points[Math.min(n, i + 3)];
    const a1 = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), a2 = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    let da = Math.abs(a2 - a1); if (da > Math.PI) da = 2 * Math.PI - da;
    const bend = Math.min(1, da / 0.35);
    const w = width * Math.max(min, pressure(s) * (1 + turn * 0.3 * bend) * (1 + wander(s, seed, 0.06)));
    pts.push({ x: points[i][0], y: points[i][1], nx, ny, w, s });
  }
  const edge = (p, side) => {
    const j = wander(p.s * 2.1 + side, seed + 3, rough);
    return [p.x + p.nx * (p.w / 2 + j) * side, p.y + p.ny * (p.w / 2 + j) * side];
  };
  const left = pts.map((p) => edge(p, 1)), right = pts.map((p) => edge(p, -1));
  const cap = (p, dir) => {
    const fx = p.ny * dir, fy = -p.nx * dir, out = [];
    for (let k = 1; k < 8; k++) {
      const a = (Math.PI * k) / 8;
      out.push([p.x + ((p.nx * Math.cos(a) + fx * Math.sin(a)) * p.w) / 2, p.y + ((p.ny * Math.cos(a) + fy * Math.sin(a)) * p.w) / 2]);
    }
    return out;
  };
  const start = cap(pts[0], -1).reverse();
  return {
    line: through(points.filter((_, i) => i % 6 === 0 || i === n)),
    shape: smooth(left.concat(cap(pts[n], 1), right.reverse(), start)),
    widest: Math.max(...pts.map((p) => p.w))
  };
}

/* ---- the marks ------------------------------------------------------------ */

// A smooth path through points (Catmull-Rom, written as cubic Béziers).
function through(points) {
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// An editor's ring round a word, as a hand draws one: the pen goes down at the
// upper right and travels anticlockwise, fast over the top, slowing into the left
// turn, round the bottom and up the right side, where it passes outside its own
// start and lifts away. The oval is a little off true and a little egg-shaped, and
// the line wanders as a hand's does.
function ring({ cx = 121, cy = 63, rx = 101, ry = 49, tilt = -5, from = -34, sweep = 396, over = 0.11, seed = 3, n = 150 } = {}) {
  const t = (tilt * Math.PI) / 180, points = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const th = ((from - sweep * f) * Math.PI) / 180;
    const late = Math.max(0, (f - 0.72) / 0.28);
    const grow = 1 + over * late * late * (3 - 2 * late);
    const egg = 1 + 0.035 * Math.cos(th + 0.6);
    const wob = 1 + wander(f, seed, 0.05) + 0.012 * Math.sin(f * 41 + seed);
    const x = rx * grow * wob * egg * Math.cos(th), y = ry * grow * (2 - wob) * Math.sin(th);
    points.push([cx + x * Math.cos(t) - y * Math.sin(t), cy + x * Math.sin(t) + y * Math.cos(t)]);
  }
  return points;
}

// The ring's pressure: the pen lands and settles, runs light over the top, leans
// into the left turn and the bottom, eases up the right side, and lifts away thin.
const ringPressure = envelope([[0, 1.12], [0.04, 0.98], [0.14, 0.8], [0.3, 0.76], [0.46, 1.04], [0.62, 1.0], [0.78, 0.86], [0.9, 0.7], [0.96, 0.42], [1, 0.16]]);

// A line under a word: set down firmly, carried right with a slight sag, lifted
// with a small upward flick.
function underline({ x0 = 4, x1 = 397, y = 12, sag = 5, seed = 7, n = 110 } = {}) {
  const points = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const x = x0 + (x1 - x0) * f;
    const flick = Math.max(0, (f - 0.9) / 0.1);
    const yy = y + sag * Math.sin(f * Math.PI) * (1 - flick) - 7 * flick * flick + wander(f, seed, 1.3);
    points.push([x, yy]);
  }
  return points;
}

const underlinePressure = envelope([[0, 1.15], [0.05, 1.0], [0.3, 0.86], [0.55, 0.94], [0.8, 0.9], [0.92, 0.7], [1, 0.22]]);

// An arrowhead drawn as one stroke: in along one barb, to the point, out along the other.
function head(tip, towards, length = 20, spread = 30) {
  const back = Math.atan2(towards[1] - tip[1], towards[0] - tip[0]);
  const barb = (sign) => {
    const a = back + (sign * spread * Math.PI) / 180;
    return [tip[0] + Math.cos(a) * length, tip[1] + Math.sin(a) * length];
  };
  const [p, q] = [barb(-1), barb(1)];
  const mid = (u, v, k) => [u[0] + (v[0] - u[0]) * k, u[1] + (v[1] - u[1]) * k];
  const [a1, a2, b1, b2] = [mid(p, tip, 0.35), mid(p, tip, 0.75), mid(tip, q, 0.25), mid(tip, q, 0.65)];
  return `M ${p.map((v) => v.toFixed(1)).join(" ")} C ${a1.map((v) => v.toFixed(1)).join(" ")}, ${a2.map((v) => v.toFixed(1)).join(" ")}, ${tip.join(" ")} C ${b1.map((v) => v.toFixed(1)).join(" ")}, ${b2.map((v) => v.toFixed(1)).join(" ")}, ${q.map((v) => v.toFixed(1)).join(" ")}`;
}

function mark(viewBox, strokes) {
  const [x, y, w, h] = viewBox.split(" ").map(Number);
  return {
    viewBox,
    // The mask's region: the drawing plus room for the reveal's round caps.
    maskBox: [x - 40, y - 40, w + 80, h + 80],
    strokes: strokes.map((stroke) => {
      const { line, shape, widest } = Array.isArray(stroke) ? { line: stroke[0], ...pen(stroke[0], stroke[1]) } : stroke;
      return { line, shape, reveal: +(widest * 1.3).toFixed(1) };
    })
  };
}

const arrowLine = "M 8 64 C 58 26, 138 18, 214 44";

export default {
  // Round "2.0" in the hero.
  ring: mark("0 0 240 126", [gesture(ring(), ringPressure, { width: 5.4, min: 0.14, seed: 3, rough: 0.14, turn: 0.6 })]),

  // Under "iPhone Duo" in the hero.
  underline: mark("0 0 400 24", [gesture(underline(), underlinePressure, { width: 7.2, min: 0.18, seed: 7, rough: 0.18, turn: 0.2 })]),

  // From the saved video to the recipe it became: a carried curve, then its head.
  arrow: mark("0 0 240 84", [
    [arrowLine, { width: 6.5, attack: 0.06, lift: 0.16, breathe: 0.14, seed: 4, min: 0.32 }],
    [head([214, 44], [176, 30], 21, 32), { width: 6, attack: 0.1, lift: 0.22, breathe: 0.08, seed: 9, min: 0.4 }]
  ])
};
