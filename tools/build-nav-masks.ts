/**
 * Regenerates src/content/nav-masks.ts from the area artwork.
 *
 * The hand-traced polygons in navigation.ts say roughly where the ground is;
 * the painting says exactly. This walks outward from the player's spawn,
 * accepting neighbouring cells whose colour continues the surface it is
 * standing on, and refusing to leave the traced region. The result is a mask
 * that hugs the painted walkways: no more strolling over chasms, and no more
 * creatures stranded off the path.
 *
 *   npm run build:nav
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { AREAS } from '../src/content/areas';
import { NAVIGATION, CELL, MASK_COLS, MASK_ROWS } from '../src/content/navigation';
import type { NavPoint } from '../src/content/navigation';

interface Bitmap {
  width: number;
  height: number;
  data: Uint8Array; // RGB triplets
}

/** Minimal decoder for the 8-bit RGB, non-interlaced PNGs this game ships. */
function decodePng(path: string): Bitmap {
  const file = readFileSync(path);
  let offset = 8; // skip signature
  const idat: Buffer[] = [];
  let width = 0;
  let height = 0;

  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString('ascii', offset + 4, offset + 8);
    const body = file.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const bitDepth = body[8];
      const colourType = body[9];
      const interlace = body[12];
      if (bitDepth !== 8 || colourType !== 2 || interlace !== 0) {
        throw new Error(`${path}: expected 8-bit RGB non-interlaced PNG`);
      }
    } else if (type === 'IDAT') {
      idat.push(body);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 3;
  const out = new Uint8Array(stride * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++]!;
    const rowStart = y * stride;
    const prevStart = rowStart - stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[pos++]!;
      const left = x >= 3 ? out[rowStart + x - 3]! : 0;
      const up = y > 0 ? out[prevStart + x]! : 0;
      const upLeft = y > 0 && x >= 3 ? out[prevStart + x - 3]! : 0;
      let recon: number;
      switch (filter) {
        case 0:
          recon = value;
          break;
        case 1:
          recon = value + left;
          break;
        case 2:
          recon = value + up;
          break;
        case 3:
          recon = value + ((left + up) >> 1);
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          recon = value + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default:
          throw new Error(`${path}: unknown PNG filter ${filter}`);
      }
      out[rowStart + x] = recon & 0xff;
    }
  }
  return { width, height, data: out };
}

/* ------------------------------------------------------------------ */

const p = (x: number, y: number): NavPoint => ({ x, y });

function isInPolygon(point: NavPoint, points: NavPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!;
    const b = points[j]!;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToSegment(point: NavPoint, a: NavPoint, b: NavPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy))
  );
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/** The traced region, widened so the painting can extend the edges a little. */
function inTracedRegion(areaId: string, point: NavPoint, grow: number): boolean {
  const nav = NAVIGATION[areaId];
  if (!nav) return false;

  const inZone = (nav.zones ?? []).some((zone) => {
    if (isInPolygon(point, zone.points)) return true;
    for (let i = 0; i < zone.points.length; i++) {
      const a = zone.points[i]!;
      const b = zone.points[(i + 1) % zone.points.length]!;
      if (distanceToSegment(point, a, b) <= grow) return true;
    }
    return false;
  });
  const onPath = (nav.paths ?? []).some((path) => {
    for (let i = 1; i < path.points.length; i++) {
      if (distanceToSegment(point, path.points[i - 1]!, path.points[i]!) <= path.width / 2 + grow) {
        return true;
      }
    }
    return false;
  });
  if (!inZone && !onPath) return false;

  // Blockers stay blocked, shrunk by the same tolerance so their edges are usable.
  return !(nav.blockers ?? []).some((blocker) => isInPolygon(point, blocker.points));
}

/* ------------------------------------------------------------------ */

interface AreaTuning {
  /** Colour distance allowed between neighbouring cells of the same surface. */
  step?: number;
  /** Cells darker than this are treated as void rather than floor. */
  minLuma?: number;
  /** How far the painting may extend past the traced outline. */
  grow?: number;
}

const TUNING: Record<string, AreaTuning> = {
  lumbridge: { step: 52 },
  varrock: { step: 46, minLuma: 18 },
  falador: { step: 50 },
  'draynor-manor': { step: 46, minLuma: 16 },
  'god-wars-dungeon': { step: 38, minLuma: 34 },
  'morytania-swamp': { step: 38, minLuma: 20 },
  'tzhaar-city': { step: 40, minLuma: 16 },
  'elvargs-lair': { step: 42, minLuma: 24 },
  'dagannoth-cave': { step: 40, minLuma: 22 },
  'bone-king-graveyard': { step: 40, minLuma: 20 },
  'durotar-azeroth': { step: 46, minLuma: 24 },
  'the-shire': { step: 50 },
};

