import type { AreaDef } from '../engine/types';
import { NAV_MASKS } from './nav-masks';

export interface NavPoint {
  x: number;
  y: number;
}

interface NavPath {
  /** Centre line of a painted road/path. Width is the usable feet corridor. */
  points: NavPoint[];
  width: number;
}

interface NavPolygon {
  points: NavPoint[];
}

interface NavigationDef {
  paths?: NavPath[];
  zones?: NavPolygon[];
  blockers?: NavPolygon[];
}

/** Nav-mask resolution. The generated masks in nav-masks.ts assume these. */
export const CELL = 3;
export const MASK_COLS = 255;
export const MASK_ROWS = 168;

/**
 * How far the player may stand off the painted walkway. A couple of pixels of
 * slack makes creatures and scenery edges comfortable to click without letting
 * anyone stroll into a chasm.
 */
const EDGE_TOLERANCE = 5;

const p = (x: number, y: number): NavPoint => ({ x, y });

/**
 * Hand-traced navigation geometry in the same 765x503 coordinate space as the
 * area canvas. These shapes describe where the player's feet may stand.
 *
 * Lumbridge is traced edge-to-edge around the actual painted stone/dirt roads.
 * Varrock's central square is a broad cobbled zone with structures cut out.
 */
export const NAVIGATION: Record<string, NavigationDef> = {
  lumbridge: {
    zones: [
      {
        // Castle gate, stone stair edges, and the narrow road to the crossroads.
        points: [
          p(496, 108),
          p(524, 108),
          p(522, 124),
          p(504, 145),
          p(485, 165),
          p(466, 185),
          p(448, 207),
          p(429, 230),
          p(409, 253),
          p(389, 274),
          p(368, 292),
          p(344, 310),
          p(329, 321),
          p(310, 314),
          p(325, 295),
          p(346, 279),
          p(366, 258),
          p(386, 236),
          p(405, 212),
          p(424, 189),
          p(444, 166),
          p(465, 145),
          p(486, 125),
        ],
      },
      {
        // Main stone road from the crossroads to the south-east entrance.
        points: [
          p(304, 292),
          p(328, 298),
          p(359, 315),
          p(399, 332),
          p(445, 352),
          p(494, 376),
          p(545, 403),
          p(596, 432),
          p(650, 461),
          p(718, 490),
          p(750, 503),
          p(665, 503),
          p(615, 486),
          p(563, 462),
          p(513, 437),
          p(464, 413),
          p(417, 390),
          p(374, 370),
          p(336, 352),
          p(305, 335),
        ],
      },
      {
        // Western path and the exact wooden bridge deck across the river.
        points: [
          p(323, 297),
          p(324, 323),
          p(292, 334),
          p(262, 347),
          p(233, 363),
          p(209, 382),
          p(186, 405),
          p(163, 430),
          p(136, 453),
          p(103, 472),
          p(66, 486),
          p(48, 462),
          p(87, 444),
          p(115, 426),
          p(139, 402),
          p(161, 377),
          p(184, 355),
          p(213, 335),
          p(246, 318),
          p(279, 305),
          p(307, 297),
        ],
      },
      {
        // Narrow village path from the crossroads to the well.
        points: [
          p(301, 320),
          p(286, 292),
          p(277, 266),
          p(267, 244),
          p(248, 232),
          p(226, 224),
          p(232, 197),
          p(263, 205),
          p(291, 221),
          p(304, 250),
          p(314, 279),
          p(327, 301),
        ],
      },
    ],
  },
  varrock: {
    zones: [
      {
        // Narrow passage under the northern arch.
        points: [p(261, 179), p(297, 179), p(298, 205), p(316, 226), p(340, 246), p(326, 270), p(300, 249), p(270, 220)],
      },
      {
        // Eastern stair corridor; the stone walls on both sides are solid.
        points: [p(563, 217), p(585, 211), p(621, 264), p(606, 282), p(582, 257)],
      },
      {
        // Open cobbled market square.
        points: [
          p(246, 190),
          p(352, 186),
          p(389, 218),
          p(533, 220),
          p(566, 250),
          p(645, 263),
          p(672, 302),
          p(730, 330),
          p(765, 350),
          p(765, 503),
          p(151, 503),
          p(144, 456),
          p(122, 416),
          p(128, 365),
          p(147, 319),
          p(183, 281),
          p(215, 245),
          p(231, 207),
        ],
      },
    ],
    blockers: [
      {
        // Angel statue and its raised circular dais.
        points: [
          p(415, 264),
          p(453, 248),
          p(493, 255),
          p(526, 278),
          p(535, 309),
          p(521, 337),
          p(486, 354),
          p(445, 354),
          p(410, 337),
          p(393, 309),
          p(397, 283),
        ],
      },
      {
        // Southern well and its stone lip.
        points: [
          p(560, 404),
          p(594, 391),
          p(630, 397),
          p(657, 420),
          p(662, 452),
          p(646, 480),
          p(615, 496),
          p(580, 489),
          p(557, 465),
          p(550, 432),
        ],
      },
      {
        // Canvas market awnings and counters in the south-west.
        points: [
          p(133, 350),
          p(210, 359),
          p(244, 388),
          p(241, 462),
          p(211, 503),
          p(137, 503),
        ],
      },
      {
        // Timber shelter beside the southern well.
        points: [p(526, 352), p(594, 369), p(613, 403), p(602, 433), p(551, 423), p(522, 390)],
      },
      {
        // Round eastern building and doorway.
        points: [p(688, 187), p(765, 179), p(765, 374), p(713, 366), p(680, 323)],
      },
    ],
  },
  falador: {
    zones: [
      {
        // Broad white-stone plaza and the southern city approach.
        points: [
          p(332, 194),
          p(548, 190),
          p(622, 200),
          p(683, 235),
          p(707, 282),
          p(668, 332),
          p(731, 373),
          p(765, 390),
          p(765, 503),
          p(416, 503),
          p(360, 463),
          p(294, 462),
          p(232, 432),
          p(188, 382),
          p(190, 337),
          p(216, 304),
          p(208, 279),
          p(248, 248),
          p(292, 215),
        ],
      },
      {
        // Western mine apron and its paved connection to the plaza.
        points: [
          p(36, 183),
          p(76, 174),
          p(110, 190),
          p(142, 210),
          p(184, 210),
          p(223, 242),
          p(229, 277),
          p(204, 301),
          p(160, 299),
          p(112, 285),
          p(67, 265),
          p(40, 231),
        ],
      },
      {
        // Main fortress gate passage.
        points: [p(426, 145), p(484, 145), p(499, 198), p(477, 218), p(425, 213), p(412, 184)],
      },
      {
        // Western garden stair and castle-wall walk.
        points: [p(279, 177), p(321, 171), p(354, 211), p(330, 252), p(300, 246), p(322, 214)],
      },
      {
        // Eastern stair connecting the court to the upper wall road.
        points: [p(629, 177), p(681, 171), p(665, 223), p(626, 254), p(600, 234)],
      },
    ],
    blockers: [
      {
        // Central fountain and obelisk island.
        points: [
          p(404, 263),
          p(431, 242),
          p(472, 237),
          p(516, 251),
          p(540, 279),
          p(535, 310),
          p(505, 333),
          p(463, 340),
          p(423, 328),
          p(397, 302),
        ],
      },
      {
        // Raised north-west flower garden.
        points: [p(190, 211), p(224, 188), p(275, 185), p(314, 211), p(318, 247), p(287, 271), p(235, 273), p(196, 251)],
      },
      {
        // Raised south-west garden.
        points: [p(242, 365), p(274, 342), p(329, 343), p(366, 374), p(365, 422), p(337, 449), p(278, 445), p(239, 414)],
      },
      {
        // Raised south-east garden.
        points: [p(526, 371), p(560, 345), p(614, 348), p(654, 381), p(660, 431), p(628, 457), p(571, 455), p(528, 423)],
      },
      {
        // Western smithy and its work yard.
        points: [p(0, 278), p(151, 279), p(210, 321), p(212, 412), p(177, 443), p(0, 449)],
      },
      {
        // Eastern chapel and smithing shelter.
        points: [p(667, 272), p(765, 267), p(765, 440), p(711, 439), p(672, 403), p(650, 334)],
      },
    ],
  },
  'draynor-manor': {
    zones: [
      {
        // Cracked circular courtyard between the manor, graveyard and workshop.
        points: [
          p(239, 180),
          p(499, 180),
          p(532, 210),
          p(543, 258),
          p(521, 316),
          p(457, 354),
          p(300, 354),
          p(241, 331),
          p(204, 285),
          p(207, 238),
        ],
      },
      {
        // Straight southern road through the open iron estate gate.
        points: [p(294, 313), p(475, 313), p(474, 503), p(305, 503)],
      },
      {
        // Manor stair and front-door approach.
        points: [p(337, 147), p(424, 147), p(438, 190), p(323, 190)],
      },
      {
        // Eastern workshop gate and open mechanical yard.
        points: [
          p(512, 252),
          p(557, 214),
          p(739, 203),
          p(765, 226),
          p(765, 354),
          p(594, 355),
          p(544, 329),
        ],
      },
    ],
    blockers: [
      {
        // Dead tree and raised circular planter in the central court.
        points: [
          p(323, 211),
          p(345, 194),
          p(377, 190),
          p(407, 204),
          p(424, 230),
          p(415, 258),
          p(389, 276),
          p(354, 274),
          p(327, 254),
          p(315, 232),
        ],
      },
      {
        // Workshop roof and stone building footprint.
        points: [p(650, 180), p(765, 177), p(765, 281), p(720, 279), p(683, 250)],
      },
      {
        // Timber experiment frame and stacked equipment.
        points: [p(528, 223), p(601, 205), p(650, 235), p(636, 290), p(558, 286)],
      },
    ],
  },
  'god-wars-dungeon': {
    zones: [
      {
        // Central circular war nexus.
        points: [
          p(274, 174),
          p(314, 148),
          p(385, 139),
          p(456, 150),
          p(500, 181),
          p(505, 226),
          p(469, 268),
          p(390, 284),
          p(310, 270),
          p(268, 229),
        ],
      },
      {
        // Frozen southern entry bridge.
        points: [p(345, 252), p(430, 252), p(435, 503), p(337, 503)],
      },
      {
        // Northern bridge into the celestial court.
        points: [p(344, 91), p(427, 91), p(432, 168), p(338, 168)],
      },
      {
        // Northern celestial court.
        points: [p(209, 35), p(269, 17), p(450, 17), p(506, 42), p(495, 106), p(439, 139), p(286, 140), p(205, 104)],
      },
      {
        // Western bronze bridge.
        points: [p(171, 155), p(283, 165), p(286, 229), p(176, 242), p(153, 206)],
      },
      {
        // Western warlord court.
        points: [p(0, 91), p(77, 67), p(179, 80), p(218, 120), p(210, 203), p(169, 248), p(51, 250), p(0, 223)],
      },
      {
        // Eastern volcanic bridge.
        points: [p(491, 166), p(560, 154), p(576, 226), p(500, 239)],
      },
      {
        // Eastern demonic court.
        points: [p(548, 101), p(647, 77), p(765, 95), p(765, 252), p(650, 261), p(559, 231)],
      },
      {
        // South-eastern bridge into the avian court.
        points: [p(455, 246), p(516, 238), p(568, 303), p(535, 342), p(479, 304)],
      },
      {
        // South-eastern avian court.
        points: [p(497, 292), p(592, 270), p(700, 289), p(744, 343), p(727, 430), p(645, 457), p(543, 439), p(491, 388)],
      },
      {
        // Broken south-western Ancient court beneath Graardor.
        points: [
          p(42, 307), p(104, 279), p(196, 286), p(247, 321), p(263, 374),
          p(244, 415), p(203, 443), p(115, 449), p(56, 421), p(34, 362),
        ],
      },
      {
        // Cracked remnant bridge linking the Ancient court to the entry causeway.
        points: [p(228, 326), p(349, 292), p(368, 342), p(258, 385)],
      },
    ],
  },
  'morytania-swamp': {
    zones: [
      {
        // Southern causeway and central mud island.
        points: [
          p(302, 503), p(456, 503), p(452, 355), p(488, 309), p(505, 267),
          p(493, 205), p(448, 174), p(365, 174), p(311, 205), p(287, 260),
          p(310, 320),
        ],
      },
      {
        // Western clearing and its timber approach.
        points: [
          p(77, 147), p(132, 130), p(197, 139), p(254, 174), p(326, 177),
          p(332, 220), p(254, 226), p(219, 261), p(146, 277), p(82, 243),
        ],
      },
      {
        // Eastern ruin clearing and boardwalk.
        points: [
          p(486, 194), p(536, 164), p(655, 157), p(719, 192), p(731, 255),
          p(686, 300), p(604, 305), p(535, 278), p(502, 238),
        ],
      },
    ],
  },
  'tzhaar-city': {
    zones: [
      {
        // Central obsidian plaza.
        points: [
          p(270, 185), p(321, 156), p(397, 149), p(472, 173), p(507, 220),
          p(493, 278), p(448, 313), p(354, 318), p(283, 289), p(251, 238),
        ],
      },
      {
        // Southern entrance bridge.
        points: [p(339, 282), p(438, 282), p(440, 503), p(334, 503)],
      },
      {
        // Western melee court and bridge.
        points: [
          p(16, 321), p(75, 297), p(181, 302), p(241, 333), p(267, 378),
          p(235, 432), p(173, 466), p(75, 461), p(24, 428),
        ],
      },
      {
        // Narrow western bridge from the central plaza.
        points: [
          p(205, 279), p(264, 211), p(304, 228), p(272, 319), p(223, 379), p(181, 358),
        ],
      },
      {
        // Eastern magic court and bridge.
        points: [
          p(495, 336), p(553, 303), p(661, 302), p(733, 336), p(754, 397),
          p(716, 454), p(626, 467), p(554, 438), p(511, 392),
        ],
      },
      {
        // Narrow eastern bridge from the central plaza.
        points: [
          p(476, 226), p(518, 208), p(581, 313), p(548, 365), p(511, 343),
        ],
      },
      {
        // Stair to Jad's raised arena.
        points: [p(345, 111), p(429, 111), p(442, 191), p(330, 191)],
      },
      {
        // Jad arena.
        points: [
          p(259, 29), p(308, 12), p(423, 12), p(488, 37), p(506, 86),
          p(475, 126), p(411, 145), p(322, 139), p(267, 112), p(245, 70),
        ],
      },
    ],
  },
  'elvargs-lair': {
    zones: [
      {
        // Broad scorched dragon court.
        points: [
          p(157, 136), p(213, 94), p(313, 73), p(457, 74), p(557, 104),
          p(618, 159), p(632, 236), p(590, 295), p(503, 326), p(268, 326),
          p(183, 299), p(139, 238),
        ],
      },
      {
        // Winding southern cave approach.
        points: [p(326, 291), p(443, 291), p(433, 503), p(329, 503)],
      },
    ],
  },
  'dagannoth-cave': {
    zones: [
      {
        // Rex's raised central nesting court.
        points: [
          p(274, 106), p(318, 79), p(399, 71), p(471, 91), p(511, 128),
          p(511, 180), p(474, 220), p(399, 239), p(318, 222), p(274, 187),
        ],
      },
      {
        // Main wet-stone causeway from the southern entrance.
        points: [p(347, 198), p(432, 198), p(437, 503), p(338, 503)],
      },
    ],
  },
  'bone-king-graveyard': {
    zones: [
      {
        // Central burial road and open court before the throne.
        points: [
          p(284, 177), p(342, 137), p(427, 137), p(486, 178), p(515, 246),
          p(482, 332), p(440, 357), p(438, 503), p(329, 503), p(327, 355),
          p(279, 321), p(251, 246),
        ],
      },
      {
        // Western skeleton burial court.
        points: [
          p(102, 201), p(165, 176), p(245, 192), p(292, 239), p(280, 298),
          p(226, 334), p(146, 322), p(91, 276),
        ],
      },
      {
        // Eastern skeleton burial court.
        points: [
          p(482, 210), p(540, 181), p(634, 186), p(706, 224), p(716, 288),
          p(671, 332), p(580, 334), p(510, 298),
        ],
      },
      {
        // Bone King's stair and throne court.
        points: [p(324, 77), p(444, 77), p(465, 159), p(306, 159)],
      },
    ],
    blockers: [
      {
        // Dead tree island in the middle of the court.
        points: [p(350, 215), p(383, 199), p(418, 215), p(426, 252), p(397, 279), p(356, 271), p(338, 241)],
      },
    ],
  },
  'durotar-azeroth': {
    zones: [
      {
        // Open red-earth challenge arena.
        points: [
          p(176, 171), p(233, 140), p(475, 139), p(545, 173), p(565, 235),
          p(539, 303), p(476, 337), p(254, 337), p(186, 304), p(156, 237),
        ],
      },
      {
        // Southern palisade gate.
        points: [p(317, 300), p(454, 300), p(459, 503), p(315, 503)],
      },
      {
        // Command stair and upper platform.
        points: [
          p(315, 55), p(456, 55), p(466, 119), p(443, 171), p(327, 171), p(302, 119),
        ],
      },
    ],
  },
  'the-shire': {
    paths: [
      {
        // Main lane from the southern wall to the central crossroads.
        points: [p(383, 503), p(383, 420), p(390, 337), p(396, 268), p(407, 217)],
        width: 74,
      },
      {
        // Bilbo's lower-west lane.
        points: [p(392, 328), p(310, 328), p(235, 348), p(171, 361)],
        width: 64,
      },
      {
        // Party Tree path where Gandalf waits.
        points: [p(404, 228), p(336, 196), p(280, 165), p(225, 147)],
        width: 65,
      },
      {
        // Upper-east lane to Frodo's green-door hill.
        points: [p(404, 226), p(453, 184), p(516, 147)],
        width: 62,
      },
      {
        // Sam's garden lane.
        points: [p(391, 299), p(476, 304), p(550, 335), p(610, 373)],
        width: 66,
      },
    ],
  },
};

