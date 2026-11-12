// Stroke data for the numerals 0-9 (0..100 box, top y=12, bottom y=88) and stroke matching (pure).
const r2 = v => +v.toFixed(2);
// Points on an ellipse arc; angles in degrees on screen (0 = right, 90 = down). from > to runs counter-clockwise on screen.
const arc = (cx, cy, rx, ry, from, to, n = 18) => {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = ((from + (to - from) * i / n) * Math.PI) / 180; pts.push([r2(cx + rx * Math.cos(a)), r2(cy + ry * Math.sin(a))]); }
  return pts;
};
const line = (...pts) => pts;

export const STROKES = {
  0: [arc(50, 50, 20, 38, -90, -450, 28)],
  1: [line([50, 12], [50, 88])],
  2: [line([32, 28], [36, 18], [44, 12.5], [54, 12], [63, 16], [67, 25], [65, 35], [58, 46], [32, 88], [70, 88])],
  3: [line([33, 20], [42, 13], [52, 12], [62, 16], [66, 27], [62, 38], [50, 46], [62, 52], [68, 63], [66, 76], [58, 85], [48, 88], [38, 86], [31, 78])],
  4: [line([54, 12], [28, 62], [74, 62]), line([62, 12], [62, 88])],
  5: [line([38, 12], [36, 44], [46, 40], [56, 41], [65, 48], [68, 60], [66, 74], [58, 84], [48, 88], [38, 86], [31, 79]), line([38, 12], [66, 12])],
  6: [[[62, 14], [50, 22], [40, 36], [34, 52], ...arc(50, 68, 17, 20, 180, -180, 22)]],
  7: [line([30, 12], [70, 12], [46, 88])],
  8: [[...arc(50, 30, 15, 18, -30, -270, 16), ...arc(50, 68, 18, 20, -90, 270, 22).slice(1), ...arc(50, 30, 15, 18, 90, -30, 8).slice(1)]],
  9: [arc(50, 32, 17, 20, -20, -340, 20), line([67, 20], [67, 50], [62, 70], [52, 84], [42, 88])],
};

// A two-digit number written left to right: every numeral shrunk around the middle of its own cell
export function wordStrokes(word) {
  const ls = [...String(word ?? '')];
  if (ls.length < 2 || ls.length > 3 || ls.some(l => !STROKES[l])) return null;
  const n = ls.length, s = Math.min(1, 1.7 / n), cell = 100 / n;
  return ls.flatMap((l, i) => {
    const cx = cell * (i + 0.5);
    return STROKES[l].map(st => st.map(([x, y]) => [r2(cx + (x - 50) * s), r2(50 + (y - 50) * s)]));
  });
}

// Strokes for any trace key: one numeral or a two-digit number
export function strokesFor(key) { return STROKES[key] || wordStrokes(key); }

export const RESAMPLE_N = 32;

function len(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return d;
}

export function resample(pts, n = RESAMPLE_N) {
  if (pts.length === 0) return [];
  if (pts.length === 1) return Array.from({ length: n }, () => [...pts[0]]);
  const total = len(pts);
  if (total === 0) return Array.from({ length: n }, () => [...pts[0]]);
  const step = total / (n - 1);
  const out = [[...pts[0]]];
  let acc = 0;
  for (let i = 1; i < pts.length && out.length < n; i++) {
    let [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    let seg = Math.hypot(x1 - x0, y1 - y0);
    while (acc + seg >= step && out.length < n) {
      const t = (step - acc) / seg;
      x0 = x0 + (x1 - x0) * t; y0 = y0 + (y1 - y0) * t;
      out.push([x0, y0]);
      seg = Math.hypot(x1 - x0, y1 - y0);
      acc = 0;
    }
    acc += seg;
  }
  while (out.length < n) out.push([...pts[pts.length - 1]]);
  return out;
}

function distToSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function distToPolyline(p, line) {
  let m = Infinity;
  for (let i = 1; i < line.length; i++) m = Math.min(m, distToSeg(p, line[i - 1], line[i]));
  return line.length === 1 ? Math.hypot(p[0] - line[0][0], p[1] - line[0][1]) : m;
}

export function matchStroke(user, expected, tol = 14) {
  if (!user || user.length < 2) return { ok: false, reason: 'too-short' };
  const s = user[0], e0 = expected[0];
  if (Math.hypot(s[0] - e0[0], s[1] - e0[1]) > tol * 1.5) return { ok: false, reason: 'wrong-start' };
  if (len(user) < len(expected) * 0.6) return { ok: false, reason: 'too-short' };
  const u = resample(user), x = resample(expected);
  const meanPath = u.reduce((a, p) => a + distToPolyline(p, expected), 0) / u.length;
  if (meanPath > tol) return { ok: false, reason: 'off-path' };
  // ordered correspondence catches wrong direction on closed shapes (e.g. clockwise o)
  const meanOrdered = u.reduce((a, p, i) => a + Math.hypot(p[0] - x[i][0], p[1] - x[i][1]), 0) / u.length;
  if (meanOrdered > tol * 2) return { ok: false, reason: 'off-path' };
  // round shapes (o, the bowls of a/d/g/q/b/p, c, e): small letters need an explicit turning-direction check
  const area = a => a.reduce((s, p, i) => { const q = a[(i + 1) % a.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  const ex = area(x);
  if (Math.abs(ex) > 150 && Math.sign(area(u)) !== Math.sign(ex)) return { ok: false, reason: 'wrong-way' };
  return { ok: true, reason: 'ok' };
}
