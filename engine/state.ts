import type {
  ArmourSetDef,
  EquipmentLoadout,
  EquipmentSlot,
  InventorySlot,
  ItemDef,
  PlayerState,
  SetEffect,
} from './types';
import { getActiveSets } from '../content/sets';
import { getItem } from '../content/items';
import { getMonsterUniqueDrops } from '../content/monsters';

export const INVENTORY_SIZE = 28;
export const SAVE_VERSION = 7;
/** Legacy single-slot key, migrated into slot 1 the first time it is seen. */
export const SAVE_KEY = 'rokascape-save';
export const SAVE_SLOTS = 3;

export function saveKeyForSlot(slot: number): string {
  return `${SAVE_KEY}-slot-${slot}`;
}

export interface SaveSummary {
  slot: number;
  player: PlayerState;
}

/** Reads one slot, returning null when it is empty or unreadable. */
export function readSlot(slot: number): PlayerState | null {
  const raw = localStorage.getItem(saveKeyForSlot(slot));
  if (!raw) return null;
  try {
    return deserializeSave(raw);
  } catch {
    return null;
  }
}

export function writeSlot(slot: number, player: PlayerState): void {
  localStorage.setItem(saveKeyForSlot(slot), serializeSave(player));
}

export function deleteSlot(slot: number): void {
  const existing = localStorage.getItem(saveKeyForSlot(slot));
  // Keep a copy: deleting a character should never be unrecoverable by accident.
  if (existing) localStorage.setItem(`${saveKeyForSlot(slot)}-backup`, existing);
  localStorage.removeItem(saveKeyForSlot(slot));
}

/**
 * Every slot, with the pre-slot save folded into slot 1 so old progress keeps
 * showing up on the character screen.
 */
export function listSaveSlots(): (SaveSummary | null)[] {
  const legacy = localStorage.getItem(SAVE_KEY);
  if (legacy && !localStorage.getItem(saveKeyForSlot(1))) {
    localStorage.setItem(saveKeyForSlot(1), legacy);
  }
  return Array.from({ length: SAVE_SLOTS }, (_, index) => {
    const slot = index + 1;
    const player = readSlot(slot);
    return player ? { slot, player } : null;
  });
}

export function createNewPlayer(name: string, areaId: string): PlayerState {
  return {
    name,
    areaId,
    hp: 10,
    maxHp: 10,
    baseAtk: 1,
    baseStr: 1,
    baseDef: 1,
    gp: 0,
    xp: 0,
    level: 1,
    inventory: [],
    equipment: {},
    collectionLog: {},
    prayer: 10,
    maxPrayer: 10,
    activePrayer: null,
    quickPrayer: 'battle',
    inCombat: false,
    combatTargetId: null,
    quests: {},
  };
}

export function getInventoryCount(inventory: InventorySlot[], itemId: string): number {
  return inventory.find((s) => s.itemId === itemId)?.quantity ?? 0;
}

export function addToInventory(inventory: InventorySlot[], itemId: string, quantity: number): InventorySlot[] {
  const next = inventory.map((s) => ({ ...s }));
  const existing = next.find((s) => s.itemId === itemId);
  if (existing) {
    existing.quantity += quantity;
    return next;
  }
  if (next.length >= INVENTORY_SIZE) {
    throw new Error('Inventory full');
  }
  next.push({ itemId, quantity });
  return next;
}

export function removeFromInventory(inventory: InventorySlot[], itemId: string, quantity: number): InventorySlot[] {
  const next = inventory
    .map((s) => ({ ...s }))
    .filter((s) => {
      if (s.itemId !== itemId) return true;
      s.quantity -= quantity;
      return s.quantity > 0;
    });
  return next;
}

/**
 * Combat follows the old-school formulas, so gear multiplies what you already
 * are instead of handing out levels.
 *
 *   effective level = level x prayer + style + 8
 *   max hit         = floor(0.5 + effStr x (strBonus + 64) / 640)
 *   attack roll     = effAtk x (atkBonus + 64)
 *   defence roll    = effDef x (defBonus + 64)
 *   hit chance      = attack roll measured against the defender's roll
 *
 * Displayed Attack, Strength and Defence stay the raw levels; the equipment
 * panel owns the bonuses, and combat is where the difference shows.
 */
