import type { EquipmentLoadout, EquipmentSlot } from '../engine/types';

/** Pokemon-style 2-frame idle: bounce up/down */
export function getIdleFrame(globalFrame: number, entityId: string): 0 | 1 {
  const speed =
    entityId === 'goblin-general' ||
    entityId === 'varrock-general' ||
    entityId === 'sir-kitbreaker' ||
    entityId === 'general-graardor' ||
    entityId === 'commander-zilyana' ||
    entityId === 'kril-tsutsaroth' ||
    entityId === 'kreearra' ||
    entityId === 'tztok-jad' ||
    entityId === 'elvarg' ||
    entityId === 'dagannoth-rex' ||
    entityId === 'bones-skeleton-king' ||
    entityId === 'high-overlord-saurfang' ||
    entityId === 'orc-king-thrall'
      ? 18
      : 22;
  return Math.floor(globalFrame / speed) % 2 === 0 ? 0 : 1;
}

export function getBounceDy(frame: 0 | 1): number {
  // A restrained two-pixel weight shift keeps the requested idle motion
  // without making the higher-detail figures float above the environment.
  return frame === 0 ? 0 : -2;
}

type Pixel = string; // hex color or transparent ''

interface SpriteSheet {
  w: number;
  h: number;
  /** row-major pixels, '' = transparent */
  frames: [Pixel[][], Pixel[][]];
}

interface PixelPainter {
  pixel(x: number, y: number, color: string): void;
  rect(x: number, y: number, width: number, height: number, color: string): void;
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string): void;
  polygon(points: [number, number][], color: string): void;
  line(x0: number, y0: number, x1: number, y1: number, color: string, thickness?: number): void;
}

/** Small raster painter used for the higher-detail original character sheets. */
function paintFrame(width: number, height: number, draw: (painter: PixelPainter) => void): Pixel[][] {
  const frame: Pixel[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => ''));
  const pixel = (x: number, y: number, color: string): void => {
    if (x >= 0 && x < width && y >= 0 && y < height) frame[y]![x] = color;
  };
  const rect = (x: number, y: number, w: number, h: number, color: string): void => {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) pixel(col, row, color);
    }
  };
  const ellipse = (cx: number, cy: number, rx: number, ry: number, color: string): void => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / Math.max(1, rx);
        const dy = (y - cy) / Math.max(1, ry);
        if (dx * dx + dy * dy <= 1) pixel(x, y, color);
      }
    }
  };
  const polygon = (points: [number, number][], color: string): void => {
    const minX = Math.floor(Math.min(...points.map(([x]) => x)));
    const maxX = Math.ceil(Math.max(...points.map(([x]) => x)));
    const minY = Math.floor(Math.min(...points.map(([, y]) => y)));
    const maxY = Math.ceil(Math.max(...points.map(([, y]) => y)));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i]!;
          const b = points[j]!;
          if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) {
            inside = !inside;
          }
        }
        if (inside) pixel(x, y, color);
      }
    }
  };
  const line = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string,
    thickness = 1
  ): void => {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const endX = Math.round(x1);
    const endY = Math.round(y1);
    const dx = Math.abs(endX - x);
    const sx = x < endX ? 1 : -1;
    const dy = -Math.abs(endY - y);
    const sy = y < endY ? 1 : -1;
    let error = dx + dy;
    while (true) {
      const radius = Math.floor((thickness - 1) / 2);
      rect(x - radius, y - radius, thickness, thickness, color);
      if (x === endX && y === endY) break;
      const doubled = 2 * error;
      if (doubled >= dy) {
        error += dy;
        x += sx;
      }
      if (doubled <= dx) {
        error += dx;
        y += sy;
      }
    }
  };
  draw({ pixel, rect, ellipse, polygon, line });
  return frame;
}

/**
 * Character-grid painter for hand-authored sheets. One character per pixel,
 * '.' transparent, every other key looked up in `palette`. Shapes are drawn
 * without contours: `outlineFrame` adds the dark edge afterwards, which keeps
 * the interior from drowning in black at these sprite sizes.
 */
function paintGrid(rows: string[], palette: Record<string, string>): Pixel[][] {
  const width = Math.max(...rows.map((row) => row.length));
  return rows.map((row) =>
    Array.from({ length: width }, (_, x) => {
      const key = row[x] ?? '.';
      if (key === '.' || key === ' ') return '';
      const color = palette[key];
      if (!color) throw new Error(`Unmapped sprite pixel '${key}'`);
      return color;
    })
  );
}

/** Paints `color` into every transparent pixel touching a filled one. */
function outlineFrame(frame: Pixel[][], color: string = INK): Pixel[][] {
  const height = frame.length;
  const width = frame[0]?.length ?? 0;
  const filled = frame.map((row) => row.map((pixel) => pixel !== ''));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (filled[y]![x]) continue;
      const touching =
        filled[y - 1]?.[x] || filled[y + 1]?.[x] || filled[y]![x - 1] || filled[y]![x + 1];
      if (touching) frame[y]![x] = color;
    }
  }
  return frame;
}

/** Deep copy, so a composited frame never mutates the shared base art. */
function clonePixelFrame(frame: Pixel[][]): Pixel[][] {
  return frame.map((row) => [...row]);
}

const frameCanvasCache = new WeakMap<Pixel[][], HTMLCanvasElement>();

function lightPixel(color: string, factor: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const value = Number.parseInt(color.slice(1), 16);
  const channel = (shift: number): number =>
    Math.max(0, Math.min(255, Math.round(((value >> shift) & 0xff) * factor)));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

function getFrameCanvas(frame: Pixel[][]): HTMLCanvasElement {
  const cached = frameCanvasCache.get(frame);
  if (cached) return cached;

  const height = frame.length;
  const width = frame[0]?.length ?? 0;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = frame[y]![x]!;
        if (!color) continue;
        // Upper-left key light and lower-right falloff give every native pixel
        // sheet a coherent three-quarter volume before environmental grading.
        const horizontal = width > 1 ? x / (width - 1) : 0.5;
        const vertical = height > 1 ? y / (height - 1) : 0.5;
        const light = 1.1 - horizontal * 0.16 - vertical * 0.08;
        ctx.fillStyle = lightPixel(color, light);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  frameCanvasCache.set(frame, canvas);
  return canvas;
}

function drawPixelFrame(
  ctx: CanvasRenderingContext2D,
  frame: Pixel[][],
  cx: number,
  footY: number,
  scale: number,
  facing: -1 | 1 = 1
): void {
  const h = frame.length;
  const w = frame[0]?.length ?? 0;
  const drawWidth = Math.round(w * scale);
  const drawHeight = Math.round(h * scale);
  const left = Math.round(cx - drawWidth / 2);
  const top = footY - h * scale;
  const source = getFrameCanvas(frame);
  ctx.imageSmoothingEnabled = false;
  if (facing === -1) {
    ctx.save();
    ctx.translate(Math.round(cx * 2), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, left, Math.round(top), drawWidth, drawHeight);
    ctx.restore();
  } else {
    ctx.drawImage(source, left, Math.round(top), drawWidth, drawHeight);
  }
}

const INK = '#17120d';
const SKIN = '#d6a06e';
const SKIN_SHADE = '#a96f49';
const SKIN_LIGHT = '#efc08b';

const GOBLIN = {
  skin: '#609447',
  shade: '#355f2f',
  light: '#8aba61',
  deep: '#203d24',
  eye: '#f4d84b',
  tusk: '#eadbb8',
  leather: '#724726',
  darkLeather: '#402817',
  red: '#9f3027',
  iron: '#89939a',
  ironLight: '#c4ccd0',
  brass: '#c59635',
};

function makeGoblin(size: 'small' | 'chief'): SpriteSheet {
  if (size === 'small') {
    const frame = (pose: 0 | 1): Pixel[][] =>
      paintFrame(20, 26, (p) => {
        const stride = pose === 0 ? 0 : 1;

        // Crooked legs and oversized feet establish the goblin silhouette.
        p.rect(5 - stride, 19, 5, 6, INK);
        p.rect(11 + stride, 19, 5, 6, INK);
        p.rect(6 - stride, 19, 3, 4, GOBLIN.leather);
        p.rect(12 + stride, 19, 3, 4, GOBLIN.leather);
        p.rect(3 - stride, 23, 6, 3, GOBLIN.darkLeather);
        p.rect(12 + stride, 23, 6, 3, GOBLIN.darkLeather);

        // Long arms; the right hand carries a chipped iron cleaver.
        p.line(5, 14, 2 + stride, 21, INK, 5);
        p.line(5, 14, 2 + stride, 20, GOBLIN.shade, 3);
        p.line(15, 14, 17 - stride, 20, INK, 5);
        p.line(15, 14, 17 - stride, 19, GOBLIN.skin, 3);
        p.line(17, 18, 19, 24, GOBLIN.darkLeather, 2);
        p.polygon([[18, 17], [19, 14], [17, 12], [16, 17]], GOBLIN.iron);
        p.pixel(18, 14, GOBLIN.ironLight);

        // Hunched leather-vest torso.
        p.polygon([[5, 12], [15, 12], [18, 18], [14, 21], [6, 21], [2, 18]], INK);
        p.polygon([[6, 13], [14, 13], [16, 18], [13, 20], [7, 20], [4, 18]], GOBLIN.skin);
        p.polygon([[6, 13], [9, 13], [9, 19], [6, 19], [4, 17]], GOBLIN.leather);
        p.polygon([[14, 13], [11, 13], [11, 19], [14, 19], [16, 17]], GOBLIN.leather);
        p.rect(6, 18, 9, 2, GOBLIN.darkLeather);
        p.pixel(10, 18, GOBLIN.brass);
        p.polygon([[8, 20], [12, 20], [14, 24], [10, 23], [6, 24]], GOBLIN.red);

        // Wide pointed ears, large jaw, and forward-projecting nose.
        p.polygon([[5, 6], [1, 8], [5, 10]], INK);
        p.polygon([[5, 7], [2, 8], [5, 9]], GOBLIN.deep);
        p.polygon([[15, 4], [19, 6], [15, 11]], INK);
        p.polygon([[15, 5], [19, 6], [15, 9]], GOBLIN.light);
        p.ellipse(10, 8, 6, 7, INK);
        p.ellipse(10, 8, 5, 6, GOBLIN.skin);
        p.rect(6, 10, 9, 4, GOBLIN.skin);
        p.rect(7, 12, 7, 3, GOBLIN.shade);
        p.ellipse(12, 10, 2, 2, GOBLIN.light);

        // Hair ridge, heavy brows, readable eyes, mouth and tusks.
        p.polygon([[5, 4], [7, 1], [9, 3], [11, 0], [12, 4], [15, 5], [12, 6], [7, 6]], GOBLIN.deep);
        p.line(7, 7, 9, 8, GOBLIN.deep, 2);
        p.line(11, 8, 15, 7, GOBLIN.deep, 2);
        p.pixel(8, 8, '#b5a83e');
        p.rect(13, 8, 2, 1, GOBLIN.eye);
        p.pixel(12, 11, GOBLIN.shade);
        p.line(8, 13, 15, 12, INK);
        p.pixel(8, 12, GOBLIN.tusk);
        p.rect(14, 11, 2, 2, GOBLIN.tusk);
      });
    return { w: 20, h: 26, frames: [frame(0), frame(1)] };
  }

  // Grubeater: an original hulking orc-goblin war-shaman. His broad jaw,
  // iron pauldrons, ritual braids and rune maul create the desired warchief
  // weight without copying any existing franchise character.
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(32, 32, (p) => {
      const sway = pose === 0 ? 0 : -2;

      // Fur mantle and ritual braids behind the body.
      p.polygon([[7, 10], [25, 10], [29, 22], [25, 27], [7, 27], [3, 22]], GOBLIN.deep);
      p.line(9, 8, 7 + sway, 24, INK, 3);
      p.line(9, 9, 7 + sway, 23, GOBLIN.red, 1);
      p.line(23, 8, 25 - sway, 24, INK, 3);
      p.line(23, 9, 25 - sway, 23, GOBLIN.red, 1);

      // Rune maul behind his right shoulder.
      p.line(27 + sway, 7, 28, 28, INK, 4);
      p.line(27 + sway, 7, 28, 28, GOBLIN.darkLeather, 2);
      p.rect(23 + sway, 3, 8, 6, INK);
      p.rect(24 + sway, 4, 7, 4, GOBLIN.iron);
      p.rect(25 + sway, 4, 4, 1, GOBLIN.ironLight);
      p.pixel(27 + sway, 6, '#55c7b8');

      // Thick legs, wrapped shins, and broad plated boots.
      p.rect(7 + (pose ? -1 : 0), 23, 7, 8, INK);
      p.rect(19 + (pose ? 1 : 0), 23, 7, 8, INK);
      p.rect(8 + (pose ? -1 : 0), 23, 5, 6, GOBLIN.shade);
      p.rect(20 + (pose ? 1 : 0), 23, 5, 6, GOBLIN.shade);
      p.rect(7 + (pose ? -1 : 0), 26, 6, 2, GOBLIN.red);
      p.rect(20 + (pose ? 1 : 0), 26, 5, 2, GOBLIN.red);
      p.rect(4 + (pose ? -1 : 0), 29, 10, 3, GOBLIN.darkLeather);
      p.rect(19 + (pose ? 1 : 0), 29, 10, 3, GOBLIN.darkLeather);
      p.pixel(6, 29, GOBLIN.brass);
      p.pixel(26, 29, GOBLIN.brass);

      // Massive tapered torso and exposed green arms.
      p.polygon([[7, 12], [25, 12], [29, 21], [24, 26], [9, 26], [3, 21]], INK);
      p.polygon([[8, 13], [24, 13], [27, 21], [22, 24], [10, 24], [5, 21]], GOBLIN.skin);
      p.ellipse(4, 19 + (pose ? -1 : 0), 4, 7, INK);
      p.ellipse(4, 19 + (pose ? -1 : 0), 3, 6, GOBLIN.shade);
      p.ellipse(28, 18 + (pose ? -2 : 0), 4, 7, INK);
      p.ellipse(28, 18 + (pose ? -2 : 0), 3, 6, GOBLIN.skin);
      p.rect(1, 23 + sway / 2, 6, 4, INK);
      p.rect(2, 23 + sway / 2, 4, 3, GOBLIN.light);
      p.rect(26, 22 + sway / 2, 6, 4, INK);
      p.rect(27, 22 + sway / 2, 4, 3, GOBLIN.light);

      // Iron-and-bone shoulder armour, deliberately asymmetrical.
      p.ellipse(6, 13, 6, 4, INK);
      p.ellipse(6, 13, 5, 3, GOBLIN.iron);
      p.rect(2, 12, 2, 3, GOBLIN.tusk);
      p.rect(8, 11, 2, 3, GOBLIN.tusk);
      p.ellipse(26, 13, 6, 4, INK);
      p.ellipse(26, 13, 5, 3, GOBLIN.iron);
      p.line(23, 12, 29, 14, GOBLIN.ironLight);
      p.pixel(6, 13, GOBLIN.brass);
      p.pixel(26, 13, GOBLIN.brass);

      // Hide chest harness, central clan ring, and red war sash.
      p.line(9, 14, 21, 24, GOBLIN.darkLeather, 3);
      p.line(23, 14, 12, 24, GOBLIN.darkLeather, 3);
      p.ellipse(16, 19, 3, 3, INK);
      p.ellipse(16, 19, 2, 2, GOBLIN.brass);
      p.rect(8, 23, 16, 3, GOBLIN.darkLeather);
      p.polygon([[12, 25], [21, 25], [23, 31], [17, 29], [11, 31]], GOBLIN.red);

      // Broad head with pointed ears and a heavy square lower jaw.
      p.polygon([[9, 6], [2, 8], [9, 11]], INK);
      p.polygon([[9, 7], [4, 8], [9, 10]], GOBLIN.deep);
      p.polygon([[23, 4], [31, 6], [23, 12]], INK);
      p.polygon([[23, 5], [30, 6], [23, 10]], GOBLIN.light);
      p.ellipse(16, 8, 8, 8, INK);
      p.ellipse(16, 8, 7, 7, GOBLIN.skin);
      p.rect(10, 10, 13, 6, GOBLIN.skin);
      p.polygon([[10, 12], [22, 12], [21, 17], [12, 17], [9, 15]], GOBLIN.shade);
      p.ellipse(18, 11, 3, 3, GOBLIN.light);

      // Shamanic topknot and facial war paint.
      p.polygon([[9, 4], [11, 1], [14, 3], [16, 0], [18, 3], [22, 1], [23, 5], [20, 7], [12, 6]], GOBLIN.deep);
      p.line(11, 7, 14, 8, GOBLIN.deep, 2);
      p.line(18, 8, 23, 7, GOBLIN.deep, 2);
      p.pixel(13, 8, '#b5a83e');
      p.rect(20, 8, 2, 1, GOBLIN.eye);
      p.pixel(18, 11, GOBLIN.shade);
      p.line(13, 14, 22, 13, INK, 2);
      p.rect(11, 13, 2, 3, GOBLIN.tusk);
      p.rect(21, 12, 2, 4, GOBLIN.tusk);
      p.line(16, 5, 16, 8, GOBLIN.red, 2);
      p.pixel(14, 6, GOBLIN.red);
      p.pixel(18, 6, GOBLIN.red);
    });
  return { w: 32, h: 32, frames: [frame(0), frame(1)] };
}

function makeKnight(variant: 'guard' | 'archer' | 'general'): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(23, 28, (p) => {
      const silver = '#bcc5ca';
      const light = '#edf2f3';
      const shade = '#727f87';
      const blue = '#315c9a';
      const blueDark = '#1e385f';
      const stride = pose === 0 ? 0 : 1;

      if (variant === 'general') {
        p.polygon([[5, 10], [18, 10], [21, 25], [15, 23], [11, 27], [3, 24]], '#7d2024');
      }

      // Armoured legs and sabatons.
      p.rect(6 - stride, 20, 5, 7, INK);
      p.rect(13 + stride, 20, 5, 7, INK);
      p.rect(7 - stride, 20, 3, 6, shade);
      p.rect(14 + stride, 20, 3, 6, silver);
      p.rect(4 - stride, 25, 7, 3, shade);
      p.rect(13 + stride, 25, 7, 3, shade);

      // Plate torso with blue tabard and articulated arms.
      p.polygon([[5, 10], [18, 10], [21, 19], [17, 22], [6, 22], [2, 19]], INK);
      p.polygon([[6, 11], [17, 11], [19, 18], [16, 21], [7, 21], [4, 18]], silver);
      p.polygon([[9, 11], [14, 11], [15, 21], [8, 21]], blue);
      p.rect(10, 13, 3, 5, light);
      p.rect(11, 14, 1, 3, blueDark);
      p.line(4, 13, 1 + stride, 21, INK, 5);
      p.line(4, 13, 2 + stride, 20, shade, 3);
      p.line(19, 13, 21 - stride, 21, INK, 5);
      p.line(19, 13, 20 - stride, 20, silver, 3);

      // Distinct equipment silhouettes.
      if (variant === 'archer') {
        p.line(20, 7, 22, 24, '#7a4e28', 2);
        p.line(20, 7, 17, 15, '#d3c19e');
        p.line(17, 15, 22, 24, '#d3c19e');
        p.line(3, 17, 18, 14, '#7a4e28');
        p.pixel(18, 14, light);
      } else {
        p.line(20, 17, 22, 27, '#604023', 2);
        p.line(21, 17, 21, 7, light, 2);
        p.pixel(21, 6, '#dfe9eb');
        if (variant === 'general') {
          p.polygon([[1, 13], [6, 11], [7, 19], [2, 22]], blueDark);
          p.polygon([[2, 14], [5, 13], [5, 18], [3, 20]], blue);
        }
      }

      // Proper helmet volume, visor slit, nose guard and plume.
      p.ellipse(11, 7, 7, 7, INK);
      p.ellipse(11, 7, 6, 6, silver);
      p.rect(5, 6, 13, 5, shade);
      p.rect(6, 7, 11, 2, INK);
      p.rect(8, 7, 2, 1, '#47758c');
      p.rect(14, 7, 3, 1, '#8cd4ef');
      p.rect(13, 7, 2, 5, light);
      p.rect(6, 4, 10, 2, light);
      p.pixel(7, 5, silver);
      if (variant === 'general') {
        p.polygon([[9, 1], [11, 0], [13, 2], [16, 1], [15, 5], [9, 5]], '#c9a02e');
      } else {
        p.rect(10, 1, 3, 4, blue);
        p.pixel(11, 0, light);
      }
    });
  return { w: 23, h: 28, frames: [frame(0), frame(1)] };
}

function makeFaladorKnight(rank: 'guard' | 'squire' | 'kitbreaker'): SpriteSheet {
  const boss = rank === 'kitbreaker';
  const squire = rank === 'squire';
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(28, 32, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const white = '#d8d5c8';
      const whiteLight = '#f4f1df';
      const whiteShade = '#8f938f';
      const blue = '#315e9c';
      const blueDark = '#1e355f';
      const gold = '#d2a83d';
      const goldLight = '#f0d06b';

      if (boss) {
        // Deep blue commander's mantle behind the plate.
        p.polygon([[5, 9], [23, 9], [27, 27], [20, 25], [14, 31], [3, 27]], INK);
        p.polygon([[6, 10], [22, 10], [25, 26], [19, 24], [14, 29], [5, 26]], blueDark);
      }

      // Articulated greaves and broad sabatons.
      p.rect(7 - stride, 23, 7, 8, INK);
      p.rect(16 + stride, 23, 7, 8, INK);
      p.rect(8 - stride, 23, 5, 6, whiteShade);
      p.rect(17 + stride, 23, 5, 6, white);
      p.rect(5 - stride, 29, 9, 3, INK);
      p.rect(16 + stride, 29, 10, 3, INK);
      p.rect(7 - stride, 29, 7, 2, whiteShade);
      p.rect(17 + stride, 29, 8, 2, white);

      // Near and far arms with gold-rimmed white pauldrons.
      p.line(6, 14, 2 + stride, 23, INK, 6);
      p.line(6, 14, 3 + stride, 22, whiteShade, 4);
      p.line(22, 14, 25 - stride, 23, INK, 6);
      p.line(22, 14, 24 - stride, 22, white, 4);
      p.ellipse(6, 14, 6, 4, INK);
      p.ellipse(6, 14, 5, 3, whiteShade);
      p.line(2, 14, 9, 12, gold, 2);
      p.ellipse(22, 14, 6, 4, INK);
      p.ellipse(22, 14, 5, 3, white);
      p.line(19, 12, 26, 14, goldLight, 2);

      // White plate cuirass and blue city tabard.
      p.polygon([[6, 11], [22, 11], [25, 21], [21, 25], [8, 25], [3, 21]], INK);
      p.polygon([[7, 12], [21, 12], [23, 20], [20, 23], [9, 23], [5, 20]], white);
      p.polygon([[11, 12], [18, 12], [19, 25], [10, 25]], blue);
      p.polygon([[11, 14], [14, 13], [14, 23], [11, 24]], blueDark);
      p.rect(13, 15, 3, 6, whiteLight);
      p.pixel(14, 16, gold);
      p.rect(8, 22, 13, 3, gold);
      p.rect(10, 23, 9, 2, blueDark);

      if (boss) {
        // Kitbreaker's two-handed square war hammer.
        const lift = pose === 0 ? 0 : -2;
        p.line(24 + lift, 7, 25, 29, INK, 4);
        p.line(24 + lift, 7, 25, 29, '#67482e', 2);
        p.rect(20 + lift, 3, 8, 7, INK);
        p.rect(21 + lift, 4, 7, 5, whiteShade);
        p.rect(22 + lift, 4, 4, 2, whiteLight);
        p.pixel(24 + lift, 7, gold);
        // Small heater shield on the far arm.
        p.polygon([[0, 15], [7, 13], [8, 21], [4, 26], [0, 22]], INK);
        p.polygon([[1, 16], [6, 15], [6, 20], [4, 24], [1, 21]], blue);
        p.pixel(4, 18, goldLight);
      } else if (squire) {
        // Squires drill with a short training sword and a wooden buckler.
        p.line(24, 12, 26 - stride, 26, INK, 4);
        p.line(24, 12, 26 - stride, 26, whiteShade, 2);
        p.rect(23, 10, 4, 3, INK);
        p.rect(23, 11, 3, 2, '#7c5935');
        p.ellipse(2, 19, 4, 5, INK);
        p.ellipse(2, 19, 3, 4, '#7c5935');
        p.pixel(2, 19, gold);
      } else {
        // Guard spear and blue-white kite shield.
        p.line(25, 4, 25 - stride, 31, INK, 3);
        p.line(25, 4, 25 - stride, 31, '#765538');
        p.polygon([[23, 4], [25, 0], [27, 4]], whiteLight);
        p.polygon([[0, 14], [7, 12], [8, 21], [4, 26], [0, 22]], INK);
        p.polygon([[1, 15], [6, 14], [6, 20], [4, 24], [1, 21]], white);
        p.polygon([[1, 15], [4, 15], [4, 23], [1, 21]], blue);
        p.pixel(4, 17, gold);
      }

      // Tall white helm, blue visor slit and gold crest.
      p.ellipse(14, 8, boss ? 8 : 7, 8, INK);
      p.ellipse(14, 8, boss ? 7 : 6, 7, white);
      p.rect(boss ? 7 : 8, 7, boss ? 15 : 13, 5, whiteShade);
      p.rect(8, 8, 13, 2, INK);
      p.rect(10, 8, 3, 1, '#5e89b6');
      p.rect(17, 8, 3, 1, '#9cc8df');
      p.rect(15, 8, 2, 5, whiteLight);
      p.rect(9, 5, 11, 2, whiteLight);
      if (boss) {
        p.polygon([[10, 4], [11, 0], [14, 3], [17, 0], [19, 4], [18, 6], [10, 6]], gold);
        p.pixel(14, 2, goldLight);
      } else if (squire) {
        // No crest yet — squires wear an unadorned trainee coif.
        p.rect(8, 4, 13, 2, whiteShade);
      } else {
        p.rect(13, 1, 3, 5, blue);
        p.pixel(14, 0, goldLight);
      }
    });
  return { w: 28, h: 32, frames: [frame(0), frame(1)] };
}

