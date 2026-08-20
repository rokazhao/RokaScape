import type { EquipmentSlot, InventorySlot, ItemDef, PlayerState } from './types';
import { getItem } from '../content/items';
import { getMonsterUniqueDrops } from '../content/monsters';

export const INVENTORY_SIZE = 28;
export const SAVE_VERSION = 6;
export const SAVE_KEY = 'rokascape-save';

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

export function getEffectiveStats(
  player: PlayerState
): { atk: number; str: number; def: number; prayerBonus: number } {
  let atk = player.baseAtk;
  let str = player.baseStr;
  let def = player.baseDef;
  let prayerBonus = 0;

  for (const itemId of Object.values(player.equipment)) {
    if (!itemId) continue;
    const item = getItem(itemId);
    atk += item.atk ?? 0;
    str += item.str ?? 0;
    def += item.def ?? 0;
    prayerBonus += item.prayerBonus ?? 0;
  }

  if (player.activePrayer === 'battle' && player.prayer > 0) {
    atk = Math.max(1, Math.round(atk * 1.15));
    str = Math.max(1, Math.round(str * 1.15));
    def = Math.max(1, Math.round(def * 1.15));
  }

  return { atk, str, def, prayerBonus };
}

/** Number of 600ms game ticks before an active prayer point is drained. */
export function getPrayerDrainTicks(prayerBonus: number): number {
  return Math.max(1, Math.round(5 * (1 + Math.max(0, prayerBonus) / 30)));
}

export function restorePrayer(player: PlayerState, amount: number): PlayerState {
  return {
    ...player,
    prayer: Math.min(player.maxPrayer, player.prayer + Math.max(0, amount)),
  };
}

export function applyProtectionPrayer(damage: number, player: PlayerState): number {
  if (player.activePrayer !== 'protection' || player.prayer <= 0) return damage;
  return Math.max(0, Math.ceil(damage * 0.6));
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
export function equipItem(player: PlayerState, itemId: string): PlayerState {
  const item = getItem(itemId);
  const slot = getEquipmentSlot(item);
  if (!slot) {
    throw new Error('That item cannot be equipped');
  }
  if (getInventoryCount(player.inventory, itemId) <= 0) {
    throw new Error('Item not in inventory');
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
  if (
    !parsed.player ||
    (parsed.version !== 1 &&
      parsed.version !== 2 &&
      parsed.version !== 3 &&
      parsed.version !== 4 &&
      parsed.version !== 5 &&
      parsed.version !== SAVE_VERSION)
  ) {
    throw new Error('Invalid save file');
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
  if (parsed.version < SAVE_VERSION) {
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
    prayer: player.prayer ?? 10,
    maxPrayer: player.maxPrayer ?? 10,
    activePrayer: player.activePrayer ?? (prayerActive ? 'battle' : null),
    quickPrayer: player.quickPrayer ?? 'battle',
  } as PlayerState;
}