// Regions that share a painting share its traced ground.
NAVIGATION['warriors-guild'] = NAVIGATION.falador!;
NAVIGATION['barrows'] = NAVIGATION['bone-king-graveyard']!;

export function distanceToSegment(point: NavPoint, a: NavPoint, b: NavPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export function isInPolygon(point: NavPoint, polygon: NavPolygon): boolean {
  let inside = false;
  const points = polygon.points;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!;
    const b = points[j]!;
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

const maskCache = new Map<string, Uint8Array>();

/** Expands a run-length encoded mask into a flat cell grid. */
function getMask(areaId: string): Uint8Array | null {
  const cached = maskCache.get(areaId);
  if (cached) return cached;
  const encoded = NAV_MASKS[areaId];
  if (!encoded) return null;

  const mask = new Uint8Array(MASK_COLS * MASK_ROWS);
  let index = 0;
  let value = 0;
  for (const run of encoded.split(',')) {
    const length = Number.parseInt(run, 36);
    if (value === 1) mask.fill(1, index, Math.min(mask.length, index + length));
    index += length;
    value = value === 1 ? 0 : 1;
  }
  maskCache.set(areaId, mask);
  return mask;
}

function cellWalkable(mask: Uint8Array, col: number, row: number): boolean {
  if (col < 0 || col >= MASK_COLS || row < 0 || row >= MASK_ROWS) return false;
  return mask[row * MASK_COLS + col] === 1;
}

/**
 * True when the player's feet may rest here. The mask follows the painted
 * walkways; EDGE_TOLERANCE lets them overhang the edge slightly so clicking
 * near a path or a creature still works.
 */
export function isWalkable(areaId: string, point: NavPoint): boolean {
  const mask = getMask(areaId);
  if (!mask) return false;
  const col = Math.floor(point.x / CELL);
  const row = Math.floor(point.y / CELL);
  if (cellWalkable(mask, col, row)) return true;

  const slack = Math.ceil(EDGE_TOLERANCE / CELL);
  for (let dr = -slack; dr <= slack; dr++) {
    for (let dc = -slack; dc <= slack; dc++) {
      if (dc === 0 && dr === 0) continue;
      if (Math.hypot(dc * CELL, dr * CELL) > EDGE_TOLERANCE) continue;
      if (cellWalkable(mask, col + dc, row + dr)) return true;
    }
  }
  return false;
}

/** Strict test used for route finding, so paths stay on the painted ground. */
function isOnWalkway(areaId: string, point: NavPoint): boolean {
  const mask = getMask(areaId);
  if (!mask) return false;
  return cellWalkable(mask, Math.floor(point.x / CELL), Math.floor(point.y / CELL));
}

function isSegmentWalkable(areaId: string, from: NavPoint, to: NavPoint): boolean {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    // Endpoints may sit in the tolerance band; the crossing itself may not.
    const lenient = i === 0 || i === steps;
    if (!(lenient ? isWalkable(areaId, point) : isOnWalkway(areaId, point))) return false;
  }
  return true;
}

interface NavGrid {
  cols: number;
  rows: number;
  walkable: Uint8Array;
}

const gridCache = new Map<string, NavGrid>();

/** Routes run over the mask itself, one node per painted cell. */
function getGrid(area: AreaDef): NavGrid {
  const cached = gridCache.get(area.id);
  if (cached) return cached;
  const mask = getMask(area.id) ?? new Uint8Array(MASK_COLS * MASK_ROWS);
  const grid = { cols: MASK_COLS, rows: MASK_ROWS, walkable: mask };
  gridCache.set(area.id, grid);
  return grid;
}

function nearestGridNode(grid: NavGrid, point: NavPoint): number | null {
  const originCol = Math.max(0, Math.min(grid.cols - 1, Math.round(point.x / CELL)));
  const originRow = Math.max(0, Math.min(grid.rows - 1, Math.round(point.y / CELL)));

  for (let radius = 0; radius <= 10; radius++) {
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let row = originRow - radius; row <= originRow + radius; row++) {
      for (let col = originCol - radius; col <= originCol + radius; col++) {
        if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols) continue;
        if (radius > 0 && row !== originRow - radius && row !== originRow + radius && col !== originCol - radius && col !== originCol + radius) continue;
        const id = row * grid.cols + col;
        if (!grid.walkable[id]) continue;
        const distance = Math.hypot(col * CELL - point.x, row * CELL - point.y);
        if (distance < bestDistance) {
          best = id;
          bestDistance = distance;
        }
      }
    }
    if (best !== null) return best;
  }
  return null;
}