const STYLE_BONUS = 3; // aggressive stance, the only one we model
const LEVEL_OFFSET = 8;
/**
 * The originals use 640 and 64. Both are tuned for a years-long grind, so this
 * game runs hotter: a smaller divisor lifts every max hit, and a smaller bonus
 * base makes each point of gear count for more without touching the unarmed
 * baseline — creatures are scored with the same constants, so bare-handed
 * odds are unchanged and only equipment gets louder.
 */
const MAX_HIT_DIVISOR = 420;
const BONUS_BASE = 48;

export interface GearBonuses {
  atk: number;
  str: number;
  def: number;
  prayerBonus: number;
}

/** Bonus points from every worn piece plus any matched set. */
export function getGearBonuses(player: PlayerState): GearBonuses {
  const bonuses: GearBonuses = { atk: 0, str: 0, def: 0, prayerBonus: 0 };

  for (const itemId of Object.values(player.equipment)) {
    if (!itemId) continue;
    const item = getItem(itemId);
    bonuses.atk += item.atk ?? 0;
    bonuses.str += item.str ?? 0;
    bonuses.def += item.def ?? 0;
    bonuses.prayerBonus += item.prayerBonus ?? 0;
  }
  for (const set of getActiveSets(getWornItemIds(player.equipment))) {
    bonuses.atk += set.bonus.atk ?? 0;
    bonuses.str += set.bonus.str ?? 0;
    bonuses.def += set.bonus.def ?? 0;
    bonuses.prayerBonus += set.bonus.prayerBonus ?? 0;
  }
  return bonuses;
}

export interface CombatProfile {
  /** Raw levels, as shown on the stats panel. */
  atkLevel: number;
  strLevel: number;
  defLevel: number;
  bonuses: GearBonuses;
  /** Levels after prayer, style and the standard offset. */
  effectiveAtk: number;
  effectiveStr: number;
  effectiveDef: number;
  maxHit: number;
  attackRoll: number;
  defenceRoll: number;
}

export function getCombatProfile(player: PlayerState): CombatProfile {
  const bonuses = getGearBonuses(player);
  const prayerMultiplier =
    player.activePrayer === 'battle' && player.prayer > 0 ? 1.15 : 1;

  const effective = (level: number): number =>
    Math.round(level * prayerMultiplier) + STYLE_BONUS + LEVEL_OFFSET;

  const effectiveAtk = effective(player.baseAtk);
  let effectiveStr = effective(player.baseStr);
  const effectiveDef = effective(player.baseDef);

  // Dharok's fought hardest at the brink: up to double the effective strength.
  if (hasSetEffect(player, 'dharok') && player.maxHp > 0) {
    const missing = 1 - Math.max(0, player.hp) / player.maxHp;
    effectiveStr = Math.round(effectiveStr * (1 + missing));
  }

  return {
    atkLevel: player.baseAtk,
    strLevel: player.baseStr,
    defLevel: player.baseDef,
    bonuses,
    effectiveAtk,
    effectiveStr,
    effectiveDef,
    maxHit: Math.floor(0.5 + (effectiveStr * (bonuses.str + BONUS_BASE)) / MAX_HIT_DIVISOR),
    attackRoll: effectiveAtk * (bonuses.atk + BONUS_BASE),
    defenceRoll: effectiveDef * (bonuses.def + BONUS_BASE),
  };
}

/** A creature's rolls, built from its flat statline with no equipment. */
export function getMonsterRolls(atk: number, def: number): {
  attackRoll: number;
  defenceRoll: number;
} {
  return {
    attackRoll: (atk + STYLE_BONUS + LEVEL_OFFSET) * BONUS_BASE,
    defenceRoll: (def + STYLE_BONUS + LEVEL_OFFSET) * BONUS_BASE,
  };
}

