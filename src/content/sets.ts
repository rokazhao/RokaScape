import type { ArmourSetDef } from '../engine/types';

/**
 * Wearing a matched set adds a flat bonus and, for the Barrows brothers, the
 * effect the wight fought with. Effects are resolved in combat by id:
 *
 *   dharok   — the closer to death, the harder you hit
 *   guthan   — a hit sometimes returns life
 *   torag    — incoming damage is blunted
 *   verac    — a hit sometimes ignores armour entirely
 *   karil    — a hit sometimes lands twice over
 *   ahrim    — spells sap the target's guard
 *   defender — nothing extra; defenders are a single item, listed for the log
 */
export const ARMOUR_SETS: ArmourSetDef[] = [
  {
    id: 'dharok',
    name: "Dharok's Set",
    pieces: ['dharoks-helm', 'dharoks-platebody', 'dharoks-platelegs', 'dharoks-greataxe'],
    bonus: { str: 8, def: 4 },
    effect: 'dharok',
    effectText: 'Strength climbs as your life falls — up to double at the brink.',
  },
  {
    id: 'guthan',
    name: "Guthan's Set",
    pieces: ['guthans-helm', 'guthans-platebody', 'guthans-chainskirt', 'guthans-warspear'],
    bonus: { atk: 6, def: 6 },
    effect: 'guthan',
    effectText: 'One hit in four drains the wound and heals you for a quarter of it.',
  },
  {
    id: 'torag',
    name: "Torag's Set",
    pieces: ['torags-helm', 'torags-platebody', 'torags-platelegs', 'torags-hammers'],
    bonus: { def: 12 },
    effect: 'torag',
    effectText: 'Incoming damage is reduced by a further fifth.',
  },
  {
    id: 'verac',
    name: "Verac's Set",
    pieces: ['veracs-helm', 'veracs-brassard', 'veracs-plateskirt', 'veracs-flail'],
    bonus: { str: 5, prayerBonus: 4 },
    effect: 'verac',
    effectText: 'One hit in five ignores armour completely.',
  },
  {
    id: 'karil',
    name: "Karil's Set",
    pieces: ['karils-coif', 'karils-leathertop', 'karils-leatherskirt', 'karils-crossbow'],
    bonus: { atk: 12 },
    effect: 'karil',
    effectText: 'One bolt in five strikes twice.',
  },
  {
    id: 'ahrim',
    name: "Ahrim's Set",
    pieces: ['ahrims-hood', 'ahrims-top', 'ahrims-skirt', 'ahrims-staff'],
    bonus: { atk: 10, prayerBonus: 3 },
    effect: 'ahrim',
    effectText: "Your strikes sap the target's guard for the rest of the fight.",
  },

  /* Older kits, given a reason to be worn whole. */
  {
    id: 'bandos',
    name: 'Bandos Armour',
    pieces: ['bandos-chestplate', 'bandos-tassets', 'bandos-boots'],
    bonus: { str: 10, def: 6 },
  },
  {
    id: 'armadyl',
    name: 'Armadyl Armour',
    pieces: ['armadyl-helmet', 'armadyl-chestplate', 'armadyl-chainskirt'],
    bonus: { atk: 14, def: 4 },
  },
  {
    id: 'bone',
    name: 'Bone Regalia',
    pieces: [
      'bone-crown',
      'bone-plate',
      'bone-greaves',
      'bone-gauntlets',
      'bone-boots',
      'bone-shield',
    ],
    bonus: { str: 10, def: 15, prayerBonus: 5 },
  },
  {
    id: 'orc',
    name: 'Orc Warplate',
    pieces: ['orc-warhelm', 'orc-warplate', 'orc-warboots'],
    bonus: { str: 12, def: 8 },
  },
  {
    id: 'steel',
    name: 'Steel Kit',
    pieces: ['steel-full-helm', 'steel-platebody', 'steel-platelegs', 'steel-kiteshield'],
    bonus: { def: 6 },
  },
];

export const armourSetMap = new Map(ARMOUR_SETS.map((set) => [set.id, set]));

/** Every set fully worn in the given loadout. */
export function getActiveSets(worn: string[]): ArmourSetDef[] {
  const equipped = new Set(worn);
  return ARMOUR_SETS.filter((set) => set.pieces.every((piece) => equipped.has(piece)));
}

/** The set that owns a piece, for tooltips and the collection log. */
export function getSetForItem(itemId: string): ArmourSetDef | null {
  return ARMOUR_SETS.find((set) => set.pieces.includes(itemId)) ?? null;
}
