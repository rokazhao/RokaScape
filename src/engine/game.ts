import { AREAS, getArea } from '../content/areas';
import { getItem } from '../content/items';
import { MONSTERS, getMonster } from '../content/monsters';
import { getNpc } from '../content/npcs';
import { getShopForArea } from '../content/shops';
import { EventEmitter } from './events';
import { rollLoot, validateDropTable } from './loot';
import {
  SAVE_KEY,
  addToInventory,
  applyProtectionPrayer,
  createNewPlayer,
  deserializeSave,
  equipItem,
  getEffectiveStats,
  getInventoryCount,
  getPrayerDrainTicks,
  recordCollectionDrop,
  removeFromInventory,
  restorePrayer,
  serializeSave,
  unequipItem,
} from './state';
import type {
  ChatKind,
  EquipmentSlot,
  MonsterInstance,
  PlayerState,
  PrayerType,
  ShopDef,
} from './types';
import { applyXp, xpToNextLevel } from './xp';

const COMBAT_TICK_MS = 600;
const OUT_OF_COMBAT_REGEN_MS = 5000;

export class Game extends EventEmitter {
  player: PlayerState;
  monsters: Map<string, MonsterInstance> = new Map();
  private combatTimer: number | null = null;
  private regenTimer: number | null = null;
  private prayerTimer: number | null = null;
  private prayerDrainTicks = 0;
  private playerAttackReady = true;
  private monsterAttackReady = true;

  constructor(player?: PlayerState) {
    super();
    for (const monster of MONSTERS) {
      validateDropTable(monster);
    }
    this.player = player ?? createNewPlayer('Adventurer', 'lumbridge');
    this.initAreaMonsters();
    this.startRegenLoop();
    this.startPrayerLoop();
  }