/** Chance for an attack roll to land against a defence roll. */
export function hitChance(attackRoll: number, defenceRoll: number): number {
  if (attackRoll > defenceRoll) {
    return 1 - (defenceRoll + 2) / (2 * (attackRoll + 1));
  }
  return attackRoll / (2 * (defenceRoll + 1));
}

export interface EffectiveStats {
  atk: number;
  str: number;
  def: number;
  prayerBonus: number;
  /** Bonus points from gear, shown by the equipment panel. */
  points: { atk: number; str: number; def: number };
  maxHit: number;
}

/**
 * Display figures: the levels themselves, never inflated by equipment. Gear
 * shows up as bonus points and as a bigger max hit.
 */
export function getEffectiveStats(player: PlayerState): EffectiveStats {
  const profile = getCombatProfile(player);
  const prayerActive = player.activePrayer === 'battle' && player.prayer > 0;
  const shown = (level: number): number =>
    prayerActive ? Math.round(level * 1.15) : level;

  return {
    atk: shown(profile.atkLevel),
    str: shown(profile.strLevel),
    def: shown(profile.defLevel),
    prayerBonus: profile.bonuses.prayerBonus,
    points: { atk: profile.bonuses.atk, str: profile.bonuses.str, def: profile.bonuses.def },
    maxHit: profile.maxHit,
  };
}

/** Number of 600ms game ticks before an active prayer point is drained. */
export function getPrayerDrainTicks(prayerBonus: number): number {
  return Math.max(1, Math.round(5 * (1 + Math.max(0, prayerBonus) / 30)));
}

/**
 * What a piece of food actually restores: its flat value plus a share of the
 * eater's own maximum life.
 */
export function getHealAmount(item: ItemDef, maxHp: number): number {
  const flat = item.heal ?? 0;
  if (flat <= 0) return 0;
  const share = Math.round((maxHp * (item.healPercent ?? 0)) / 100);
  return flat + share;
}

export function restorePrayer(player: PlayerState, amount: number): PlayerState {
  return {
    ...player,
    prayer: Math.min(player.maxPrayer, player.prayer + Math.max(0, amount)),
  };
}

export function applyProtectionPrayer(damage: number, player: PlayerState): number {
  let reduced = damage;
  if (player.activePrayer === 'protection' && player.prayer > 0) {
    reduced = Math.ceil(reduced * 0.6);
  }
  // Torag's plate soaks a further fifth.
  if (hasSetEffect(player, 'torag')) {
    reduced = Math.ceil(reduced * 0.8);
  }
  return Math.max(0, reduced);
}

/** Worn item ids, with empty slots dropped. */
export function getWornItemIds(equipment: EquipmentLoadout): string[] {
  return Object.values(equipment).filter((itemId): itemId is string => Boolean(itemId));
}

/** Sets currently worn in full. */
export function getPlayerSets(player: PlayerState): ArmourSetDef[] {
  return getActiveSets(getWornItemIds(player.equipment));
}

export function hasSetEffect(player: PlayerState, effect: SetEffect): boolean {
  return getPlayerSets(player).some((set) => set.effect === effect);
}

export function getEquipmentSlot(item: ItemDef): EquipmentSlot | null {
  if (item.slot) return item.slot;
  return item.category === 'weapon' ? 'weapon' : null;
}

/**
 * Worn gear leaves the pack. The item moves out of the inventory and into its
 * slot; whatever was already in that slot is handed back, so the pack never
 * gains a net slot and can never overflow here.
 */
/** Thrown when the wearer is not yet strong enough for a piece of gear. */
export class LevelRequirementError extends Error {
  constructor(itemName: string, required: number) {
    super(`You need combat level ${required} to use ${itemName}.`);
    this.name = 'LevelRequirementError';
  }
}

