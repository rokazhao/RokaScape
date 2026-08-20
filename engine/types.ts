export type ItemCategory = 'weapon' | 'armor' | 'food' | 'potion' | 'misc';

export type EquipmentSlot =
  | 'helm'
  | 'cape'
  | 'neck'
  | 'ammo'
  | 'weapon'
  | 'body'
  | 'shield'
  | 'legs'
  | 'hands'
  | 'feet'
  | 'ring';

export type EquipmentLoadout = Partial<Record<EquipmentSlot, string>>;
export type CollectionLog = Record<string, Record<string, number>>;
export type PrayerType = 'battle' | 'protection';

export interface ItemDef {
  id: string;
  name: string;
  value: number;
  category: ItemCategory;
  /**
   * Combat level needed to wear or wield this. Absent means anyone may use it.
   */
  levelReq?: number;
  /**
   * Gear bonuses are *points*, not levels: they scale the wearer's own
   * attributes rather than adding to them, so the same sword is worth more in
   * stronger hands. See getEffectiveStats.
   */
  atk?: number;
  str?: number;
  def?: number;
  prayerBonus?: number;
  heal?: number;
  /**
   * Extra healing as a percentage of the eater's maximum life, on top of
   * `heal`. The flat part keeps good food worth eating at low level; the
   * percentage keeps it worth carrying at high level.
   */
  healPercent?: number;
  prayerRestore?: number;
  attackSpeed?: number;
  slot?: EquipmentSlot;
}

/** Set effects resolved in combat, keyed by id in sets.ts. */
export type SetEffect = 'dharok' | 'guthan' | 'torag' | 'verac' | 'karil' | 'ahrim';

export interface ArmourSetDef {
  id: string;
  name: string;
  pieces: string[];
  bonus: { atk?: number; str?: number; def?: number; prayerBonus?: number };
  effect?: SetEffect;
  effectText?: string;
}

export interface DropEntry {
  itemId: string;
  weight: number;
  quantity?: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  /** Displayed encounter level; combat still uses the explicit stats below. */
  combatLevel?: number;
  maxHp: number;
  atk: number;
  str: number;
  def: number;
  drops: DropEntry[];
  nothingWeight?: number;
}

export interface DialogueOption {
  label: string;
  text: string;
}

export interface NpcDef {
  id: string;
  name: string;
  /** Optional aura level shown on hover for unusually powerful NPCs. */
  combatLevel?: number;
  dialogues: DialogueOption[];
}

export interface EntitySpawn {
  id: string;
  kind: 'monster' | 'npc';
  /** Pixel position on area map (feet anchor) */
  x: number;
  y: number;
  scale?: number;
}

/** Which portrait a shop's keeper wears in the shop window. */
export type ShopkeeperKind =
  | 'general'
  | 'blacksmith'
  | 'dwarf'
  | 'inventor'
  | 'hobbit'
  | 'vampyre'
  | 'tzhaar'
  | 'skeleton'
  | 'orc';

export interface ShopDef {
  areaId: string;
  /** Window title, e.g. "Varrock Swordshop". */
  name: string;
  keeperName: string;
  keeper: ShopkeeperKind;
  /** Spoken on opening the shop. */
  greeting: string;
  /** Spoken when the player switches to the sell tab. */
  sellLine: string;
  /** Spoken after a purchase. */
  thanks: string;
  stock: string[];
}

export interface QuestObjective {
  monsterId: string;
  count: number;
}

export interface QuestReward {
  xp: number;
  gp: number;
  /** Granted only the first time the contract is handed in. */
  itemId?: string;
}

export interface QuestDef {
  id: string;
  areaId: string;
  name: string;
  /** Who posts the contract, when somebody local does. */
  giver?: string;
  summary: string;
  objective: QuestObjective;
  reward: QuestReward;
  /**
   * Contract that must be handed in before this one is offered. Chains run
   * within a region, each step pointing at a tougher local creature.
   */
  requires?: string;
}

export interface QuestProgress {
  /** Kills banked toward the current run of this contract. */
  kills: number;
  /** How many times it has been handed in; 0 means the item is still owed. */
  claimed: number;
}

export interface AreaDef {
  id: string;
  name: string;
  monsterIds: string[];
  npcIds: string[];
  backdrop: string;
  /**
   * Optional colour wash over the backdrop. Regions that share a painting use
   * this to read as their own place.
   */
  tint?: string;
  mapWidth: number;
  mapHeight: number;
  /** Where the player stands when entering this area (feet on road/path) */
  playerSpawn: { x: number; y: number; scale?: number };
  spawns: EntitySpawn[];
}

export interface InventorySlot {
  itemId: string;
  quantity: number;
}

export interface PlayerState {
  name: string;
  areaId: string;
  hp: number;
  maxHp: number;
  baseAtk: number;
  baseStr: number;
  baseDef: number;
  gp: number;
  xp: number;
  level: number;
  inventory: InventorySlot[];
  equipment: EquipmentLoadout;
  collectionLog: CollectionLog;
  prayer: number;
  maxPrayer: number;
  activePrayer: PrayerType | null;
  quickPrayer: PrayerType;
  inCombat: boolean;
  combatTargetId: string | null;
  quests: Record<string, QuestProgress>;
}

export interface MonsterInstance {
  defId: string;
  hp: number;
  maxHp: number;
}

export interface LootResult {
  nothing: boolean;
  itemId?: string;
  quantity: number;
}

export type ChatKind = 'game' | 'npc' | 'combat' | 'levelup' | 'system';

export type GameEvent =
  | { type: 'chat'; message: string; kind: ChatKind }
  | { type: 'playerHp'; hp: number; maxHp: number }
  | {
      type: 'playerStats';
      atk: number;
      str: number;
      def: number;
      prayer: number;
      maxPrayer: number;
      prayerBonus: number;
      activePrayer: PrayerType | null;
      quickPrayer: PrayerType;
      level: number;
      xp: number;
      gp: number;
    }
  | { type: 'inventoryChanged'; inventory: InventorySlot[] }
  | { type: 'equipmentChanged'; equipment: EquipmentLoadout }
  | { type: 'areaChanged'; areaId: string; areaName: string }
  | { type: 'combatStart'; monsterId: string; monsterName: string }
  | { type: 'combatEnd' }
  | { type: 'monsterHp'; monsterId: string; hp: number; maxHp: number }
  | { type: 'hitsplat'; target: 'player' | 'monster'; damage: number; missed: boolean }
  | { type: 'xpDrop'; amount: number }
  | { type: 'levelUp'; level: number }
  | { type: 'loot'; itemId: string; itemName: string; quantity: number }
  | { type: 'monsterRespawn'; monsterId: string }
  | { type: 'playerDeath' }
  | { type: 'shopOpen' }
  | { type: 'shopClose' }
  | { type: 'questProgress'; questId: string; kills: number; count: number }
  | { type: 'questReady'; questId: string; questName: string }
  | { type: 'questClaimed'; questId: string; questName: string };

export type EventListener = (event: GameEvent) => void;