function makeDwarvenMiner(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(24, 25, (p) => {
      const sway = pose === 0 ? 0 : 2;
      const beard = '#a85e2f';
      const beardLight = '#d18447';
      const steel = '#858d8c';
      const steelLight = '#c0c7c2';
      const shirt = '#596a4a';
      const leather = '#67462e';

      // Pickaxe behind the compact body.
      p.line(3 + sway, 3, 20 - sway, 22, INK, 3);
      p.line(3 + sway, 3, 20 - sway, 22, '#735034');
      p.line(0 + sway, 5, 8 + sway, 1, INK, 3);
      p.line(1 + sway, 5, 8 + sway, 2, steelLight);

      // Short legs and heavy mining boots.
      p.rect(5 - (pose ? 1 : 0), 18, 7, 6, INK);
      p.rect(13 + (pose ? 1 : 0), 18, 7, 6, INK);
      p.rect(6 - (pose ? 1 : 0), 18, 5, 4, leather);
      p.rect(14 + (pose ? 1 : 0), 18, 5, 4, '#7a5637');
      p.rect(3 - (pose ? 1 : 0), 22, 9, 3, INK);
      p.rect(13 + (pose ? 1 : 0), 22, 9, 3, INK);

      // Stocky work shirt, belt, forearms and gloves.
      p.polygon([[4, 10], [20, 10], [23, 18], [18, 21], [6, 21], [1, 18]], INK);
      p.polygon([[5, 11], [19, 11], [21, 17], [17, 19], [7, 19], [3, 17]], shirt);
      p.line(4, 13, 1, 20, INK, 5);
      p.line(4, 13, 2, 19, SKIN_SHADE, 3);
      p.line(20, 13, 23, 20, INK, 5);
      p.line(20, 13, 22, 19, SKIN, 3);
      p.rect(5, 17, 14, 3, leather);
      p.pixel(12, 18, '#c89a3c');

      // Broad dwarf face, bright eyes and enormous forked beard.
      p.ellipse(12, 8, 7, 7, INK);
      p.ellipse(12, 8, 6, 6, SKIN);
      p.pixel(9, 7, '#657d83');
      p.pixel(15, 7, '#a8d4db');
      p.pixel(14, 9, SKIN_SHADE);
      p.polygon([[6, 10], [18, 10], [19, 18], [14, 16], [12, 20], [10, 16], [5, 18]], INK);
      p.polygon([[7, 10], [17, 10], [17, 16], [14, 14], [12, 18], [10, 14], [7, 16]], beard);
      p.pixel(9, 11, beardLight);
      p.pixel(15, 12, beardLight);

      // Riveted miner helmet and lamp.
      p.ellipse(12, 4, 7, 4, INK);
      p.ellipse(12, 4, 6, 3, steel);
      p.rect(6, 4, 13, 3, steel);
      p.rect(7, 4, 11, 1, steelLight);
      p.ellipse(12, 3, 2, 2, INK);
      p.pixel(12, 3, '#f2d75c');
    });
  return { w: 24, h: 25, frames: [frame(0), frame(1)] };
}

function makeTiffy(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(22, 29, (p) => {
      const blue = '#3b6698';
      const blueDark = '#243d61';
      const white = '#dedbcf';
      const gold = '#d4a83d';
      const beard = '#d2d0c8';
      const sway = pose === 0 ? 0 : 1;

      // Walking cane behind the near arm.
      p.line(19 - sway, 13, 20 - sway, 28, INK, 3);
      p.line(19 - sway, 13, 20 - sway, 28, '#755031');
      p.line(18 - sway, 13, 21 - sway, 12, gold, 2);

      p.rect(5, 21, 5, 7, INK);
      p.rect(12, 21, 5, 7, INK);
      p.rect(6, 21, 3, 5, blueDark);
      p.rect(13, 21, 3, 5, blue);
      p.rect(3, 26, 7, 3, INK);
      p.rect(12, 26, 7, 3, INK);

      // Formal white-and-blue knight-statesman coat.
      p.polygon([[5, 12], [17, 12], [20, 21], [16, 24], [6, 24], [2, 21]], INK);
      p.polygon([[6, 13], [16, 13], [18, 20], [15, 22], [7, 22], [4, 20]], white);
      p.polygon([[8, 13], [13, 13], [15, 23], [7, 23]], blue);
      p.line(5, 14, 2, 22, INK, 4);
      p.line(5, 14, 3, 21, white, 2);
      p.line(17, 14, 19, 22, INK, 4);
      p.line(17, 14, 18, 21, white, 2);
      p.ellipse(5, 13, 4, 3, gold);
      p.ellipse(17, 13, 4, 3, gold);
      p.rect(6, 20, 11, 2, blueDark);
      p.pixel(11, 20, gold);

      // Bald elderly face, calm eyes, moustache and trimmed white beard.
      p.ellipse(11, 8, 5, 6, INK);
      p.ellipse(11, 8, 4, 5, SKIN);
      p.pixel(9, 7, '#61777d');
      p.pixel(14, 7, '#9ec1c7');
      p.pixel(13, 9, SKIN_SHADE);
      p.line(9, 11, 12, 12, beard, 2);
      p.line(12, 12, 15, 11, beard, 2);
      p.polygon([[8, 12], [16, 12], [15, 17], [12, 15], [10, 17]], beard);
      p.pixel(10, 3, SKIN_LIGHT);
      p.pixel(11, 3, SKIN_LIGHT);
      p.rect(8, 4, 7, 2, '#bdbbb5');
    });
  return { w: 22, h: 29, frames: [frame(0), frame(1)] };
}

function makeCountDraynor(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(24, 31, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const black = '#211a25';
      const blackLight = '#403343';
      const crimson = '#7d2432';
      const crimsonLight = '#a83d49';
      const pale = '#d9ced2';
      const paleShade = '#9e8d98';

      // Long split cape and polished boots.
      p.polygon([[4, 9], [19, 9], [23, 29], [15, 26], [11, 31], [1, 28]], INK);
      p.polygon([[5, 10], [18, 10], [21, 27], [15, 25], [11, 29], [3, 27]], black);
      p.polygon([[5, 11], [10, 12], [8, 27], [3, 27]], crimson);
      p.rect(6 - stride, 22, 5, 8, INK);
      p.rect(14 + stride, 22, 5, 8, INK);
      p.rect(7 - stride, 23, 3, 5, '#352a35');
      p.rect(15 + stride, 23, 3, 5, blackLight);
      p.rect(4 - stride, 28, 7, 3, INK);
      p.rect(14 + stride, 28, 7, 3, INK);

      // Tailored maroon coat, high collar, and aristocratic clasp.
      p.line(5, 13, 2 + stride, 22, INK, 5);
      p.line(5, 13, 3 + stride, 21, crimson, 3);
      p.line(19, 13, 22 - stride, 22, INK, 5);
      p.line(19, 13, 21 - stride, 21, crimsonLight, 3);
      p.polygon([[5, 11], [19, 11], [21, 22], [16, 25], [8, 25], [3, 22]], INK);
      p.polygon([[6, 12], [18, 12], [19, 21], [15, 23], [9, 23], [5, 21]], crimson);
      p.polygon([[6, 12], [11, 13], [10, 23], [8, 23], [5, 20]], '#541a29');
      p.polygon([[8, 11], [12, 16], [16, 11], [18, 13], [12, 18], [6, 13]], blackLight);
      p.rect(11, 15, 3, 7, pale);
      p.pixel(12, 17, '#d3ae3d');

      // Pale angular face with red eyes and tiny visible fangs.
      p.ellipse(12, 7, 5, 6, INK);
      p.polygon([[8, 4], [15, 3], [17, 7], [15, 12], [11, 14], [7, 10]], pale);
      p.pixel(9, 7, '#d64b56');
      p.pixel(15, 7, '#ff7780');
      p.pixel(14, 9, paleShade);
      p.line(9, 11, 15, 11, '#633641');
      p.pixel(10, 11, '#f5eee3');
      p.pixel(14, 11, '#f5eee3');
      // Widow's peak and swept black hair.
      p.polygon([[7, 6], [7, 2], [11, 0], [16, 2], [18, 6], [15, 5], [13, 3], [11, 6], [9, 4]], black);
      p.pixel(16, 3, blackLight);
      p.polygon([[5, 9], [2, 12], [7, 14]], black);
      p.polygon([[19, 9], [22, 12], [17, 14]], black);
    });
  return { w: 24, h: 31, frames: [frame(0), frame(1)] };
}

function makeAva(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(25, 31, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const leather = '#65452f';
      const green = '#5b704e';
      const greenLight = '#81926a';
      const brass = '#c49b36';
      const steel = '#899394';
      const deviceRed = '#8d3534';

      // Assembler backpack: gears, attraction vanes and recovered arrows.
      p.rect(1, 10, 8, 15, INK);
      p.rect(2, 11, 6, 13, deviceRed);
      p.rect(3, 13, 4, 5, steel);
      p.ellipse(5, 20, 3, 3, INK);
      p.ellipse(5, 20, 2, 2, brass);
      p.line(3, 10, 0, 4 + stride, steel, 2);
      p.line(7, 10, 10, 2 - stride, steel, 2);
      p.polygon([[0, 3 + stride], [3, 4 + stride], [1, 6 + stride]], '#657f9a');
      p.polygon([[10, 1 - stride], [12, 4 - stride], [9, 4 - stride]], '#9cb0bd');
      p.line(3, 13, 0, 9, '#765538');
      p.pixel(0, 8, '#d5dadd');
      p.line(6, 12, 8, 5, '#765538');
      p.pixel(8, 4, '#d5dadd');

      // Practical trousers, boots, rolled sleeves and leather apron.
      p.rect(7 - stride, 22, 5, 8, INK);
      p.rect(14 + stride, 22, 5, 8, INK);
      p.rect(8 - stride, 22, 3, 6, '#3f4e42');
      p.rect(15 + stride, 22, 3, 6, green);
      p.rect(5 - stride, 28, 7, 3, INK);
      p.rect(14 + stride, 28, 7, 3, INK);
      p.line(7, 14, 4 + stride, 22, INK, 4);
      p.line(7, 14, 5 + stride, 21, SKIN_SHADE, 2);
      p.line(18, 14, 21 - stride, 22, INK, 4);
      p.line(18, 14, 20 - stride, 21, SKIN, 2);
      p.polygon([[7, 12], [18, 12], [21, 22], [17, 24], [8, 24], [4, 21]], INK);
      p.polygon([[8, 13], [17, 13], [19, 21], [16, 22], [9, 22], [6, 21]], green);
      p.polygon([[15, 13], [17, 14], [18, 20], [15, 18]], greenLight);
      p.polygon([[9, 15], [16, 15], [17, 23], [8, 23]], leather);
      p.line(9, 17, 16, 17, '#8a6242');
      p.pixel(12, 20, brass);

      // Alert face, tied-back brown hair and brass workshop goggles.
      p.ellipse(13, 8, 5, 6, INK);
      p.ellipse(13, 8, 4, 5, SKIN);
      p.pixel(11, 8, '#557b84');
      p.pixel(16, 8, '#8bc4c9');
      p.pixel(15, 10, SKIN_SHADE);
      p.pixel(14, 12, '#8a5140');
      p.polygon([[8, 7], [9, 2], [14, 1], [19, 4], [18, 8], [16, 5], [12, 4], [9, 8]], '#593b2b');
      p.rect(16, 4, 5, 3, '#593b2b');
      p.ellipse(20, 6, 2, 3, '#3e2a20');
      p.rect(9, 6, 8, 2, brass);
      p.pixel(11, 6, '#8fd2d7');
      p.pixel(15, 6, '#8fd2d7');
    });
  return { w: 25, h: 31, frames: [frame(0), frame(1)] };
}

function makeGraardor(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(36, 35, (p) => {
      const shift = pose === 0 ? 0 : -2;
      const skin = '#9a673e';
      const skinShade = '#684329';
      const bronze = '#9a7837';
      const bronzeLight = '#d0ae55';
      const armor = '#37343a';
      const red = '#8c302d';

      // Monumental warhammer behind his shoulder.
      p.line(29 + shift, 5, 31, 33, INK, 5);
      p.line(29 + shift, 5, 31, 33, '#654329', 3);
      p.rect(24 + shift, 1, 11, 8, INK);
      p.rect(25 + shift, 2, 10, 6, bronze);
      p.rect(26 + shift, 2, 6, 2, bronzeLight);

      // Huge bowed legs and iron-shod boots.
      p.rect(7 - (pose ? 1 : 0), 25, 9, 9, INK);
      p.rect(21 + (pose ? 1 : 0), 25, 9, 9, INK);
      p.rect(8 - (pose ? 1 : 0), 25, 7, 6, skinShade);
      p.rect(22 + (pose ? 1 : 0), 25, 7, 6, skin);
      p.rect(3 - (pose ? 1 : 0), 31, 13, 4, armor);
      p.rect(20 + (pose ? 1 : 0), 31, 14, 4, armor);
      p.pixel(6, 32, bronze);
      p.pixel(30, 32, bronze);

      // Barrel torso, bare arms and battered black-bronze armour.
      p.ellipse(5, 21, 6, 9, INK);
      p.ellipse(5, 21, 5, 8, skinShade);
      p.ellipse(31, 20 + shift, 6, 9, INK);
      p.ellipse(31, 20 + shift, 5, 8, skin);
      p.rect(1, 26, 8, 5, INK);
      p.rect(2, 26, 6, 4, armor);
      p.rect(28, 25 + shift, 8, 5, INK);
      p.rect(29, 25 + shift, 6, 4, armor);
      p.polygon([[6, 11], [29, 11], [34, 24], [27, 29], [9, 29], [2, 24]], INK);
      p.polygon([[8, 12], [27, 12], [31, 23], [25, 27], [10, 27], [5, 23]], skin);
      p.polygon([[8, 12], [17, 14], [16, 27], [9, 27], [5, 22]], armor);
      p.polygon([[27, 12], [19, 14], [20, 27], [26, 27], [31, 22]], '#4b474d');
      p.line(8, 14, 27, 26, red, 4);
      p.line(27, 14, 10, 26, '#4b2c26', 4);
      p.ellipse(18, 21, 4, 4, INK);
      p.ellipse(18, 21, 3, 3, bronzeLight);

      // Brutish face, tusks and horned war helm.
      p.ellipse(18, 9, 9, 9, INK);
      p.ellipse(18, 9, 8, 8, skin);
      p.rect(11, 10, 15, 6, skin);
      p.polygon([[11, 12], [25, 12], [23, 18], [13, 18]], skinShade);
      p.pixel(14, 9, '#e6c34b');
      p.pixel(22, 9, '#f2dc68');
      p.line(13, 14, 24, 14, INK, 2);
      p.rect(11, 13, 2, 4, '#e6d7b2');
      p.rect(24, 13, 2, 4, '#e6d7b2');
      p.polygon([[10, 8], [7, 2], [12, 5]], INK);
      p.polygon([[11, 7], [8, 2], [13, 5]], bronze);
      p.polygon([[25, 7], [30, 2], [27, 9]], INK);
      p.polygon([[24, 6], [29, 2], [26, 8]], bronzeLight);
      p.rect(11, 4, 15, 4, armor);
      p.pixel(18, 5, red);
    });
  return { w: 36, h: 35, frames: [frame(0), frame(1)] };
}

function makeZilyana(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(34, 36, (p) => {
      const lift = pose === 0 ? 0 : 1;
      const silver = '#c8d3d4';
      const light = '#f3f1dc';
      const blue = '#426fa6';
      const blueDark = '#263f68';
      const gold = '#d7b34b';

      // Layered luminous wings behind the armour.
      p.polygon([[9, 10], [3, 7 - lift], [0, 11], [5, 17], [0, 22], [10, 23]], INK);
      p.polygon([[9, 11], [4, 8 - lift], [2, 11], [7, 16], [2, 20], [10, 21]], light);
      p.line(4, 11, 9, 19, silver, 2);
      p.polygon([[25, 10], [31, 7 + lift], [34, 11], [29, 17], [34, 22], [24, 23]], INK);
      p.polygon([[25, 11], [30, 8 + lift], [32, 11], [27, 16], [32, 20], [24, 21]], '#dce8e7');
      p.line(30, 11, 25, 19, silver, 2);

      // Plate legs and gold-edged boots.
      p.rect(9 - lift, 26, 6, 9, INK);
      p.rect(19 + lift, 26, 6, 9, INK);
      p.rect(10 - lift, 26, 4, 7, silver);
      p.rect(20 + lift, 26, 4, 7, light);
      p.rect(6 - lift, 33, 9, 3, blueDark);
      p.rect(19 + lift, 33, 9, 3, blueDark);
      p.pixel(8, 33, gold);
      p.pixel(26, 33, gold);

      // Slender silver cuirass, blue tabard and sword arm.
      p.line(9, 16, 5 + lift, 25, INK, 5);
      p.line(9, 16, 6 + lift, 24, silver, 3);
      p.line(25, 16, 29 - lift, 25, INK, 5);
      p.line(25, 16, 28 - lift, 24, light, 3);
      p.polygon([[9, 12], [25, 12], [28, 25], [22, 29], [12, 29], [6, 25]], INK);
      p.polygon([[10, 13], [24, 13], [26, 24], [21, 27], [13, 27], [8, 24]], silver);
      p.polygon([[14, 13], [20, 13], [21, 28], [13, 28]], blue);
      p.rect(16, 15, 3, 8, light);
      p.pixel(17, 18, gold);
      p.rect(10, 25, 14, 3, gold);
      // Long radiant sword.
      p.line(29 - lift, 22, 32 - lift, 5, INK, 4);
      p.line(29 - lift, 22, 32 - lift, 5, light, 2);
      p.polygon([[31 - lift, 5], [33 - lift, 0], [34 - lift, 6]], light);
      p.line(27 - lift, 20, 33 - lift, 22, gold, 2);

      // Human face, white hair and winged command helm.
      p.ellipse(17, 9, 6, 7, INK);
      p.ellipse(17, 9, 5, 6, SKIN);
      p.pixel(15, 9, '#527f9b');
      p.pixel(20, 9, '#8ed0e2');
      p.pixel(19, 11, SKIN_SHADE);
      p.pixel(18, 13, '#9a5649');
      p.polygon([[11, 8], [12, 3], [17, 1], [23, 4], [23, 9], [20, 6], [16, 5], [12, 9]], '#e5e1d8');
      p.rect(12, 3, 11, 3, silver);
      p.pixel(17, 3, gold);
      p.polygon([[12, 5], [7, 2], [11, 8]], light);
      p.polygon([[22, 5], [27, 2], [23, 8]], light);
    });
  return { w: 34, h: 36, frames: [frame(0), frame(1)] };
}

function makeKril(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(38, 37, (p) => {
      const sway = pose === 0 ? 0 : -2;
      const red = '#9c352d';
      const redLight = '#ca5743';
      const redDark = '#572025';
      const armor = '#282329';
      const iron = '#7f7778';

      // Ragged bat wings and barbed tail.
      p.polygon([[10, 10], [3, 5 + sway], [0, 9], [5, 16], [0, 23], [11, 24]], INK);
      p.polygon([[10, 11], [4, 7 + sway], [2, 9], [7, 16], [2, 21], [11, 22]], redDark);
      p.line(4, 9, 10, 20, red, 2);
      p.polygon([[28, 10], [35, 5 - sway], [38, 9], [33, 16], [38, 23], [27, 24]], INK);
      p.polygon([[28, 11], [34, 7 - sway], [36, 9], [31, 16], [36, 21], [27, 22]], redDark);
      p.line(34, 9, 28, 20, red, 2);
      p.line(28, 25, 36, 31 + sway, redDark, 3);
      p.polygon([[35, 29 + sway], [38, 31 + sway], [35, 34 + sway]], red);

      // Cloven legs and black greaves.
      p.rect(8 - (pose ? 1 : 0), 27, 8, 8, INK);
      p.rect(22 + (pose ? 1 : 0), 27, 8, 8, INK);
      p.rect(9 - (pose ? 1 : 0), 27, 6, 6, armor);
      p.rect(23 + (pose ? 1 : 0), 27, 6, 6, '#3a3035');
      p.polygon([[7, 33], [16, 33], [13, 37], [8, 36]], INK);
      p.polygon([[22, 33], [31, 33], [30, 36], [25, 37]], INK);

      // Demonic body and heavy spiked armour.
      p.ellipse(6, 21, 6, 9, INK);
      p.ellipse(6, 21, 5, 8, red);
      p.ellipse(32, 20 + sway, 6, 9, INK);
      p.ellipse(32, 20 + sway, 5, 8, redLight);
      p.polygon([[8, 11], [30, 11], [35, 25], [28, 30], [11, 30], [3, 25]], INK);
      p.polygon([[10, 12], [28, 12], [32, 24], [26, 28], [12, 28], [6, 24]], red);
      p.polygon([[8, 12], [17, 14], [16, 28], [11, 28], [6, 23]], armor);
      p.polygon([[30, 12], [21, 14], [22, 28], [27, 28], [32, 23]], '#3b3035');
      p.rect(10, 25, 18, 4, iron);
      p.pixel(19, 26, '#d19d37');
      p.polygon([[5, 13], [9, 8], [12, 14]], iron);
      p.polygon([[27, 14], [30, 8], [34, 13]], iron);

      // Obsidian greatsword carried high.
      p.line(31 + sway, 22, 34 + sway, 3, INK, 5);
      p.line(31 + sway, 22, 34 + sway, 3, iron, 3);
      p.polygon([[33 + sway, 4], [35 + sway, 0], [37 + sway, 5]], '#b7aeb0');
      p.line(28 + sway, 20, 35 + sway, 23, '#b38735', 2);

      // Horned red face, glowing eyes and exposed fangs.
      p.ellipse(19, 9, 9, 9, INK);
      p.ellipse(19, 9, 8, 8, red);
      p.polygon([[12, 6], [7, 0], [14, 3]], INK);
      p.polygon([[13, 5], [8, 1], [15, 4]], iron);
      p.polygon([[25, 6], [31, 0], [24, 5]], INK);
      p.polygon([[24, 5], [30, 1], [23, 6]], iron);
      p.pixel(15, 9, '#f0c34f');
      p.pixel(23, 9, '#ffdd62');
      p.pixel(21, 12, redDark);
      p.line(14, 14, 25, 14, INK, 2);
      p.rect(13, 13, 2, 4, '#e8d8b9');
      p.rect(24, 13, 2, 4, '#e8d8b9');
    });
  return { w: 38, h: 37, frames: [frame(0), frame(1)] };
}

function makeKreearra(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(42, 34, (p) => {
      const flap = pose === 0 ? 0 : 2;
      const feather = '#557890';
      const featherLight = '#86a6b8';
      const featherDark = '#2f4659';
      const gold = '#d2ad47';
      const beak = '#d49a3c';

      // Vast segmented wings with readable primary feathers.
      p.polygon([[15, 11], [8, 5 + flap], [2, 2 + flap], [5, 10], [0, 13 + flap], [8, 17], [2, 22], [16, 23]], INK);
      p.polygon([[15, 12], [9, 6 + flap], [4, 4 + flap], [7, 11], [2, 13 + flap], [10, 16], [5, 20], [16, 21]], feather);
      p.line(6, 7 + flap, 14, 19, featherLight, 2);
      p.line(4, 13 + flap, 15, 20, featherDark, 2);
      p.polygon([[27, 11], [34, 5 - flap], [40, 2 - flap], [37, 10], [42, 13 - flap], [34, 17], [40, 22], [26, 23]], INK);
      p.polygon([[27, 12], [33, 6 - flap], [38, 4 - flap], [35, 11], [40, 13 - flap], [32, 16], [37, 20], [26, 21]], featherLight);
      p.line(36, 7 - flap, 28, 19, '#b0c5cc', 2);
      p.line(38, 13 - flap, 27, 20, feather, 2);

      // Taloned legs beneath a feathered battle skirt.
      p.rect(15 - (pose ? 1 : 0), 25, 5, 7, INK);
      p.rect(23 + (pose ? 1 : 0), 25, 5, 7, INK);
      p.rect(16 - (pose ? 1 : 0), 25, 3, 5, gold);
      p.rect(24 + (pose ? 1 : 0), 25, 3, 5, gold);
      p.line(17, 30, 12, 33, INK, 2);
      p.line(17, 30, 20, 34, INK, 2);
      p.line(25, 30, 22, 34, INK, 2);
      p.line(25, 30, 31, 33, INK, 2);
      p.pixel(12, 33, gold);
      p.pixel(31, 33, gold);

      // Avian torso, layered breast feathers and gold harness.
      p.ellipse(21, 19, 10, 11, INK);
      p.ellipse(21, 19, 9, 10, feather);
      p.polygon([[15, 16], [21, 13], [28, 16], [27, 27], [21, 30], [14, 27]], featherDark);
      p.polygon([[18, 16], [24, 15], [26, 25], [21, 28], [16, 25]], featherLight);
      p.line(14, 14, 28, 26, gold, 3);
      p.line(28, 14, 15, 26, '#8c6b2b', 3);
      p.ellipse(21, 21, 3, 3, INK);
      p.ellipse(21, 21, 2, 2, gold);

      // Eagle-like head, swept crest, hooked beak and fierce eyes.
      p.ellipse(21, 8, 8, 8, INK);
      p.ellipse(21, 8, 7, 7, feather);
      p.polygon([[15, 5], [12, 0], [18, 3], [20, 0], [23, 3], [29, 1], [27, 7]], featherDark);
      p.line(15, 7, 19, 8, INK, 2);
      p.line(23, 8, 28, 7, INK, 2);
      p.pixel(18, 8, '#efd85a');
      p.pixel(26, 8, '#fff075');
      p.polygon([[20, 10], [31, 11], [25, 16], [21, 14]], INK);
      p.polygon([[21, 10], [30, 11], [25, 14], [22, 13]], beak);
      p.pixel(27, 11, '#f1c05b');
    });
  return { w: 42, h: 34, frames: [frame(0), frame(1)] };
}

function makeZaros(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(26, 34, (p) => {
      const sway = pose === 0 ? 0 : 1;
      const voidColor = '#181321';
      const purple = '#553078';
      const purpleLight = '#9762c2';
      const ancient = '#b79ac8';
      const gold = '#b99848';

      // Staff and long split imperial cloak.
      p.line(22 - sway, 5, 23 - sway, 33, INK, 4);
      p.line(22 - sway, 5, 23 - sway, 33, '#4e385a', 2);
      p.ellipse(22 - sway, 4, 4, 4, INK);
      p.ellipse(22 - sway, 4, 3, 3, purpleLight);
      p.pixel(22 - sway, 3, '#e2b9ff');
      p.polygon([[5, 10], [20, 10], [24, 32], [16, 29], [12, 34], [2, 31]], INK);
      p.polygon([[6, 11], [19, 11], [22, 30], [16, 28], [12, 32], [4, 29]], voidColor);
      p.polygon([[5, 12], [11, 14], [9, 30], [4, 29]], purple);
      p.polygon([[19, 12], [14, 14], [16, 28], [21, 30]], '#322042');

      // Narrow arms, ancient armour trim and central sigil.
      p.line(6, 14, 2 + sway, 24, INK, 5);
      p.line(6, 14, 3 + sway, 23, purple, 3);
      p.line(19, 14, 23 - sway, 24, INK, 5);
      p.line(19, 14, 22 - sway, 23, purpleLight, 3);
      p.polygon([[6, 11], [19, 11], [21, 23], [17, 27], [8, 27], [3, 23]], INK);
      p.polygon([[7, 12], [18, 12], [19, 22], [16, 25], [9, 25], [5, 22]], '#282033');
      p.polygon([[10, 12], [15, 12], [16, 26], [9, 26]], purple);
      p.line(7, 13, 18, 24, ancient, 2);
      p.line(18, 13, 8, 24, '#68428a', 2);
      p.ellipse(13, 19, 3, 3, gold);
      p.pixel(13, 18, '#d9bdea');

      // Faceless crown-mask with two violet eyes.
      p.ellipse(13, 8, 7, 8, INK);
      p.ellipse(13, 8, 6, 7, voidColor);
      p.rect(7, 7, 12, 5, '#262030');
      p.pixel(10, 8, '#b56cff');
      p.pixel(16, 8, '#e0b5ff');
      p.rect(12, 7, 2, 6, ancient);
      p.polygon([[7, 5], [8, 0], [11, 4], [13, 0], [15, 4], [19, 1], [19, 6]], INK);
      p.polygon([[8, 5], [9, 1], [11, 5], [13, 1], [15, 5], [18, 2], [18, 6]], purpleLight);
    });
  return { w: 26, h: 34, frames: [frame(0), frame(1)] };
}