export function equipItem(player: PlayerState, itemId: string): PlayerState {
  const item = getItem(itemId);
  const slot = getEquipmentSlot(item);
  if (!slot) {
    throw new Error('That item cannot be equipped');
  }
  if (getInventoryCount(player.inventory, itemId) <= 0) {
    throw new Error('Item not in inventory');
  }
  if ((item.levelReq ?? 1) > player.level) {
    throw new LevelRequirementError(item.name, item.levelReq!);
  }

  let inventory = removeFromInventory(player.inventory, itemId, 1);
  const displaced = player.equipment[slot];
  if (displaced && displaced !== itemId) {
    inventory = addToInventory(inventory, displaced, 1);
  }

  return {
    ...player,
    inventory,
    equipment: {
      ...player.equipment,
      [slot]: itemId,
    },
  };
}

/** Thrown when gear cannot come off because there is nowhere to put it. */
export class PackFullError extends Error {
  constructor(itemName: string) {
    super(`Your pack is too full to take off ${itemName}.`);
    this.name = 'PackFullError';
  }
}

/**
 * Removing gear puts it back in the pack, so it needs a free slot. Passing no
 * slot strips everything, which needs room for every worn piece.
 */
export function unequipItem(player: PlayerState, slot?: EquipmentSlot): PlayerState {
  const slots = slot
    ? ([slot] as EquipmentSlot[])
    : (Object.keys(player.equipment) as EquipmentSlot[]);

  let inventory = player.inventory;
  const equipment = { ...player.equipment };
  for (const each of slots) {
    const itemId = equipment[each];
    if (!itemId) continue;
    try {
      inventory = addToInventory(inventory, itemId, 1);
    } catch {
      throw new PackFullError(getItem(itemId).name);
    }
    delete equipment[each];
  }

  return { ...player, inventory, equipment };
}

export function recordCollectionDrop(
  player: PlayerState,
  monsterId: string,
  itemId: string,
  quantity: number
): PlayerState {
  if (quantity <= 0 || !getMonsterUniqueDrops(monsterId).includes(itemId)) return player;
  const monsterLog = player.collectionLog[monsterId] ?? {};
  return {
    ...player,
    collectionLog: {
      ...player.collectionLog,
      [monsterId]: {
        ...monsterLog,
        [itemId]: (monsterLog[itemId] ?? 0) + quantity,
      },
    },
  };
}

export interface SavedGame {
  version: number;
  player: PlayerState;
}

export function serializeSave(player: PlayerState): string {
  const payload: SavedGame = { version: SAVE_VERSION, player };
  return JSON.stringify(payload);
}

export function deserializeSave(raw: string): PlayerState {
  const parsed = JSON.parse(raw) as {
    version: number;
    player?: Partial<PlayerState> & {
      equippedWeaponId?: string | null;
      prayerActive?: boolean;
    };
  };
  // Any older layout is migrated by the defaults below; only a save written by
  // a newer build is genuinely unreadable, and that must not be overwritten.
  if (!parsed.player || !Number.isFinite(parsed.version) || parsed.version < 1) {
    throw new Error('Invalid save file');
  }
  if (parsed.version > SAVE_VERSION) {
    throw new Error(
      `Save was written by a newer version of the game (v${parsed.version} > v${SAVE_VERSION})`
    );
  }

  const { equippedWeaponId, prayerActive, ...player } = parsed.player;
  const equipment =
    parsed.version === 1
      ? equippedWeaponId
        ? { weapon: equippedWeaponId }
        : {}
      : (player.equipment ?? {});

  // Up to version five, worn gear also sat in the pack. Drop the duplicate so
  // an item now lives in exactly one place.
  let inventory = player.inventory ?? [];
  if (parsed.version < 6) {
    for (const itemId of Object.values(equipment)) {
      if (itemId && getInventoryCount(inventory, itemId) > 0) {
        inventory = removeFromInventory(inventory, itemId, 1);
      }
    }
  }

  return {
    ...player,
    inventory,
    equipment,
    collectionLog: player.collectionLog ?? {},
    quests: player.quests ?? {},
    prayer: player.prayer ?? 10,
    maxPrayer: player.maxPrayer ?? 10,
    activePrayer: player.activePrayer ?? (prayerActive ? 'battle' : null),
    quickPrayer: player.quickPrayer ?? 'battle',
  } as PlayerState;
}
