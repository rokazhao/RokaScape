import type { AreaDef } from '../engine/types';
import { getMonsterCombatLevel } from './monsters';

/**
 * Spawn positions are hand-fitted to the backdrop art in a 765x503 canvas space.
 * `y` is the entity's feet, so every point below sits on painted walkable ground
 * (dirt path, cobblestone, or open grass) and clear of buildings, water and fences.
 */
export const AREAS: AreaDef[] = [
  {
    id: 'lumbridge',
    name: 'Lumbridge',
    monsterIds: ['cow', 'goblin', 'giant-rat', 'giant-frog', 'goblin-general'],
    npcIds: ['hans', 'chef'],
    backdrop: '/sprites/areas/lumbridge.png',
    mapWidth: 765,
    mapHeight: 503,
    // South-east cobble road, the overland approach into town.
    playerSpawn: { x: 560, y: 445, scale: 36 },
    spawns: [
      // Hans on the dirt path descending from the castle steps.
      { id: 'hans', kind: 'npc', x: 400, y: 200, scale: 34 },
      // Chef on the path outside the well, by the little grey-roofed store.
      { id: 'chef', kind: 'npc', x: 299, y: 235, scale: 34 },
      // Cow grazing the open flowered grass between the main road and the pond.
      { id: 'cow', kind: 'monster', x: 364, y: 322, scale: 40 },
      // Goblin loitering on the west path, past the fenced crop garden.
      { id: 'goblin', kind: 'monster', x: 252, y: 336, scale: 34 },
      // Giant rat nosing along the main road below the pond.
      { id: 'giant-rat', kind: 'monster', x: 472, y: 372, scale: 26 },
      // Frog squatting on the west path where it meets the river bank.
      { id: 'giant-frog', kind: 'monster', x: 158, y: 420, scale: 26 },
      // Grubeater camped on the track across the river, well clear of the bridge.
      { id: 'goblin-general', kind: 'monster', x: 70, y: 442, scale: 60 },
    ],
  },
  {
    id: 'varrock',
    name: 'Varrock',
    monsterIds: [
      'varrock-guard',
      'varrock-archer',
      'varrock-thug',
      'dark-wizard',
      'varrock-general',
      'evil-wizard',
    ],
    npcIds: ['king-roald'],
    backdrop: '/sprites/areas/varrock.png',
    mapWidth: 765,
    mapHeight: 503,
    // Cobbles at the southern edge of the square.
    playerSpawn: { x: 364, y: 461, scale: 36 },
    spawns: [
      // Guard holding the cobbles below the great archway.
      { id: 'varrock-guard', kind: 'monster', x: 280, y: 212, scale: 38 },
      // Archer posted at the foot of the east stone stair.
      { id: 'varrock-archer', kind: 'monster', x: 570, y: 276, scale: 36 },
      // King Roald addressing the square, west of the statue and clear of the brazier.
      { id: 'king-roald', kind: 'npc', x: 322, y: 318, scale: 38 },
      // Sir Lancelot on open cobbles south of the statue, clear of the well roof.
      { id: 'varrock-general', kind: 'monster', x: 474, y: 432, scale: 48 },
      // Thug loitering on the quiet south-east cobbles past the well.
      { id: 'varrock-thug', kind: 'monster', x: 700, y: 468, scale: 36 },
      // Dark wizard muttering on the open stones north of the statue.
      { id: 'dark-wizard', kind: 'monster', x: 392, y: 232, scale: 38 },
      // Surok Magis skulking on the flagstones south of the market awnings.
      { id: 'evil-wizard', kind: 'monster', x: 276, y: 461, scale: 44 },
    ],
  },
  {
    id: 'falador',
    name: 'Falador',
    monsterIds: [
      'falador-guard',
      'dwarven-miner',
      'white-knight-squire',
      'mine-scorpion',
      'sir-kitbreaker',
    ],
    npcIds: ['sir-tiffy-cashien'],
    backdrop: '/sprites/areas/falador.png',
    mapWidth: 765,
    mapHeight: 503,
    // Southern white-stone gate entering the central plaza.
    playerSpawn: { x: 466, y: 481, scale: 36 },
    spawns: [
      // Guard on the broad approach below the central castle arch.
      { id: 'falador-guard', kind: 'monster', x: 420, y: 211, scale: 40 },
      // Kitbreaker commands the eastern training court.
      { id: 'sir-kitbreaker', kind: 'monster', x: 590, y: 265, scale: 56 },
      // Miner on the stone apron outside the western mine entrance.
      { id: 'dwarven-miner', kind: 'monster', x: 112, y: 263, scale: 38 },
      // Squire drilling on the paving east of the training court.
      { id: 'white-knight-squire', kind: 'monster', x: 645, y: 322, scale: 38 },
      // Scorpion skittering across the mine apron north of the miner.
      { id: 'mine-scorpion', kind: 'monster', x: 168, y: 214, scale: 30 },
      // Tiffy waits beside the central monument where every road meets.
      { id: 'sir-tiffy-cashien', kind: 'npc', x: 374, y: 333, scale: 38 },
    ],
  },
  {
    id: 'draynor-manor',
    name: 'Draynor Manor',
    monsterIds: ['manor-ghoul', 'count-draynor'],
    npcIds: ['ava'],
    backdrop: '/sprites/areas/draynor-manor.png',
    mapWidth: 765,
    mapHeight: 503,
    // Open iron gate at the end of the moonlit southern road.
    playerSpawn: { x: 425, y: 476, scale: 36 },
    spawns: [
      // The Count watches the courtyard from below the manor steps.
      { id: 'count-draynor', kind: 'monster', x: 382, y: 183, scale: 48 },
      // Ghoul scavenging the cracked west arc of the courtyard.
      { id: 'manor-ghoul', kind: 'monster', x: 240, y: 300, scale: 34 },
      // Ava works in the fenced mechanical yard east of the central court.
      { id: 'ava', kind: 'npc', x: 616, y: 296, scale: 40 },
    ],
  },
  {
    id: 'god-wars-dungeon',
    name: 'God Wars Dungeon',
    monsterIds: [
      'spiritual-warrior',
      'spiritual-mage',
      'general-graardor',
      'commander-zilyana',
      'kril-tsutsaroth',
      'kreearra',
    ],
    npcIds: ['zaros', 'fallen-soldier'],
    backdrop: '/sprites/areas/god-wars-dungeon.png',
    mapWidth: 765,
    mapHeight: 503,
    // Frozen southern bridge entering the central war nexus.
    playerSpawn: { x: 385, y: 487, scale: 36 },
    spawns: [
      // Each commander occupies a distinct faction court around the nexus.
      { id: 'general-graardor', kind: 'monster', x: 120, y: 188, scale: 72 },
      { id: 'commander-zilyana', kind: 'monster', x: 385, y: 110, scale: 64 },
      { id: 'kril-tsutsaroth', kind: 'monster', x: 642, y: 202, scale: 72 },
      { id: 'kreearra', kind: 'monster', x: 585, y: 395, scale: 76 },
      // Faction footsoldiers hold the nexus itself, guarding every bridge.
      { id: 'spiritual-warrior', kind: 'monster', x: 312, y: 258, scale: 46 },
      { id: 'spiritual-mage', kind: 'monster', x: 452, y: 252, scale: 46 },
      // Zaros occupies the isolated Ancient ruin beneath Graardor's court.
      { id: 'zaros', kind: 'npc', x: 154, y: 393, scale: 48 },
      { id: 'fallen-soldier', kind: 'npc', x: 385, y: 446, scale: 34 },
    ],
  },
  {
    id: 'morytania-swamp',
    name: 'Morytania Swamp',
    monsterIds: ['ghast', 'giant-swamp-snail', 'swamp-banshee', 'morytania-vampyre'],
    npcIds: [],
    backdrop: '/sprites/areas/morytania-swamp.png',
    mapWidth: 765,
    mapHeight: 503,
    playerSpawn: { x: 383, y: 486, scale: 36 },
    spawns: [
      { id: 'ghast', kind: 'monster', x: 141, y: 204, scale: 46 },
      { id: 'giant-swamp-snail', kind: 'monster', x: 382, y: 257, scale: 48 },
      { id: 'swamp-banshee', kind: 'monster', x: 436, y: 372, scale: 40 },
      { id: 'morytania-vampyre', kind: 'monster', x: 610, y: 235, scale: 50 },
    ],
  },
  {
    id: 'tzhaar-city',
    name: 'TzHaar City',
    monsterIds: ['tz-kek', 'tz-kih', 'yt-mejkot', 'ket-zek', 'tztok-jad'],
    npcIds: [],
    backdrop: '/sprites/areas/tzhaar-city.png',
    mapWidth: 765,
    mapHeight: 503,
    playerSpawn: { x: 383, y: 486, scale: 36 },
    spawns: [
      { id: 'tz-kek', kind: 'monster', x: 142, y: 400, scale: 52 },
      // Lesser TzHaar patrol the central plaza beneath Jad's stair.
      { id: 'tz-kih', kind: 'monster', x: 318, y: 232, scale: 40 },
      { id: 'yt-mejkot', kind: 'monster', x: 452, y: 252, scale: 58 },
      { id: 'ket-zek', kind: 'monster', x: 612, y: 400, scale: 68 },
      { id: 'tztok-jad', kind: 'monster', x: 383, y: 110, scale: 96 },
    ],
  },
  {
    id: 'elvargs-lair',
    name: "Elvarg's Lair",
    monsterIds: ['dragon-whelp', 'elvarg'],
    npcIds: [],
    backdrop: '/sprites/areas/elvargs-lair.png',
    mapWidth: 765,
    mapHeight: 503,
    playerSpawn: { x: 383, y: 480, scale: 36 },
    spawns: [
      // Whelp circling the scorched eastern edge of its mother's court.
      { id: 'dragon-whelp', kind: 'monster', x: 596, y: 208, scale: 44 },
      { id: 'elvarg', kind: 'monster', x: 383, y: 244, scale: 100 },
    ],
  },
  {
    id: 'dagannoth-cave',
    name: 'Dagannoth Cave',
    monsterIds: ['dagannoth-spawn', 'dagannoth-rex'],
    npcIds: [],
    backdrop: '/sprites/areas/dagannoth-cave.png',
    mapWidth: 765,
    mapHeight: 503,
    playerSpawn: { x: 383, y: 480, scale: 36 },
    spawns: [
      // Spawn blocking the causeway before Rex's nesting court.
      { id: 'dagannoth-spawn', kind: 'monster', x: 396, y: 330, scale: 50 },
      { id: 'dagannoth-rex', kind: 'monster', x: 383, y: 181, scale: 92 },
    ],
  },
  {
    id: 'bone-king-graveyard',
    name: 'Graveyard of the Bone King',
    monsterIds: [
      'grave-skeleton',
      'grave-skeleton-archer',
      'crypt-wraith',
      'grave-titan',
      'bones-skeleton-king',
    ],
    npcIds: [],
    backdrop: '/sprites/areas/bone-king-graveyard.png',
    mapWidth: 765,
    mapHeight: 503,
    playerSpawn: { x: 383, y: 480, scale: 36 },
    spawns: [
      { id: 'grave-skeleton', kind: 'monster', x: 188, y: 267, scale: 44 },
      { id: 'grave-skeleton-archer', kind: 'monster', x: 578, y: 270, scale: 44 },
      // The burial road itself is haunted either side of the dead tree.
      { id: 'crypt-wraith', kind: 'monster', x: 300, y: 252, scale: 42 },
      { id: 'grave-titan', kind: 'monster', x: 462, y: 258, scale: 56 },
      { id: 'bones-skeleton-king', kind: 'monster', x: 383, y: 135, scale: 76 },
    ],
  },
  {
    id: 'durotar-azeroth',
    name: 'Durotar, Azeroth',
    monsterIds: ['orc-grunt', 'korkron-elite', 'high-overlord-saurfang', 'orc-king-thrall'],
    npcIds: [],
    backdrop: '/sprites/areas/durotar-azeroth.png',
    mapWidth: 765,
    mapHeight: 503,
    playerSpawn: { x: 383, y: 475, scale: 36 },
    spawns: [
      // Kor'kron rank and file waiting their turn in the challenge ring.
      { id: 'orc-grunt', kind: 'monster', x: 512, y: 286, scale: 52 },
      { id: 'korkron-elite', kind: 'monster', x: 236, y: 198, scale: 58 },
      { id: 'high-overlord-saurfang', kind: 'monster', x: 278, y: 274, scale: 68 },
      { id: 'orc-king-thrall', kind: 'monster', x: 383, y: 132, scale: 78 },
    ],
  },
  {
    id: 'the-shire',
    name: 'The Shire',
    monsterIds: [],
    npcIds: ['bilbo', 'gandalf', 'frodo', 'samwise'],
    backdrop: '/sprites/areas/the-shire.png',
    mapWidth: 765,
    mapHeight: 503,
    playerSpawn: { x: 383, y: 483, scale: 36 },
    spawns: [
      { id: 'bilbo', kind: 'npc', x: 300, y: 335, scale: 38 },
      { id: 'gandalf', kind: 'npc', x: 225, y: 147, scale: 48 },
      { id: 'frodo', kind: 'npc', x: 480, y: 175, scale: 36 },
      { id: 'samwise', kind: 'npc', x: 560, y: 300, scale: 36 },
    ],
  },
];

export const areaMap = new Map(AREAS.map((a) => [a.id, a]));

export function getArea(id: string): AreaDef {
  const area = areaMap.get(id);
  if (!area) throw new Error(`Unknown area: ${id}`);
  return area;
}

export function getAreaAverageCombatLevel(area: AreaDef): number {
  if (area.monsterIds.length === 0) return 0;
  const total = area.monsterIds.reduce(
    (sum, monsterId) => sum + getMonsterCombatLevel(monsterId),
    0
  );
  return Math.round(total / area.monsterIds.length);
}