function makeFallenSoldier(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(34, 18, (p) => {
      const breath = pose === 0 ? 0 : 1;
      const steel = '#75828a';
      const steelLight = '#aeb8bc';
      const blue = '#314e75';
      const leather = '#543b2a';

      // Legs stretched across the frozen path.
      p.polygon([[4, 11], [18, 11], [22, 15], [6, 17], [1, 15]], INK);
      p.polygon([[5, 12], [17, 12], [20, 14], [6, 16], [2, 14]], blue);
      p.rect(1, 13, 7, 4, leather);
      p.rect(16, 13, 8, 4, leather);
      p.pixel(2, 14, steel);
      p.pixel(22, 14, steelLight);

      // Slumped armoured torso and weakly braced arm.
      p.ellipse(23, 10 - breath, 9, 6, INK);
      p.ellipse(23, 10 - breath, 8, 5, steel);
      p.polygon([[16, 8 - breath], [27, 5 - breath], [31, 11], [23, 15]], blue);
      p.rect(21, 8 - breath, 7, 2, steelLight);
      p.line(25, 11, 32, 16, INK, 4);
      p.line(25, 11, 31, 15, steel, 2);
      p.ellipse(32, 16, 2, 2, leather);

      // Dented helm and visible exhausted face.
      p.ellipse(29, 6 - breath, 5, 5, INK);
      p.ellipse(29, 6 - breath, 4, 4, SKIN_SHADE);
      p.rect(25, 3 - breath, 8, 4, steel);
      p.rect(26, 4 - breath, 7, 1, steelLight);
      p.pixel(31, 7 - breath, '#67504c');
      p.pixel(32, 8 - breath, SKIN);
    });
  return { w: 34, h: 18, frames: [frame(0), frame(1)] };
}

function makeGhast(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(26, 30, (p) => {
      const drift = pose === 0 ? 0 : 1;
      const mist = '#7e9188';
      const mistLight = '#a9b7a7';
      const rot = '#465b51';

      // Torn vapor tail instead of feet.
      p.polygon([[7, 13], [19, 13], [23, 23], [20, 29], [16, 26], [13, 30], [10, 26], [5, 29], [3, 22]], INK);
      p.polygon([[8, 14], [18, 14], [21, 22], [19, 27], [16, 24], [13, 28], [10, 24], [6, 27], [5, 21]], rot);
      p.polygon([[12, 15], [18, 16], [17, 25], [13, 28]], mist);

      // Long reaching spectral arms.
      p.line(7, 15, 1 + drift, 23, INK, 5);
      p.line(7, 15, 2 + drift, 22, mist, 3);
      p.line(19, 15, 25 - drift, 22, INK, 5);
      p.line(19, 15, 24 - drift, 21, mistLight, 3);
      p.line(1 + drift, 23, 0, 26, mistLight, 2);
      p.line(25 - drift, 22, 25, 26, mistLight, 2);

      // Hollow face under a dripping hood.
      p.ellipse(13, 10, 8, 9, INK);
      p.ellipse(13, 10, 7, 8, mist);
      p.polygon([[5, 10], [7, 3], [12, 0], [20, 4], [21, 12], [18, 8], [13, 5], [8, 10]], rot);
      p.rect(8, 9, 4, 3, '#1e2926');
      p.rect(15, 9, 4, 3, '#1e2926');
      p.pixel(10, 10, '#b7dfb8');
      p.pixel(17, 10, '#d1efc9');
      p.ellipse(14, 15, 3, 2, '#2c3632');
    });
  return { w: 26, h: 30, frames: [frame(0), frame(1)] };
}

function makeSwampSnail(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(36, 22, (p) => {
      const crawl = pose === 0 ? 0 : 1;
      const flesh = '#6f8b63';
      const fleshLight = '#a1b581';
      const shell = '#7a4f35';
      const shellLight = '#b17a4d';

      // Broad slime foot and muscular body.
      p.ellipse(19, 17, 16, 5, INK);
      p.ellipse(19, 17, 15, 4, flesh);
      p.rect(15, 15, 18, 5, flesh);
      p.line(30, 14, 35, 10 - crawl, INK, 4);
      p.line(30, 14, 34, 10 - crawl, fleshLight, 2);

      // Heavy spiral shell.
      p.ellipse(14, 10, 11, 10, INK);
      p.ellipse(14, 10, 10, 9, shell);
      p.ellipse(14, 10, 7, 6, shellLight);
      p.ellipse(14, 10, 4, 4, shell);
      p.ellipse(14, 10, 2, 2, '#4d3327');
      p.line(14, 4, 20, 8, '#d09a60', 2);
      p.line(8, 15, 5, 9, '#52382a', 2);

      // Long eye stalks and simple mouth.
      p.line(29, 12, 31 - crawl, 4, INK, 3);
      p.line(29, 12, 31 - crawl, 4, fleshLight);
      p.line(33, 12, 35 - crawl, 5, INK, 3);
      p.line(33, 12, 35 - crawl, 5, fleshLight);
      p.ellipse(31 - crawl, 3, 2, 2, INK);
      p.ellipse(35 - crawl, 4, 2, 2, INK);
      p.pixel(31 - crawl, 3, '#e4da65');
      p.pixel(35 - crawl, 4, '#e4da65');
      p.line(30, 16, 35, 15, '#354638');
    });
  return { w: 36, h: 22, frames: [frame(0), frame(1)] };
}

function makeSwampVampyre(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(25, 32, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const coat = '#26352f';
      const coatLight = '#40564b';
      const cape = '#502734';
      const pale = '#c8b9bd';

      p.polygon([[4, 9], [20, 9], [24, 30], [16, 28], [12, 32], [1, 29]], INK);
      p.polygon([[5, 10], [19, 10], [22, 28], [16, 26], [12, 30], [3, 27]], cape);
      p.rect(6 - stride, 23, 5, 8, INK);
      p.rect(15 + stride, 23, 5, 8, INK);
      p.rect(4 - stride, 29, 8, 3, '#241c20');
      p.rect(14 + stride, 29, 8, 3, '#241c20');
      p.line(6, 14, 2 + stride, 23, INK, 5);
      p.line(6, 14, 3 + stride, 22, coat, 3);
      p.line(19, 14, 23 - stride, 23, INK, 5);
      p.line(19, 14, 22 - stride, 22, coatLight, 3);
      p.polygon([[6, 11], [19, 11], [21, 23], [17, 26], [8, 26], [3, 23]], INK);
      p.polygon([[7, 12], [18, 12], [19, 22], [16, 24], [9, 24], [5, 22]], coat);
      p.rect(11, 13, 4, 10, '#d5d0c6');
      p.pixel(13, 16, '#8d3137');

      p.ellipse(13, 8, 6, 7, INK);
      p.ellipse(13, 8, 5, 6, pale);
      p.pixel(10, 8, '#cf4656');
      p.pixel(17, 8, '#ff7880');
      p.pixel(15, 11, '#896a73');
      p.line(10, 13, 17, 13, '#57323b');
      p.pixel(11, 13, '#f1e5d7');
      p.pixel(16, 13, '#f1e5d7');
      p.polygon([[7, 7], [8, 2], [13, 0], [19, 3], [19, 8], [16, 5], [13, 3], [10, 6]], '#20231f');
    });
  return { w: 25, h: 32, frames: [frame(0), frame(1)] };
}

function makeTzKek(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(28, 31, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const rock = '#332d2d';
      const rockLight = '#5a4540';
      const magma = '#e14d22';
      const ember = '#ffad32';

      p.rect(5 - stride, 23, 8, 7, INK);
      p.rect(16 + stride, 23, 8, 7, INK);
      p.rect(6 - stride, 23, 6, 5, rock);
      p.rect(17 + stride, 23, 6, 5, rockLight);
      p.rect(3 - stride, 28, 10, 3, INK);
      p.rect(15 + stride, 28, 11, 3, INK);
      p.ellipse(5, 20, 5, 8, INK);
      p.ellipse(5, 20, 4, 7, rock);
      p.ellipse(23, 19, 5, 8, INK);
      p.ellipse(23, 19, 4, 7, rockLight);
      p.polygon([[5, 11], [23, 11], [27, 23], [21, 27], [8, 27], [1, 23]], INK);
      p.polygon([[7, 12], [21, 12], [24, 22], [19, 25], [9, 25], [4, 22]], rock);
      p.line(8, 13, 19, 24, magma, 3);
      p.line(20, 12, 11, 25, '#8f321f', 2);
      p.pixel(14, 19, ember);

      p.ellipse(14, 9, 9, 9, INK);
      p.polygon([[6, 9], [9, 2], [14, 0], [22, 4], [23, 11], [19, 16], [10, 16]], rock);
      p.polygon([[8, 9], [11, 4], [15, 3], [21, 6], [20, 12], [17, 14], [10, 13]], rockLight);
      p.pixel(11, 9, ember);
      p.pixel(18, 9, '#ffd25c');
      p.line(10, 12, 19, 12, INK, 2);
      p.pixel(14, 6, magma);
    });
  return { w: 28, h: 31, frames: [frame(0), frame(1)] };
}

function makeKetZek(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(32, 37, (p) => {
      const sway = pose === 0 ? 0 : -2;
      const basalt = '#29272a';
      const basaltLight = '#514041';
      const magma = '#da3f1f';
      const ember = '#ff9d2d';

      // Molten staff.
      p.line(27 + sway, 5, 29, 36, INK, 5);
      p.line(27 + sway, 5, 29, 36, basaltLight, 3);
      p.ellipse(27 + sway, 4, 5, 5, INK);
      p.ellipse(27 + sway, 4, 4, 4, magma);
      p.pixel(27 + sway, 3, '#ffe064');

      p.rect(6 - (pose ? 1 : 0), 28, 8, 8, INK);
      p.rect(19 + (pose ? 1 : 0), 28, 8, 8, INK);
      p.rect(7 - (pose ? 1 : 0), 28, 6, 6, basalt);
      p.rect(20 + (pose ? 1 : 0), 28, 6, 6, basaltLight);
      p.rect(3 - (pose ? 1 : 0), 34, 12, 3, INK);
      p.rect(18 + (pose ? 1 : 0), 34, 12, 3, INK);
      p.ellipse(5, 23, 6, 10, INK);
      p.ellipse(5, 23, 5, 9, basalt);
      p.ellipse(27, 22 + sway, 6, 10, INK);
      p.ellipse(27, 22 + sway, 5, 9, basaltLight);
      p.polygon([[6, 12], [26, 12], [31, 27], [24, 31], [9, 31], [1, 27]], INK);
      p.polygon([[8, 13], [24, 13], [28, 26], [22, 29], [10, 29], [4, 26]], basalt);
      p.line(8, 15, 23, 28, magma, 4);
      p.line(24, 14, 12, 29, '#802a1e', 3);
      p.pixel(16, 22, ember);

      p.ellipse(16, 10, 10, 10, INK);
      p.polygon([[6, 10], [10, 2], [16, 0], [26, 5], [26, 12], [21, 18], [11, 18]], basalt);
      p.polygon([[9, 10], [12, 5], [17, 3], [24, 7], [23, 13], [20, 16], [11, 15]], basaltLight);
      p.pixel(12, 10, ember);
      p.pixel(21, 10, '#ffd966');
      p.line(11, 14, 22, 14, INK, 2);
      p.line(16, 4, 16, 8, magma, 2);
    });
  return { w: 32, h: 37, frames: [frame(0), frame(1)] };
}

function makeJad(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(46, 36, (p) => {
      const stomp = pose === 0 ? 0 : 1;
      const basalt = '#302b2b';
      const basaltLight = '#5a4440';
      const magma = '#e04720';
      const ember = '#ffb238';

      // Four pillar-like legs.
      for (const [x, offset] of [[7, stomp], [15, -stomp], [29, -stomp], [37, stomp]] as const) {
        p.rect(x, 23, 7, 11 + offset, INK);
        p.rect(x + 1, 23, 5, 8 + offset, basalt);
        p.rect(x - 2, 31 + offset, 10, 4, INK);
        p.pixel(x + 2, 31 + offset, magma);
      }

      // Massive volcanic body and shoulder vents.
      p.ellipse(23, 19, 18, 12, INK);
      p.ellipse(23, 19, 17, 11, basalt);
      p.polygon([[8, 16], [15, 7], [23, 5], [37, 12], [42, 22], [34, 29], [13, 29], [4, 23]], basaltLight);
      p.line(10, 16, 34, 27, magma, 4);
      p.line(35, 13, 18, 29, '#8f2d20', 3);
      p.pixel(23, 18, ember);
      p.polygon([[9, 13], [6, 4], [13, 9]], INK);
      p.polygon([[10, 12], [7, 4], [14, 10]], basaltLight);
      p.polygon([[35, 11], [41, 3], [38, 14]], INK);
      p.polygon([[34, 11], [40, 4], [37, 14]], basaltLight);

      // Horned demon head and furnace mouth.
      p.ellipse(31, 11, 11, 10, INK);
      p.polygon([[21, 10], [26, 3], [34, 2], [42, 8], [42, 15], [36, 21], [26, 19]], basalt);
      p.polygon([[27, 6], [24, 0], [31, 4]], basaltLight);
      p.polygon([[38, 6], [44, 0], [41, 9]], basaltLight);
      p.pixel(28, 10, ember);
      p.pixel(37, 10, '#ffe56a');
      p.polygon([[27, 14], [40, 14], [37, 19], [29, 19]], INK);
      p.rect(30, 15, 8, 3, magma);
      p.pixel(34, 16, '#ffcf4b');
    });
  return { w: 46, h: 36, frames: [frame(0), frame(1)] };
}

function makeElvarg(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(48, 37, (p) => {
      const flap = pose === 0 ? 0 : 2;
      const green = '#47724a';
      const greenLight = '#71a160';
      const greenDark = '#263f31';
      const belly = '#b49c69';
      const horn = '#ddd2ad';

      // Tail and two broad wings.
      p.line(10, 22, 1, 29 + flap, INK, 5);
      p.line(10, 22, 1, 29 + flap, greenDark, 3);
      p.polygon([[13, 15], [7, 4 + flap], [17, 9], [21, 1 + flap], [24, 17]], INK);
      p.polygon([[14, 14], [9, 6 + flap], [17, 11], [21, 3 + flap], [22, 17]], green);
      p.line(12, 9 + flap, 21, 15, greenLight, 2);
      p.polygon([[27, 15], [32, 3 - flap], [36, 11], [45, 6 - flap], [37, 19]], INK);
      p.polygon([[28, 15], [32, 5 - flap], [36, 13], [43, 8 - flap], [36, 18]], green);

      // Four clawed legs.
      for (const [x, step] of [[11, flap / 2], [18, -flap / 2], [29, -flap / 2], [36, flap / 2]] as const) {
        p.rect(x, 25, 6, 9 + step, INK);
        p.rect(x + 1, 25, 4, 7 + step, green);
        p.line(x + 1, 33 + step, x - 2, 36 + step, horn, 2);
        p.line(x + 4, 33 + step, x + 7, 36 + step, horn, 2);
      }

      // Long dragon body and plated belly.
      p.ellipse(24, 21, 17, 11, INK);
      p.ellipse(24, 21, 16, 10, green);
      p.polygon([[14, 17], [25, 13], [36, 18], [33, 27], [21, 30], [13, 26]], greenLight);
      p.polygon([[25, 17], [34, 19], [32, 27], [25, 29]], belly);
      p.line(29, 19, 32, 27, '#756a4e', 2);

      // Long horned head with nostrils and visible teeth.
      p.polygon([[31, 15], [36, 6], [44, 7], [48, 13], [44, 20], [34, 20]], INK);
      p.polygon([[33, 15], [37, 8], [43, 9], [46, 13], [43, 18], [35, 18]], greenLight);
      p.polygon([[37, 8], [36, 2], [40, 7]], horn);
      p.polygon([[43, 9], [47, 4], [46, 11]], horn);
      p.pixel(39, 11, '#f2d45a');
      p.pixel(45, 13, greenDark);
      p.line(36, 17, 45, 17, INK, 2);
      p.pixel(38, 17, horn);
      p.pixel(42, 17, horn);
    });
  return { w: 48, h: 37, frames: [frame(0), frame(1)] };
}

function makeDagannothRex(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(44, 37, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const hide = '#4f745f';
      const hideLight = '#789682';
      const hideDark = '#293f39';
      const fin = '#52768a';
      const tooth = '#e7dfc3';

      // Thick tail, fin ridge and powerful hind legs.
      p.line(12, 23, 1, 30 - stride, INK, 6);
      p.line(12, 23, 2, 29 - stride, hideDark, 4);
      p.rect(8 - stride, 26, 9, 9, INK);
      p.rect(29 + stride, 26, 9, 9, INK);
      p.rect(9 - stride, 26, 7, 6, hide);
      p.rect(30 + stride, 26, 7, 6, hideLight);
      p.rect(5 - stride, 32, 13, 5, INK);
      p.rect(27 + stride, 32, 14, 5, INK);
      p.pixel(7, 33, tooth);
      p.pixel(39, 33, tooth);

      // Broad amphibious body and short grasping arms.
      p.ellipse(22, 22, 16, 11, INK);
      p.ellipse(22, 22, 15, 10, hide);
      p.polygon([[10, 17], [17, 8], [24, 13], [31, 6], [35, 18]], fin);
      p.line(13, 19, 7 + stride, 27, INK, 5);
      p.line(13, 19, 8 + stride, 26, hide, 3);
      p.line(32, 18, 40 - stride, 26, INK, 5);
      p.line(32, 18, 39 - stride, 25, hideLight, 3);
      p.line(7, 27, 3, 29, tooth, 2);
      p.line(40, 26, 43, 29, tooth, 2);

      // Dinosaur-like head, gills and toothy jaw.
      p.ellipse(28, 11, 12, 10, INK);
      p.polygon([[17, 10], [23, 3], [34, 3], [43, 9], [42, 16], [34, 21], [20, 18]], hide);
      p.polygon([[24, 4], [32, 4], [39, 9], [35, 12], [23, 11]], hideLight);
      p.pixel(25, 8, '#e4d250');
      p.pixel(36, 9, '#fff079');
      p.polygon([[21, 13], [42, 13], [36, 20], [24, 19]], INK);
      p.line(24, 14, 39, 14, '#70433f', 3);
      for (const x of [25, 29, 34, 38]) p.pixel(x, 14, tooth);
      p.line(19, 9, 15, 6, fin, 3);
      p.line(19, 12, 14, 12, fin, 3);
    });
  return { w: 44, h: 37, frames: [frame(0), frame(1)] };
}

function makeSkeleton(rank: 'warrior' | 'archer' | 'king'): SpriteSheet {
  const king = rank === 'king';
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(king ? 34 : 25, king ? 36 : 31, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const bone = '#d8cfb3';
      const boneLight = '#f1ead3';
      const boneShade = '#938b78';
      const ghost = '#5b79a3';
      const width = king ? 34 : 25;
      const cx = king ? 17 : 12;

      if (king) {
        p.polygon([[5, 10], [29, 10], [34, 33], [23, 30], [17, 36], [1, 32]], INK);
        p.polygon([[6, 11], [28, 11], [32, 31], [22, 28], [17, 34], [3, 30]], '#29243a');
      }

      // Separated shin bones and armoured feet.
      p.line(cx - 5, king ? 25 : 22, cx - 7 - stride, king ? 34 : 29, INK, 5);
      p.line(cx - 5, king ? 25 : 22, cx - 7 - stride, king ? 33 : 28, boneShade, 3);
      p.line(cx + 5, king ? 25 : 22, cx + 7 + stride, king ? 34 : 29, INK, 5);
      p.line(cx + 5, king ? 25 : 22, cx + 7 + stride, king ? 33 : 28, bone, 3);
      p.rect(cx - 12 - stride, king ? 32 : 28, 10, 4, INK);
      p.rect(cx + 3 + stride, king ? 32 : 28, 10, 4, INK);

      // Spine, ribs and long skeletal arms.
      p.line(cx, 12, cx, king ? 27 : 24, INK, 5);
      p.line(cx, 12, cx, king ? 26 : 23, boneShade, 3);
      for (const y of [14, 17, 20]) {
        p.line(cx, y, cx - (king ? 9 : 7), y - 2, bone, 2);
        p.line(cx, y, cx + (king ? 9 : 7), y - 2, boneLight, 2);
      }
      p.line(cx - 7, 13, cx - 13 + stride, king ? 26 : 23, INK, 5);
      p.line(cx - 7, 13, cx - 12 + stride, king ? 25 : 22, boneShade, 3);
      p.line(cx + 7, 13, cx + 13 - stride, king ? 26 : 23, INK, 5);
      p.line(cx + 7, 13, cx + 12 - stride, king ? 25 : 22, bone, 3);
      p.rect(cx - 5, king ? 24 : 22, 11, 3, ghost);

      if (rank === 'archer') {
        p.line(width - 3, 6, width - 2, 28, '#775538', 2);
        p.line(width - 3, 6, width - 8, 17, boneLight);
        p.line(width - 8, 17, width - 2, 28, boneLight);
        p.line(2, 20, width - 5, 16, '#765538', 2);
      } else {
        // Rusted blade for warriors; possessed femur for the king.
        const blade = king ? boneLight : '#8f9493';
        p.line(cx + 12, 22, width - 2, king ? 4 : 5, INK, king ? 5 : 4);
        p.line(cx + 12, 22, width - 2, king ? 4 : 5, blade, king ? 3 : 2);
        p.line(cx + 9, 20, cx + 15, 24, king ? ghost : '#7c5935', 2);
      }

      // Skull with eye sockets and broken teeth.
      p.ellipse(cx, 8, king ? 8 : 7, 8, INK);
      p.ellipse(cx, 8, king ? 7 : 6, 7, bone);
      p.rect(cx - 6, 8, king ? 13 : 12, 5, bone);
      p.rect(cx - 5, 7, 4, 3, '#29272a');
      p.rect(cx + 2, 7, 4, 3, '#29272a');
      p.pixel(cx - 3, 8, ghost);
      p.pixel(cx + 4, 8, '#8cb5e0');
      p.pixel(cx, 11, boneShade);
      p.line(cx - 4, 13, cx + 5, 13, INK);
      p.pixel(cx - 2, 13, boneLight);
      p.pixel(cx + 2, 13, boneLight);

      if (king) {
        p.polygon([[9, 4], [9, 0], [13, 3], [17, 0], [21, 3], [26, 0], [25, 6]], INK);
        p.polygon([[10, 4], [10, 1], [13, 4], [17, 1], [21, 4], [25, 1], [24, 6]], boneLight);
        p.pixel(17, 3, ghost);
        p.ellipse(6, 14, 6, 4, boneShade);
        p.ellipse(28, 14, 6, 4, bone);
      }
    });
  return {
    w: king ? 34 : 25,
    h: king ? 36 : 31,
    frames: [frame(0), frame(1)],
  };
}

function makeOrc(rank: 'saurfang' | 'thrall'): SpriteSheet {
  const king = rank === 'thrall';
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(king ? 36 : 32, king ? 38 : 35, (p) => {
      const shift = pose === 0 ? 0 : -2;
      const skin = '#628252';
      const skinLight = '#88a76b';
      const skinDark = '#344c36';
      const iron = '#4d4b4b';
      const ironLight = '#85847f';
      const leather = '#5c3927';
      const red = '#8f3229';
      const cx = king ? 18 : 16;

      if (king) {
        // Doomhammer behind the chieftain.
        p.line(29 + shift, 8, 31, 36, INK, 6);
        p.line(29 + shift, 8, 31, 36, leather, 3);
        p.rect(24 + shift, 2, 11, 9, INK);
        p.rect(25 + shift, 3, 10, 7, iron);
        p.rect(26 + shift, 3, 6, 2, ironLight);
        p.pixel(30 + shift, 7, '#58a8d2');
      } else {
        // Saurfang's broad cleaver.
        p.line(26 + shift, 8, 29, 34, INK, 5);
        p.line(26 + shift, 8, 29, 34, leather, 3);
        p.polygon([[21 + shift, 2], [31 + shift, 1], [29 + shift, 11], [23 + shift, 9]], INK);
        p.polygon([[22 + shift, 3], [30 + shift, 2], [28 + shift, 9], [24 + shift, 8]], ironLight);
      }

      // Heavy legs and plated boots.
      p.rect(cx - 10 - (pose ? 1 : 0), king ? 28 : 26, 9, 9, INK);
      p.rect(cx + 2 + (pose ? 1 : 0), king ? 28 : 26, 9, 9, INK);
      p.rect(cx - 9 - (pose ? 1 : 0), king ? 28 : 26, 7, 6, leather);
      p.rect(cx + 3 + (pose ? 1 : 0), king ? 28 : 26, 7, 6, '#765039');
      p.rect(cx - 13, king ? 34 : 32, 13, 4, iron);
      p.rect(cx + 1, king ? 34 : 32, 14, 4, iron);

      // Massive arms and layered warplate.
      p.ellipse(cx - 13, 21, 6, 10, INK);
      p.ellipse(cx - 13, 21, 5, 9, skinDark);
      p.ellipse(cx + 13, 20 + shift, 6, 10, INK);
      p.ellipse(cx + 13, 20 + shift, 5, 9, skin);
      p.polygon([[cx - 11, 12], [cx + 11, 12], [cx + 16, 27], [cx + 8, 31], [cx - 8, 31], [cx - 16, 27]], INK);
      p.polygon([[cx - 9, 13], [cx + 9, 13], [cx + 13, 26], [cx + 7, 29], [cx - 7, 29], [cx - 13, 26]], iron);
      p.polygon([[cx - 7, 14], [cx, 16], [cx - 1, 29], [cx - 8, 28]], red);
      p.polygon([[cx + 8, 14], [cx + 2, 16], [cx + 3, 29], [cx + 8, 28]], '#322e2f');
      p.line(cx - 8, 15, cx + 8, 28, leather, 4);
      p.ellipse(cx, 22, 4, 4, INK);
      p.ellipse(cx, 22, 3, 3, '#bd9137');

      // Shoulder armour with horn details.
      p.ellipse(cx - 11, 14, 7, 5, INK);
      p.ellipse(cx - 11, 14, 6, 4, iron);
      p.polygon([[cx - 16, 12], [cx - 18, 7], [cx - 12, 12]], '#d5c7a3');
      p.ellipse(cx + 11, 14, 7, 5, INK);
      p.ellipse(cx + 11, 14, 6, 4, ironLight);
      p.polygon([[cx + 15, 12], [cx + 18, 7], [cx + 12, 12]], '#e3d8b7');

      // Broad orc face, tusks, braids and stern eyes.
      p.ellipse(cx, 9, 9, 9, INK);
      p.ellipse(cx, 9, 8, 8, skin);
      p.polygon([[cx + 2, 3], [cx + 7, 5], [cx + 6, 9], [cx + 3, 7]], skinLight);
      p.rect(cx - 7, 10, 15, 7, skin);
      p.polygon([[cx - 7, 13], [cx + 7, 13], [cx + 6, 19], [cx - 5, 19]], skinDark);
      p.pixel(cx - 4, 9, '#e2c456');
      p.pixel(cx + 5, 9, '#f6dc6e');
      p.line(cx - 5, 15, cx + 7, 15, INK, 2);
      p.rect(cx - 7, 14, 2, 4, '#eadbb8');
      p.rect(cx + 7, 14, 2, 4, '#eadbb8');
      p.polygon([[cx - 8, 7], [cx - 6, 2], [cx, 0], [cx + 8, 4], [cx + 8, 8], [cx + 3, 5], [cx - 3, 5]], '#29231f');
      if (king) {
        p.line(cx - 6, 5, cx - 9, 22, INK, 4);
        p.line(cx - 6, 6, cx - 9, 21, '#3f2b22', 2);
        p.line(cx + 6, 5, cx + 10, 22, INK, 4);
        p.line(cx + 6, 6, cx + 10, 21, '#3f2b22', 2);
        p.pixel(cx, 4, '#4f96bd');
      } else {
        p.polygon([[cx - 8, 6], [cx - 6, 1], [cx + 1, 0], [cx + 8, 4], [cx + 7, 7]], '#6a3a25');
      }
    });
  return {
    w: king ? 36 : 32,
    h: king ? 38 : 35,
    frames: [frame(0), frame(1)],
  };
}

