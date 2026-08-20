import { AREAS, getArea } from '../content/areas';
import { getItem } from '../content/items';
import {
  MONSTERS,
  canTalkToMonster,
  getMonster,
  getMonsterCombatLevel,
  getMonsterDialogues,
  getMonsterKillXp,
} from '../content/monsters';
import { getNpc } from '../content/npcs';
import { getShopForArea } from '../content/shops';
import { QUESTS, getQuest, getQuestsForMonster } from '../content/quests';
import { EventEmitter } from './events';
import { rollLoot, validateDropTable } from './loot';
import {
  addToInventory,
  applyProtectionPrayer,
  createNewPlayer,
  equipItem,
  getCombatProfile,
  getEffectiveStats,
  getInventoryCount,
  getMonsterRolls,
  hitChance,
  getEquipmentSlot,
  getHealAmount,
  getPrayerDrainTicks,
  hasSetEffect,
  recordCollectionDrop,
  removeFromInventory,
  readSlot,
  restorePrayer,
  unequipItem,
  writeSlot,
} from './state';
import type {
  ChatKind,
  EquipmentSlot,
  MonsterInstance,
  PlayerState,
  PrayerType,
  QuestDef,
  QuestProgress,
  ShopDef,
} from './types';
import { applyXp, xpToNextLevel } from './xp';

const COMBAT_TICK_MS = 600;
/** Experience per point of damage dealt, as in the game this borrows from. */
const XP_PER_DAMAGE = 4;
const OUT_OF_COMBAT_REGEN_MS = 5000;

export class Game extends EventEmitter {
  player: PlayerState;
  /** Which character slot this session writes to. */
  readonly slot: number;
  monsters: Map<string, MonsterInstance> = new Map();
  private combatTimer: number | null = null;
  private regenTimer: number | null = null;
  private prayerTimer: number | null = null;
  private prayerDrainTicks = 0;
  private playerAttackReady = true;
  private monsterAttackReady = true;
  /** Ahrim's guard reduction, cleared when the fight ends. */
  private defenceSap: Map<string, number> = new Map();

  constructor(player?: PlayerState, slot = 1) {
    super();
    this.slot = slot;
    for (const monster of MONSTERS) {
      validateDropTable(monster);
    }
    this.player = player ?? createNewPlayer('Adventurer', 'lumbridge');
    this.initAreaMonsters();
    this.startRegenLoop();
    this.startPrayerLoop();
  }

  static loadOrCreate(name: string, slot = 1): Game {
    const player = readSlot(slot);
    return new Game(player ?? createNewPlayer(name, 'lumbridge'), slot);
  }