function main(): void {
  const encoded: string[] = [];

  for (const area of AREAS) {
    const tuning = TUNING[area.id] ?? {};
    const step = tuning.step ?? 44;
    const minLuma = tuning.minLuma ?? 22;
    const grow = tuning.grow ?? 8;

    const image = decodePng(`public${area.backdrop}`);
    const scaleX = image.width / area.mapWidth;
    const scaleY = image.height / area.mapHeight;

    /** Average colour of the artwork under a nav cell. */
    const sample = (col: number, row: number): [number, number, number] => {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let dy = 0; dy < CELL; dy++) {
        for (let dx = 0; dx < CELL; dx++) {
          const sx = Math.min(image.width - 1, Math.floor((col * CELL + dx) * scaleX));
          const sy = Math.min(image.height - 1, Math.floor((row * CELL + dy) * scaleY));
          const idx = (sy * image.width + sx) * 3;
          r += image.data[idx]!;
          g += image.data[idx + 1]!;
          b += image.data[idx + 2]!;
          n++;
        }
      }
      return [r / n, g / n, b / n];
    };

    const colours: ([number, number, number] | null)[] = new Array(MASK_COLS * MASK_ROWS).fill(
      null
    );
    const allowed = new Uint8Array(MASK_COLS * MASK_ROWS);
    for (let row = 0; row < MASK_ROWS; row++) {
      for (let col = 0; col < MASK_COLS; col++) {
        const id = row * MASK_COLS + col;
        const centre = p(col * CELL + CELL / 2, row * CELL + CELL / 2);
        if (!inTracedRegion(area.id, centre, grow)) continue;
        const colour = sample(col, row);
        const luma = 0.299 * colour[0] + 0.587 * colour[1] + 0.114 * colour[2];
        if (luma < minLuma) continue;
        colours[id] = colour;
        allowed[id] = 1;
      }
    }

    // Region growing from the spawn, plus each creature's footing so separate
    // platforms are covered even when a bridge is only a few pixels wide.
    const walkable = new Uint8Array(MASK_COLS * MASK_ROWS);
    const cellOf = (point: NavPoint): number => {
      const col = Math.max(0, Math.min(MASK_COLS - 1, Math.floor(point.x / CELL)));
      const row = Math.max(0, Math.min(MASK_ROWS - 1, Math.floor(point.y / CELL)));
      return row * MASK_COLS + col;
    };
    const seeds: number[] = [];
    const addSeed = (point: NavPoint): void => {
      // Nudge onto the nearest allowed cell; entity feet sit just off the path.
      for (let radius = 0; radius <= 8; radius++) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const col = Math.floor(point.x / CELL) + dx;
            const row = Math.floor(point.y / CELL) + dy;
            if (col < 0 || col >= MASK_COLS || row < 0 || row >= MASK_ROWS) continue;
            const id = row * MASK_COLS + col;
            if (allowed[id] && !walkable[id]) {
              seeds.push(id);
              return;
            }
          }
        }
      }
    };
    addSeed(area.playerSpawn);
    for (const spawn of area.spawns) addSeed(spawn);
    if (seeds.length === 0) seeds.push(cellOf(area.playerSpawn));

    const queue: number[] = [];
    for (const seed of seeds) {
      if (!allowed[seed] || walkable[seed]) continue;
      walkable[seed] = 1;
      queue.push(seed);
    }
    while (queue.length > 0) {
      const current = queue.pop()!;
      const col = current % MASK_COLS;
      const row = (current - col) / MASK_COLS;
      const here = colours[current]!;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nc = col + dx;
        const nr = row + dy;
        if (nc < 0 || nc >= MASK_COLS || nr < 0 || nr >= MASK_ROWS) continue;
        const next = nr * MASK_COLS + nc;
        if (walkable[next] || !allowed[next]) continue;
        const there = colours[next]!;
        const distance = Math.hypot(here[0] - there[0], here[1] - there[1], here[2] - there[2]);
        if (distance > step) continue;
        walkable[next] = 1;
        queue.push(next);
      }
    }

    /* --- Connectivity repair -------------------------------------------
     * Colour growth stops at painted bridges that are darker or a different
     * material to the platforms they join, which would strand whole courts.
     * Label the components, keep the one holding the spawn, then carve the
     * shortest corridor to every other component through traced ground.
     * Anything still unreachable is erased so nobody can stand on an island.
     */
    const labels = new Int32Array(walkable.length).fill(-1);
    const components: number[][] = [];
    for (let start = 0; start < walkable.length; start++) {
      if (!walkable[start] || labels[start] !== -1) continue;
      const id = components.length;
      const cells: number[] = [];
      const stack = [start];
      labels[start] = id;
      while (stack.length > 0) {
        const current = stack.pop()!;
        cells.push(current);
        const col = current % MASK_COLS;
        const row = (current - col) / MASK_COLS;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nc = col + dx;
          const nr = row + dy;
          if (nc < 0 || nc >= MASK_COLS || nr < 0 || nr >= MASK_ROWS) continue;
          const next = nr * MASK_COLS + nc;
          if (!walkable[next] || labels[next] !== -1) continue;
          labels[next] = id;
          stack.push(next);
        }
      }
      components.push(cells);
    }

    const spawnCell = cellOf(area.playerSpawn);
    let mainLabel = labels[spawnCell];
    if (mainLabel === -1) {
      // Spawn landed in the tolerance band; take the nearest labelled cell.
      let best = -1;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < labels.length; i++) {
        if (labels[i] === -1) continue;
        const col = i % MASK_COLS;
        const row = (i - col) / MASK_COLS;
        const distance = Math.hypot(
          col * CELL - area.playerSpawn.x,
          row * CELL - area.playerSpawn.y
        );
        if (distance < bestDistance) {
          best = i;
          bestDistance = distance;
        }
      }
      mainLabel = best >= 0 ? labels[best]! : -1;
    }

    /** Cells of components that hold a creature or NPC come first. */
    const occupied = new Set<number>();
    for (const spawn of area.spawns) {
      let nearest = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < labels.length; i++) {
        if (labels[i] === -1) continue;
        const col = i % MASK_COLS;
        const row = (i - col) / MASK_COLS;
        const distance = Math.hypot(col * CELL - spawn.x, row * CELL - spawn.y);
        if (distance < nearestDistance) {
          nearest = i;
          nearestDistance = distance;
        }
      }
      if (nearest >= 0 && nearestDistance <= 90) occupied.add(labels[nearest]!);
    }

    const order = components
      .map((cells, id) => ({ id, cells }))
      .filter((component) => component.id !== mainLabel)
      .sort((a, b) => {
        const aOccupied = occupied.has(a.id) ? 0 : 1;
        const bOccupied = occupied.has(b.id) ? 0 : 1;
        return aOccupied - bOccupied || b.cells.length - a.cells.length;
      });

    const connected = new Set<number>([mainLabel]);
    for (const component of order) {
      const target = new Set(component.cells);
      // Breadth-first over traced ground, starting from everything reachable.
      const from = new Int32Array(walkable.length).fill(-2);
      const queue: number[] = [];
      for (let i = 0; i < walkable.length; i++) {
        if (walkable[i] && connected.has(labels[i]!)) {
          from[i] = -1;
          queue.push(i);
        }
      }
      let reached = -1;
      for (let head = 0; head < queue.length && reached === -1; head++) {
        const current = queue[head]!;
        const col = current % MASK_COLS;
        const row = (current - col) / MASK_COLS;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nc = col + dx;
          const nr = row + dy;
          if (nc < 0 || nc >= MASK_COLS || nr < 0 || nr >= MASK_ROWS) continue;
          const next = nr * MASK_COLS + nc;
          if (from[next] !== -2 || !allowed[next]) continue;
          from[next] = current;
          if (target.has(next)) {
            reached = next;
            break;
          }
          queue.push(next);
        }
      }

      if (reached === -1) {
        // No corridor exists inside the traced region: erase the island.
        for (const cell of component.cells) walkable[cell] = 0;
        continue;
      }

      let cursor = reached;
      while (cursor >= 0) {
        walkable[cursor] = 1;
        const col = cursor % MASK_COLS;
        const row = (cursor - col) / MASK_COLS;
        // Widen the corridor so it is comfortable to walk, staying in-region.
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nc = col + dc;
            const nr = row + dr;
            if (nc < 0 || nc >= MASK_COLS || nr < 0 || nr >= MASK_ROWS) continue;
            const near = nr * MASK_COLS + nc;
            if (allowed[near]) walkable[near] = 1;
          }
        }
        cursor = from[cursor]!;
      }
      connected.add(component.id);
      for (const cell of component.cells) labels[cell] = mainLabel;
    }

    // Run-length encode: alternating blocked/walkable counts in base 36.
    const runs: number[] = [];
    let value = 0;
    let run = 0;
    for (let i = 0; i < walkable.length; i++) {
      const bit = walkable[i]!;
      if (bit === value) {
        run++;
      } else {
        runs.push(run);
        value = bit;
        run = 1;
      }
    }
    runs.push(run);
    const covered = walkable.reduce((sum, bit) => sum + bit, 0);
    console.log(
      `${area.id.padEnd(22)} ${String(covered).padStart(6)} cells walkable ` +
        `(${((covered / walkable.length) * 100).toFixed(1)}% of map, ${runs.length} runs)`
    );
    encoded.push(`  '${area.id}':\n    '${runs.map((n) => n.toString(36)).join(',')}',`);
  }

  const file = `/**
 * Walkable ground per area, generated from the artwork by tools/build-nav-masks.ts.
 * Do not hand-edit: adjust the traced regions in navigation.ts and re-run
 * \`npm run build:nav\`.
 *
 * Each entry is a run-length encoding over a ${MASK_COLS}x${MASK_ROWS} grid of
 * ${CELL}px cells, alternating blocked/walkable, counts in base 36.
 */
export const NAV_MASKS: Record<string, string> = {
${encoded.join('\n')}
};
`;
  writeFileSync('src/content/nav-masks.ts', file);
  console.log('\nwrote src/content/nav-masks.ts');
}

main();