function makeHobbit(type: 'bilbo' | 'frodo' | 'samwise'): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(22, 25, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const jacket = type === 'bilbo' ? '#7a5130' : type === 'frodo' ? '#53694b' : '#8a6b39';
      const jacketLight = type === 'bilbo' ? '#a67a48' : type === 'frodo' ? '#78926a' : '#b28a4f';
      const cloak = type === 'frodo' ? '#4a5844' : type === 'samwise' ? '#667244' : '#58402d';
      const hair = type === 'samwise' ? '#b07b3f' : '#4b3429';

      // Short legs and large bare hobbit feet.
      p.rect(5 - stride, 18, 5, 5, INK);
      p.rect(12 + stride, 18, 5, 5, INK);
      p.rect(6 - stride, 18, 3, 4, '#594332');
      p.rect(13 + stride, 18, 3, 4, '#6b5037');
      p.ellipse(5 - stride, 23, 5, 2, INK);
      p.ellipse(16 + stride, 23, 5, 2, INK);
      p.rect(3 - stride, 22, 7, 2, SKIN_SHADE);
      p.rect(13 + stride, 22, 7, 2, SKIN);

      // Compact jacket, cloak and simple pack.
      p.polygon([[5, 10], [17, 10], [20, 19], [15, 21], [7, 21], [2, 18]], INK);
      p.polygon([[6, 11], [16, 11], [18, 18], [14, 20], [8, 20], [4, 18]], jacket);
      p.polygon([[5, 11], [10, 12], [9, 20], [6, 19], [4, 17]], cloak);
      p.polygon([[14, 11], [17, 13], [17, 18], [13, 16]], jacketLight);
      p.line(5, 12, 2 + stride, 19, SKIN_SHADE, 3);
      p.line(17, 12, 20 - stride, 19, SKIN, 3);
      p.rect(7, 17, 9, 2, '#59402c');
      p.pixel(11, 17, '#c79a3c');

      // Round face, curls and distinct expressions.
      p.ellipse(11, 7, 5, 6, INK);
      p.ellipse(11, 7, 4, 5, SKIN);
      p.pixel(9, 7, '#596f73');
      p.pixel(14, 7, '#8bb0b2');
      p.pixel(13, 9, SKIN_SHADE);
      p.pixel(12, 11, '#865044');
      p.polygon([[6, 7], [7, 2], [10, 1], [12, 3], [15, 1], [18, 5], [16, 8], [14, 5], [11, 4], [8, 7]], hair);
      p.pixel(7, 4, jacketLight);
    });
  return { w: 22, h: 25, frames: [frame(0), frame(1)] };
}

function makeGandalf(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(28, 37, (p) => {
      const sway = pose === 0 ? 0 : 1;
      const grey = '#777b7c';
      const greyLight = '#b5b7b3';
      const greyDark = '#44484d';
      const beard = '#d0d0c8';

      // Knotted staff.
      p.line(23 - sway, 5, 25 - sway, 36, INK, 4);
      p.line(23 - sway, 5, 25 - sway, 36, '#68472d', 2);
      p.line(23 - sway, 5, 26 - sway, 1, '#80603c', 2);

      // Tall layered robe.
      p.polygon([[7, 14], [20, 14], [24, 35], [4, 35]], INK);
      p.polygon([[8, 15], [19, 15], [22, 33], [6, 33]], grey);
      p.polygon([[9, 16], [14, 17], [13, 33], [6, 33]], greyDark);
      p.polygon([[15, 16], [20, 18], [21, 32], [16, 29]], greyLight);
      p.line(8, 17, 3 + sway, 26, INK, 5);
      p.line(8, 17, 4 + sway, 25, grey, 3);
      p.line(20, 17, 24 - sway, 25, INK, 5);
      p.line(20, 17, 23 - sway, 24, greyLight, 3);
      p.rect(5, 33, 8, 4, INK);
      p.rect(17, 33, 8, 4, INK);

      // Wise face and flowing forked beard.
      p.ellipse(14, 11, 6, 7, INK);
      p.ellipse(14, 11, 5, 6, SKIN);
      p.pixel(11, 10, '#5f797f');
      p.pixel(17, 10, '#9bc3c7');
      p.pixel(16, 12, SKIN_SHADE);
      p.polygon([[9, 13], [20, 13], [19, 24], [15, 21], [12, 25], [10, 20]], beard);
      p.line(10, 9, 13, 8, beard, 2);
      p.line(15, 8, 19, 9, beard, 2);

      // Tall battered grey hat.
      p.rect(6, 6, 16, 3, INK);
      p.rect(7, 6, 14, 2, greyDark);
      p.polygon([[8, 6], [12, 0], [16, 2], [20, 7]], INK);
      p.polygon([[9, 6], [12, 1], [15, 3], [19, 7]], grey);
      p.pixel(12, 2, greyLight);
    });
  return { w: 28, h: 37, frames: [frame(0), frame(1)] };
}

function makeCow(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(34, 21, (p) => {
      const brown = '#9a6938';
      const brownShade = '#654125';
      const brownLight = '#c18a50';
      const cream = '#eee1c6';
      const muzzle = '#d89e91';
      const hoof = '#29231d';
      const step = pose === 0 ? 0 : 1;

      // Tail with a dark tuft.
      p.line(5, 7, 1, 13 - step, brownShade, 2);
      p.ellipse(1, 14 - step, 2, 2, INK);
      p.pixel(1, 14 - step, brownShade);

      // Four separate weight-bearing legs and cloven hooves.
      for (const [x, offset] of [[7, step], [12, -step], [20, -step], [25, step]] as const) {
        p.rect(x, 12, 4, 8 + offset, INK);
        p.rect(x + 1, 13, 2, 5 + offset, brown);
        p.rect(x - 1, 18 + offset, 5, 3, hoof);
        p.pixel(x + 1, 18 + offset, '#80705e');
      }

      // Long bovine barrel with a straight back and rounded belly.
      p.ellipse(15, 9, 12, 8, INK);
      p.ellipse(15, 9, 11, 7, brown);
      p.rect(6, 4, 17, 4, brownLight);
      p.ellipse(14, 12, 9, 4, brownShade);
      p.polygon([[7, 5], [12, 3], [16, 5], [14, 9], [9, 10]], cream);
      p.polygon([[16, 10], [21, 7], [24, 10], [21, 14], [17, 14]], cream);
      p.pixel(12, 5, brown);
      p.pixel(20, 11, brown);

      // Neck and recognisable cow head in side profile.
      p.polygon([[21, 5], [27, 4 + step], [29, 12 + step], [22, 14]], INK);
      p.polygon([[22, 6], [26, 5 + step], [28, 11 + step], [22, 13]], brownLight);
      p.ellipse(27, 8 + step, 5, 5, INK);
      p.ellipse(27, 8 + step, 4, 4, brown);
      p.ellipse(30, 11 + step, 3, 3, INK);
      p.ellipse(30, 11 + step, 2, 2, muzzle);
      p.pixel(29, 11 + step, '#70463f');
      p.pixel(31, 11 + step, '#70463f');

      // Ears, horns and a clearly readable eye.
      p.polygon([[24, 5 + step], [20, 3 + step], [24, 7 + step]], brownShade);
      p.polygon([[29, 5 + step], [32, 3 + step], [29, 7 + step]], brownShade);
      p.line(24, 4 + step, 23, 1 + step, cream, 2);
      p.line(29, 4 + step, 30, 1 + step, cream, 2);
      p.rect(27, 6 + step, 2, 2, INK);
      p.pixel(27, 6 + step, '#f7d75b');

      // Udder under the rear belly.
      p.ellipse(19, 15, 4, 2, '#d68e91');
      p.pixel(17, 17, '#9b5f65');
      p.pixel(21, 17, '#9b5f65');
    });
  return { w: 34, h: 21, frames: [frame(0), frame(1)] };
}

function makeWizard(variant: 'surok' | 'dark' = 'surok'): SpriteSheet {
  const dark = variant === 'dark';
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(22, 29, (p) => {
      // The dark order wears the same cut in black wool with blood-red trim.
      const purple = dark ? '#2a2430' : '#6336a5';
      const purpleDark = dark ? '#14121a' : '#331b61';
      const purpleLight = dark ? '#4a4152' : '#9369d0';
      const beard = dark ? '#3b3630' : '#dad4cb';
      const gold = dark ? '#a3282a' : '#d6ae3c';
      const sway = pose === 0 ? 0 : 1;

      // Staff behind the robe.
      p.line(19, 5, 20 - sway, 28, INK, 3);
      p.line(19, 5, 20 - sway, 28, '#65411f');
      p.ellipse(19, 4, 3, 3, gold);
      p.pixel(19, 3, dark ? '#ff6a55' : '#78d7e5');

      // Tapered layered robe with separated boots.
      p.polygon([[7, 13], [15, 13], [19, 27], [3, 27]], INK);
      p.polygon([[8, 14], [14, 14], [17, 26], [5, 26]], purple);
      p.polygon([[11, 14], [15, 25], [11, 23], [8, 26]], purpleDark);
      p.line(8, 16, 3 + sway, 22, INK, 4);
      p.line(8, 16, 4 + sway, 21, purpleLight, 2);
      p.line(14, 16, 18 - sway, 21, INK, 4);
      p.line(14, 16, 17 - sway, 20, purpleLight, 2);
      p.rect(5, 26, 6, 3, INK);
      p.rect(13, 26, 6, 3, INK);
      p.pixel(7, 26, gold);

      // Face, eyes, long brows and forked beard.
      p.ellipse(11, 10, 5, 6, INK);
      p.ellipse(11, 10, 4, 5, dark ? '#9d8f83' : SKIN);
      p.rect(8, 9, 7, 2, dark ? '#b3a396' : SKIN_LIGHT);
      p.pixel(9, 9, dark ? '#8f2222' : '#46899a');
      p.rect(13, 9, 2, 1, dark ? '#ff5544' : '#72e2ef');
      p.pixel(13, 11, SKIN_SHADE);
      p.polygon([[8, 12], [16, 12], [15, 18], [12, 16], [9, 18]], beard);
      p.line(8, 8, 10, 7, beard);
      p.line(12, 7, 15, 8, beard);

      // Crooked wide-brimmed hat with stitched gold moons.
      p.rect(4, 5, 15, 3, INK);
      p.rect(5, 5, 13, 2, purpleDark);
      p.polygon([[7, 5], [10, 0], [13, 2], [16, 6]], INK);
      p.polygon([[8, 5], [10, 1], [12, 3], [15, 6]], purple);
      p.pixel(11, 3, gold);
      p.pixel(7, 6, purpleLight);
    });
  return { w: 22, h: 29, frames: [frame(0), frame(1)] };
}

function makeNpc(type: 'hans' | 'chef' | 'king'): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(20, 27, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const cloth =
        type === 'chef' ? '#e7e1d5' : type === 'king' ? '#a42f36' : '#756044';
      const clothShade =
        type === 'chef' ? '#a9a49c' : type === 'king' ? '#641d27' : '#493a29';
      const trim = type === 'king' ? '#e0b849' : type === 'chef' ? '#bd3f35' : '#3c6b82';

      // Boots, trousers, arms and shaped torso.
      p.rect(5 - stride, 20, 5, 6, INK);
      p.rect(11 + stride, 20, 5, 6, INK);
      p.rect(6 - stride, 20, 3, 5, clothShade);
      p.rect(12 + stride, 20, 3, 5, clothShade);
      p.rect(3 - stride, 24, 7, 3, '#35281d');
      p.rect(11 + stride, 24, 7, 3, '#35281d');
      p.line(5, 13, 2 + stride, 21, INK, 4);
      p.line(5, 14, 3 + stride, 20, SKIN_SHADE, 2);
      p.line(15, 13, 18 - stride, 21, INK, 4);
      p.line(15, 14, 17 - stride, 20, SKIN, 2);
      p.polygon([[5, 12], [15, 12], [17, 21], [3, 21]], INK);
      p.polygon([[6, 13], [14, 13], [15, 20], [5, 20]], cloth);
      p.rect(5, 18, 11, 2, clothShade);
      p.rect(9, 13, 2, 6, trim);

      // Human head with visible eyes, nose, mouth and ears.
      p.ellipse(10, 8, 5, 6, INK);
      p.ellipse(10, 8, 4, 5, SKIN);
      p.pixel(6, 8, SKIN_SHADE);
      p.pixel(15, 8, SKIN_SHADE);
      p.rect(8, 7, 2, 2, INK);
      p.rect(13, 7, 2, 2, INK);
      p.pixel(9, 7, '#7f9fa8');
      p.pixel(14, 7, '#c7edf2');
      p.pixel(12, 10, SKIN_SHADE);
      p.line(9, 12, 14, 11, '#713f34');

      if (type === 'chef') {
        // Tall segmented toque and small dark moustache.
        p.ellipse(10, 2, 6, 3, INK);
        p.ellipse(10, 2, 5, 2, '#f7f4e9');
        p.rect(6, 2, 9, 5, INK);
        p.rect(7, 2, 7, 4, '#f7f4e9');
        p.line(8, 11, 10, 12, '#4b3327');
        p.line(10, 12, 12, 11, '#4b3327');
        p.rect(6, 15, 8, 1, '#bd3f35');
      } else if (type === 'king') {
        // Crown, grey beard, fur collar and cape clasp.
        p.polygon([[5, 4], [5, 0], [8, 3], [10, 0], [12, 3], [15, 0], [15, 5]], INK);
        p.polygon([[6, 4], [6, 1], [8, 4], [10, 1], [12, 4], [14, 1], [14, 5]], '#e1b737');
        p.pixel(10, 3, '#4ca2d1');
        p.polygon([[6, 11], [14, 11], [13, 16], [10, 14], [7, 16]], '#c9c5bd');
        p.rect(4, 13, 12, 3, '#ede4cf');
        p.ellipse(10, 17, 2, 2, '#e1b737');
      } else {
        // Hans: side-parted brown hair and a short beard shadow.
        p.polygon([[5, 6], [6, 2], [11, 1], [15, 4], [14, 6], [10, 4], [7, 6]], '#5c3a24');
        p.rect(7, 11, 7, 3, '#7f5539');
        p.pixel(10, 12, SKIN);
      }
    });
  return { w: 20, h: 27, frames: [frame(0), frame(1)] };
}

const PLAYER_PALETTE: Record<string, string> = {
  h: '#2a2320', // hair
  L: '#55483e', // hair sheen
  s: '#f2d3b3', // skin
  S: '#ffe6c9', // skin lit
  d: '#cfa07c', // skin shade
  i: '#2a2226', // eye
  e: '#ffffff', // eye glint
  m: '#b06a58', // mouth
  t: '#3f6fa8', // tunic
  T: '#5f97cf', // tunic lit
  u: '#2b4d78', // tunic shade
  w: '#cfd6dd', // hem trim
  r: '#a83a3a', // scarf
  c: '#7a5230', // bracer
  b: '#4a3423', // belt
  B: '#d8ab3e', // buckle
  g: '#3d4450', // trousers
  G: '#57606f', // trousers lit
  k: '#6b4526', // boots
  K: '#8f5f34', // boot highlight
};

/**
 * The hero, authored pixel by pixel: fluffy dark hair, bright eyes, blue
 * travelling tunic with a red scarf, leather bracers and riding boots.
 */
/**
 * The hero's base figure. The torso is deliberately long so worn armour has
 * room to read, and every overlay in EQUIP_OVERLAYS is authored against these
 * exact rows: torso interior x8-17, arms x5-6 and x19-20, legs x8-11 and
 * x14-17, boots x7-11 and x14-18.
 */
const PLAYER_ROWS: string[] = [
  //     01234567890123456789012345
  /*  0 */ '.........hhhhhhhh.........',
  /*  1 */ '........hhhhhhhhhh........',
  /*  2 */ '........hhsssssshh........',
  /*  3 */ '........hssssssssh........',
  /*  4 */ '........hsiissiish........',
  /*  5 */ '.........ssssssss.........',
  /*  6 */ '.........sssmmsss.........',
  /*  7 */ '..........ssssss..........',
  /*  8 */ '...........dSSd...........',
  /*  9 */ '...........dSSd...........',
  /* 10 */ '.......rrrrrrrrrrrr.......',
  /* 11 */ '.......tttttttttttt.......',
  /* 12 */ '.....tt.utttttttTT.tt.....',
  /* 13 */ '.....tt.utttttttTT.tt.....',
  /* 14 */ '.....cc.utttttttTT.cc.....',
  /* 15 */ '.....cc.utttttttTT.cc.....',
  /* 16 */ '.....ss.utttttttTT.ss.....',
  /* 17 */ '.....ss.bbbbBBbbbb.ss.....',
  /* 18 */ '........uttttttttT........',
  /* 19 */ '........wwwwwwwwww........',
  /* 20 */ '........gggg..gggg........',
  /* 21 */ '........gggg..gggg........',
  /* 22 */ '........gGgg..ggGg........',
  /* 23 */ '........gggg..gggg........',
  /* 24 */ '........kkkk..kkkk........',
  /* 25 */ '........kKKk..kKKk........',
  /* 26 */ '.......kkkkk..kkkkk.......',
];

/** Second idle frame: weight shifts, so the stance widens by a pixel. */
const PLAYER_ROWS_STRIDE: string[] = PLAYER_ROWS.map((row, y) => {
  if (y < 20) return row;
  if (y < 24) return '.......gggg....gggg.......';
  if (y < 26) return '.......kkkk....kkkk.......';
  return '......kkkkk....kkkkk......';
});

/** Unoutlined, so worn gear can be composited before the contour is drawn. */
const PLAYER_BASE: [Pixel[][], Pixel[][]] = [
  paintGrid(PLAYER_ROWS, PLAYER_PALETTE),
  paintGrid(PLAYER_ROWS_STRIDE, PLAYER_PALETTE),
];

function makePlayer(): SpriteSheet {
  const frames: [Pixel[][], Pixel[][]] = [
    outlineFrame(clonePixelFrame(PLAYER_BASE[0])),
    outlineFrame(clonePixelFrame(PLAYER_BASE[1])),
  ];
  return { w: 26, h: 27, frames };
}

/* --------------------------------------------------------------------------
   Worn equipment, drawn onto the hero. Each overlay is a character grid on
   the same 26x34 canvas as the base figure: 'm' main colour, 'd' shade,
   'l' highlight, 'a' accent. The colours come from the item's own material
   tint, so a rune platebody and a bandos chestplate share a shape but never
   a palette. Rings are deliberately invisible — nobody can see a ring at
   this scale.
   -------------------------------------------------------------------------- */

/** Cape first: it hangs behind the figure, so it is composited underneath. */
const OVERLAY_CAPE: string[] = [
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '.......dmmmmmmmmmmml......',
  '......dmmmmmmmmmmmmml.....',
  '......dmmmmmmmmmmmmml.....',
  '......dmmmmmmmmmmmmml.....',
  '......dmmmmmmmmmmmmml.....',
  '......dmmmmmmmmmmmmml.....',
  '......dmmmmmmmmmmmmml.....',
  '......dmmmmmmmmmmmmml.....',
  '......dmmmmmmmmmmmmml.....',
  '......dmmmmmmmmmmmmml.....',
  '.......dmmmmmmmmmmml......',
  '.......dmmmmmmmmmmml......',
  '........dmmmmmmmmml.......',
  '.........ddmmmmmdll.......',
  '..........dddddddl........',
];

const OVERLAY_BODY: string[] = [
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '.......mmmmmmmmmmmm.......',
  '....mmmm.dmmmmmmmll.mmmm..',
  '....mmmm.dmmmmmmmll.mmmm..',
  '.....mm..dmmmammmll..mm...',
  '.........dmmmmmmmll.......',
  '.........dmmmmmmmll.......',
  '.........dmmmmmmmll.......',
  '..........................',
  '.........dmmmmmmmll.......',
  '........dddmmmmmmlll......',
];

const OVERLAY_LEGS: string[] = [
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '........dmmm..mmml........',
  '........dmmm..mmml........',
  '........dmmm..mmml........',
  '........dddd..llll........',
];

const OVERLAY_FEET: string[] = [
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '........mmmm..mmmm........',
  '........dllm..dllm........',
  '.......mmmmm..mmmmm.......',
];

const OVERLAY_HANDS: string[] = [
  ...Array.from({ length: 15 }, () => '..........................'),
  '.....mm............mm.....',
  '.....mm............mm.....',
  '.....dl............ld.....',
];

const OVERLAY_HELM: string[] = [
  '.........mmmmmmmm.........',
  '........mmmmmmmmmm........',
  '........mmllllllmm........',
  '........mm.aa...mm........',
  '........mm......mm........',
  '........dm......md........',
];

const OVERLAY_NECK: string[] = [
  ...Array.from({ length: 9 }, () => '..........................'),
  '..........mmaamm..........',
  '...........maa............',
  '............a.............',
];

const OVERLAY_SHIELD: string[] = [
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..dmmmd...................',
  '.dmmmmmd..................',
  '.dmmammd..................',
  '.dmmmmmd..................',
  '.dmmmmmd..................',
  '..dmmmd...................',
  '...ddd....................',
];

/** Weapons: one silhouette per family, held in the hero's right hand. */
const OVERLAY_WEAPON: Record<'blade' | 'blunt' | 'staff', string[]> = {
  blade: [
    '..........................',
    '..........................',
    '..........................',
    '....................l.....',
    '...................ml.....',
    '...................ml.....',
    '...................ml.....',
    '...................ml.....',
    '...................ml.....',
    '...................ml.....',
    '...................ml.....',
    '...................ml.....',
    '...................ml.....',
    '...................ml.....',
    '...................ml.....',
    '..................aaaa....',
    '...................dd.....',
    '...................dd.....',
    '...................a......',
  ],
  blunt: [
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '...................mmmm...',
    '...................mllm...',
    '...................mllm...',
    '...................mmmm...',
    '....................dd....',
    '....................dd....',
    '....................dd....',
    '....................dd....',
    '....................dd....',
    '....................dd....',
    '....................dd....',
    '....................aa....',
    '....................dd....',
    '....................dd....',
    '....................a.....',
  ],
  staff: [
    '....................a.....',
    '...................aaa....',
    '....................a.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................d.....',
    '....................a.....',
  ],
};

const WEAPON_FAMILY: Record<string, 'blade' | 'blunt' | 'staff'> = {
  sword: 'blade',
  scimitar: 'blade',
  spear: 'blade',
  axe: 'blade',
  mace: 'blunt',
  club: 'blunt',
  knuckles: 'blunt',
  staff: 'staff',
  crossbow: 'staff',
  hilt: 'blade',
};

function paintOverlay(rows: string[], tint: IconTint): Pixel[][] {
  return paintGrid(rows, { m: tint.m, d: tint.d, l: tint.l, a: tint.a, h: tint.h });
}

/** Every overlay is authored against this canvas; anything shorter is padded. */
const OVERLAY_ROWS = PLAYER_ROWS.length;
const OVERLAY_COLS = PLAYER_ROWS[0]?.length ?? 26;

function padOverlay(rows: string[]): string[] {
  const blank = '.'.repeat(OVERLAY_COLS);
  const padded = rows.slice(0, OVERLAY_ROWS).map((row) => row.padEnd(OVERLAY_COLS, '.'));
  while (padded.length < OVERLAY_ROWS) padded.push(blank);
  return padded;
}

/** Copies every filled pixel of `layer` onto `target`. */
function stampLayer(target: Pixel[][], layer: Pixel[][]): void {
  for (let y = 0; y < layer.length && y < target.length; y++) {
    const row = layer[y]!;
    for (let x = 0; x < row.length; x++) {
      const pixel = row[x]!;
      if (pixel) target[y]![x] = pixel;
    }
  }
}

/** Slots that show on the figure, in back-to-front paint order. */
const VISIBLE_SLOTS: EquipmentSlot[] = [
  'cape',
  'legs',
  'feet',
  'body',
  'hands',
  'shield',
  'weapon',
  'helm',
  'neck',
];

function overlayForSlot(slot: EquipmentSlot, itemId: string): string[] | null {
  const overlay = pickOverlay(slot, itemId);
  return overlay ? padOverlay(overlay) : null;
}

function pickOverlay(slot: EquipmentSlot, itemId: string): string[] | null {
  const { shape } = resolveIcon(itemId, 'armor');
  switch (slot) {
    case 'cape':
      return OVERLAY_CAPE;
    case 'body':
      return OVERLAY_BODY;
    case 'legs':
      return OVERLAY_LEGS;
    case 'feet':
      return OVERLAY_FEET;
    case 'hands':
      return OVERLAY_HANDS;
    case 'helm':
      return OVERLAY_HELM;
    case 'neck':
      return OVERLAY_NECK;
    case 'shield':
      return OVERLAY_SHIELD;
    case 'weapon':
      return OVERLAY_WEAPON[WEAPON_FAMILY[shape] ?? 'blade'];
    default:
      // Rings and arrows are too small to read on the figure.
      return null;
  }
}

const dressedPlayerCache = new Map<string, SpriteSheet>();

/** The hero wearing his current kit, cached per distinct loadout. */
export function getDressedPlayerSheet(equipment: EquipmentLoadout): SpriteSheet {
  const worn = VISIBLE_SLOTS.map((slot) => `${slot}:${equipment[slot] ?? ''}`).join('|');
  const cached = dressedPlayerCache.get(worn);
  if (cached) return cached;

  const frames = PLAYER_BASE.map((base) => {
    // Always compose onto a canvas the size of the base figure. Overlays may be
    // shorter than the sprite — using one as the canvas would crop his boots.
    const frame: Pixel[][] = base.map((row) => row.map(() => '' as Pixel));

    // The cape hangs behind him, so it goes down before the figure does.
    const capeId = equipment.cape;
    if (capeId) {
      stampLayer(frame, paintOverlay(padOverlay(OVERLAY_CAPE), resolveIcon(capeId, 'armor').tint));
    }
    stampLayer(frame, base);

    for (const slot of VISIBLE_SLOTS) {
      if (slot === 'cape') continue;
      const itemId = equipment[slot];
      if (!itemId) continue;
      const rows = overlayForSlot(slot, itemId);
      if (!rows) continue;
      stampLayer(frame, paintOverlay(rows, resolveIcon(itemId, 'armor').tint));
    }
    return outlineFrame(frame);
  }) as [Pixel[][], Pixel[][]];

  const sheet: SpriteSheet = { w: 26, h: 27, frames };
  dressedPlayerCache.set(worn, sheet);
  return sheet;
}

/* --------------------------------------------------------------------------
   Mid-tier creatures. These fill the level gaps between each region's
   starter mobs and its boss, so they share their neighbours' palettes.
   -------------------------------------------------------------------------- */