  save(): void {
    writeSlot(this.slot, this.player);
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

  /**
   * Applies experience and any level-ups that follow. Every source of
   * experience — damage dealt, kills, contracts — comes through here.
   */
  private grantXp(amount: number): void {
    if (amount <= 0) return;
    const result = applyXp(this.player.xp, this.player.level, amount);
    this.player = { ...this.player, xp: result.xp, level: result.level };
    this.emit({ type: 'xpDrop', amount });

    if (!result.levelUp) return;
    const bonus = result.levelUp.statBonus;
    const maxHp = this.player.maxHp + bonus.maxHp;
    const maxPrayer = this.player.maxPrayer + result.levelUp.levelsGained * 2;
    this.player = {
      ...this.player,
      maxHp,
      hp: maxHp,
      maxPrayer,
      prayer: maxPrayer,
      baseAtk: this.player.baseAtk + bonus.atk,
      baseStr: this.player.baseStr + bonus.str,
      baseDef: this.player.baseDef + bonus.def,
    };
    this.emit({ type: 'levelUp', level: result.levelUp.newLevel });
    this.chat(`Level up! You are now level ${result.levelUp.newLevel}.`, 'levelup');
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

  /** Sentient creatures answer; beasts do not. */
  canTalkToMonster(monsterId: string): boolean {
    return canTalkToMonster(monsterId);
  }

  talkToMonster(monsterId: string, dialogueIndex: number): void {
    if (this.player.inCombat) return;
    const area = getArea(this.player.areaId);
    if (!area.monsterIds.includes(monsterId)) return;
    const dialogue = getMonsterDialogues(monsterId)[dialogueIndex];
    if (!dialogue) return;
    this.chat(`${getMonster(monsterId).name}: ${dialogue.text}`, 'npc');
  }

  /** Flavour line for the right-click Examine option. */
  examineMonster(monsterId: string): void {
    const monster = getMonster(monsterId);
    const level = getMonsterCombatLevel(monster);
    this.chat(
      `${monster.name} — combat level ${level}, ${monster.maxHp} life. ` +
        `${this.canTalkToMonster(monsterId) ? 'It looks willing to talk.' : 'It looks past talking.'}`,
      'game'
    );
  }

  examineItem(itemId: string): void {
    const item = getItem(itemId);
    const slot = getEquipmentSlot(item);
    const detail = slot
      ? `worn on the ${slot}`
      : item.category === 'misc'
        ? 'no use but its weight in coin'
        : item.category;
    this.chat(`${item.name} — ${detail}, worth ${item.value.toLocaleString()} gp.`, 'game');
  }

  examineNpc(npcId: string): void {
    const npc = getNpc(npcId);
    this.chat(
      `${npc.name}${npc.combatLevel ? ` — an aura of level ${npc.combatLevel}` : ''}. ` +
        'They have the look of someone with something to say.',
      'game'
    );
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
    this.defenceSap.clear();
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
    const profile = getCombatProfile(this.player);

    if (this.playerAttackReady) {
      this.playerAttackReady = false;
      window.setTimeout(() => {
        this.playerAttackReady = true;
      }, COMBAT_TICK_MS);

      // Accuracy is the player's attack roll measured against the creature's
      // defence roll; damage is then rolled between zero and the max hit.
      const sapped = this.defenceSap.get(monsterId) ?? 0;
      const guard = Math.max(0, def.def - sapped);
      const piercing = hasSetEffect(this.player, 'verac') && Math.random() < 0.2;
      const monsterDefenceRoll = piercing ? 0 : getMonsterRolls(def.atk, guard).defenceRoll;
      if (Math.random() < hitChance(profile.attackRoll, monsterDefenceRoll)) {
        let damage = Math.floor(Math.random() * (profile.maxHit + 1));
        // Karil's second bolt.
        if (hasSetEffect(this.player, 'karil') && Math.random() < 0.2) {
          damage += Math.floor(Math.random() * (profile.maxHit + 1));
          this.chat("Karil's bolts strike twice!", 'combat');
        }
        if (piercing) this.chat("Verac's flail finds a gap in the armour!", 'combat');
        if (hasSetEffect(this.player, 'ahrim')) {
          this.defenceSap.set(monsterId, Math.min(def.def, sapped + 2));
        }
        // Guthan's spear returns a share of the wound as life.
        if (hasSetEffect(this.player, 'guthan') && damage > 0 && Math.random() < 0.25) {
          const healed = Math.max(1, Math.round(damage / 4));
          const hp = Math.min(this.player.maxHp, this.player.hp + healed);
          if (hp > this.player.hp) {
            this.player = { ...this.player, hp };
            this.emit({ type: 'playerHp', hp, maxHp: this.player.maxHp });
            this.chat(`Guthan's spear drains ${healed} life into you.`, 'combat');
          }
        }
        instance.hp = Math.max(0, instance.hp - damage);
        this.monsters.set(monsterId, instance);
        this.emit({ type: 'hitsplat', target: 'monster', damage, missed: false });
        this.emit({ type: 'monsterHp', monsterId, hp: instance.hp, maxHp: instance.maxHp });

        this.chat(`You hit ${damage} damage.`, 'combat');
        this.grantXp(damage * XP_PER_DAMAGE);

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

      const monsterAttackRoll = getMonsterRolls(def.atk, def.def).attackRoll;
      if (Math.random() < hitChance(monsterAttackRoll, profile.defenceRoll)) {
        // A creature's strength is its max hit outright.
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
    const killXp = getMonsterKillXp(def);
    this.player = { ...this.player, gp: this.player.gp + maxHp };
    this.chat(
      `The ${def.name} dies. You gain ${killXp.toLocaleString()} xp and ${maxHp.toLocaleString()} gp.`,
      'combat'
    );
    this.grantXp(killXp);

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

    this.trackQuestKill(monsterId);
    this.respawnMonster(monsterId);
    this.endCombat();
  }

  /** True once the contract this one follows has been handed in. */
  isQuestUnlocked(questId: string): boolean {
    const quest = getQuest(questId);
    if (!quest.requires) return true;
    return this.getQuestProgress(quest.requires).claimed > 0;
  }

  /** Banks a kill against every unlocked contract that wants this creature. */
  private trackQuestKill(monsterId: string): void {
    const quests = getQuestsForMonster(monsterId).filter((quest) =>
      this.isQuestUnlocked(quest.id)
    );
    if (quests.length === 0) return;

    const progress = { ...this.player.quests };
    for (const quest of quests) {
      const current = progress[quest.id] ?? { kills: 0, claimed: 0 };
      if (current.kills >= quest.objective.count) continue;
      const kills = current.kills + 1;
      progress[quest.id] = { ...current, kills };
      this.emit({
        type: 'questProgress',
        questId: quest.id,
        kills,
        count: quest.objective.count,
      });
      if (kills >= quest.objective.count) {
        this.emit({ type: 'questReady', questId: quest.id, questName: quest.name });
        this.chat(`Contract complete: ${quest.name}. Claim it in your quest journal.`, 'levelup');
      } else {
        this.chat(`${quest.name}: ${kills}/${quest.objective.count}.`, 'game');
      }
    }
    this.player = { ...this.player, quests: progress };
  }

  getQuests(): QuestDef[] {
    return QUESTS;
  }

  getQuestProgress(questId: string): QuestProgress {
    return this.player.quests[questId] ?? { kills: 0, claimed: 0 };
  }

  isQuestReady(questId: string): boolean {
    const quest = getQuest(questId);
    if (!this.isQuestUnlocked(questId)) return false;
    return this.getQuestProgress(questId).kills >= quest.objective.count;
  }

  /**
   * Hands in a finished contract: xp and coins every time, the reward item
   * only on the first completion. The kill count resets so it can be run again.
   */
  claimQuest(questId: string): void {
    const quest = getQuest(questId);
    if (!this.isQuestUnlocked(questId)) {
      const gate = getQuest(quest.requires!);
      this.chat(`${quest.name} is not offered until you finish ${gate.name}.`, 'system');
      return;
    }
    const progress = this.getQuestProgress(questId);
    if (progress.kills < quest.objective.count) {
      this.chat(`${quest.name} is not finished yet.`, 'system');
      return;
    }

    const firstTime = progress.claimed === 0;
    const itemId = firstTime ? quest.reward.itemId : undefined;
    let inventory = this.player.inventory;
    if (itemId) {
      try {
        inventory = addToInventory(inventory, itemId, 1);
      } catch {
        this.chat('Your pack is full — make room before claiming that reward.', 'system');
        return;
      }
    }

    this.player = {
      ...this.player,
      inventory,
      gp: this.player.gp + quest.reward.gp,
      quests: {
        ...this.player.quests,
        [questId]: {
          kills: progress.kills - quest.objective.count,
          claimed: progress.claimed + 1,
        },
      },
    };
    this.grantXp(quest.reward.xp);

    this.chat(
      `${quest.name} handed in: ${quest.reward.xp} xp and ${quest.reward.gp} gp.`,
      'levelup'
    );
    if (itemId) {
      this.chat(`Reward: ${getItem(itemId).name}.`, 'levelup');
      this.emit({ type: 'loot', itemId, itemName: getItem(itemId).name, quantity: 1 });
    }
    if (firstTime) {
      const unlocked = QUESTS.filter((next) => next.requires === questId);
      for (const next of unlocked) {
        this.chat(`New contract available: ${next.name}.`, 'levelup');
      }
    }
    this.emit({ type: 'questClaimed', questId, questName: quest.name });
    this.save();
    this.emitStats();
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

    const healed = getHealAmount(item, this.player.maxHp);
    const newHp = Math.min(this.player.maxHp, this.player.hp + healed);
    const gained = newHp - this.player.hp;
    this.player = {
      ...this.player,
      hp: newHp,
      inventory: removeFromInventory(this.player.inventory, itemId, 1),
    };
    this.chat(
      `You eat ${item.name} and recover ${gained} life — ${newHp}/${this.player.maxHp}.`,
      'game'
    );
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