class MinHeap {
  private values: { id: number; score: number }[] = [];

  get size(): number {
    return this.values.length;
  }

  push(value: { id: number; score: number }): void {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent]!.score <= value.score) break;
      this.values[index] = this.values[parent]!;
      index = parent;
    }
    this.values[index] = value;
  }

  pop(): { id: number; score: number } | null {
    if (this.values.length === 0) return null;
    const root = this.values[0]!;
    const last = this.values.pop()!;
    if (this.values.length === 0) return root;

    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.values.length) break;
      const child =
        right < this.values.length && this.values[right]!.score < this.values[left]!.score ? right : left;
      if (this.values[child]!.score >= last.score) break;
      this.values[index] = this.values[child]!;
      index = child;
    }
    this.values[index] = last;
    return root;
  }
}

const NEIGHBOURS = [
  { dc: -1, dr: 0, cost: 1 },
  { dc: 1, dr: 0, cost: 1 },
  { dc: 0, dr: -1, cost: 1 },
  { dc: 0, dr: 1, cost: 1 },
  { dc: -1, dr: -1, cost: Math.SQRT2 },
  { dc: 1, dr: -1, cost: Math.SQRT2 },
  { dc: -1, dr: 1, cost: Math.SQRT2 },
  { dc: 1, dr: 1, cost: Math.SQRT2 },
] as const;