function makeGiantRat(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(30, 17, (p) => {
      const step = pose === 0 ? 0 : 1;
      const fur = '#6d5f4c';
      const furLight = '#9c8b70';
      const furDark = '#3a332a';
      const flesh = '#c2938f';

      // Long naked tail trailing away behind the haunches.
      p.line(6, 9, 2, 5 - step, INK, 3);
      p.line(6, 9, 2, 5 - step, flesh);
      p.line(2, 5 - step, 0, 8 - step, flesh);

      // Four scurrying legs with small pink feet.
      for (const [x, offset] of [[8, step], [12, -step], [17, -step], [21, step]] as const) {
        p.rect(x, 10, 3, 5 - offset, INK);
        p.rect(x, 10, 2, 4 - offset, furDark);
        p.rect(x - 1, 14 - offset, 4, 2, INK);
        p.pixel(x, 14 - offset, flesh);
      }

      // Low hunched barrel with a lighter back.
      p.ellipse(14, 8, 8, 4, INK);
      p.ellipse(14, 8, 7, 3, fur);
      p.polygon([[8, 6], [14, 4], [20, 7], [17, 9], [10, 9]], furLight);
      p.pixel(12, 7, fur);

      // Head: round skull, long snout, round ear, bright eye.
      p.ellipse(22, 8, 5, 4, INK);
      p.ellipse(22, 8, 4, 3, fur);
      p.polygon([[24, 5], [29, 8], [24, 11]], INK);
      p.polygon([[24, 6], [28, 8], [24, 10]], furLight);
      p.pixel(29, 8, flesh);
      p.ellipse(20, 4, 2, 2, INK);
      p.pixel(20, 4, '#8f6360');
      p.rect(22, 7, 3, 2, INK);
      p.rect(23, 7, 2, 1, '#f2d75c');
      p.pixel(23, 7, '#fff6c8');
      p.rect(25, 10, 3, 1, '#e7d9b8');
      p.line(27, 10, 29, 12, furLight);
      p.line(27, 7, 29, 5, furLight);
    });
  return { w: 30, h: 17, frames: [frame(0), frame(1)] };
}

function makeGiantFrog(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(26, 19, (p) => {
      const croak = pose === 0 ? 0 : 1;
      const green = '#5d8443';
      const greenLight = '#8cb35c';
      const greenDark = '#2f4a2c';
      const belly = '#d9d69a';

      // Folded hind legs at both flanks and splayed webbed toes.
      p.polygon([[1, 9], [7, 7], [8, 16], [0, 16]], INK);
      p.polygon([[2, 10], [6, 9], [6, 15], [1, 15]], greenDark);
      p.polygon([[18, 9], [24, 7], [25, 16], [17, 16]], INK);
      p.polygon([[19, 10], [23, 9], [24, 15], [18, 15]], green);
      for (const x of [1, 4, 18, 21]) {
        p.rect(x, 16, 4, 2, INK);
        p.rect(x, 16, 3, 1, greenLight);
      }
      p.rect(9, 16, 8, 2, INK);
      for (const x of [9, 12, 15]) p.rect(x, 16, 2, 1, greenLight);

      // Wide squat body with a pale throat that puffs on the second frame.
      p.ellipse(13, 12, 9, 5, INK);
      p.ellipse(13, 12, 8, 4, green);
      p.polygon([[6, 10], [13, 8], [20, 10], [18, 13], [8, 13]], greenLight);
      p.ellipse(13, 14 + croak, 5, 2 + croak, belly);
      p.pixel(9, 11, greenDark);
      p.pixel(17, 13, greenDark);

      // Broad flat head with a wide grinning mouth.
      p.ellipse(13, 7, 9, 4, INK);
      p.ellipse(13, 7, 8, 3, green);
      p.polygon([[7, 5], [13, 3], [19, 5], [18, 7], [8, 7]], greenLight);
      p.line(6, 9, 20, 9, greenDark, 2);
      p.line(7, 10, 19, 10, '#243a24');
      p.pixel(6, 8, greenDark);
      p.pixel(20, 8, greenDark);
      p.pixel(11, 6, greenDark);
      p.pixel(15, 6, greenDark);

      // Two big bulging eyes riding on top of the skull.
      for (const [ex, iris] of [[7, '#efd657'], [19, '#fbe87a']] as const) {
        p.ellipse(ex, 3, 4, 3, INK);
        p.ellipse(ex, 3, 3, 2, iris);
        p.rect(ex, 2, 1, 3, '#1d1a12');
        p.pixel(ex - 1, 2, '#fffbe0');
      }
    });
  return { w: 26, h: 19, frames: [frame(0), frame(1)] };
}

function makeThug(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(22, 29, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const jerkin = '#4b3a2c';
      const jerkinLight = '#6d553c';
      const cloth = '#6b2f2c';
      const iron = '#8d8f8c';

      // Cudgel resting on the shoulder.
      p.line(17, 9, 20 - stride, 24, INK, 4);
      p.line(17, 9, 20 - stride, 24, '#6d4a2a', 2);
      p.ellipse(17, 8, 3, 3, INK);
      p.ellipse(17, 8, 2, 2, iron);

      // Heavy boots and patched trousers.
      p.rect(5 - stride, 21, 5, 7, INK);
      p.rect(12 + stride, 21, 5, 7, INK);
      p.rect(6 - stride, 21, 3, 5, '#3d3226');
      p.rect(13 + stride, 21, 3, 5, '#4a3d2d');
      p.rect(3 - stride, 26, 8, 3, INK);
      p.rect(11 + stride, 26, 8, 3, INK);
      p.rect(4 - stride, 26, 6, 2, '#2b241c');
      p.rect(12 + stride, 26, 6, 2, '#2b241c');

      // Thick arms, sleeveless jerkin and a rope belt.
      p.line(5, 13, 2 + stride, 21, INK, 5);
      p.line(5, 14, 3 + stride, 20, SKIN_SHADE, 3);
      p.line(16, 13, 18 - stride, 20, INK, 5);
      p.line(16, 14, 17 - stride, 19, SKIN, 3);
      p.polygon([[5, 11], [16, 11], [18, 21], [4, 21]], INK);
      p.polygon([[6, 12], [15, 12], [17, 20], [5, 20]], jerkin);
      p.polygon([[10, 12], [15, 12], [16, 20], [11, 20]], jerkinLight);
      p.rect(5, 18, 12, 2, '#2d2418');
      p.pixel(11, 18, '#b9903a');

      // Scarred face under a red bandana.
      p.ellipse(11, 7, 5, 6, INK);
      p.ellipse(11, 7, 4, 5, SKIN);
      p.rect(7, 4, 9, 3, INK);
      p.rect(7, 4, 8, 2, cloth);
      p.pixel(9, 5, '#8f3f3a');
      p.rect(8, 7, 2, 2, INK);
      p.rect(12, 7, 2, 2, INK);
      p.pixel(9, 7, '#c7d3c0');
      p.pixel(13, 7, '#e2ece0');
      p.line(9, 10, 13, 10, '#7a4038');
      p.line(13, 5, 14, 9, '#a8695a');
      p.pixel(12, 9, SKIN_SHADE);
    });
  return { w: 22, h: 29, frames: [frame(0), frame(1)] };
}

function makeMineScorpion(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(32, 22, (p) => {
      const flick = pose === 0 ? 0 : 1;
      const chitin = '#4a3b46';
      const chitinLight = '#7b5f6a';
      const chitinDark = '#231b21';
      const sting = '#ddcb94';

      // Eight thin legs braced out from under the plates.
      for (const [x, offset] of [[9, flick], [13, -flick], [17, -flick], [21, flick]] as const) {
        p.line(x, 15, x - 4, 20 + offset, chitinDark);
        p.line(x + 1, 15, x + 4, 20 - offset, chitinDark);
        p.pixel(x - 4, 20 + offset, chitinLight);
        p.pixel(x + 4, 20 - offset, chitinLight);
      }

      // Tail arcing up over the back, segment by segment, tipped by a stinger.
      const tail: [number, number][] = [
        [7, 12],
        [4, 9 - flick],
        [5, 5 - flick],
        [10, 2 - flick],
        [16, 1 - flick],
        [21, 3 - flick],
      ];
      for (const [tx, ty] of tail) {
        p.ellipse(tx, ty, 3, 3, INK);
        p.ellipse(tx, ty, 2, 2, chitin);
        p.pixel(tx - 1, ty - 1, chitinLight);
      }
      p.polygon([[23, 2 - flick], [27, 8 - flick], [22, 6 - flick]], INK);
      p.polygon([[23, 3 - flick], [26, 7 - flick], [22, 5 - flick]], sting);

      // Three plated body segments with visible seams.
      for (const [bx, tone] of [[10, chitin], [15, chitinLight], [20, chitin]] as const) {
        p.ellipse(bx, 14, 5, 4, INK);
        p.ellipse(bx, 14, 4, 3, tone);
        p.line(bx - 2, 12, bx + 2, 12, '#96788a');
      }
      p.line(12, 11, 12, 17, INK);
      p.line(18, 11, 18, 17, INK);

      // Small head with two forward eyes and a pair of raised pincers.
      p.ellipse(25, 14, 4, 3, INK);
      p.ellipse(25, 14, 3, 2, chitin);
      p.pixel(25, 13, '#f0d15c');
      p.pixel(27, 13, '#ffe57a');
      for (const [cy, tip] of [[10 - flick, 7 - flick], [18 + flick, 21 + flick]] as const) {
        p.line(26, 14, 29, cy, INK, 3);
        p.line(26, 14, 29, cy, chitin);
        p.polygon([[27, cy], [32, tip], [32, cy], [29, cy + (tip > cy ? 2 : -2)]], INK);
        p.polygon([[28, cy], [31, tip], [31, cy]], chitinLight);
      }
    });
  return { w: 32, h: 22, frames: [frame(0), frame(1)] };
}

function makeManorGhoul(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(24, 28, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const hide = '#8a8a6d';
      const hideLight = '#b0ad86';
      const hideDark = '#4c4c3c';
      const rag = '#40342c';

      // Bandy legs and bare clawed feet.
      p.rect(6 - stride, 20, 5, 7, INK);
      p.rect(13 + stride, 20, 5, 7, INK);
      p.rect(7 - stride, 20, 3, 5, hideDark);
      p.rect(14 + stride, 20, 3, 5, hide);
      p.rect(4 - stride, 25, 8, 3, INK);
      p.rect(12 + stride, 25, 8, 3, INK);
      p.pixel(5 - stride, 26, hideLight);
      p.pixel(19 + stride, 26, hideLight);

      // Long dangling arms with hooked fingers.
      p.line(5, 12, 2 + stride, 22, INK, 5);
      p.line(5, 13, 3 + stride, 21, hideDark, 3);
      p.line(18, 12, 21 - stride, 22, INK, 5);
      p.line(18, 13, 20 - stride, 21, hide, 3);
      p.line(2 + stride, 22, 1 + stride, 25, hideLight, 2);
      p.line(21 - stride, 22, 22 - stride, 25, hideLight, 2);

      // Gaunt ribbed torso in a rotted shroud.
      p.polygon([[6, 10], [17, 10], [19, 20], [4, 20]], INK);
      p.polygon([[7, 11], [16, 11], [17, 19], [6, 19]], hide);
      p.polygon([[7, 14], [16, 14], [17, 19], [6, 19]], rag);
      for (const y of [12, 14]) {
        p.line(9, y, 14, y, hideDark);
      }
      p.pixel(11, 13, hideLight);

      // Skull-like head with a lolling jaw and sunken eyes.
      p.ellipse(11, 6, 6, 6, INK);
      p.ellipse(11, 6, 5, 5, hide);
      p.rect(7, 5, 3, 3, '#241f1c');
      p.rect(12, 5, 3, 3, '#241f1c');
      p.pixel(8, 6, '#d9e2a8');
      p.pixel(13, 6, '#f0f4c4');
      p.polygon([[8, 9], [15, 9], [14, 13], [10, 13]], INK);
      p.polygon([[9, 9], [14, 9], [13, 12], [10, 12]], '#c9c49a');
      for (const x of [10, 12]) p.pixel(x, 11, '#786f52');
      p.pixel(16, 5, hideLight);
    });
  return { w: 24, h: 28, frames: [frame(0), frame(1)] };
}

function makeBanshee(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(24, 31, (p) => {
      const drift = pose === 0 ? 0 : 1;
      const shroud = '#5c6f74';
      const shroudLight = '#93a7a4';
      const shroudDark = '#33454a';
      const wail = '#c9ecd8';

      // Tattered trailing shroud instead of legs.
      p.polygon([[6, 14], [18, 14], [21, 24], [17, 30], [14, 26], [11, 31], [8, 26], [3, 29], [3, 22]], INK);
      p.polygon([[7, 15], [17, 15], [19, 23], [16, 28], [13, 24], [10, 29], [7, 24], [5, 27], [5, 22]], shroud);
      p.polygon([[11, 16], [17, 17], [16, 26], [12, 28]], shroudDark);

      // Trailing sleeves and thin grasping hands.
      p.line(6, 16, 1 + drift, 24, INK, 5);
      p.line(6, 16, 2 + drift, 23, shroudLight, 3);
      p.line(18, 16, 22 - drift, 23, INK, 5);
      p.line(18, 16, 21 - drift, 22, shroudLight, 3);
      p.pixel(1 + drift, 25, wail);
      p.pixel(22 - drift, 24, wail);

      // Veiled head with hollow eyes and an open, screaming mouth.
      p.ellipse(12, 9, 7, 8, INK);
      p.ellipse(12, 9, 6, 7, shroudLight);
      p.polygon([[5, 9], [7, 2], [12, 0], [18, 3], [19, 11], [16, 7], [12, 4], [8, 8]], shroud);
      p.rect(8, 7, 3, 3, '#1c282b');
      p.rect(13, 7, 3, 3, '#1c282b');
      p.pixel(9, 8, wail);
      p.pixel(14, 8, '#eafff0');
      p.ellipse(12, 13, 2, 3, '#1c282b');
      p.ellipse(12, 12, 1, 1, wail);
      // Sound rings escaping the veil.
      p.line(2, 11 - drift, 4, 11 - drift, wail);
      p.line(20, 12 + drift, 22, 12 + drift, wail);
    });
  return { w: 24, h: 31, frames: [frame(0), frame(1)] };
}

function makeTzKih(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(22, 24, (p) => {
      const hop = pose === 0 ? 0 : 1;
      const rock = '#453637';
      const rockLight = '#6d5250';
      const rockDark = '#241d1e';
      const magma = '#e0491f';
      const ember = '#ffb038';

      // Membranous wings spread behind the shoulders.
      p.polygon([[8, 13], [1, 5 - hop], [0, 14], [6, 18]], INK);
      p.polygon([[8, 13], [3, 7 - hop], [2, 14], [7, 17]], '#6d2a1c');
      p.line(4, 9 - hop, 6, 16, '#8f3a24');
      p.polygon([[20, 13], [27, 5 + hop], [28, 14], [22, 18]], INK);
      p.polygon([[20, 13], [25, 7 + hop], [26, 14], [21, 17]], '#8f3a24');
      p.line(24, 9 + hop, 22, 16, '#b04a2c');

      // Two stubby legs with clawed feet.
      p.rect(8, 19 - hop, 5, 5 + hop, INK);
      p.rect(15, 19 - hop, 5, 5 + hop, INK);
      p.rect(9, 19 - hop, 3, 4 + hop, rockDark);
      p.rect(16, 19 - hop, 3, 4 + hop, rock);
      p.rect(6, 23, 8, 3, INK);
      p.rect(14, 23, 8, 3, INK);
      for (const x of [7, 10, 15, 18]) p.pixel(x, 24, rockLight);

      // Squat basalt torso with a glowing seam.
      p.ellipse(14, 16, 7, 6, INK);
      p.ellipse(14, 16, 6, 5, rock);
      p.polygon([[9, 13], [14, 11], [19, 13], [18, 17], [10, 17]], rockLight);
      p.line(11, 13, 17, 19, magma, 2);
      p.pixel(14, 16, ember);

      // Imp head kept lighter than the torso so the silhouette reads.
      p.ellipse(14, 7, 7, 6, INK);
      p.ellipse(14, 7, 6, 5, rockLight);
      p.polygon([[9, 6], [14, 2], [19, 6], [18, 9], [10, 9]], '#8a6a63');
      p.polygon([[7, 4], [4, 0], [10, 3]], INK);
      p.polygon([[8, 4], [6, 1], [10, 4]], rock);
      p.polygon([[21, 4], [24, 0], [18, 3]], INK);
      p.polygon([[20, 4], [22, 1], [18, 4]], rock);
      // Sunken burning eyes and a small toothy mouth.
      p.rect(10, 6, 3, 2, rockDark);
      p.rect(16, 6, 3, 2, rockDark);
      p.pixel(11, 6, ember);
      p.pixel(17, 6, '#ffd25c');
      p.line(12, 10, 17, 10, rockDark, 1);
      p.pixel(13, 11, '#f6e3b6');
      p.pixel(16, 11, '#f6e3b6');
      p.pixel(14, 3, magma);
    });
  return { w: 28, h: 26, frames: [frame(0), frame(1)] };
}

function makeYtMejKot(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(34, 34, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const rock = '#2f2a2c';
      const rockLight = '#584241';
      const magma = '#d8401d';
      const ember = '#ffa22c';

      // Wide stance on heavy obsidian legs.
      p.rect(6 - stride, 25, 9, 8, INK);
      p.rect(19 + stride, 25, 9, 8, INK);
      p.rect(7 - stride, 25, 7, 6, rock);
      p.rect(20 + stride, 25, 7, 6, rockLight);
      p.rect(3 - stride, 31, 12, 3, INK);
      p.rect(18 + stride, 31, 13, 3, INK);

      // Enormous shoulders and long simian arms.
      p.ellipse(4, 20, 6, 10, INK);
      p.ellipse(4, 20, 5, 9, rock);
      p.ellipse(29, 19, 6, 10, INK);
      p.ellipse(29, 19, 5, 9, rockLight);
      p.ellipse(3, 29, 4, 4, INK);
      p.ellipse(30, 28, 4, 4, INK);
      p.ellipse(3, 29, 3, 3, rock);
      p.ellipse(30, 28, 3, 3, rockLight);

      // Barrel torso with glowing fissures.
      p.polygon([[7, 11], [26, 11], [31, 25], [24, 29], [10, 29], [3, 25]], INK);
      p.polygon([[9, 12], [25, 12], [28, 24], [22, 27], [11, 27], [6, 24]], rock);
      p.line(10, 14, 24, 26, magma, 3);
      p.line(24, 13, 11, 26, '#8c2f18', 2);
      p.ellipse(17, 20, 3, 3, ember);
      p.pixel(17, 19, '#ffe9a8');

      // Broad brow, sunken burning eyes and a heavy tusked jaw.
      p.ellipse(17, 8, 10, 8, INK);
      p.polygon([[8, 8], [11, 1], [17, 0], [25, 3], [26, 10], [22, 15], [12, 15]], rock);
      p.polygon([[10, 8], [13, 3], [18, 2], [24, 5], [23, 11], [20, 13], [12, 12]], rockLight);
      p.rect(12, 6, 4, 2, '#1b1517');
      p.rect(19, 6, 4, 2, '#1b1517');
      p.pixel(13, 7, ember);
      p.pixel(21, 7, '#ffd25c');
      p.line(11, 12, 23, 12, INK, 2);
      p.polygon([[12, 12], [13, 16], [15, 12]], '#e8d6ae');
      p.polygon([[20, 12], [22, 16], [23, 12]], '#e8d6ae');
      p.pixel(17, 3, magma);
    });
  return { w: 34, h: 34, frames: [frame(0), frame(1)] };
}

function makeDragonWhelp(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(34, 26, (p) => {
      const flap = pose === 0 ? 0 : 2;
      const green = '#4b7a4e';
      const greenLight = '#78a865';
      const greenDark = '#26402d';
      const belly = '#bfa870';
      const horn = '#ded3ae';

      // Spaded tail sweeping out behind the haunches.
      p.line(8, 15, 3, 20 + flap, INK, 5);
      p.line(8, 15, 4, 19 + flap, greenDark, 3);
      p.polygon([[3, 19 + flap], [0, 23 + flap], [5, 23 + flap]], INK);
      p.polygon([[3, 20 + flap], [1, 22 + flap], [4, 22 + flap]], green);

      // One large ribbed wing rising off the back.
      p.polygon([[13, 12], [8, 2 - flap], [16, 6 - flap], [20, 1 - flap], [22, 12]], INK);
      p.polygon([[14, 12], [10, 4 - flap], [16, 8 - flap], [19, 3 - flap], [20, 12]], green);
      p.line(11, 5 - flap, 15, 11, greenLight);
      p.line(16, 7 - flap, 17, 11, greenLight);
      p.line(19, 4 - flap, 20, 11, greenLight);

      // Four short legs, thigh then shin, with pale claws.
      for (const [x, step] of [[10, flap / 2], [15, -flap / 2], [20, -flap / 2], [24, flap / 2]] as const) {
        p.rect(x, 16, 5, 6 + step, INK);
        p.rect(x + 1, 16, 3, 5 + step, x > 17 ? green : greenDark);
        p.rect(x - 1, 21 + step, 7, 3, INK);
        p.line(x - 1, 22 + step, x + 5, 22 + step, horn);
      }

      // Chubby barrel body with a plated belly.
      p.ellipse(17, 14, 10, 5, INK);
      p.ellipse(17, 14, 9, 4, green);
      p.polygon([[10, 12], [17, 10], [25, 12], [23, 16], [12, 16]], greenLight);
      p.polygon([[13, 16], [23, 16], [22, 18], [14, 18]], belly);

      // Neck and an oversized hatchling head with a snout.
      p.polygon([[23, 9], [28, 6], [30, 13], [24, 15]], INK);
      p.polygon([[24, 10], [27, 8], [28, 13], [24, 14]], green);
      p.ellipse(28, 8, 5, 5, INK);
      p.ellipse(28, 8, 4, 4, greenLight);
      p.polygon([[30, 6], [34, 9], [30, 12]], INK);
      p.polygon([[30, 7], [33, 9], [30, 11]], green);
      p.polygon([[25, 4], [23, 0], [28, 3]], INK);
      p.polygon([[26, 4], [24, 1], [28, 4]], horn);
      p.polygon([[31, 4], [34, 1], [32, 6]], horn);
      p.rect(28, 7, 2, 2, INK);
      p.pixel(28, 7, '#f7dd5f');
      p.line(30, 11, 33, 11, INK);
      p.pixel(31, 11, horn);
      p.pixel(33, 9, '#e08a3d');
    });
  return { w: 34, h: 26, frames: [frame(0), frame(1)] };
}

function makeDagannothSpawn(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(32, 26, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const hide = '#4b7062';
      const hideLight = '#74907f';
      const hideDark = '#263b38';
      const fin = '#4e7285';
      const tooth = '#e6ddc0';

      // Whipping tail and two short hind legs.
      p.line(9, 16, 1, 21 - stride, INK, 5);
      p.line(9, 16, 2, 20 - stride, hideDark, 3);
      p.rect(7 - stride, 18, 6, 7, INK);
      p.rect(20 + stride, 18, 6, 7, INK);
      p.rect(8 - stride, 18, 4, 5, hide);
      p.rect(21 + stride, 18, 4, 5, hideLight);
      p.rect(5 - stride, 23, 9, 3, INK);
      p.rect(19 + stride, 23, 10, 3, INK);

      // Hunched amphibious body with a dorsal fin.
      p.ellipse(16, 15, 11, 7, INK);
      p.ellipse(16, 15, 10, 6, hide);
      p.polygon([[8, 11], [13, 5], [18, 9], [23, 4], [26, 12]], fin);
      p.line(10, 13, 6 + stride, 19, INK, 4);
      p.line(10, 13, 7 + stride, 18, hide, 2);
      p.line(23, 12, 27 - stride, 18, INK, 4);
      p.line(23, 12, 26 - stride, 17, hideLight, 2);

      // Broad toothed head with gill slits.
      p.ellipse(22, 8, 8, 6, INK);
      p.polygon([[14, 7], [18, 2], [26, 2], [31, 6], [30, 11], [24, 14], [16, 12]], hide);
      p.polygon([[19, 3], [25, 3], [29, 6], [26, 9], [18, 8]], hideLight);
      p.pixel(19, 6, '#e2cf4e');
      p.pixel(27, 6, '#fff079');
      p.polygon([[16, 9], [30, 9], [26, 14], [18, 13]], INK);
      p.line(18, 10, 28, 10, '#6d413d', 2);
      for (const x of [19, 22, 25, 27] as const) p.pixel(x, 10, tooth);
      p.line(15, 6, 12, 4, fin, 2);
      p.line(15, 9, 11, 9, fin, 2);
    });
  return { w: 32, h: 26, frames: [frame(0), frame(1)] };
}

function makeCryptWraith(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(26, 32, (p) => {
      const drift = pose === 0 ? 0 : 1;
      const robe = '#2b2a3a';
      const robeLight = '#4a4860';
      const bone = '#d6ccb0';
      const soul = '#7fb6ef';

      // Ragged hovering robe with no feet.
      p.polygon([[6, 12], [20, 12], [24, 25], [19, 31], [15, 27], [11, 32], [7, 27], [2, 30], [2, 24]], INK);
      p.polygon([[7, 13], [19, 13], [22, 24], [18, 29], [14, 25], [10, 30], [7, 25], [4, 28], [4, 23]], robe);
      p.polygon([[13, 14], [19, 15], [18, 27], [14, 29]], '#1b1a26');
      p.line(8, 18, 18, 26, robeLight, 2);

      // Skeletal arms holding a rusted sickle.
      p.line(6, 15, 2 + drift, 23, INK, 5);
      p.line(6, 15, 3 + drift, 22, robeLight, 3);
      p.line(20, 15, 24 - drift, 23, INK, 5);
      p.line(20, 15, 23 - drift, 22, robeLight, 3);
      p.ellipse(2 + drift, 24, 2, 2, bone);
      p.ellipse(24 - drift, 24, 2, 2, bone);
      p.line(24, 24, 25, 8, INK, 3);
      p.line(24, 24, 25, 9, '#6d5236', 1);
      p.polygon([[25, 9], [19, 4], [24, 5]], '#9aa0a2');

      // Deep cowl with a skull and two soul-lights.
      p.ellipse(13, 9, 8, 9, INK);
      p.polygon([[4, 11], [6, 3], [13, 0], [21, 4], [22, 13], [18, 8], [13, 5], [8, 9]], robe);
      p.ellipse(13, 10, 5, 5, bone);
      p.rect(9, 9, 3, 3, '#15141c');
      p.rect(14, 9, 3, 3, '#15141c');
      p.pixel(10, 10, soul);
      p.pixel(15, 10, '#bfe1ff');
      p.line(11, 14, 15, 14, '#8d846b');
      p.pixel(13, 13, '#a79c80');
      p.polygon([[5, 10], [7, 4], [12, 1], [19, 5], [20, 11], [16, 6], [11, 4], [8, 8]], '#211f2c');
    });
  return { w: 26, h: 32, frames: [frame(0), frame(1)] };
}

