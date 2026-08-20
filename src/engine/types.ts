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
  atk?: number;
  str?: number;
  def?: number;
  prayerBonus?: number;
  heal?: number;
  prayerRestore?: number;
  attackSpeed?: number;
  slot?: EquipmentSlot;
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

export interface AreaDef {
  id: string;
  name: string;
  monsterIds: string[];
  npcIds: string[];
  backdrop: string;
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
  | { type: 'shopClose' };

export type EventListener = (event: GameEvent) => void;