/**
 * A* route constrained to the hand-traced walkable geometry. The returned
 * points are line-of-sight smoothed so movement follows roads without grid
 * jitter while still respecting walls and water.
 */
export function findWalkPath(area: AreaDef, from: NavPoint, to: NavPoint): NavPoint[] | null {
  if (!isWalkable(area.id, from) || !isWalkable(area.id, to)) return null;
  if (isSegmentWalkable(area.id, from, to)) return [to];

  const grid = getGrid(area);
  const start = nearestGridNode(grid, from);
  const goal = nearestGridNode(grid, to);
  if (start === null || goal === null) return null;

  const count = grid.cols * grid.rows;
  const cameFrom = new Int32Array(count);
  cameFrom.fill(-1);
  const gScore = new Float64Array(count);
  gScore.fill(Number.POSITIVE_INFINITY);
  const closed = new Uint8Array(count);
  const open = new MinHeap();

  const goalCol = goal % grid.cols;
  const goalRow = Math.floor(goal / grid.cols);
  gScore[start] = 0;
  open.push({ id: start, score: 0 });

  while (open.size > 0) {
    const current = open.pop()!;
    if (closed[current.id]) continue;
    if (current.id === goal) break;
    closed[current.id] = 1;

    const col = current.id % grid.cols;
    const row = Math.floor(current.id / grid.cols);
    for (const neighbour of NEIGHBOURS) {
      const nextCol = col + neighbour.dc;
      const nextRow = row + neighbour.dr;
      if (nextCol < 0 || nextCol >= grid.cols || nextRow < 0 || nextRow >= grid.rows) continue;
      const next = nextRow * grid.cols + nextCol;
      if (!grid.walkable[next] || closed[next]) continue;

      // Diagonals may not cut across the corner of a wall or obstacle.
      if (neighbour.dc !== 0 && neighbour.dr !== 0) {
        const horizontal = row * grid.cols + nextCol;
        const vertical = nextRow * grid.cols + col;
        if (!grid.walkable[horizontal] || !grid.walkable[vertical]) continue;
      }

      const tentative = gScore[current.id]! + neighbour.cost;
      if (tentative >= gScore[next]!) continue;
      cameFrom[next] = current.id;
      gScore[next] = tentative;
      const heuristic = Math.hypot(goalCol - nextCol, goalRow - nextRow);
      open.push({ id: next, score: tentative + heuristic });
    }
  }

  if (start !== goal && cameFrom[goal] === -1) return null;

  const raw: NavPoint[] = [to];
  let cursor = goal;
  while (cursor !== start) {
    raw.push({ x: (cursor % grid.cols) * CELL, y: Math.floor(cursor / grid.cols) * CELL });
    cursor = cameFrom[cursor]!;
    if (cursor < 0) return null;
  }
  raw.push(from);
  raw.reverse();

  const smooth: NavPoint[] = [];
  let anchor = 0;
  while (anchor < raw.length - 1) {
    let furthest = raw.length - 1;
    while (furthest > anchor + 1 && !isSegmentWalkable(area.id, raw[anchor]!, raw[furthest]!)) {
      furthest--;
    }
    smooth.push(raw[furthest]!);
    anchor = furthest;
  }
  return smooth;
}

/** Finds the closest legal feet position around an entity. */
export function findInteractionPoint(area: AreaDef, from: NavPoint, target: NavPoint, maxDistance = 58): NavPoint | null {
  const candidates: NavPoint[] = [];
  for (let radius = 30; radius <= maxDistance; radius += 7) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      const candidate = {
        x: target.x + Math.cos(angle) * radius,
        y: target.y + Math.sin(angle) * radius,
      };
      if (isWalkable(area.id, candidate)) candidates.push(candidate);
    }
  }
  candidates.sort(
    (a, b) =>
      Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y)
  );
  return candidates.find((candidate) => findWalkPath(area, from, candidate) !== null) ?? null;
}