function makeGraveTitan(): SpriteSheet {
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(34, 36, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const bone = '#cec4a6';
      const boneLight = '#efe6cb';
      const boneShade = '#8b8371';
      const grave = '#3d4a5c';
      const soul = '#6f9cd8';

      // Tomb-slab shoulders and a rag cape behind the frame.
      p.polygon([[6, 12], [28, 12], [31, 32], [22, 29], [17, 35], [3, 31]], INK);
      p.polygon([[8, 13], [26, 13], [28, 30], [21, 27], [17, 33], [6, 29]], grave);

      // Thick fused leg bones and slab feet.
      p.rect(8 - stride, 24, 7, 9, INK);
      p.rect(19 + stride, 24, 7, 9, INK);
      p.rect(9 - stride, 24, 5, 7, boneShade);
      p.rect(20 + stride, 24, 5, 7, bone);
      p.rect(5 - stride, 31, 11, 4, INK);
      p.rect(18 + stride, 31, 12, 4, INK);
      p.rect(7 - stride, 31, 8, 3, boneShade);
      p.rect(19 + stride, 31, 9, 3, bone);

      // Massive arms; one drags a slab club.
      p.ellipse(5, 19, 5, 9, INK);
      p.ellipse(5, 19, 4, 8, boneShade);
      p.ellipse(28, 18, 5, 9, INK);
      p.ellipse(28, 18, 4, 8, bone);
      p.line(30, 20, 32, 34, INK, 4);
      p.line(30, 20, 32, 33, '#6d5236', 2);
      p.rect(26, 12, 8, 8, INK);
      p.rect(27, 13, 6, 6, boneShade);
      p.pixel(29, 15, soul);

      // Ribcage torso packed with grave earth.
      p.polygon([[9, 12], [25, 12], [28, 24], [21, 28], [12, 28], [6, 24]], INK);
      p.polygon([[10, 13], [24, 13], [26, 23], [20, 26], [13, 26], [8, 23]], grave);
      for (const y of [15, 18, 21]) {
        p.line(17, y, 10, y - 1, bone, 2);
        p.line(17, y, 24, y - 1, boneLight, 2);
      }
      p.line(17, 13, 17, 25, boneShade, 3);
      p.ellipse(17, 19, 2, 3, soul);

      // Cracked colossal skull with burning sockets.
      p.ellipse(17, 8, 9, 8, INK);
      p.ellipse(17, 8, 8, 7, bone);
      p.rect(9, 8, 17, 5, bone);
      p.rect(11, 6, 5, 4, '#1d1d24');
      p.rect(19, 6, 5, 4, '#1d1d24');
      p.pixel(13, 8, soul);
      p.pixel(21, 8, '#bcd8ff');
      p.line(12, 13, 23, 13, INK, 2);
      for (const x of [13, 16, 19, 22] as const) p.pixel(x, 13, boneLight);
      p.line(16, 1, 14, 6, boneShade);
      p.line(21, 2, 23, 5, boneShade);
    });
  return { w: 34, h: 36, frames: [frame(0), frame(1)] };
}

function makeOrcSoldier(rank: 'grunt' | 'elite'): SpriteSheet {
  const elite = rank === 'elite';
  const width = elite ? 30 : 28;
  const height = elite ? 34 : 32;
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(width, height, (p) => {
      const shift = pose === 0 ? 0 : -1;
      const skin = elite ? '#4f7248' : '#6a8a56';
      const skinLight = elite ? '#7c9c62' : '#93b073';
      const skinDark = '#31482f';
      const iron = elite ? '#3f3d40' : '#5b544c';
      const ironLight = elite ? '#7e7c80' : '#8b8378';
      const leather = '#5c3927';
      const cx = Math.floor(width / 2);

      // Axe for the grunt, glaive for the elite.
      if (elite) {
        p.line(cx + 10 + shift, 4, cx + 12, height - 2, INK, 4);
        p.line(cx + 10 + shift, 4, cx + 12, height - 2, leather, 2);
        p.polygon(
          [
            [cx + 6 + shift, 2],
            [cx + 14 + shift, 0],
            [cx + 12 + shift, 8],
            [cx + 8 + shift, 7],
          ],
          INK
        );
        p.polygon(
          [
            [cx + 7 + shift, 3],
            [cx + 13 + shift, 1],
            [cx + 11 + shift, 7],
            [cx + 9 + shift, 6],
          ],
          ironLight
        );
      } else {
        p.line(cx + 9 + shift, 8, cx + 10, height - 4, INK, 4);
        p.line(cx + 9 + shift, 8, cx + 10, height - 4, leather, 2);
        p.polygon(
          [
            [cx + 5 + shift, 5],
            [cx + 12 + shift, 6],
            [cx + 10 + shift, 12],
            [cx + 6 + shift, 10],
          ],
          INK
        );
        p.polygon(
          [
            [cx + 6 + shift, 6],
            [cx + 11 + shift, 7],
            [cx + 9 + shift, 11],
            [cx + 7 + shift, 9],
          ],
          ironLight
        );
      }

      // Legs, hide kilt and iron-shod boots.
      p.rect(cx - 8 - (pose ? 1 : 0), height - 12, 7, 8, INK);
      p.rect(cx + 1 + (pose ? 1 : 0), height - 12, 7, 8, INK);
      p.rect(cx - 7 - (pose ? 1 : 0), height - 12, 5, 6, leather);
      p.rect(cx + 2 + (pose ? 1 : 0), height - 12, 5, 6, '#77503a');
      p.rect(cx - 10, height - 4, 10, 4, iron);
      p.rect(cx, height - 4, 11, 4, iron);

      // Corded arms and a studded chest harness.
      p.ellipse(cx - 10, 19, 5, 8, INK);
      p.ellipse(cx - 10, 19, 4, 7, skinDark);
      p.ellipse(cx + 10, 18, 5, 8, INK);
      p.ellipse(cx + 10, 18, 4, 7, skin);
      p.polygon(
        [
          [cx - 8, 11],
          [cx + 8, 11],
          [cx + 12, 24],
          [cx + 6, 28],
          [cx - 6, 28],
          [cx - 12, 24],
        ],
        INK
      );
      p.polygon(
        [
          [cx - 7, 12],
          [cx + 7, 12],
          [cx + 10, 23],
          [cx + 5, 26],
          [cx - 5, 26],
          [cx - 10, 23],
        ],
        elite ? iron : skin
      );
      p.line(cx - 7, 13, cx + 7, 25, leather, 3);
      p.line(cx + 7, 13, cx - 7, 25, leather, 2);
      p.ellipse(cx, 19, 3, 3, INK);
      p.ellipse(cx, 19, 2, 2, '#b98f36');
      if (elite) {
        // Spiked pauldrons mark the Kor'kron guard.
        p.ellipse(cx - 9, 13, 6, 4, INK);
        p.ellipse(cx - 9, 13, 5, 3, iron);
        p.polygon([[cx - 13, 11], [cx - 15, 6], [cx - 9, 11]], '#d5c7a3');
        p.ellipse(cx + 9, 13, 6, 4, INK);
        p.ellipse(cx + 9, 13, 5, 3, ironLight);
        p.polygon([[cx + 12, 11], [cx + 15, 6], [cx + 9, 11]], '#e3d8b7');
      }

      // Tusked orc face with a bound topknot.
      p.ellipse(cx, 8, 7, 7, INK);
      p.ellipse(cx, 8, 6, 6, skin);
      p.rect(cx - 5, 9, 11, 5, skin);
      p.polygon([[cx - 5, 11], [cx + 5, 11], [cx + 4, 16], [cx - 4, 16]], skinDark);
      p.pixel(cx - 3, 8, '#e2c456');
      p.pixel(cx + 4, 8, '#f6dc6e');
      p.line(cx - 4, 13, cx + 5, 13, INK, 2);
      p.rect(cx - 6, 12, 2, 3, '#eadbb8');
      p.rect(cx + 5, 12, 2, 3, '#eadbb8');
      p.polygon([[cx - 6, 5], [cx - 4, 1], [cx + 2, 0], [cx + 6, 3], [cx + 6, 6], [cx + 1, 4], [cx - 3, 4]], '#29231f');
      p.line(cx, 1, cx + (elite ? 4 : 3), -3, '#3f2b22', 2);
      p.pixel(cx + 5, 5, skinLight);
      if (elite) {
        p.rect(cx - 6, 4, 13, 2, iron);
        p.pixel(cx, 5, '#b98f36');
      }
    });
  return { w: width, h: height, frames: [frame(0), frame(1)] };
}

function makeSpiritual(rank: 'warrior' | 'mage'): SpriteSheet {
  const mage = rank === 'mage';
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(26, 33, (p) => {
      const drift = pose === 0 ? 0 : 1;
      const spirit = mage ? '#5c6ea8' : '#4f7a72';
      const spiritLight = mage ? '#93a6dd' : '#83aca0';
      const spiritDark = mage ? '#2d3660' : '#26433f';
      const plate = '#7d7a72';
      const glow = mage ? '#c8d6ff' : '#c5efdf';

      if (mage) {
        // Floating rune staff wreathed in cold light.
        p.line(22 - drift, 5, 23 - drift, 31, INK, 4);
        p.line(22 - drift, 5, 23 - drift, 31, '#4b4a5c', 2);
        p.ellipse(22 - drift, 4, 4, 4, INK);
        p.ellipse(22 - drift, 4, 3, 3, spiritLight);
        p.pixel(22 - drift, 3, glow);
      } else {
        // Spectral greatsword held across the body.
        p.line(3 + drift, 6, 21, 27, INK, 5);
        p.line(3 + drift, 6, 21, 27, plate, 3);
        p.polygon([[1 + drift, 3], [6 + drift, 4], [4 + drift, 9]], glow);
        p.line(17, 21, 23, 25, '#5c4a36', 3);
      }

      // Dissolving lower body — these soldiers never touch the floor.
      p.polygon([[7, 13], [19, 13], [23, 25], [18, 32], [13, 27], [8, 32], [3, 25]], INK);
      p.polygon([[8, 14], [18, 14], [21, 24], [17, 30], [13, 25], [9, 30], [5, 24]], spirit);
      p.polygon([[13, 15], [18, 16], [17, 28], [13, 29]], spiritDark);
      p.line(9, 19, 18, 27, spiritLight, 2);

      // Armoured arms and a faction breastplate.
      p.line(7, 15, 3 + drift, 23, INK, 5);
      p.line(7, 15, 4 + drift, 22, spirit, 3);
      p.line(19, 15, 23 - drift, 23, INK, 5);
      p.line(19, 15, 22 - drift, 22, spiritLight, 3);
      p.polygon([[7, 12], [19, 12], [21, 22], [17, 25], [9, 25], [5, 22]], INK);
      p.polygon([[8, 13], [18, 13], [19, 21], [16, 23], [10, 23], [7, 21]], mage ? spirit : plate);
      p.ellipse(13, 18, 3, 3, INK);
      p.ellipse(13, 18, 2, 2, glow);
      p.rect(9, 22, 9, 2, spiritDark);

      // Hollow helm with two points of soul-light.
      p.ellipse(13, 8, 7, 8, INK);
      p.ellipse(13, 8, 6, 7, mage ? spiritDark : plate);
      p.rect(7, 7, 13, 5, mage ? spirit : '#5f5c55');
      p.rect(9, 7, 3, 2, '#15161f');
      p.rect(15, 7, 3, 2, '#15161f');
      p.pixel(10, 7, glow);
      p.pixel(16, 7, glow);
      p.rect(12, 7, 2, 6, spiritLight);
      if (mage) {
        // Pointed hood.
        p.polygon([[6, 8], [9, 1], [13, 0], [19, 4], [20, 10], [16, 6], [10, 6]], spiritDark);
        p.pixel(13, 2, glow);
      } else {
        // Crested war helm.
        p.polygon([[8, 4], [12, 0], [15, 0], [19, 4], [18, 6], [9, 6]], INK);
        p.polygon([[9, 4], [12, 1], [15, 1], [18, 4], [17, 5], [10, 5]], plate);
        p.rect(12, 0, 2, 4, glow);
      }
    });
  return { w: 26, h: 33, frames: [frame(0), frame(1)] };
}


function makeCyclops(rank: 'common' | 'elder'): SpriteSheet {
  const elder = rank === 'elder';
  const width = elder ? 34 : 30;
  const height = elder ? 38 : 34;
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(width, height, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const hide = elder ? '#7f6a4e' : '#96805f';
      const hideLight = elder ? '#a48a66' : '#bda37c';
      const hideDark = '#4d3f2c';
      const iron = '#565049';
      const cx = Math.floor(width / 2);

      // Club resting over one shoulder.
      p.line(cx + 9, 6, cx + 12, height - 6, INK, 5);
      p.line(cx + 9, 6, cx + 12, height - 6, '#6b4a2a', 3);
      p.ellipse(cx + 9, 5, 6, 5, INK);
      p.ellipse(cx + 9, 5, 5, 4, '#7d5a33');
      for (const [ox, oy] of [[-2, -2], [2, -1], [0, 2]] as const) {
        p.pixel(cx + 9 + ox, 5 + oy, iron);
      }

      // Tree-trunk legs and broad feet.
      p.rect(cx - 9 - stride, height - 13, 8, 10, INK);
      p.rect(cx + 2 + stride, height - 13, 8, 10, INK);
      p.rect(cx - 8 - stride, height - 13, 6, 8, hideDark);
      p.rect(cx + 3 + stride, height - 13, 6, 8, hide);
      p.rect(cx - 11, height - 4, 11, 4, INK);
      p.rect(cx + 1, height - 4, 12, 4, INK);
      p.rect(cx - 10, height - 4, 9, 3, hideDark);
      p.rect(cx + 2, height - 4, 10, 3, hide);

      // Slab torso with a hide wrap.
      p.polygon(
        [
          [cx - 10, 12],
          [cx + 10, 12],
          [cx + 13, 24],
          [cx + 7, 28],
          [cx - 7, 28],
          [cx - 13, 24],
        ],
        INK
      );
      p.polygon(
        [
          [cx - 9, 13],
          [cx + 9, 13],
          [cx + 11, 23],
          [cx + 6, 26],
          [cx - 6, 26],
          [cx - 11, 23],
        ],
        hide
      );
      p.polygon([[cx - 9, 13], [cx - 3, 14], [cx - 4, 26], [cx - 6, 26], [cx - 11, 23]], hideDark);
      p.rect(cx - 8, 22, 16, 3, '#5c4326');
      p.pixel(cx, 23, '#b98f36');

      // Long arms with heavy fists.
      p.ellipse(cx - 12, 19, 5, 9, INK);
      p.ellipse(cx - 12, 19, 4, 8, hideDark);
      p.ellipse(cx + 12, 18, 5, 9, INK);
      p.ellipse(cx + 12, 18, 4, 8, hideLight);
      p.ellipse(cx - 12, 27, 4, 4, INK);
      p.ellipse(cx - 12, 27, 3, 3, hide);

      // One-eyed head: heavy brow, single eye, tusked underbite.
      p.ellipse(cx, 8, 9, 8, INK);
      p.ellipse(cx, 8, 8, 7, hide);
      p.polygon([[cx - 7, 6], [cx, 1], [cx + 7, 6], [cx + 6, 11], [cx - 6, 11]], hideLight);
      p.rect(cx - 7, 5, 15, 2, hideDark);
      p.ellipse(cx, 8, 4, 3, INK);
      p.ellipse(cx, 8, 3, 2, '#f2ecd8');
      p.ellipse(cx, 8, 1, 1, elder ? '#c0452c' : '#3f6a4a');
      p.pixel(cx - 1, 7, '#ffffff');
      p.line(cx - 5, 13, cx + 5, 13, INK, 2);
      p.polygon([[cx - 4, 13], [cx - 3, 17], [cx - 1, 13]], '#eadbb8');
      p.polygon([[cx + 2, 13], [cx + 4, 17], [cx + 4, 13]], '#eadbb8');
      if (elder) {
        // Elders wear an iron brow-band and a scarred crown.
        p.rect(cx - 8, 3, 17, 2, iron);
        p.pixel(cx, 4, '#b98f36');
        p.line(cx + 3, 1, cx + 6, 5, hideDark);
      }
    });
  return { w: width, h: height, frames: [frame(0), frame(1)] };
}

type BarrowsBrother = 'ahrim' | 'dharok' | 'guthan' | 'karil' | 'torag' | 'verac';

const BARROWS_PALETTE: Record<
  BarrowsBrother,
  { cloth: string; clothLight: string; trim: string; weapon: 'staff' | 'axe' | 'spear' | 'bow' | 'hammer' | 'flail' }
> = {
  ahrim: { cloth: '#3c3350', clothLight: '#5e5279', trim: '#9d8ac4', weapon: 'staff' },
  dharok: { cloth: '#4a3b2c', clothLight: '#6d573f', trim: '#8f4a2c', weapon: 'axe' },
  guthan: { cloth: '#33463a', clothLight: '#4f6b55', trim: '#86a15f', weapon: 'spear' },
  karil: { cloth: '#3a2c34', clothLight: '#59444f', trim: '#a35f74', weapon: 'bow' },
  torag: { cloth: '#31383d', clothLight: '#4b555c', trim: '#7d8b93', weapon: 'hammer' },
  verac: { cloth: '#3e3a2a', clothLight: '#5d573c', trim: '#b6a45c', weapon: 'flail' },
};

/** The six wights: one silhouette, six kits, each with its own weapon. */
function makeBarrowsWight(brother: BarrowsBrother): SpriteSheet {
  const kit = BARROWS_PALETTE[brother];
  const frame = (pose: 0 | 1): Pixel[][] =>
    paintFrame(28, 34, (p) => {
      const stride = pose === 0 ? 0 : 1;
      const bone = '#cdc3a4';
      const boneDark = '#8a8270';
      const soul = '#8fd6c0';

      // Weapon, held to the right.
      const shaft = '#5c4026';
      if (kit.weapon === 'staff') {
        p.line(24, 4, 25, 32, INK, 4);
        p.line(24, 4, 25, 32, shaft, 2);
        p.ellipse(24, 3, 4, 4, INK);
        p.ellipse(24, 3, 3, 3, kit.trim);
        p.pixel(24, 3, '#eafff5');
      } else if (kit.weapon === 'axe') {
        p.line(24, 8, 25, 32, INK, 4);
        p.line(24, 8, 25, 32, shaft, 2);
        p.polygon([[19, 4], [27, 2], [27, 13], [20, 11]], INK);
        p.polygon([[20, 5], [26, 3], [26, 12], [21, 10]], '#7c8388');
        p.line(21, 6, 21, 10, '#b8bfc4');
      } else if (kit.weapon === 'spear') {
        p.line(24, 2, 25, 32, INK, 4);
        p.line(24, 2, 25, 32, shaft, 2);
        p.polygon([[22, 4], [24, -2], [26, 4], [24, 7]], INK);
        p.polygon([[23, 4], [24, 0], [25, 4], [24, 6]], '#a9b0b4');
      } else if (kit.weapon === 'bow') {
        p.line(25, 6, 25, 28, INK, 3);
        p.line(24, 8, 24, 26, kit.trim, 1);
        p.line(25, 6, 22, 12, INK, 2);
        p.line(25, 28, 22, 22, INK, 2);
        p.line(23, 12, 23, 22, '#e3dcc4');
      } else if (kit.weapon === 'hammer') {
        p.line(24, 10, 25, 32, INK, 4);
        p.line(24, 10, 25, 32, shaft, 2);
        p.rect(20, 5, 8, 7, INK);
        p.rect(21, 6, 6, 5, '#6d757a');
        p.rect(22, 6, 3, 2, '#9aa2a7');
      } else {
        // Verac's flail: chain and spiked head.
        p.line(24, 12, 25, 32, INK, 4);
        p.line(24, 12, 25, 32, shaft, 2);
        for (const y of [4, 7, 10]) p.pixel(24, y, '#8a8f92');
        p.ellipse(24, 2, 4, 3, INK);
        p.ellipse(24, 2, 3, 2, '#6d757a');
        p.pixel(21, 2, '#b8bfc4');
        p.pixel(27, 2, '#b8bfc4');
      }

      // Tattered robe over skeletal legs.
      p.rect(7 - stride, 24, 5, 8, INK);
      p.rect(15 + stride, 24, 5, 8, INK);
      p.rect(8 - stride, 24, 3, 6, boneDark);
      p.rect(16 + stride, 24, 3, 6, bone);
      p.rect(5 - stride, 30, 8, 3, INK);
      p.rect(14 + stride, 30, 8, 3, INK);

      p.polygon([[6, 12], [21, 12], [24, 26], [18, 31], [9, 31], [3, 26]], INK);
      p.polygon([[7, 13], [20, 13], [22, 25], [17, 29], [10, 29], [5, 25]], kit.cloth);
      p.polygon([[13, 13], [20, 13], [22, 25], [17, 29], [14, 29]], kit.clothLight);
      p.line(7, 22, 21, 22, kit.trim, 2);
      p.rect(12, 16, 4, 6, kit.trim);

      // Arms and bony hands.
      p.line(7, 15, 3 + stride, 24, INK, 5);
      p.line(7, 15, 4 + stride, 23, kit.cloth, 3);
      p.line(20, 15, 24 - stride, 24, INK, 5);
      p.line(20, 15, 23 - stride, 23, kit.clothLight, 3);
      p.ellipse(3 + stride, 25, 2, 2, bone);
      p.ellipse(24 - stride, 25, 2, 2, bone);

      // Skull under a hood, with soul-light in the sockets.
      p.ellipse(13, 8, 7, 8, INK);
      p.ellipse(13, 8, 6, 7, bone);
      p.polygon([[5, 10], [7, 2], [13, 0], [20, 3], [21, 11], [17, 6], [13, 4], [8, 8]], kit.cloth);
      p.rect(9, 8, 3, 3, '#1b1a20');
      p.rect(14, 8, 3, 3, '#1b1a20');
      p.pixel(10, 9, soul);
      p.pixel(15, 9, soul);
      p.rect(10, 13, 7, 2, INK);
      p.rect(11, 13, 5, 1, bone);
      for (const x of [11, 13, 15]) p.pixel(x, 14, boneDark);
      p.pixel(13, 11, boneDark);
    });
  return { w: 28, h: 34, frames: [frame(0), frame(1)] };
}

export const SPRITES: Record<string, SpriteSheet> = {
  player: makePlayer(),
  cow: makeCow(),
  goblin: makeGoblin('small'),
  'goblin-general': makeGoblin('chief'),
  'giant-rat': makeGiantRat(),
  'giant-frog': makeGiantFrog(),
  'varrock-guard': makeKnight('guard'),
  'varrock-archer': makeKnight('archer'),
  'varrock-general': makeKnight('general'),
  'varrock-thug': makeThug(),
  'dark-wizard': makeWizard('dark'),
  'evil-wizard': makeWizard(),
  'falador-guard': makeFaladorKnight('guard'),
  'white-knight-squire': makeFaladorKnight('squire'),
  'sir-kitbreaker': makeFaladorKnight('kitbreaker'),
  'mine-scorpion': makeMineScorpion(),
  'dwarven-miner': makeDwarvenMiner(),
  hans: makeNpc('hans'),
  chef: makeNpc('chef'),
  'king-roald': makeNpc('king'),
  'sir-tiffy-cashien': makeTiffy(),
  'count-draynor': makeCountDraynor(),
  'manor-ghoul': makeManorGhoul(),
  ava: makeAva(),
  'general-graardor': makeGraardor(),
  'commander-zilyana': makeZilyana(),
  'kril-tsutsaroth': makeKril(),
  kreearra: makeKreearra(),
  'spiritual-warrior': makeSpiritual('warrior'),
  'spiritual-mage': makeSpiritual('mage'),
  zaros: makeZaros(),
  'fallen-soldier': makeFallenSoldier(),
  ghast: makeGhast(),
  'giant-swamp-snail': makeSwampSnail(),
  'swamp-banshee': makeBanshee(),
  'morytania-vampyre': makeSwampVampyre(),
  'tz-kek': makeTzKek(),
  'tz-kih': makeTzKih(),
  'yt-mejkot': makeYtMejKot(),
  'ket-zek': makeKetZek(),
  'tztok-jad': makeJad(),
  'dragon-whelp': makeDragonWhelp(),
  elvarg: makeElvarg(),
  'dagannoth-spawn': makeDagannothSpawn(),
  'dagannoth-rex': makeDagannothRex(),
  'grave-skeleton': makeSkeleton('warrior'),
  'grave-skeleton-archer': makeSkeleton('archer'),
  'crypt-wraith': makeCryptWraith(),
  'grave-titan': makeGraveTitan(),
  'bones-skeleton-king': makeSkeleton('king'),
  'orc-grunt': makeOrcSoldier('grunt'),
  'korkron-elite': makeOrcSoldier('elite'),
  cyclops: makeCyclops('common'),
  'elder-cyclops': makeCyclops('elder'),
  ahrim: makeBarrowsWight('ahrim'),
  dharok: makeBarrowsWight('dharok'),
  guthan: makeBarrowsWight('guthan'),
  karil: makeBarrowsWight('karil'),
  torag: makeBarrowsWight('torag'),
  verac: makeBarrowsWight('verac'),
  'ghost-of-barrows': makeCryptWraith(),
  'high-overlord-saurfang': makeOrc('saurfang'),
  'orc-king-thrall': makeOrc('thrall'),
  bilbo: makeHobbit('bilbo'),
  gandalf: makeGandalf(),
  frodo: makeHobbit('frodo'),
  samwise: makeHobbit('samwise'),
};

/* ==========================================================================
   Shopkeeper portraits — 40x40 busts, drawn at four times the detail of a
   world sprite because the shop window frames them as a close-up.
   ========================================================================== */

const PORTRAIT = 40;

interface BustPalette {
  cloth: string;
  clothShade: string;
  clothLight: string;
  trim: string;
}

/** Shoulders, collar and neck shared by every keeper. */
function paintBust(p: PixelPainter, pal: BustPalette, neck: string, neckShade: string): void {
  p.rect(15, 21, 10, 8, INK);
  p.rect(16, 21, 8, 7, neckShade);
  p.rect(17, 21, 6, 6, neck);

  p.polygon([[0, 40], [4, 30], [13, 26], [27, 26], [36, 30], [40, 40]], INK);
  p.polygon([[2, 40], [6, 31], [14, 28], [26, 28], [34, 31], [38, 40]], pal.cloth);
  p.polygon([[2, 40], [6, 31], [14, 28], [19, 29], [17, 40]], pal.clothShade);
  p.polygon([[26, 28], [34, 31], [38, 40], [30, 40]], pal.clothLight);
  // Open collar framing the neck.
  p.polygon([[14, 28], [20, 27], [26, 28], [24, 33], [20, 30], [16, 33]], pal.trim);
  p.pixel(20, 31, pal.clothShade);
}

