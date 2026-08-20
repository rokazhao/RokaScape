import type { QuestDef } from '../engine/types';

/**
 * Contracts run in chains, one chain per region: cull the local nuisance, and
 * whoever posted it trusts you with something bigger. Every step points at a
 * tougher creature in the same area, so a region unfolds as you clear it.
 *
 * Rewards stay deliberately modest — the item is a one-off leg-up roughly in
 * line with what the target itself drops, never a shortcut past the grind.
 * Repeating a finished contract still pays experience and coins.
 */
export const QUESTS: QuestDef[] = [
  /* --- Lumbridge ------------------------------------------------------- */
  {
    id: 'lumbridge-rats',
    areaId: 'lumbridge',
    name: 'Rat Problem',
    giver: 'Shopkeeper Wilkin',
    summary: 'Rats are getting into the store room. Thin them out along the road.',
    objective: { monsterId: 'giant-rat', count: 5 },
    reward: { xp: 40, gp: 60, itemId: 'bronze-sword' },
  },
  {
    id: 'lumbridge-frogs',
    areaId: 'lumbridge',
    name: 'Croaking Menace',
    giver: 'Shopkeeper Wilkin',
    summary: 'Something fat and green is eating the river bank. Deal with it.',
    objective: { monsterId: 'giant-frog', count: 4 },
    reward: { xp: 90, gp: 140, itemId: 'leather-boots' },
    requires: 'lumbridge-rats',
  },
  {
    id: 'lumbridge-grubeater',
    areaId: 'lumbridge',
    name: "Grubeater's End",
    giver: 'Hans',
    summary: 'The goblin chief across the river has been raiding the crops. End him.',
    objective: { monsterId: 'goblin-general', count: 1 },
    reward: { xp: 180, gp: 300, itemId: 'addy-sword' },
    requires: 'lumbridge-frogs',
  },

  /* --- Varrock --------------------------------------------------------- */
  {
    id: 'varrock-thugs',
    areaId: 'varrock',
    name: 'Keep the Peace',
    giver: 'King Roald',
    summary: 'Thugs are working the south-east cobbles after dark. Clear them off.',
    objective: { monsterId: 'varrock-thug', count: 6 },
    reward: { xp: 260, gp: 450, itemId: 'steel-platebody' },
  },
  {
    id: 'varrock-lancelot',
    areaId: 'varrock',
    name: 'The Knight Errant',
    giver: 'King Roald',
    summary: 'Sir Lancelot bars the square to anyone who cannot best him. Try.',
    objective: { monsterId: 'varrock-general', count: 1 },
    reward: { xp: 340, gp: 560, itemId: 'addy-knuckles' },
    requires: 'varrock-thugs',
  },
  {
    id: 'varrock-wizards',
    areaId: 'varrock',
    name: 'Dark Practices',
    giver: 'King Roald',
    summary: 'Robed figures are muttering at the statue. Break up their circle.',
    objective: { monsterId: 'dark-wizard', count: 3 },
    reward: { xp: 420, gp: 700, itemId: 'dark-wizard-hat' },
    requires: 'varrock-lancelot',
  },
  {
    id: 'varrock-surok',
    areaId: 'varrock',
    name: 'Surok Unbound',
    giver: 'King Roald',
    summary: 'Their master still walks my city. Bring me his staff, and quietly.',
    objective: { monsterId: 'evil-wizard', count: 1 },
    reward: { xp: 640, gp: 1100, itemId: 'arcane-staff' },
    requires: 'varrock-wizards',
  },

  /* --- Falador -------------------------------------------------------- */
  {
    id: 'falador-squires',
    areaId: 'falador',
    name: "Knight's Trial",
    giver: 'Sir Tiffy Cashien',
    summary: 'Best our squires in the training court and the tabard is yours.',
    objective: { monsterId: 'white-knight-squire', count: 5 },
    reward: { xp: 380, gp: 600, itemId: 'knight-tabard' },
  },
  {
    id: 'falador-scorpions',
    areaId: 'falador',
    name: 'Deep Trouble',
    giver: 'Doric Ironhand',
    summary: 'Scorpions have taken the mine apron. The miners cannot work.',
    objective: { monsterId: 'mine-scorpion', count: 4 },
    reward: { xp: 460, gp: 800, itemId: 'scorpion-stinger' },
    requires: 'falador-squires',
  },
  {
    id: 'falador-kitbreaker',
    areaId: 'falador',
    name: 'Breaking the Breaker',
    giver: 'Sir Tiffy Cashien',
    summary: 'Kitbreaker tests every challenger. Nobody has passed. You may.',
    objective: { monsterId: 'sir-kitbreaker', count: 1 },
    reward: { xp: 700, gp: 1200, itemId: 'excalibur' },
    requires: 'falador-scorpions',
  },

  /* --- Draynor Manor -------------------------------------------------- */
  {
    id: 'draynor-ghouls',
    areaId: 'draynor-manor',
    name: 'Manor Cleansing',
    giver: 'Ava',
    summary: 'Ghouls keep digging up my test yard. Please discourage them.',
    objective: { monsterId: 'manor-ghoul', count: 4 },
    reward: { xp: 320, gp: 520, itemId: 'adventurer-cape' },
  },
  {
    id: 'draynor-count',
    areaId: 'draynor-manor',
    name: 'The Count of Draynor',
    giver: 'Ava',
    summary: 'He complains about my noise; I complain about his appetite. Settle it.',
    objective: { monsterId: 'count-draynor', count: 1 },
    reward: { xp: 520, gp: 900, itemId: 'vampyre-cape' },
    requires: 'draynor-ghouls',
  },

  /* --- Morytania ------------------------------------------------------ */
  {
    id: 'morytania-ghasts',
    areaId: 'morytania-swamp',
    name: 'Clearing the Mist',
    giver: 'Malkath the Pale',
    summary: 'Ghasts spoil what little the swamp still gives. Disperse them.',
    objective: { monsterId: 'ghast', count: 5 },
    reward: { xp: 420, gp: 700, itemId: 'swamp-snelm' },
  },
  {
    id: 'morytania-banshees',
    areaId: 'morytania-swamp',
    name: 'Silence the Wail',
    giver: 'Malkath the Pale',
    summary: 'The wailing keeps the dead restless. Even I need quiet.',
    objective: { monsterId: 'swamp-banshee', count: 3 },
    reward: { xp: 700, gp: 1200, itemId: 'swamp-cloak' },
    requires: 'morytania-ghasts',
  },
  {
    id: 'morytania-vampyre',
    areaId: 'morytania-swamp',
    name: 'Rival Thirst',
    giver: 'Malkath the Pale',
    summary: 'One of my kin hunts the eastern ruin. I would rather he did not.',
    objective: { monsterId: 'morytania-vampyre', count: 2 },
    reward: { xp: 980, gp: 1700, itemId: 'vampyre-coat' },
    requires: 'morytania-banshees',
  },

  /* --- TzHaar --------------------------------------------------------- */
  {
    id: 'tzhaar-trial',
    areaId: 'tzhaar-city',
    name: 'Trial by Fire',
    giver: 'TzHaar-Hur-Lek',
    summary: 'JalYt-Ket, prove yourself on the lesser kin before the arena.',
    objective: { monsterId: 'tz-kih', count: 4 },
    reward: { xp: 1200, gp: 2000, itemId: 'tzhaar-gauntlets' },
  },
  {
    id: 'tzhaar-mejkot',
    areaId: 'tzhaar-city',
    name: 'The Guardian Kin',
    giver: 'TzHaar-Hur-Lek',
    summary: 'Yt-MejKot heals its brothers. Break it, and the plaza is yours.',
    objective: { monsterId: 'yt-mejkot', count: 2 },
    reward: { xp: 2200, gp: 3600, itemId: 'obsidian-shield' },
    requires: 'tzhaar-trial',
  },
  {
    id: 'tzhaar-ketzek',
    areaId: 'tzhaar-city',
    name: 'Ket-Zek Must Fall',
    giver: 'TzHaar-Hur-Lek',
    summary: 'Only the flame-caster stands between you and the arena floor.',
    objective: { monsterId: 'ket-zek', count: 1 },
    reward: { xp: 3600, gp: 6000, itemId: 'tzhaar-ket-om' },
    requires: 'tzhaar-mejkot',
  },

  /* --- Warriors' Guild: one defender per ten cyclopes ----------------- */
  {
    id: 'guild-bronze',
    areaId: 'warriors-guild',
    name: 'Bronze Defender',
    giver: 'Guildmaster Harrallak',
    summary: 'Cut down 10 more cyclopes and the next defender is yours.',
    objective: { monsterId: 'cyclops', count: 10 },
    reward: { xp: 900, gp: 1500, itemId: 'bronze-defender' },
  },
  {
    id: 'guild-iron',
    areaId: 'warriors-guild',
    name: 'Iron Defender',
    giver: 'Guildmaster Harrallak',
    summary: 'Cut down 10 more cyclopes and the next defender is yours.',
    objective: { monsterId: 'cyclops', count: 10 },
    reward: { xp: 1000, gp: 1700, itemId: 'iron-defender' },
    requires: 'guild-bronze',
  },
  {
    id: 'guild-steel',
    areaId: 'warriors-guild',
    name: 'Steel Defender',
    giver: 'Guildmaster Harrallak',
    summary: 'Cut down 10 more cyclopes and the next defender is yours.',
    objective: { monsterId: 'cyclops', count: 10 },
    reward: { xp: 1150, gp: 1900, itemId: 'steel-defender' },
    requires: 'guild-iron',
  },
  {
    id: 'guild-black',
    areaId: 'warriors-guild',
    name: 'Black Defender',
    giver: 'Guildmaster Harrallak',
    summary: 'Cut down 10 more cyclopes and the next defender is yours.',
    objective: { monsterId: 'cyclops', count: 10 },
    reward: { xp: 1300, gp: 2200, itemId: 'black-defender' },
    requires: 'guild-steel',
  },
  {
    id: 'guild-mithril',
    areaId: 'warriors-guild',
    name: 'Mithril Defender',
    giver: 'Guildmaster Harrallak',
    summary: 'Cut down 10 more cyclopes and the next defender is yours.',
    objective: { monsterId: 'cyclops', count: 10 },
    reward: { xp: 1500, gp: 2500, itemId: 'mithril-defender' },
    requires: 'guild-black',
  },
  {
    id: 'guild-adamant',
    areaId: 'warriors-guild',
    name: 'Adamant Defender',
    giver: 'Guildmaster Harrallak',
    summary: 'Cut down 10 more cyclopes and the next defender is yours.',
    objective: { monsterId: 'cyclops', count: 10 },
    reward: { xp: 1750, gp: 2900, itemId: 'adamant-defender' },
    requires: 'guild-mithril',
  },
  {
    id: 'guild-rune',
    areaId: 'warriors-guild',
    name: 'Rune Defender',
    giver: 'Guildmaster Harrallak',
    summary: 'Cut down 10 more cyclopes and the next defender is yours.',
    objective: { monsterId: 'cyclops', count: 10 },
    reward: { xp: 2100, gp: 3400, itemId: 'rune-defender' },
    requires: 'guild-adamant',
  },
  {
    id: 'guild-dragon',
    areaId: 'warriors-guild',
    name: 'Dragon Defender',
    giver: 'Guildmaster Harrallak',
    summary: 'Twenty-five elder cyclopes stand between you and the last defender.',
    objective: { monsterId: 'elder-cyclops', count: 25 },
    reward: { xp: 6000, gp: 9000, itemId: 'dragon-defender' },
    requires: 'guild-rune',
  },

  /* --- The Barrows ---------------------------------------------------- */
  {
    id: 'barrows-guardians',
    areaId: 'barrows',
    name: 'Breaking Ground',
    summary: 'The crypt guardians must fall before any mound will open.',
    objective: { monsterId: 'ghost-of-barrows', count: 6 },
    reward: { xp: 1400, gp: 2200, itemId: 'barrows-key' },
  },
  {
    id: 'barrows-ahrim',
    areaId: 'barrows',
    name: 'Ahrim the Blighted',
    summary: 'The first mound holds a mage who never finished his last spell.',
    objective: { monsterId: 'ahrim', count: 3 },
    reward: { xp: 2000, gp: 3200, itemId: 'ahrims-hood' },
    requires: 'barrows-guardians',
  },
  {
    id: 'barrows-karil',
    areaId: 'barrows',
    name: 'Karil the Tainted',
    summary: 'Something still fires bolts from the second mound. Silence it.',
    objective: { monsterId: 'karil', count: 3 },
    reward: { xp: 2300, gp: 3600, itemId: 'karils-coif' },
    requires: 'barrows-ahrim',
  },
  {
    id: 'barrows-torag',
    areaId: 'barrows',
    name: 'Torag the Corrupted',
    summary: 'The third wight is armoured like a door. Get through it.',
    objective: { monsterId: 'torag', count: 3 },
    reward: { xp: 2600, gp: 4100, itemId: 'torags-helm' },
    requires: 'barrows-karil',
  },
  {
    id: 'barrows-guthan',
    areaId: 'barrows',
    name: 'Guthan the Infested',
    summary: 'His spear drinks what it spills. Finish him before he drinks yours.',
    objective: { monsterId: 'guthan', count: 3 },
    reward: { xp: 2900, gp: 4600, itemId: 'guthans-helm' },
    requires: 'barrows-torag',
  },
  {
    id: 'barrows-verac',
    areaId: 'barrows',
    name: 'Verac the Defiled',
    summary: 'Armour will not save you from the fifth brother. Speed might.',
    objective: { monsterId: 'verac', count: 3 },
    reward: { xp: 3200, gp: 5200, itemId: 'veracs-helm' },
    requires: 'barrows-guthan',
  },
  {
    id: 'barrows-dharok',
    areaId: 'barrows',
    name: 'Dharok the Wretched',
    summary: 'The last mound. He hits hardest with his life nearly out — mind that.',
    objective: { monsterId: 'dharok', count: 3 },
    reward: { xp: 4200, gp: 6800, itemId: 'dharoks-helm' },
    requires: 'barrows-verac',
  },

  /* --- Elvarg's Lair -------------------------------------------------- */
  {
    id: 'elvarg-whelps',
    areaId: 'elvargs-lair',
    name: 'Whelp Cull',
    summary: "Elvarg's brood is spreading beyond the lair. Cut the numbers down.",
    objective: { monsterId: 'dragon-whelp', count: 4 },
    reward: { xp: 900, gp: 1500, itemId: 'rune-scim' },
  },
  {
    id: 'elvarg-slayer',
    areaId: 'elvargs-lair',
    name: 'Dragonslayer',
    summary: 'With the brood thinned, only the mother remains. Finish it.',
    objective: { monsterId: 'elvarg', count: 1 },
    reward: { xp: 1400, gp: 2400, itemId: 'rune-platebody' },
    requires: 'elvarg-whelps',
  },

  /* --- Graveyard ------------------------------------------------------ */
  {
    id: 'graveyard-bones',
    areaId: 'bone-king-graveyard',
    name: 'Restless Bones',
    giver: 'Marrowmonger',
    summary: 'The walking ones are bad for business. Put them back down.',
    objective: { monsterId: 'grave-skeleton', count: 6 },
    reward: { xp: 820, gp: 1400, itemId: 'ossuary-charm' },
  },
  {
    id: 'graveyard-wraiths',
    areaId: 'bone-king-graveyard',
    name: 'Cold Company',
    giver: 'Marrowmonger',
    summary: 'Wraiths drift the burial road and frighten my customers off.',
    objective: { monsterId: 'crypt-wraith', count: 4 },
    reward: { xp: 1300, gp: 2200, itemId: 'bone-arrows' },
    requires: 'graveyard-bones',
  },
  {
    id: 'graveyard-titan',
    areaId: 'bone-king-graveyard',
    name: 'The Slab Walker',
    giver: 'Marrowmonger',
    summary: 'A titan of grave-slabs guards the throne stair. It must not.',
    objective: { monsterId: 'grave-titan', count: 2 },
    reward: { xp: 2600, gp: 4200, itemId: 'bone-gauntlets' },
    requires: 'graveyard-wraiths',
  },
  {
    id: 'graveyard-king',
    areaId: 'bone-king-graveyard',
    name: 'Crown of Bones',
    giver: 'Marrowmonger',
    summary: 'Take the crown from Bones himself and the graveyard is quiet at last.',
    objective: { monsterId: 'bones-skeleton-king', count: 1 },
    reward: { xp: 5000, gp: 8000, itemId: 'bone-crown' },
    requires: 'graveyard-titan',
  },

  /* --- Dagannoth Cave ------------------------------------------------- */
  {
    id: 'dagannoth-spawn',
    areaId: 'dagannoth-cave',
    name: 'Spawn Control',
    summary: 'Rex breeds faster than the causeway can hold. Clear the brood.',
    objective: { monsterId: 'dagannoth-spawn', count: 3 },
    reward: { xp: 1600, gp: 2600, itemId: 'warrior-ring' },
  },
  {
    id: 'dagannoth-rex',
    areaId: 'dagannoth-cave',
    name: 'Rex Himself',
    summary: 'The nest is thinned. Now take the beast that fills it.',
    objective: { monsterId: 'dagannoth-rex', count: 1 },
    reward: { xp: 3800, gp: 6200, itemId: 'dragon-axe' },
    requires: 'dagannoth-spawn',
  },

  /* --- Durotar -------------------------------------------------------- */
  {
    id: 'durotar-grunts',
    areaId: 'durotar-azeroth',
    name: 'Blood and Thunder',
    giver: 'Quartermaster Gorzek',
    summary: 'The ring is crowded with grunts awaiting a turn. Make room.',
    objective: { monsterId: 'orc-grunt', count: 3 },
    reward: { xp: 2400, gp: 4000, itemId: 'orcish-cleaver' },
  },
  {
    id: 'durotar-elite',
    areaId: 'durotar-azeroth',
    name: "Kor'kron Proving",
    giver: 'Quartermaster Gorzek',
    summary: 'The guard says you fight like a grunt. Show them otherwise.',
    objective: { monsterId: 'korkron-elite', count: 2 },
    reward: { xp: 4200, gp: 6800, itemId: 'orc-warhelm' },
    requires: 'durotar-grunts',
  },
  {
    id: 'durotar-saurfang',
    areaId: 'durotar-azeroth',
    name: 'The High Overlord',
    giver: 'Quartermaster Gorzek',
    summary: 'Saurfang has heard of you. He is waiting. Lok-tar ogar.',
    objective: { monsterId: 'high-overlord-saurfang', count: 1 },
    reward: { xp: 6500, gp: 10000, itemId: 'saurfang-cleaver' },
    requires: 'durotar-elite',
  },

  /* --- God Wars ------------------------------------------------------- */
  {
    id: 'godwars-nexus',
    areaId: 'god-wars-dungeon',
    name: 'Hold the Nexus',
    giver: 'Zaros',
    summary: 'Their footsoldiers hold my bridges. Remove them, and be noticed.',
    objective: { monsterId: 'spiritual-warrior', count: 4 },
    reward: { xp: 3000, gp: 5000, itemId: 'rune-sword' },
  },
  {
    id: 'godwars-mages',
    areaId: 'god-wars-dungeon',
    name: 'Silence the Choir',
    giver: 'Zaros',
    summary: 'Their casters keep the wards lit. Put them out.',
    objective: { monsterId: 'spiritual-mage', count: 3 },
    reward: { xp: 3800, gp: 6000, itemId: 'spiritual-sigil' },
    requires: 'godwars-nexus',
  },
  {
    id: 'godwars-graardor',
    areaId: 'god-wars-dungeon',
    name: 'Bandos Brought Low',
    giver: 'Zaros',
    summary: 'One general, to remind the other three what occupation costs.',
    objective: { monsterId: 'general-graardor', count: 1 },
    reward: { xp: 8000, gp: 12000, itemId: 'bandos-boots' },
    requires: 'godwars-mages',
  },
];

export const questMap = new Map(QUESTS.map((quest) => [quest.id, quest]));

export function getQuest(id: string): QuestDef {
  const quest = questMap.get(id);
  if (!quest) throw new Error(`Unknown quest: ${id}`);
  return quest;
}

export function getQuestsForArea(areaId: string): QuestDef[] {
  return QUESTS.filter((quest) => quest.areaId === areaId);
}

/** Contracts that advance when the given creature dies. */
export function getQuestsForMonster(monsterId: string): QuestDef[] {
  return QUESTS.filter((quest) => quest.objective.monsterId === monsterId);
}

/** How many steps into its chain a contract sits, for display order. */
export function getQuestChainStep(quest: QuestDef): number {
  let step = 1;
  let cursor = quest.requires;
  while (cursor) {
    step++;
    cursor = questMap.get(cursor)?.requires;
  }
  return step;
}
