import type { DropEntry, LootResult, MonsterDef } from './types';
import { getItem } from '../content/items';

export function validateDropTable(monster: MonsterDef): void {
  for (const drop of monster.drops) {
    if (drop.weight <= 0) {
      throw new Error(`Invalid drop weight for ${monster.id}/${drop.itemId}`);
    }
    getItem(drop.itemId);
  }
  if (monster.nothingWeight !== undefined && monster.nothingWeight < 0) {
    throw new Error(`Invalid nothing weight for ${monster.id}`);
  }
}

export function rollLoot(monster: MonsterDef, rng: () => number = Math.random): LootResult {
  const entries: DropEntry[] = [...monster.drops];
  const itemWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const nothingWeight = monster.nothingWeight ?? 0;
  const totalWeight = itemWeight + nothingWeight;

  if (totalWeight <= 0) {
    return { nothing: true, quantity: 0 };
  }

  let roll = Math.floor(rng() * totalWeight) + 1;

  for (const entry of entries) {
    if (roll <= entry.weight) {
      return {
        nothing: false,
        itemId: entry.itemId,
        quantity: entry.quantity ?? 1,
      };
    }
    roll -= entry.weight;
  }

  return { nothing: true, quantity: 0 };
}