  static loadOrCreate(name: string): Game {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      try {
        const player = deserializeSave(raw);
        return new Game(player);
      } catch {
        localStorage.removeItem(SAVE_KEY);
      }
    }
    return new Game(createNewPlayer(name, 'lumbridge'));
  }

  save(): void {
    localStorage.setItem(SAVE_KEY, serializeSave(this.player));
  }

  private initAreaMonsters(): void {
    this.monsters.clear();
    const area = getArea(this.player.areaId);
    for (const id of area.monsterIds) {
      const def = getMonster(id);
      this.monsters.set(id, { defId: id, hp: def.maxHp, maxHp: def.maxHp });
    }
  }

  private emitPlayerStats(): void {
    const stats = getEffectiveStats(this.player);
    this.emit({
      type: 'playerStats',
      atk: stats.atk,
      str: stats.str,
      def: stats.def,
      prayer: this.player.prayer,
      maxPrayer: this.player.maxPrayer,
      prayerBonus: stats.prayerBonus,
      activePrayer: this.player.activePrayer,
      quickPrayer: this.player.quickPrayer,
      level: this.player.level,
      xp: this.player.xp,
      gp: this.player.gp,
    });
  }

  private emitStats(): void {
    this.emitPlayerStats();
    this.emit({ type: 'playerHp', hp: this.player.hp, maxHp: this.player.maxHp });
    this.emit({ type: 'inventoryChanged', inventory: [...this.player.inventory] });
    this.emit({ type: 'equipmentChanged', equipment: { ...this.player.equipment } });
  }

  private chat(message: string, kind: ChatKind = 'game'): void {
    this.emit({ type: 'chat', message, kind });
  }

  getCurrentArea() {
    return getArea(this.player.areaId);
  }

  getAreas() {
    return AREAS;
  }

  /** The shop of the area the player is standing in, if it has one. */
  getShop(): ShopDef | null {
    return getShopForArea(this.player.areaId);
  }

  getShopItems() {
    const shop = this.getShop();
    if (!shop) return [];
    return shop.stock.map((itemId) => getItem(itemId));
  }

  travel(areaId: string): void {
    if (this.player.inCombat) {
      this.chat('You cannot travel while in combat.', 'system');
      return;
    }
    if (this.player.areaId === areaId) {
      this.chat(`You are already in ${getArea(areaId).name}.`, 'system');
      return;
    }
    this.player = { ...this.player, areaId };
    this.initAreaMonsters();
    const area = getArea(areaId);
    this.emit({ type: 'areaChanged', areaId, areaName: area.name });
    this.chat(`You travel to ${area.name}.`);
    this.save();
    this.emitStats();
  }

  talkToNpc(npcId: string, dialogueIndex: number): void {
    if (this.player.inCombat) return;
    const area = getArea(this.player.areaId);
    if (!area.npcIds.includes(npcId)) return;
    const npc = getNpc(npcId);
    const dialogue = npc.dialogues[dialogueIndex];
    if (!dialogue) return;
    this.chat(`${npc.name}: ${dialogue.text}`, 'npc');
  }

  startCombat(monsterId: string): void {
    if (this.player.inCombat) return;
    const area = getArea(this.player.areaId);
    if (!area.monsterIds.includes(monsterId)) return;
    const instance = this.monsters.get(monsterId);
    if (!instance || instance.hp <= 0) {
      this.chat('That foe is already defeated.', 'system');
      return;
    }
    const def = getMonster(monsterId);
    this.player = { ...this.player, inCombat: true, combatTargetId: monsterId };
    this.playerAttackReady = true;
    this.monsterAttackReady = true;
    this.emit({ type: 'combatStart', monsterId, monsterName: def.name });
    this.emit({ type: 'monsterHp', monsterId, hp: instance.hp, maxHp: instance.maxHp });
    this.chat(`You engage ${def.name}!`, 'combat');
    this.startCombatLoop();
  }

  fleeCombat(): void {
    if (!this.player.inCombat) return;
    const targetId = this.player.combatTargetId;
    this.endCombat();
    if (targetId) {
      const def = getMonster(targetId);
      this.respawnMonster(targetId);
      this.chat(`You flee from the ${def.name}.`, 'combat');
    }
  }

  private endCombat(): void {
    this.player = { ...this.player, inCombat: false, combatTargetId: null };
    if (this.combatTimer !== null) {
      window.clearInterval(this.combatTimer);
      this.combatTimer = null;
    }
    this.emit({ type: 'combatEnd' });
    this.save();
    this.emitStats();
  }

  private respawnMonster(monsterId: string): void {
    const def = getMonster(monsterId);
    this.monsters.set(monsterId, { defId: monsterId, hp: def.maxHp, maxHp: def.maxHp });
    this.emit({ type: 'monsterRespawn', monsterId });
    this.emit({ type: 'monsterHp', monsterId, hp: def.maxHp, maxHp: def.maxHp });
  }

  private startCombatLoop(): void {
    if (this.combatTimer !== null) window.clearInterval(this.combatTimer);
    this.combatTimer = window.setInterval(() => this.combatTick(), COMBAT_TICK_MS);
  }

  private combatTick(): void {
    if (!this.player.inCombat || !this.player.combatTargetId) return;
    const monsterId = this.player.combatTargetId;
    const instance = this.monsters.get(monsterId);
    if (!instance || instance.hp <= 0) {
      this.endCombat();
      return;
    }
    const def = getMonster(monsterId);
    const stats = getEffectiveStats(this.player);

    if (this.playerAttackReady) {
      this.playerAttackReady = false;
      window.setTimeout(() => {
        this.playerAttackReady = true;
      }, COMBAT_TICK_MS);

      const hitChance = Math.floor(Math.random() * (stats.atk + 1));
      const defChance = Math.floor(Math.random() * (def.def + 1));
      if (hitChance >= defChance) {
        const damage = Math.floor(Math.random() * (stats.str + 1));
        instance.hp = Math.max(0, instance.hp - damage);
        this.monsters.set(monsterId, instance);
        this.emit({ type: 'hitsplat', target: 'monster', damage, missed: false });
        this.emit({ type: 'monsterHp', monsterId, hp: instance.hp, maxHp: instance.maxHp });

        const xpResult = applyXp(this.player.xp, this.player.level, damage);
        this.player = {
          ...this.player,
          xp: xpResult.xp,
          level: xpResult.level,
        };
        this.emit({ type: 'xpDrop', amount: damage });
        this.chat(`You hit ${damage} damage.`, 'combat');

        if (xpResult.levelUp) {
          const bonus = xpResult.levelUp.statBonus;
          const newMaxHp = this.player.maxHp + bonus.maxHp;
          const newMaxPrayer =
            this.player.maxPrayer + xpResult.levelUp.levelsGained * 2;
          this.player = {
            ...this.player,
            maxHp: newMaxHp,
            hp: newMaxHp,
            maxPrayer: newMaxPrayer,
            prayer: newMaxPrayer,
            baseAtk: this.player.baseAtk + bonus.atk,
            baseStr: this.player.baseStr + bonus.str,
            baseDef: this.player.baseDef + bonus.def,
          };
          this.emit({ type: 'levelUp', level: xpResult.levelUp.newLevel });
          this.chat(`Level up! You are now level ${xpResult.levelUp.newLevel}.`, 'levelup');
        }

        if (instance.hp <= 0) {
          this.onMonsterKilled(monsterId, def.maxHp);
          return;
        }
      } else {
        this.emit({ type: 'hitsplat', target: 'monster', damage: 0, missed: true });
        this.chat('You miss.', 'combat');
      }
    }

    if (this.monsterAttackReady) {
      this.monsterAttackReady = false;
      window.setTimeout(() => {
        this.monsterAttackReady = true;
      }, COMBAT_TICK_MS);

      const hitChance = Math.floor(Math.random() * (def.atk + 1));
      const defChance = Math.floor(Math.random() * (stats.def + 1));
      if (hitChance >= defChance) {
        const rolledDamage = Math.floor(Math.random() * (def.str + 1));
        const damage = applyProtectionPrayer(rolledDamage, this.player);
        this.player = { ...this.player, hp: Math.max(0, this.player.hp - damage) };
        this.emit({ type: 'hitsplat', target: 'player', damage, missed: false });
        this.emit({ type: 'playerHp', hp: this.player.hp, maxHp: this.player.maxHp });
        this.chat(`${def.name} hits ${damage} damage.`, 'combat');

        if (this.player.hp <= 0) {
          this.onPlayerDeath();
          return;
        }
      } else {
        this.emit({ type: 'hitsplat', target: 'player', damage: 0, missed: true });
        this.chat(`${def.name} misses.`, 'combat');
      }
    }

    this.save();
    this.emitStats();
  }

  private onMonsterKilled(monsterId: string, maxHp: number): void {
    const def = getMonster(monsterId);
    const loot = rollLoot(def);
    this.player = { ...this.player, gp: this.player.gp + maxHp };
    this.chat(`The ${def.name} dies. You gain ${maxHp} gp.`, 'combat');

    if (!loot.nothing && loot.itemId) {
      try {
        this.player = {
          ...this.player,
          inventory: addToInventory(this.player.inventory, loot.itemId, loot.quantity),
        };
        this.player = recordCollectionDrop(this.player, monsterId, loot.itemId, loot.quantity);
        const item = getItem(loot.itemId);
        this.emit({ type: 'loot', itemId: loot.itemId, itemName: item.name, quantity: loot.quantity });
        this.chat(`You receive ${loot.quantity}x ${item.name}.`, 'combat');
      } catch {
        this.chat('Your inventory is full! The loot is lost.', 'system');
      }
    }

    this.respawnMonster(monsterId);
    this.endCombat();
  }

  private onPlayerDeath(): void {
    this.player = {
      ...this.player,
      gp: Math.floor(this.player.gp / 2),
      hp: this.player.maxHp,
      prayer: this.player.maxPrayer,
      activePrayer: null,
      areaId: 'lumbridge',
    };
    this.initAreaMonsters();
    this.emit({ type: 'playerDeath' });
    this.chat('You have passed out and wake in Lumbridge with half your gold.', 'combat');
    this.endCombat();
    this.emit({ type: 'areaChanged', areaId: 'lumbridge', areaName: 'Lumbridge' });
  }

  togglePrayer(prayerType: PrayerType): void {
    if (this.player.activePrayer === prayerType) {
      this.player = { ...this.player, activePrayer: null };
      this.prayerDrainTicks = 0;
      this.chat(`${prayerType === 'battle' ? 'Battle' : 'Protection'} Prayer deactivated.`, 'game');
    } else {
      if (this.player.prayer <= 0) {
        this.chat('You have no Prayer points left. Drink a Prayer Potion.', 'system');
        return;
      }
      this.player = { ...this.player, activePrayer: prayerType };
      this.prayerDrainTicks = 0;
      this.chat(
        prayerType === 'battle'
          ? 'Battle Prayer activated. Your combat attributes rise.'
          : 'Protection Prayer activated. Incoming damage is reduced.',
        'game'
      );
    }
    this.save();
    this.emitPlayerStats();
  }

  toggleQuickPrayer(): void {
    if (this.player.activePrayer) {
      this.togglePrayer(this.player.activePrayer);
    } else {
      this.togglePrayer(this.player.quickPrayer);
    }
  }

  setQuickPrayer(prayerType: PrayerType): void {
    this.player = { ...this.player, quickPrayer: prayerType };
    this.chat(
      `${prayerType === 'battle' ? 'Battle' : 'Protection'} Prayer set as quick prayer.`,
      'game'
    );
    this.save();
    this.emitPlayerStats();
  }

  consumeItem(itemId: string): void {
    const item = getItem(itemId);
    const isFood = item.category === 'food' && Boolean(item.heal);
    const isPrayerPotion = item.category === 'potion' && Boolean(item.prayerRestore);
    if (!isFood && !isPrayerPotion) {
      this.chat('That item cannot be consumed.', 'system');
      return;
    }
    if (getInventoryCount(this.player.inventory, itemId) <= 0) {
      this.chat(`You do not have ${item.name}.`, 'system');
      return;
    }

    if (isPrayerPotion) {
      if (this.player.prayer >= this.player.maxPrayer) {
        this.chat('Your Prayer is already full.', 'system');
        return;
      }
      const restored = restorePrayer(this.player, item.prayerRestore ?? 0);
      this.player = {
        ...restored,
        inventory: removeFromInventory(this.player.inventory, itemId, 1),
      };
      this.chat(`You drink ${item.name} and restore Prayer to ${this.player.prayer}.`, 'game');
      this.save();
      this.emitStats();
      return;
    }

    const newHp = Math.min(this.player.maxHp, this.player.hp + (item.heal ?? 0));
    this.player = {
      ...this.player,
      hp: newHp,
      inventory: removeFromInventory(this.player.inventory, itemId, 1),
    };
    this.chat(`You eat ${item.name} and heal to ${newHp} HP.`, 'game');
    this.save();
    this.emitStats();
  }

  eatFood(itemId: string): void {
    this.consumeItem(itemId);
  }

  equip(itemId: string): void {
    try {
      this.player = equipItem(this.player, itemId);
      const item = getItem(itemId);
      this.chat(`${item.name} equipped.`, 'game');
    } catch (e) {
      this.chat(e instanceof Error ? e.message : 'Cannot equip.', 'system');
    }
    this.save();
    this.emitStats();
  }

  unequip(slot?: EquipmentSlot): void {
    if (slot ? !this.player.equipment[slot] : Object.keys(this.player.equipment).length === 0) {
      this.chat('Nothing equipped.', 'system');
      return;
    }
    const itemName = slot ? getItem(this.player.equipment[slot]!).name : 'Equipment';
    try {
      this.player = unequipItem(this.player, slot);
    } catch (e) {
      // Gear returns to the pack, so it needs a free slot to come off.
      this.chat(e instanceof Error ? e.message : 'Your pack is full.', 'system');
      return;
    }
    this.chat(`${itemName} returned to your pack.`, 'game');
    this.save();
    this.emitStats();
  }

  buyItem(itemId: string, quantity: number): void {
    const item = getItem(itemId);
    const shop = this.getShop();
    if (!shop) {
      this.chat('There is nowhere to trade in this area.', 'system');
      return;
    }
    if (!shop.stock.includes(itemId)) {
      this.chat(`${shop.keeperName} does not stock ${item.name}.`, 'system');
      return;
    }
    const cost = item.value * quantity;
    if (this.player.gp < cost) {
      this.chat('You do not have enough GP.', 'system');
      return;
    }
    try {
      this.player = {
        ...this.player,
        gp: this.player.gp - cost,
        inventory: addToInventory(this.player.inventory, itemId, quantity),
      };
      this.chat(`Purchased ${quantity}x ${item.name} for ${cost} GP.`, 'game');
    } catch {
      this.chat('Inventory full.', 'system');
      return;
    }
    this.save();
    this.emitStats();
  }

  sellItem(itemId: string, quantity: number): void {
    const item = getItem(itemId);
    const owned = getInventoryCount(this.player.inventory, itemId);
    if (owned <= 0) {
      this.chat('You do not have that item.', 'system');
      return;
    }
    const amount = Math.min(quantity, owned);
    const payout = Math.floor((item.value * amount) / 2);
    this.player = {
      ...this.player,
      gp: this.player.gp + payout,
      inventory: removeFromInventory(this.player.inventory, itemId, amount),
    };
    this.chat(`Sold ${amount}x ${item.name} for ${payout} GP.`, 'game');
    this.save();
    this.emitStats();
  }

  dropItem(itemId: string, quantity: number): void {
    const owned = getInventoryCount(this.player.inventory, itemId);
    if (owned <= 0) return;
    const amount = Math.min(quantity, owned);
    this.player = {
      ...this.player,
      inventory: removeFromInventory(this.player.inventory, itemId, amount),
    };
    const item = getItem(itemId);
    this.chat(`Dropped ${amount}x ${item.name}.`, 'game');
    this.save();
    this.emitStats();
  }

  private startRegenLoop(): void {
    this.regenTimer = window.setInterval(() => {
      if (this.player.inCombat) return;
      if (this.player.hp < this.player.maxHp) {
        this.player = { ...this.player, hp: Math.min(this.player.maxHp, this.player.hp + 1) };
        this.emit({ type: 'playerHp', hp: this.player.hp, maxHp: this.player.maxHp });
      }
    }, OUT_OF_COMBAT_REGEN_MS);
  }

  private startPrayerLoop(): void {
    this.prayerTimer = window.setInterval(() => {
      if (!this.player.activePrayer) {
        this.prayerDrainTicks = 0;
        return;
      }
      const { prayerBonus } = getEffectiveStats(this.player);
      this.prayerDrainTicks++;
      if (this.prayerDrainTicks < getPrayerDrainTicks(prayerBonus)) return;

      this.prayerDrainTicks = 0;
      const prayer = Math.max(0, this.player.prayer - 1);
      this.player = {
        ...this.player,
        prayer,
        activePrayer: prayer > 0 ? this.player.activePrayer : null,
      };
      if (prayer === 0) {
        this.chat('Your Prayer points are exhausted. Your active prayer fades.', 'system');
      }
      this.save();
      this.emitPlayerStats();
    }, COMBAT_TICK_MS);
  }

  destroy(): void {
    if (this.combatTimer !== null) window.clearInterval(this.combatTimer);
    if (this.regenTimer !== null) window.clearInterval(this.regenTimer);
    if (this.prayerTimer !== null) window.clearInterval(this.prayerTimer);
  }

  getXpToNext(): number {
    return xpToNextLevel(this.player.xp, this.player.level);
  }
}
