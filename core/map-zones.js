// Coordinates and radii are percentages of map width (map aspect 1.6:1).
export function mapZones(points, { aspect = 1.6, minimum = 7 } = {}) {
  return points.map(([x, y], i) => ({ x, y, radius: Math.max(minimum, Math.min(11,
    ...points.filter((_, j) => j !== i).map(([a, b]) => Math.hypot(x - a, (y - b) / aspect) / 2))) }));
}
export function nearestZone(zones, x, y, aspect = 1.6) {
  let best = -1, distance = Infinity;
  zones.forEach((z, i) => {
    const d = Math.hypot(x - z.x, (y - z.y) / aspect);
    if (d < distance) { best = i; distance = d; }
  });
  return best >= 0 && distance <= zones[best].radius * 1.6 ? best : -1;
}
export function recommendedIsland(progress) {
  const i = progress.findIndex(p => !p.cleared);
  return i < 0 ? null : i + 1;
}

// Pick the cardinal side with the most clearance for the whole finger, in map-width units.
export function fingerSide(zones, index, { aspect = 1.6, size = 5.3 } = {}) {
  const z = zones[index], half = size / 2;
  const candidates = [['bottom', 0, 1], ['top', 0, -1], ['left', -1, 0], ['right', 1, 0]];
  return candidates.map(([side, dx, dy]) => {
    const x = z.x + dx * (z.radius + half), y = z.y / aspect + dy * (z.radius + half);
    const edge = Math.min(x - half, 100 - x - half, y - half, 100 / aspect - y - half);
    const clearance = Math.min(edge, ...zones.filter((_, i) => i !== index).map(p => {
      const ax = Math.max(Math.abs(p.x - x) - half, 0), ay = Math.max(Math.abs(p.y / aspect - y) - half, 0);
      return Math.hypot(ax, ay) - p.radius;
    }));
    return { side, clearance };
  }).sort((a, b) => b.clearance - a.clearance)[0].side;
}