const SHOP_PORTRAITS: Record<string, Pixel[][]> = {
  general: paintFrame(PORTRAIT, PORTRAIT, (p) => {
    const apron = '#4d6b3e';
    paintBust(
      p,
      { cloth: '#e2d8bf', clothShade: '#ab9f86', clothLight: '#f4ecd6', trim: apron },
      SKIN,
      SKIN_SHADE
    );
    // Apron bib and its shoulder straps.
    p.polygon([[14, 33], [26, 33], [28, 40], [12, 40]], apron);
    p.line(15, 29, 14, 34, '#3a5230', 2);
    p.line(25, 29, 26, 34, '#3a5230', 2);
    p.pixel(20, 36, '#c9a53c');

    // Head, ears and a friendly weathered face.
    p.ellipse(20, 13, 10, 12, INK);
    p.ellipse(20, 13, 9, 11, SKIN);
    p.ellipse(10, 15, 2, 3, INK);
    p.ellipse(30, 15, 2, 3, INK);
    p.ellipse(10, 15, 1, 2, SKIN_SHADE);
    p.ellipse(30, 15, 1, 2, SKIN);
    p.polygon([[11, 12], [20, 8], [29, 12], [28, 20], [20, 24], [12, 20]], SKIN_LIGHT);
    // Brows, eyes with catchlights, nose and smile.
    p.rect(13, 11, 6, 2, '#5c3a24');
    p.rect(22, 11, 6, 2, '#5c3a24');
    p.ellipse(16, 15, 3, 2, '#f6f1e2');
    p.ellipse(25, 15, 3, 2, '#f6f1e2');
    p.ellipse(16, 15, 1, 1, '#3d5a52');
    p.ellipse(25, 15, 1, 1, '#3d5a52');
    p.pixel(15, 14, '#ffffff');
    p.pixel(24, 14, '#ffffff');
    p.polygon([[20, 15], [22, 19], [18, 19]], SKIN_SHADE);
    p.pixel(20, 18, '#a4653f');
    p.line(16, 21, 24, 21, '#8a4a38', 1);
    p.line(15, 20, 16, 21, '#8a4a38');
    p.line(24, 21, 25, 20, '#8a4a38');
    // Thick moustache and short parted hair.
    p.polygon([[14, 19], [20, 18], [26, 19], [25, 21], [20, 20], [15, 21]], '#6b4327');
    p.polygon([[9, 10], [12, 3], [21, 1], [30, 4], [31, 11], [26, 6], [16, 5], [12, 9]], '#6b4327');
    p.polygon([[12, 6], [19, 3], [26, 5], [22, 6], [15, 8]], '#8a5a33');
  }),

  blacksmith: paintFrame(PORTRAIT, PORTRAIT, (p) => {
    const leather = '#6b4526';
    paintBust(
      p,
      { cloth: '#3d3129', clothShade: '#241d18', clothLight: '#57463a', trim: leather },
      '#c99268',
      '#94643f'
    );
    // Studded leather apron.
    p.polygon([[13, 32], [27, 32], [29, 40], [11, 40]], leather);
    p.polygon([[13, 32], [20, 32], [19, 40], [11, 40]], '#4f321b');
    for (const x of [15, 20, 25]) p.pixel(x, 35, '#a98a4a');
    p.line(14, 29, 13, 33, '#4f321b', 2);
    p.line(26, 29, 27, 33, '#4f321b', 2);

    // Head with a soot-smudged cheek and forge light on one side.
    p.ellipse(20, 13, 10, 12, INK);
    p.ellipse(20, 13, 9, 11, '#c99268');
    p.polygon([[20, 3], [29, 8], [30, 20], [22, 24]], '#dda87c');
    p.ellipse(10, 15, 2, 3, INK);
    p.ellipse(30, 15, 2, 3, INK);
    p.rect(11, 6, 19, 3, INK);
    p.rect(11, 6, 18, 2, '#8f3230');
    p.pixel(14, 7, '#c25a4a');
    // Focused eyes, strong nose and set jaw.
    p.rect(12, 11, 6, 2, '#2f2620');
    p.rect(23, 11, 6, 2, '#2f2620');
    p.ellipse(16, 15, 3, 2, '#f2ece0');
    p.ellipse(25, 15, 3, 2, '#f2ece0');
    p.ellipse(16, 15, 1, 1, '#4a3a2c');
    p.ellipse(25, 15, 1, 1, '#4a3a2c');
    p.pixel(26, 14, '#ffffff');
    p.polygon([[20, 14], [23, 19], [18, 19]], '#94643f');
    p.line(16, 21, 25, 21, '#7c4030', 1);
    p.rect(12, 16, 3, 5, '#3a2a20');
    p.rect(26, 16, 3, 5, '#3a2a20');
    p.pixel(27, 18, '#2a1e18');
    p.pixel(28, 19, '#2a1e18');
    // Hair tied back under the band.
    p.polygon([[10, 9], [13, 4], [22, 2], [30, 6], [31, 10], [24, 6], [15, 7]], '#2f2620');
    p.polygon([[30, 8], [35, 12], [33, 18], [30, 14]], '#2f2620');
  }),

  dwarf: paintFrame(PORTRAIT, PORTRAIT, (p) => {
    const iron = '#7e8386';
    const ironLight = '#b4bab9';
    const beard = '#b1642c';
    const beardLight = '#d98f47';
    paintBust(
      p,
      { cloth: '#4a4b50', clothShade: '#2c2d31', clothLight: '#6e7075', trim: '#5c3a1e' },
      '#d9a075',
      '#a06f48'
    );
    // Riveted mail across the shoulders.
    for (let x = 4; x < 36; x += 4) {
      p.pixel(x, 33, ironLight);
      p.pixel(x + 2, 36, iron);
    }

    // Wide dwarven head, low brow, bulbous nose.
    p.ellipse(20, 14, 11, 11, INK);
    p.ellipse(20, 14, 10, 10, '#d9a075');
    p.ellipse(9, 16, 2, 3, INK);
    p.ellipse(31, 16, 2, 3, INK);
    p.rect(11, 12, 7, 3, '#8a4d22');
    p.rect(22, 12, 7, 3, '#8a4d22');
    p.ellipse(15, 16, 3, 2, '#f4eee1');
    p.ellipse(25, 16, 3, 2, '#f4eee1');
    p.ellipse(15, 16, 1, 1, '#3f5c6b');
    p.ellipse(25, 16, 1, 1, '#3f5c6b');
    p.pixel(14, 15, '#ffffff');
    p.ellipse(20, 19, 3, 3, '#c08a62');
    p.pixel(19, 19, '#a06f48');
    p.pixel(21, 20, '#e0b48c');

    // Enormous braided beard swallowing the lower face.
    p.polygon([[9, 20], [31, 20], [33, 32], [27, 40], [13, 40], [7, 32]], INK);
    p.polygon([[10, 21], [30, 21], [31, 31], [26, 39], [14, 39], [9, 31]], beard);
    p.polygon([[14, 22], [20, 21], [22, 34], [17, 38]], beardLight);
    p.line(12, 26, 14, 38, '#8a4d22', 2);
    p.line(28, 26, 26, 38, '#8a4d22', 2);
    p.line(16, 23, 24, 23, '#7e441d', 2);
    p.ellipse(15, 37, 2, 2, '#a98a4a');
    p.ellipse(25, 37, 2, 2, '#a98a4a');

    // Iron half-helm with a nose guard.
    p.polygon([[7, 12], [10, 4], [20, 0], [30, 4], [33, 12], [30, 9], [20, 5], [10, 9]], INK);
    p.polygon([[8, 12], [11, 5], [20, 1], [29, 5], [32, 12], [28, 9], [20, 6], [12, 9]], iron);
    p.polygon([[12, 6], [20, 2], [26, 5], [20, 5]], ironLight);
    p.rect(19, 8, 3, 8, iron);
    p.rect(19, 8, 1, 7, ironLight);
    for (const x of [11, 20, 29]) p.pixel(x, 11, '#d9dede');
  }),

  inventor: paintFrame(PORTRAIT, PORTRAIT, (p) => {
    const coat = '#3f4a54';
    const brass = '#c39a2c';
    paintBust(
      p,
      { cloth: coat, clothShade: '#27313a', clothLight: '#5c6a76', trim: '#8a6b3a' },
      SKIN,
      SKIN_SHADE
    );
    // Buttoned high-collar workshop coat with a shoulder rig.
    p.line(20, 30, 20, 40, '#27313a', 2);
    for (const y of [33, 36, 39]) p.pixel(22, y, brass);
    p.rect(30, 29, 7, 4, INK);
    p.rect(31, 30, 5, 2, '#6d7378');
    p.line(33, 32, 36, 27, '#6d7378', 2);
    p.pixel(36, 26, '#8fd3e2');

    // Head with goggles pushed up on the forehead.
    p.ellipse(20, 14, 10, 12, INK);
    p.ellipse(20, 14, 9, 11, SKIN);
    p.ellipse(10, 16, 2, 3, INK);
    p.ellipse(30, 16, 2, 3, INK);
    p.polygon([[11, 13], [20, 9], [29, 13], [28, 21], [20, 25], [12, 21]], SKIN_LIGHT);
    p.rect(12, 10, 5, 2, '#4a3423');
    p.rect(23, 10, 5, 2, '#4a3423');
    p.ellipse(16, 15, 3, 2, '#f6f1e2');
    p.ellipse(25, 15, 3, 2, '#f6f1e2');
    p.ellipse(16, 15, 1, 1, '#4a6b4f');
    p.ellipse(25, 15, 1, 1, '#4a6b4f');
    p.pixel(15, 14, '#ffffff');
    p.polygon([[20, 15], [22, 19], [18, 19]], SKIN_SHADE);
    p.line(17, 21, 24, 21, '#8a4a38');
    p.pixel(24, 20, '#8a4a38');

    // Goggles: strap, brass rims and glass.
    p.rect(9, 5, 23, 4, INK);
    p.rect(9, 6, 22, 2, '#4a3a2c');
    p.ellipse(15, 7, 4, 4, INK);
    p.ellipse(15, 7, 3, 3, brass);
    p.ellipse(15, 7, 2, 2, '#6fd6e8');
    p.ellipse(26, 7, 4, 4, INK);
    p.ellipse(26, 7, 3, 3, brass);
    p.ellipse(26, 7, 2, 2, '#9fe6f2');
    p.pixel(14, 6, '#ffffff');
    p.pixel(25, 6, '#ffffff');
    // Dark hair gathered behind the goggles.
    p.polygon([[9, 11], [10, 4], [20, 1], [31, 5], [32, 11], [27, 7], [14, 7]], '#3b2b22');
    p.ellipse(33, 13, 4, 4, INK);
    p.ellipse(33, 13, 3, 3, '#3b2b22');
  }),

  hobbit: paintFrame(PORTRAIT, PORTRAIT, (p) => {
    const waistcoat = '#a5742a';
    paintBust(
      p,
      { cloth: '#e7dcc2', clothShade: '#b0a58b', clothLight: '#f6efdb', trim: waistcoat },
      '#e0ab7d',
      '#ad7a52'
    );
    // Waistcoat panels and a floury apron edge.
    p.polygon([[8, 30], [17, 29], [16, 40], [6, 40]], waistcoat);
    p.polygon([[23, 29], [32, 30], [34, 40], [24, 40]], '#8d6224');
    for (const y of [33, 37]) p.pixel(17, y, '#e6c65c');
    p.rect(12, 38, 16, 2, '#f4efe0');

    // Round cheerful face with pointed ears.
    p.ellipse(20, 15, 11, 11, INK);
    p.ellipse(20, 15, 10, 10, '#e0ab7d');
    p.polygon([[8, 15], [5, 10], [10, 12]], INK);
    p.polygon([[9, 15], [7, 11], [10, 13]], '#e0ab7d');
    p.polygon([[32, 15], [35, 10], [30, 12]], INK);
    p.polygon([[31, 15], [33, 11], [30, 13]], '#efc08b');
    p.ellipse(13, 19, 3, 2, '#d98a72');
    p.ellipse(27, 19, 3, 2, '#d98a72');
    p.rect(13, 12, 5, 2, '#7c4a24');
    p.rect(22, 12, 5, 2, '#7c4a24');
    p.ellipse(16, 16, 3, 2, '#f7f2e5');
    p.ellipse(25, 16, 3, 2, '#f7f2e5');
    p.ellipse(16, 16, 1, 1, '#5a4028');
    p.ellipse(25, 16, 1, 1, '#5a4028');
    p.pixel(15, 15, '#ffffff');
    p.pixel(24, 15, '#ffffff');
    p.ellipse(20, 19, 2, 2, '#c9906a');
    // Broad grin.
    p.line(16, 22, 24, 22, '#8a4a38', 1);
    p.pixel(15, 21, '#8a4a38');
    p.pixel(25, 21, '#8a4a38');
    p.rect(18, 22, 5, 1, '#f4efe0');
    // Mop of auburn curls.
    p.polygon([[8, 12], [10, 4], [20, 1], [31, 5], [32, 13], [27, 7], [14, 7], [11, 12]], '#8c4a22');
    for (const [x, y] of [[12, 6], [17, 3], [23, 4], [28, 7]] as const) p.ellipse(x, y, 3, 2, '#a85c28');
    p.ellipse(20, 3, 3, 2, '#c07338');
  }),

  vampyre: paintFrame(PORTRAIT, PORTRAIT, (p) => {
    const cloak = '#1d1a22';
    const collar = '#4a1f2b';
    const pale = '#c9bcc0';
    paintBust(
      p,
      { cloth: cloak, clothShade: '#100e14', clothLight: '#2f2a36', trim: collar },
      pale,
      '#8f8288'
    );
    // High popped collar behind the head.
    p.polygon([[8, 34], [11, 20], [16, 27], [14, 36]], INK);
    p.polygon([[9, 33], [12, 22], [15, 27], [13, 35]], collar);
    p.polygon([[32, 34], [29, 20], [24, 27], [26, 36]], INK);
    p.polygon([[31, 33], [28, 22], [25, 27], [27, 35]], '#632936');
    p.ellipse(20, 33, 3, 3, '#8f2f3c');
    p.pixel(20, 32, '#d95a5a');

    // Gaunt pale face with a widow's peak.
    p.ellipse(20, 13, 9, 12, INK);
    p.ellipse(20, 13, 8, 11, pale);
    p.polygon([[12, 12], [20, 8], [28, 12], [27, 20], [20, 25], [13, 20]], '#ded1d3');
    p.ellipse(11, 15, 2, 3, INK);
    p.ellipse(29, 15, 2, 3, INK);
    p.rect(13, 11, 6, 2, '#221d24');
    p.rect(22, 11, 6, 2, '#221d24');
    p.ellipse(16, 15, 3, 2, '#efe6e6');
    p.ellipse(25, 15, 3, 2, '#efe6e6');
    p.ellipse(16, 15, 1, 1, '#a8202c');
    p.ellipse(25, 15, 1, 1, '#c9303a');
    p.pixel(15, 14, '#ff8f8f');
    p.pixel(24, 14, '#ff8f8f');
    p.rect(13, 17, 4, 4, '#a89aa0');
    p.rect(24, 17, 4, 4, '#a89aa0');
    p.polygon([[20, 14], [22, 19], [18, 19]], '#8f8288');
    // Thin mouth with two fangs.
    p.line(16, 21, 25, 21, '#5c2830', 1);
    p.pixel(17, 22, '#f1e5e5');
    p.pixel(23, 22, '#f1e5e5');
    p.pixel(17, 23, '#f1e5e5');
    p.pixel(23, 23, '#f1e5e5');
    // Slicked black hair with a sharp peak.
    p.polygon([[10, 11], [11, 3], [20, 0], [29, 3], [31, 11], [27, 5], [20, 6], [14, 5]], '#17141b');
    p.polygon([[17, 6], [20, 2], [23, 6], [20, 8]], '#17141b');
    p.line(13, 4, 20, 2, '#332c38', 2);
  }),

  tzhaar: paintFrame(PORTRAIT, PORTRAIT, (p) => {
    const rock = '#332b2c';
    const rockLight = '#5d4644';
    const magma = '#dc4720';
    const ember = '#ffb03c';
    paintBust(
      p,
      { cloth: '#251f20', clothShade: '#151112', clothLight: '#3d3132', trim: '#6b2a17' },
      rock,
      '#241e1f'
    );
    // Cooling magma seams across the shoulders.
    p.line(5, 34, 15, 30, magma, 2);
    p.line(25, 30, 35, 35, magma, 2);
    p.pixel(10, 32, ember);
    p.pixel(30, 33, ember);

    // Heavy obsidian skull with a lava-lit fissure.
    p.ellipse(20, 14, 11, 12, INK);
    p.ellipse(20, 14, 10, 11, rock);
    p.polygon([[11, 12], [20, 6], [30, 12], [29, 22], [20, 27], [12, 22]], rockLight);
    p.line(14, 4, 18, 14, magma, 2);
    p.line(18, 14, 16, 24, magma, 2);
    p.pixel(15, 8, ember);
    p.pixel(17, 19, ember);
    // Burning sunken eyes under a slab brow.
    p.rect(11, 10, 8, 4, '#1a1516');
    p.rect(22, 10, 8, 4, '#1a1516');
    p.ellipse(15, 13, 3, 2, magma);
    p.ellipse(26, 13, 3, 2, magma);
    p.pixel(15, 13, ember);
    p.pixel(26, 13, '#ffe08a');
    p.rect(10, 8, 20, 2, '#1f1a1b');
    // Cracked mouth with tusks.
    p.line(13, 22, 28, 22, INK, 2);
    p.line(14, 22, 27, 22, magma);
    p.polygon([[14, 22], [15, 27], [17, 22]], '#e8d6ae');
    p.polygon([[24, 22], [26, 27], [27, 22]], '#e8d6ae');
    // Horned crest ridges.
    p.polygon([[9, 8], [5, 1], [13, 5]], INK);
    p.polygon([[10, 8], [7, 3], [12, 6]], rockLight);
    p.polygon([[31, 8], [35, 1], [27, 5]], INK);
    p.polygon([[30, 8], [33, 3], [28, 6]], rockLight);
    p.pixel(20, 5, magma);
  }),

  skeleton: paintFrame(PORTRAIT, PORTRAIT, (p) => {
    const bone = '#d8cfb3';
    const boneLight = '#f2ebd6';
    const boneShade = '#938b78';
    const hood = '#3b3446';
    const soul = '#6f9cd8';
    paintBust(
      p,
      { cloth: hood, clothShade: '#241f2c', clothLight: '#544c62', trim: '#6b5a33' },
      bone,
      boneShade
    );
    // Merchant's hood draped over bare clavicles.
    p.polygon([[6, 40], [9, 27], [16, 24], [24, 24], [31, 27], [34, 40]], hood);
    p.polygon([[6, 40], [9, 27], [16, 24], [19, 26], [17, 40]], '#2c2636');
    p.line(12, 31, 28, 31, boneShade, 2);
    p.ellipse(20, 34, 3, 2, boneLight);
    p.ellipse(14, 36, 2, 3, '#6b5a33');
    p.pixel(14, 36, '#c9a53c');

    // Skull: deep sockets with soul-fire, nasal cavity, grinning teeth.
    p.ellipse(20, 14, 10, 11, INK);
    p.ellipse(20, 14, 9, 10, bone);
    p.polygon([[12, 12], [20, 7], [28, 12], [27, 19], [20, 22], [13, 19]], boneLight);
    p.ellipse(15, 14, 4, 4, '#191722');
    p.ellipse(25, 14, 4, 4, '#191722');
    p.ellipse(15, 14, 2, 2, soul);
    p.ellipse(25, 14, 2, 2, '#bcd8ff');
    p.pixel(15, 13, '#eaf4ff');
    p.pixel(25, 13, '#eaf4ff');
    p.polygon([[20, 17], [22, 21], [18, 21]], '#191722');
    p.rect(12, 23, 17, 4, INK);
    p.rect(13, 23, 15, 3, bone);
    for (const x of [15, 18, 21, 24, 27]) p.line(x, 23, x, 26, boneShade);
    p.line(13, 25, 28, 25, boneShade);
    p.pixel(11, 12, boneShade);
    p.pixel(29, 12, boneLight);
    // Hood brim casting shadow over the crown.
    p.polygon([[9, 12], [11, 3], [20, 0], [30, 3], [32, 13], [28, 6], [20, 4], [12, 7]], hood);
    p.polygon([[12, 7], [20, 4], [27, 6], [20, 8]], '#544c62');
  }),

  orc: paintFrame(PORTRAIT, PORTRAIT, (p) => {
    const skin = '#5f8150';
    const skinLight = '#87a768';
    const skinDark = '#33492f';
    const iron = '#494647';
    const ironLight = '#807d7e';
    paintBust(
      p,
      { cloth: '#3a3a36', clothShade: '#22221f', clothLight: '#57574f', trim: '#5c3927' },
      skin,
      skinDark
    );
    // Spiked pauldrons.
    p.ellipse(6, 32, 8, 6, INK);
    p.ellipse(6, 32, 7, 5, iron);
    p.polygon([[2, 28], [0, 20], [8, 27]], '#d5c7a3');
    p.ellipse(34, 32, 8, 6, INK);
    p.ellipse(34, 32, 7, 5, ironLight);
    p.polygon([[38, 28], [40, 20], [32, 27]], '#e3d8b7');
    p.line(12, 33, 28, 33, '#5c3927', 3);
    p.pixel(20, 33, '#b98f36');

    // Heavy brow, broad nose and a scarred cheek.
    p.ellipse(20, 14, 11, 11, INK);
    p.ellipse(20, 14, 10, 10, skin);
    p.polygon([[11, 13], [20, 7], [29, 13], [28, 21], [20, 26], [12, 21]], skinLight);
    p.ellipse(9, 15, 3, 3, INK);
    p.ellipse(9, 15, 2, 2, skinDark);
    p.ellipse(31, 15, 3, 3, INK);
    p.ellipse(31, 15, 2, 2, skin);
    p.rect(10, 9, 20, 4, skinDark);
    p.ellipse(15, 15, 3, 2, '#f2eddc');
    p.ellipse(25, 15, 3, 2, '#f2eddc');
    p.ellipse(15, 15, 1, 1, '#c9a52c');
    p.ellipse(25, 15, 1, 1, '#e2c456');
    p.pixel(14, 14, '#ffffff');
    p.line(24, 6, 27, 18, '#8f5a48');
    p.ellipse(20, 19, 3, 2, skinDark);
    // Underbite with two heavy tusks.
    p.line(13, 22, 28, 22, INK, 2);
    p.polygon([[13, 21], [14, 27], [17, 22]], '#eadbb8');
    p.polygon([[24, 22], [27, 27], [28, 21]], '#eadbb8');
    p.pixel(20, 23, '#3f2f28');
    // Bound topknot and braids.
    p.polygon([[10, 10], [12, 3], [20, 0], [29, 3], [31, 10], [26, 5], [20, 4], [13, 6]], '#251f1c');
    p.line(20, 2, 26, -4, '#3f2b22', 3);
    p.line(11, 8, 8, 22, '#3f2b22', 2);
    p.line(29, 8, 32, 22, '#3f2b22', 2);
    p.ellipse(8, 23, 2, 2, '#b98f36');
    p.ellipse(32, 23, 2, 2, '#b98f36');
  }),
};

/** Standalone canvas holding a shop keeper's close-up portrait. */
export function createShopkeeperPortraitCanvas(kind: string, px = 160): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const frame = SHOP_PORTRAITS[kind] ?? SHOP_PORTRAITS.general!;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(getFrameCanvas(frame), 0, 0, px, px);
  }
  return canvas;
}

export interface EntityDrawState {
  hovered: boolean;
  inCombat: boolean;
  /** Worn gear, drawn onto the hero. Ignored for every other entity. */
  equipment?: EquipmentLoadout;
  /** Applies the muted violet/amber grade used by Varrock's night backdrop. */
  night?: boolean;
  /** Canonical sheets face right; -1 mirrors them toward the left. */
  facing?: -1 | 1;
}

export function getEntityBounds(
  id: string,
  cx: number,
  footY: number,
  displaySize: number,
  globalFrame: number
): { left: number; top: number; width: number; height: number; cx: number; footY: number; dy: number } {
  // Worn gear never changes the figure's footprint, so bounds use the base sheet.
  const sheet = SPRITES[id];
  const frameIdx = getIdleFrame(globalFrame, id);
  const dy = getBounceDy(frameIdx);

  if (!sheet) {
    return {
      left: cx - displaySize / 2,
      top: footY - displaySize,
      width: displaySize,
      height: displaySize,
      cx,
      footY,
      dy,
    };
  }

  const scale = displaySize / sheet.h;
  const w = sheet.w * scale;
  const h = sheet.h * scale;
  return {
    left: cx - w / 2,
    top: footY - h + dy,
    width: w,
    height: h,
    cx,
    footY: footY + dy,
    dy,
  };
}

/** Tighter click target — lower body / sprite core, not full bounding box */
export function getEntityClickHitbox(
  id: string,
  cx: number,
  footY: number,
  displaySize: number,
  globalFrame: number
): { left: number; top: number; width: number; height: number } {
  const b = getEntityBounds(id, cx, footY, displaySize, globalFrame);
  const padX = b.width * 0.15;
  const padTop = b.height * 0.1;
  const padBottom = b.height * 0.05;
  return {
    left: b.left + padX,
    top: b.top + padTop,
    width: b.width - padX * 2,
    height: b.height - padTop - padBottom,
  };
}

function drawFeetGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  radius: number,
  color: string,
  alpha: number
): void {
  const g = ctx.createRadialGradient(cx, footY - 2, 2, cx, footY, radius);
  g.addColorStop(0, color.replace('ALPHA', String(alpha * 0.9)));
  g.addColorStop(0.5, color.replace('ALPHA', String(alpha * 0.35)));
  g.addColorStop(1, color.replace('ALPHA', '0'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, footY - 2, radius, radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  spriteWidth: number,
  spriteHeight: number
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 6, 8, 0.42)';
  ctx.beginPath();
  ctx.ellipse(
    cx + 2,
    footY - 1,
    Math.max(7, spriteWidth * 0.32),
    Math.max(2, spriteHeight * 0.075),
    -0.08,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

export function drawAnimatedEntity(
  ctx: CanvasRenderingContext2D,
  id: string,
  cx: number,
  footY: number,
  displaySize: number,
  globalFrame: number,
  state: EntityDrawState = { hovered: false, inCombat: false }
): { left: number; top: number; width: number; height: number } {
  const dressed =
    id === 'player' && state.equipment && Object.keys(state.equipment).length > 0
      ? getDressedPlayerSheet(state.equipment)
      : null;
  const sheet = dressed ?? SPRITES[id];
  const frameIdx = getIdleFrame(globalFrame, id);
  const dy = getBounceDy(frameIdx);

  if (!sheet) {
    ctx.fillStyle = '#888';
    ctx.fillRect(cx - displaySize / 2, footY - displaySize, displaySize, displaySize);
    return { left: cx - displaySize / 2, top: footY - displaySize, width: displaySize, height: displaySize };
  }

  const scale = displaySize / sheet.h;
  const frame = sheet.frames[frameIdx]!;
  const w = sheet.w * scale;
  const h = sheet.h * scale;
  const left = cx - w / 2;
  const top = footY - h + dy;
  const glowRadius = Math.max(w, h) * 0.55;
  const facing = state.facing ?? 1;

  drawGroundShadow(ctx, cx, footY + dy, w, h);
  if (state.hovered) {
    drawFeetGlow(ctx, cx, footY + dy, glowRadius, 'rgba(255, 220, 120, ALPHA)', 0.85);
  }
  if (state.inCombat) {
    drawFeetGlow(ctx, cx, footY + dy, glowRadius * 1.1, 'rgba(255, 80, 60, ALPHA)', 0.7);
  }

  // A one-pixel down-right occlusion pass gives every figure the same dark,
  // dimensional edge seen on the environment's baked 16-bit forms.
  ctx.save();
  ctx.globalAlpha = state.night ? 0.4 : 0.3;
  ctx.filter = 'brightness(0)';
  drawPixelFrame(ctx, frame, cx + 1.25, footY + dy + 1.25, scale, facing);
  ctx.restore();

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (state.night) {
    // The removed backdrop figures used low-saturation violet shadows and warm
    // highlights. Grade only the live sprite draw call to share that ambience.
    ctx.filter = 'brightness(0.82) saturate(0.76) sepia(0.08) hue-rotate(-6deg)';
  } else {
    ctx.filter = 'saturate(0.92)';
  }
  if (state.hovered) {
    ctx.shadowColor = 'rgba(255, 230, 150, 0.95)';
    ctx.shadowBlur = 16;
  } else if (state.inCombat) {
    ctx.shadowColor = 'rgba(255, 100, 80, 0.8)';
    ctx.shadowBlur = 12;
  }
  drawPixelFrame(ctx, frame, cx, footY + dy, scale, facing);
  ctx.restore();

  return { left, top, width: w, height: h };
}

export function drawHoverTooltip(
  ctx: CanvasRenderingContext2D,
  cx: number,
  top: number,
  label: string,
  action: string
): void {
  const text = `${label}`;
  const sub = action;
  ctx.font = '8px "Press Start 2P", monospace';
  const tw = Math.max(ctx.measureText(text).width, ctx.measureText(sub).width);
  const pad = 6;
  const boxW = tw + pad * 2;
  const boxH = 28;
  const bx = cx - boxW / 2;
  const by = top - boxH - 6;

  ctx.fillStyle = 'rgba(20, 16, 10, 0.82)';
  ctx.strokeStyle = 'rgba(255, 200, 80, 0.7)';
  ctx.lineWidth = 1;
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeRect(bx, by, boxW, boxH);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, cx, by + 11);
  ctx.fillStyle = '#ff981f';
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText(sub, cx, by + 22);
}

/* ==========================================================================
   Item icons — 12x12 pixel grids per archetype, tinted by material tier
   ========================================================================== */

type IconArchetype =
  | 'sword'
  | 'scimitar'
  | 'mace'
  | 'club'
  | 'staff'
  | 'spear'
  | 'crossbow'
  | 'axe'
  | 'knuckles'
  | 'helm'
  | 'body'
  | 'legs'
  | 'boots'
  | 'shield'
  | 'neck'
  | 'ammo'
  | 'ring'
  | 'hilt'
  | 'shard'
  | 'cape'
  | 'fish'
  | 'meat'
  | 'ration'
  | 'grub'
  | 'potion'
  | 'bar'
  | 'junk';

/** m = metal/main, d = dark shade, l = light shade, h = handle, a = accent */
const ICON_GRIDS: Record<IconArchetype, string[]> = {
  sword: [
    '.....ll.....',
    '.....ml.....',
    '.....ml.....',
    '.....ml.....',
    '.....ml.....',
    '.....ml.....',
    '....dmld....',
    '..aaaaaaaa..',
    '.....hh.....',
    '.....hh.....',
    '....ahha....',
    '.....dd.....',
  ],
  scimitar: [
    '........ll..',
    '.......mll..',
    '......mml...',
    '.....mml....',
    '....mml.....',
    '...mml......',
    '..dml.......',
    '..aaaa......',
    '...hh.......',
    '...hh.......',
    '..ahha......',
    '...dd.......',
  ],
  mace: [
    '....dmmd....',
    '...mmllmm...',
    '..dmllllmd..',
    '..mllaallm..',
    '..mllaallm..',
    '..dmllllmd..',
    '...mmllmm...',
    '....dmmd....',
    '.....hh.....',
    '.....hh.....',
    '....ahha....',
    '.....dd.....',
  ],
  club: [
    '...dmmmmd...',
    '..mmllllmm..',
    '..mlaaaalm..',
    '..mllaallm..',
    '...mllllm...',
    '....mmmm....',
    '.....hh.....',
    '.....hh.....',
    '.....hh.....',
    '....ahha....',
    '.....hh.....',
    '.....dd.....',
  ],
  staff: [
    '.....aa.....',
    '....alla....',
    '...alllla...',
    '...alllla...',
    '....alla....',
    '.....hh.....',
    '.....hh.....',
    '....mhhm....',
    '.....hh.....',
    '.....hh.....',
    '.....hh.....',
    '.....dd.....',
  ],
  spear: [
    '.....ll.....',
    '....mll.....',
    '....mml.....',
    '.....hh.....',
    '.....hh.....',
    '.....hh.....',
    '....ahha....',
    '.....hh.....',
    '.....hh.....',
    '.....hh.....',
    '.....hh.....',
    '.....dd.....',
  ],
  crossbow: [
    '.....mm.....',
    '...mmllmm...',
    '..ml....lm..',
    '.ml......lm.',
    '..mml..lmm..',
    '....mllm....',
    '.....hh.....',
    '....ahha....',
    '.....hh.....',
    '.....hh.....',
    '.....dd.....',
    '............',
  ],
  axe: [
    '...dmmmm....',
    '..dmllllm...',
    '..mllllllm..',
    '...dmmmmlm..',
    '.....hh.....',
    '.....hh.....',
    '.....hh.....',
    '.....hh.....',
    '....ahha....',
    '.....hh.....',
    '.....dd.....',
    '............',
  ],
  knuckles: [
    '............',
    '..mm.mm.mm..',
    '.mllmmllmml.',
    '.mllmmllmml.',
    '.mmmmmmmmmm.',
    '.mllllllllm.',
    '.mllllllllm.',
    '.dmmmmmmmmd.',
    '..hh....hh..',
    '..hh....hh..',
    '...dd..dd...',
    '............',
  ],
  helm: [
    '....mmmm....',
    '...mllllm...',
    '..mllllllm..',
    '..mllaallm..',
    '.mllllllllm.',
    '.mmdmmmmmdm.',
    '.md......dm.',
    '..d......d..',
    '............',
    '............',
    '............',
    '............',
  ],
  body: [
    '............',
    '..mm....mm..',
    '.mllmmmmllm.',
    '.mllllllllm.',
    '.mmllllllmm.',
    '..mllllllm..',
    '..mllllllm..',
    '..mllaallm..',
    '..mllllllm..',
    '..dmmmmmmd..',
    '...dd..dd...',
    '............',
  ],
  legs: [
    '............',
    '..mmmmmmmm..',
    '..mllllllm..',
    '..mllllllm..',
    '..dmmllmmd..',
    '...mllmllm..',
    '...mllmllm..',
    '...mllmllm..',
    '...mllmllm..',
    '..dmmdmmmd..',
    '..dd..dd....',
    '............',
  ],
  boots: [
    '............',
    '............',
    '...mm..mm...',
    '...ml..lm...',
    '...ml..lm...',
    '...ml..lm...',
    '..dmm..mmd..',
    '.dmll..llmd.',
    '.dmmm..mmmd.',
    '............',
    '............',
    '............',
  ],
  shield: [
    '............',
    '..aaaaaaaa..',
    '.ammmmmmmma.',
    '.amllllllma.',
    '.amllllllma.',
    '.amllaallma.',
    '.amllllllma.',
    '..mllllllm..',
    '..dmllllmd..',
    '...dmmmmd...',
    '....dddd....',
    '............',
  ],
  neck: [
    '............',
    '..hh....hh..',
    '...hh..hh...',
    '....hhhh....',
    '.....aa.....',
    '....alla....',
    '...alllla...',
    '....alla....',
    '.....aa.....',
    '............',
    '............',
    '............',
  ],
  ammo: [
    '..l....l....',
    '..m....m....',
    '..m....m....',
    '..m....m....',
    '..h....h....',
    '..h....h....',
    '..h....h....',
    '.aha..aha...',
    '..h....h....',
    '..d....d....',
    '............',
    '............',
  ],
  ring: [
    '............',
    '....aaaa....',
    '...alllla...',
    '..allmmlla..',
    '..alm..mla..',
    '..alm..mla..',
    '..allmmlla..',
    '...alllla...',
    '....aaaa....',
    '............',
    '............',
    '............',
  ],
  hilt: [
    '............',
    '.....aa.....',
    '....alla....',
    '.....mm.....',
    '.aaaammmaaaa',
    '.....mm.....',
    '.....hh.....',
    '....ahha....',
    '.....hh.....',
    '.....dd.....',
    '............',
    '............',
  ],
  shard: [
    '............',
    '......l.....',
    '.....ll.....',
    '....lml.....',
    '...lmmml....',
    '..lmmmmd....',
    '...mmmd.....',
    '....mdd.....',
    '.....d......',
    '............',
    '............',
    '............',
  ],
  cape: [
    '....aaaa....',
    '...ammmma...',
    '...mllllm...',
    '..mllllllm..',
    '..mllllllm..',
    '..mllllllm..',
    '..mllllllm..',
    '.mllllllllm.',
    '.mllllllllm.',
    '.dmmllllmmd.',
    '..ddm..mdd..',
    '............',
  ],
  fish: [
    '............',
    '.......dd...',
    '...mmmmmmd..',
    '..mllllllmd.',
    '.mlllaalllmm',
    '.mllllllllml',
    '.mlllllllmm.',
    '..mllllllm..',
    '...mmmmmm...',
    '......dd....',
    '............',
    '............',
  ],
  meat: [
    '............',
    '....mmmm....',
    '...mllllm...',
    '..mllaallm..',
    '..mllllllm..',
    '...mllllm...',
    '....mmmm....',
    '.....hh.....',
    '.....hh.....',
    '....lhhl....',
    '....llll....',
    '.....dd.....',
  ],
  ration: [
    '............',
    '..dddddddd..',
    '..dmmmmmmd..',
    '..dmllllmd..',
    '..dmlaalmd..',
    '..dmllllmd..',
    '..dmllllmd..',
    '..dmmmmmmd..',
    '..dddddddd..',
    '............',
    '............',
    '............',
  ],
  grub: [
    '............',
    '.....aa.....',
    '....aaaa....',
    '...mmmmmm...',
    '..mllllllm..',
    '..mlallalm..',
    '..mllllllm..',
    '..mllllllm..',
    '...mmmmmm...',
    '....dddd....',
    '............',
    '............',
  ],
  potion: [
    '....aaaa....',
    '....ahha....',
    '....mmmm....',
    '...mllllm...',
    '..mllllllm..',
    '..mllllllm..',
    '..mllaallm..',
    '..mllllllm..',
    '..mllllllm..',
    '...mllllm...',
    '....dddd....',
    '............',
  ],
  bar: [
    '............',
    '............',
    '...llllll...',
    '..llmmmmll..',
    '.llmmmmmmll.',
    '.lmmmmmmmml.',
    '.dmmmmmmmmd.',
    '..dddddddd..',
    '............',
    '............',
    '............',
    '............',
  ],
  junk: [
    '............',
    '.....dd.....',
    '...ddmmd....',
    '..dmmllmd...',
    '.dmllmmlmd..',
    '.dmlmmdmmd..',
    '..dmmdmmd...',
    '...ddmmdd...',
    '....dddd....',
    '............',
    '............',
    '............',
  ],
};

interface IconTint {
  m: string;
  d: string;
  l: string;
  h: string;
  a: string;
}

const TINT_BRONZE: IconTint = { m: '#a9713a', d: '#5e3a17', l: '#d69a5c', h: '#6b4526', a: '#8a5a2b' };
const TINT_STEEL: IconTint = { m: '#9aa2ab', d: '#4d5560', l: '#cdd4dc', h: '#5c4033', a: '#7d858e' };
const TINT_ADAMANT: IconTint = { m: '#4e8f6d', d: '#245140', l: '#7fc39c', h: '#5c4033', a: '#356b52' };
const TINT_RUNE: IconTint = { m: '#3f86b5', d: '#1d4a69', l: '#79bde3', h: '#5c4033', a: '#2a6690' };
const TINT_GOBLIN: IconTint = { m: '#6f7a48', d: '#39411f', l: '#9aa66a', h: '#4a3728', a: '#57603a' };
const TINT_MYTHIC: IconTint = { m: '#c9a227', d: '#6f5410', l: '#f4dc7a', h: '#5c4033', a: '#e0c04a' };
const TINT_ARCANE: IconTint = { m: '#7c4fc0', d: '#3d2168', l: '#b48ff0', h: '#4a3728', a: '#c9a4ff' };
const TINT_FISH: IconTint = { m: '#6c93b8', d: '#33506e', l: '#a8c8e2', h: '#8d6a4a', a: '#ffb3a0' };
const TINT_MEAT: IconTint = { m: '#b5563f', d: '#6a2a1c', l: '#e08a6a', h: '#e8dcc8', a: '#7d3324' };
const TINT_BREAD: IconTint = { m: '#c39a52', d: '#6f5223', l: '#e6c78a', h: '#8d6a4a', a: '#a87a34' };
const TINT_GRUB: IconTint = { m: '#7f9c4a', d: '#3f5122', l: '#b3cf7a', h: '#4a3728', a: '#d9e07a' };
const TINT_GOLD: IconTint = { m: '#d4a72c', d: '#7a5c10', l: '#f6e08a', h: '#5c4033', a: '#ffe9a0' };
const TINT_JUNK: IconTint = { m: '#6d6459', d: '#3a352e', l: '#948a7c', h: '#4a4238', a: '#575047' };
const TINT_PRAYER: IconTint = { m: '#397eb2', d: '#183d68', l: '#a9ddf5', h: '#d7d5cb', a: '#eefaff' };
const TINT_BANDOS: IconTint = { m: '#645547', d: '#2f2925', l: '#a18a69', h: '#62432c', a: '#c39b3d' };
const TINT_SARADOMIN: IconTint = { m: '#d7d9d3', d: '#6f7f8b', l: '#f4f2df', h: '#526e91', a: '#d3ad3d' };
const TINT_ZAMORAK: IconTint = { m: '#8f302e', d: '#351c22', l: '#c95848', h: '#4a3028', a: '#c69a36' };
const TINT_ARMADYL: IconTint = { m: '#63849a', d: '#304a5d', l: '#a4bdc8', h: '#5a4635', a: '#d1ae4b' };
const TINT_STEAM: IconTint = { m: '#668c9d', d: '#304b5c', l: '#b2d6dc', h: '#5c4033', a: '#e16f45' };
const TINT_BONE: IconTint = { m: '#d4c9aa', d: '#746d5d', l: '#f3ead0', h: '#68503a', a: '#6e82b0' };
const TINT_OBSIDIAN: IconTint = { m: '#3a3233', d: '#171416', l: '#665052', h: '#5c4033', a: '#e04a22' };
const TINT_FIRE: IconTint = { m: '#a82f1f', d: '#421719', l: '#ef6a28', h: '#5c2d24', a: '#ffd04a' };
const TINT_DRAGON: IconTint = { m: '#4d8b57', d: '#284a35', l: '#79b66e', h: '#5c4033', a: '#d2bd77' };
const TINT_ORC: IconTint = { m: '#555052', d: '#292429', l: '#898587', h: '#68442e', a: '#9d332b' };
const TINT_SWAMP: IconTint = { m: '#657c58', d: '#354637', l: '#9caf7d', h: '#5c4033', a: '#a77a4c' };

const ITEM_ICON_MAP: Record<string, { shape: IconArchetype; tint: IconTint }> = {
  'vampyre-cape': { shape: 'cape', tint: TINT_ZAMORAK },
  'bandos-chestplate': { shape: 'body', tint: TINT_BANDOS },
  'bandos-tassets': { shape: 'legs', tint: TINT_BANDOS },
  'bandos-boots': { shape: 'boots', tint: TINT_BANDOS },
  'armadyl-helmet': { shape: 'helm', tint: TINT_ARMADYL },
  'armadyl-chestplate': { shape: 'body', tint: TINT_ARMADYL },
  'armadyl-chainskirt': { shape: 'legs', tint: TINT_ARMADYL },
  'bandos-hilt': { shape: 'hilt', tint: TINT_BANDOS },
  'saradomin-hilt': { shape: 'hilt', tint: TINT_SARADOMIN },
  'zamorak-hilt': { shape: 'hilt', tint: TINT_ZAMORAK },
  'armadyl-hilt': { shape: 'hilt', tint: TINT_ARMADYL },
  'godsword-shard-1': { shape: 'shard', tint: TINT_STEEL },
  'godsword-shard-2': { shape: 'shard', tint: TINT_SARADOMIN },
  'godsword-shard-3': { shape: 'shard', tint: TINT_RUNE },
  'dragon-bones': { shape: 'shard', tint: TINT_BONE },
  'ancient-totem': { shape: 'hilt', tint: TINT_ARCANE },
  'swamp-snelm': { shape: 'helm', tint: TINT_SWAMP },
  'vampyre-coat': { shape: 'body', tint: TINT_ZAMORAK },
  'obsidian-shield': { shape: 'shield', tint: TINT_OBSIDIAN },
  'tzhaar-gauntlets': { shape: 'knuckles', tint: TINT_OBSIDIAN },
  'fire-cape': { shape: 'cape', tint: TINT_FIRE },
  'rune-platebody': { shape: 'body', tint: TINT_RUNE },
  'berserker-ring': { shape: 'ring', tint: TINT_BANDOS },
  'warrior-ring': { shape: 'ring', tint: TINT_RUNE },
  'bone-crown': { shape: 'helm', tint: TINT_BONE },
  'bone-plate': { shape: 'body', tint: TINT_BONE },
  'bone-greaves': { shape: 'legs', tint: TINT_BONE },
  'bone-gauntlets': { shape: 'knuckles', tint: TINT_BONE },
  'bone-boots': { shape: 'boots', tint: TINT_BONE },
  'bone-shield': { shape: 'shield', tint: TINT_BONE },
  'bone-amulet': { shape: 'neck', tint: TINT_BONE },
  'bone-arrows': { shape: 'ammo', tint: TINT_BONE },
  'orc-warplate': { shape: 'body', tint: TINT_ORC },
  'orc-warboots': { shape: 'boots', tint: TINT_ORC },
  'steel-full-helm': { shape: 'helm', tint: TINT_STEEL },
  'adventurer-cape': { shape: 'cape', tint: TINT_BRONZE },
  'bronze-amulet': { shape: 'neck', tint: TINT_BRONZE },
  'steel-arrows': { shape: 'ammo', tint: TINT_STEEL },
  'steel-platebody': { shape: 'body', tint: TINT_STEEL },
  'steel-kiteshield': { shape: 'shield', tint: TINT_STEEL },
  'steel-platelegs': { shape: 'legs', tint: TINT_STEEL },
  'leather-gloves': { shape: 'knuckles', tint: TINT_BRONZE },
  'leather-boots': { shape: 'boots', tint: TINT_BRONZE },
  'copper-ring': { shape: 'ring', tint: TINT_BRONZE },
  'bronze-sword': { shape: 'sword', tint: TINT_BRONZE },
  'slimy-sword': { shape: 'sword', tint: TINT_GOBLIN },
  'goblin-sword': { shape: 'scimitar', tint: TINT_GOBLIN },
  'goblin-mace': { shape: 'mace', tint: TINT_GOBLIN },
  'goblin-club': { shape: 'club', tint: TINT_GOBLIN },
  'rune-scim': { shape: 'scimitar', tint: TINT_RUNE },
  'steel-sword': { shape: 'sword', tint: TINT_STEEL },
  'addy-sword': { shape: 'sword', tint: TINT_ADAMANT },
  'rune-sword': { shape: 'sword', tint: TINT_RUNE },
  excalibur: { shape: 'sword', tint: TINT_MYTHIC },
  'steel-knuckles': { shape: 'knuckles', tint: TINT_STEEL },
  'addy-knuckles': { shape: 'knuckles', tint: TINT_ADAMANT },
  'rune-knuckles': { shape: 'knuckles', tint: TINT_RUNE },
  'arcane-staff': { shape: 'staff', tint: TINT_ARCANE },
  'graardor-warhammer': { shape: 'mace', tint: TINT_BANDOS },
  'saradomin-sword': { shape: 'sword', tint: TINT_SARADOMIN },
  'armadyl-crossbow': { shape: 'crossbow', tint: TINT_ARMADYL },
  'zamorakian-spear': { shape: 'spear', tint: TINT_ZAMORAK },
  'steam-battlestaff': { shape: 'staff', tint: TINT_STEAM },
  'tzhaar-ket-om': { shape: 'mace', tint: TINT_OBSIDIAN },
  'possessed-femur': { shape: 'club', tint: TINT_BONE },
  'dragon-axe': { shape: 'axe', tint: TINT_DRAGON },
  doomhammer: { shape: 'mace', tint: TINT_ORC },
  'saurfang-cleaver': { shape: 'axe', tint: TINT_ORC },
  'prayer-potion': { shape: 'potion', tint: TINT_PRAYER },
  shrimp: { shape: 'fish', tint: TINT_MEAT },
  trout: { shape: 'fish', tint: TINT_FISH },
  shark: { shape: 'fish', tint: TINT_STEEL },
  manta: { shape: 'fish', tint: TINT_ARCANE },
  'raw-beef': { shape: 'meat', tint: TINT_MEAT },
  'goblin-meat': { shape: 'meat', tint: TINT_GRUB },
  'varrock-rations': { shape: 'ration', tint: TINT_BREAD },
  'wizard-grub': { shape: 'grub', tint: TINT_GRUB },
  'war-god-ration': { shape: 'ration', tint: TINT_BANDOS },
  'swamp-snail-meat': { shape: 'meat', tint: TINT_SWAMP },
  'swamp-ration': { shape: 'ration', tint: TINT_SWAMP },
  'lava-eel': { shape: 'fish', tint: TINT_FIRE },
  'dragon-steak': { shape: 'meat', tint: TINT_DRAGON },
  'bone-broth': { shape: 'grub', tint: TINT_BONE },
  'gold-bar': { shape: 'bar', tint: TINT_GOLD },
  junk: { shape: 'junk', tint: TINT_JUNK },
  'dark-wizard-hat': { shape: 'helm', tint: TINT_ARCANE },
  'scorpion-stinger': { shape: 'spear', tint: TINT_ADAMANT },
  'obsidian-cape': { shape: 'cape', tint: TINT_OBSIDIAN },
  'orc-warhelm': { shape: 'helm', tint: TINT_ORC },
  'spiritual-sigil': { shape: 'neck', tint: TINT_SARADOMIN },
  'knight-tabard': { shape: 'body', tint: TINT_SARADOMIN },
  'avas-assembler': { shape: 'cape', tint: TINT_STEEL },
  'swamp-cloak': { shape: 'cape', tint: TINT_SWAMP },
  'ossuary-charm': { shape: 'neck', tint: TINT_BONE },
  'orcish-cleaver': { shape: 'axe', tint: TINT_ORC },
  'frog-legs': { shape: 'meat', tint: TINT_GRUB },
  'bronze-defender': { shape: 'shield', tint: TINT_BRONZE },
  'iron-defender': { shape: 'shield', tint: TINT_JUNK },
  'steel-defender': { shape: 'shield', tint: TINT_STEEL },
  'black-defender': { shape: 'shield', tint: TINT_OBSIDIAN },
  'mithril-defender': { shape: 'shield', tint: TINT_RUNE },
  'adamant-defender': { shape: 'shield', tint: TINT_ADAMANT },
  'rune-defender': { shape: 'shield', tint: TINT_ARMADYL },
  'dragon-defender': { shape: 'shield', tint: TINT_FIRE },
  'cyclops-hide': { shape: 'junk', tint: TINT_BREAD },
  'barrows-key': { shape: 'shard', tint: TINT_BONE },
  'amulet-of-power': { shape: 'neck', tint: TINT_GOLD },
  'amulet-of-glory': { shape: 'neck', tint: TINT_MYTHIC },
  'sharpened-stake': { shape: 'spear', tint: TINT_BREAD },
  'ahrims-hood': { shape: 'helm', tint: TINT_ARCANE },
  'ahrims-top': { shape: 'body', tint: TINT_ARCANE },
  'ahrims-skirt': { shape: 'legs', tint: TINT_ARCANE },
  'ahrims-staff': { shape: 'staff', tint: TINT_ARCANE },
  'dharoks-helm': { shape: 'helm', tint: TINT_BANDOS },
  'dharoks-platebody': { shape: 'body', tint: TINT_BANDOS },
  'dharoks-platelegs': { shape: 'legs', tint: TINT_BANDOS },
  'dharoks-greataxe': { shape: 'axe', tint: TINT_BANDOS },
  'guthans-helm': { shape: 'helm', tint: TINT_SWAMP },
  'guthans-platebody': { shape: 'body', tint: TINT_SWAMP },
  'guthans-chainskirt': { shape: 'legs', tint: TINT_SWAMP },
  'guthans-warspear': { shape: 'spear', tint: TINT_SWAMP },
  'karils-coif': { shape: 'helm', tint: TINT_ZAMORAK },
  'karils-leathertop': { shape: 'body', tint: TINT_ZAMORAK },
  'karils-leatherskirt': { shape: 'legs', tint: TINT_ZAMORAK },
  'karils-crossbow': { shape: 'crossbow', tint: TINT_ZAMORAK },
  'torags-helm': { shape: 'helm', tint: TINT_STEEL },
  'torags-platebody': { shape: 'body', tint: TINT_STEEL },
  'torags-platelegs': { shape: 'legs', tint: TINT_STEEL },
  'torags-hammers': { shape: 'mace', tint: TINT_STEEL },
  'veracs-helm': { shape: 'helm', tint: TINT_MYTHIC },
  'veracs-brassard': { shape: 'body', tint: TINT_MYTHIC },
  'veracs-plateskirt': { shape: 'legs', tint: TINT_MYTHIC },
  'veracs-flail': { shape: 'mace', tint: TINT_MYTHIC },
  'shire-pie': { shape: 'ration', tint: TINT_BREAD },
};

const CATEGORY_FALLBACK: Record<string, { shape: IconArchetype; tint: IconTint }> = {
  weapon: { shape: 'sword', tint: TINT_STEEL },
  armor: { shape: 'body', tint: TINT_STEEL },
  food: { shape: 'meat', tint: TINT_MEAT },
  potion: { shape: 'potion', tint: TINT_PRAYER },
  misc: { shape: 'bar', tint: TINT_GOLD },
};

function resolveIcon(itemId: string, category: string): { shape: IconArchetype; tint: IconTint } {
  return ITEM_ICON_MAP[itemId] ?? CATEGORY_FALLBACK[category] ?? CATEGORY_FALLBACK.weapon!;
}

/** Draws a 12x12 item icon into ctx, scaled to `size` px. */
export function drawItemIcon(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  category: string,
  x: number,
  y: number,
  size: number
): void {
  const { shape, tint } = resolveIcon(itemId, category);
  const grid = ICON_GRIDS[shape];
  const scale = size / 12;

  for (let row = 0; row < grid.length; row++) {
    const line = grid[row]!;
    for (let col = 0; col < 12; col++) {
      const ch = line[col];
      if (!ch || ch === '.') continue;
      const color =
        ch === 'm' ? tint.m : ch === 'd' ? tint.d : ch === 'l' ? tint.l : ch === 'h' ? tint.h : tint.a;
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.round(x + col * scale),
        Math.round(y + row * scale),
        Math.ceil(scale),
        Math.ceil(scale)
      );
    }
  }
}

/** Convenience: standalone canvas element holding an item icon. */
export function createItemIconCanvas(itemId: string, category: string, px = 24): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    drawItemIcon(ctx, itemId, category, 0, 0, px);
  }
  return canvas;
}

export function drawHitsplat(ctx: CanvasRenderingContext2D, x: number, y: number, damage: number, missed: boolean): void {
  const w = 28;
  const h = 22;
  ctx.fillStyle = missed ? '#0000ff' : '#a41623';
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(missed ? '0' : String(damage), x, y - 6);
}

export function drawXpDrop(ctx: CanvasRenderingContext2D, x: number, y: number, amount: number, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#00ff00';
  ctx.font = '9px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`+${amount} xp`, x, y);
  ctx.globalAlpha = 1;
}

export function drawHpBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  hp: number,
  maxHp: number
): void {
  const h = 6;
  ctx.fillStyle = '#1a140f';
  ctx.fillRect(x, y, width, h);
  const pct = maxHp > 0 ? hp / maxHp : 0;
  ctx.fillStyle = '#2d6a1f';
  ctx.fillRect(x, y, width * pct, h);
  ctx.strokeStyle = '#8b7355';
  ctx.strokeRect(x, y, width, h);
}

export { getEntityClickHitbox as getEntityHitbox };
