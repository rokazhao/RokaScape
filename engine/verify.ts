import {
  INVENTORY_SIZE,
  addToInventory,
  applyProtectionPrayer,
  createNewPlayer,
  deserializeSave,
  equipItem,
  getCombatProfile,
  getEffectiveStats,
  getInventoryCount,
  hitChance,
  getEquipmentSlot,
  getHealAmount,
  getPlayerSets,
  getPrayerDrainTicks,
  hasSetEffect,
  recordCollectionDrop,
  restorePrayer,
  serializeSave,
  unequipItem,
} from './state';
import type { EffectiveStats } from './state';
import { rollLoot, validateDropTable } from './loot';
import { AREAS, getAreaAverageCombatLevel } from '../content/areas';
import {
  canTalkToMonster,
  getMonster,
  getMonsterCombatLevel,
  getMonsterKillXp,
  MONSTERS,
  MONSTER_DIALOGUES,
  MONSTER_UNIQUES,
} from '../content/monsters';
import { ITEMS, getItem } from '../content/items';
import { SHOPS, getShopForArea } from '../content/shops';
import { QUESTS, getQuestsForMonster } from '../content/quests';
import { ARMOUR_SETS } from '../content/sets';
import { findInteractionPoint, findWalkPath, isWalkable } from '../content/navigation';
import { applyXp, xpForLevel } from './xp';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

export function runRegressionChecks(): string[] {
  const results: string[] = [];

  for (const monster of MONSTERS) validateDropTable(monster);

  let inv = addToInventory([], 'shrimp', 5);
  inv = addToInventory(inv, 'raw-beef', 3);
  inv = addToInventory(inv, 'goblin-meat', 2);
  assert(getInventoryCount(inv, 'shrimp') === 5, 'shrimp count');
  assert(getInventoryCount(inv, 'raw-beef') === 3, 'raw beef count');
  assert(getInventoryCount(inv, 'goblin-meat') === 2, 'goblin meat count');
  assert(inv.length === 3, 'three distinct inventory slots');
  results.push('Same-value items coexist in inventory');

  for (let i = 0; i < 200; i++) {
    const loot = rollLoot(getMonster('goblin'));
    assert(typeof loot.nothing === 'boolean', 'loot nothing flag');
    if (!loot.nothing) {
      assert(typeof loot.itemId === 'string', 'loot itemId');
      assert(loot.quantity > 0, 'loot quantity');
    }
  }
  results.push('Drops never null');

  const godWarsRares: Record<string, string[]> = {
    'general-graardor': ['bandos-chestplate', 'bandos-tassets', 'bandos-boots', 'graardor-warhammer', 'bandos-hilt'],
    'commander-zilyana': ['saradomin-sword', 'armadyl-crossbow', 'saradomin-hilt'],
    'kril-tsutsaroth': ['zamorakian-spear', 'steam-battlestaff', 'zamorak-hilt'],
    kreearra: ['armadyl-helmet', 'armadyl-chestplate', 'armadyl-chainskirt', 'armadyl-hilt'],
  };
  for (const [bossId, expectedRares] of Object.entries(godWarsRares)) {
    const boss = getMonster(bossId);
    const totalWeight =
      boss.drops.reduce((sum, drop) => sum + drop.weight, 0) + (boss.nothingWeight ?? 0);
    assert(totalWeight === 1000, `${boss.name} drop table uses a 1000-weight scale`);
    for (const itemId of expectedRares) {
      assert(boss.drops.some((drop) => drop.itemId === itemId), `${boss.name} can drop ${itemId}`);
    }
    for (const shard of ['godsword-shard-1', 'godsword-shard-2', 'godsword-shard-3']) {
      assert(boss.drops.some((drop) => drop.itemId === shard), `${boss.name} can drop ${shard}`);
    }
  }
  results.push('God Wars bosses retain complete common and rare tables');

  const xpResult = applyXp(95, 1, 20);
  assert(xpResult.xp > 0, 'xp overflow preserved');
  results.push('XP overflow preserved');

  // Five life a level, so a maxed adventurer carries 500.
  let grower = createNewPlayer('Growth', 'lumbridge');
  assert(grower.maxHp === 10, 'a fresh adventurer starts with ten life');
  let carried = grower.maxHp;
  for (let level = 2; level <= 99; level++) {
    const step = applyXp(xpForLevel(level) - 1, level - 1, 1);
    assert(step.levelUp !== null, `level ${level} is reachable`);
    carried += step.levelUp!.statBonus.maxHp;
  }
  assert(carried === 500, `a level 99 carries 500 life, not ${carried}`);
  results.push('Life grows five a level, to 500 at ninety-nine');

  // Food: a flat base so good food matters early, a share of the pool so it
  // still matters at ninety-nine.
  const warGod = getItem('war-god-ration');
  const shrimp = getItem('shrimp');
  assert(getHealAmount(shrimp, 10) === getHealAmount(shrimp, 500), 'starter food stays flat');
  assert(
    getHealAmount(warGod, 500) > getHealAmount(warGod, 100),
    'good food scales with the eater'
  );
  assert(
    getHealAmount(warGod, 100) >= 50,
    'good food is already worth eating at low level'
  );
  assert(
    getHealAmount(warGod, 500) / 500 < 0.25,
    'no single meal refills a quarter of a maxed bar'
  );
  for (const item of ITEMS) {
    if (!item.healPercent) continue;
    assert((item.heal ?? 0) > 0, `${item.name} has a flat base as well as a share`);
    assert(item.healPercent <= 8, `${item.name} keeps its share modest`);
  }
  // Better food must heal more at every size of health bar.
  for (const pool of [10, 100, 500]) {
    const ladder = ['shrimp', 'trout', 'shark', 'manta', 'dragon-steak', 'war-god-ration'];
    for (let i = 1; i < ladder.length; i++) {
      assert(
        getHealAmount(getItem(ladder[i]!), pool) >= getHealAmount(getItem(ladder[i - 1]!), pool),
        `${ladder[i]} out-heals ${ladder[i - 1]} at ${pool} life`
      );
    }
  }
  results.push('Food heals a flat amount plus a share of the eater');

  const player = createNewPlayer('Test', 'lumbridge');
  player.hp = 7;
  const saved = deserializeSave(serializeSave(player));
  assert(saved.hp === 7, 'hp persisted');
  results.push('HP persists across save/load');

  const prayerPotion = getItem('prayer-potion');
  assert(prayerPotion.prayerRestore === 25, 'Prayer Potion restores prayer');
  let prayerPlayer = createNewPlayer('Prayer Test', 'lumbridge');
  prayerPlayer = {
    ...prayerPlayer,
    // High level, because the kit below is gated behind combat requirements.
    level: 99,
    baseAtk: 99,
    baseStr: 99,
    baseDef: 99,
    prayer: 1,
    inventory: addToInventory(
      addToInventory(prayerPlayer.inventory, 'fire-cape', 1),
      'saradomin-sword',
      1
    ),
  };
  prayerPlayer = equipItem(equipItem(prayerPlayer, 'fire-cape'), 'saradomin-sword');
  const unboostedPrayerStats = getEffectiveStats(prayerPlayer);
  assert(unboostedPrayerStats.prayerBonus === 4, 'equipped gear grants prayer bonus');
  const boostedProfile = getCombatProfile({ ...prayerPlayer, activePrayer: 'battle' });
  const plainProfile = getCombatProfile(prayerPlayer);
  assert(
    boostedProfile.attackRoll > plainProfile.attackRoll &&
      boostedProfile.maxHit >= plainProfile.maxHit &&
      boostedProfile.defenceRoll > plainProfile.defenceRoll,
    'Battle Prayer boosts all combat attributes'
  );
  assert(
    getPrayerDrainTicks(30) > getPrayerDrainTicks(0),
    'prayer bonus slows point drain'
  );
  assert(
    applyProtectionPrayer(20, { ...prayerPlayer, activePrayer: 'protection' }) === 12,
    'Protection Prayer reduces incoming damage by forty percent'
  );
  prayerPlayer = restorePrayer(prayerPlayer, prayerPotion.prayerRestore ?? 0);
  assert(prayerPlayer.prayer === prayerPlayer.maxPrayer, 'Prayer Potion restoration caps at maximum');
  const loadedPrayer = deserializeSave(
    serializeSave({
      ...prayerPlayer,
      prayer: 4,
      activePrayer: 'protection',
      quickPrayer: 'protection',
    })
  );
  assert(
    loadedPrayer.prayer === 4 &&
      loadedPrayer.activePrayer === 'protection' &&
      loadedPrayer.quickPrayer === 'protection',
    'prayer points, activation, and quick preset persist'
  );
  const {
    prayer: _oldPrayer,
    maxPrayer: _oldMaxPrayer,
    activePrayer: _oldActivePrayer,
    quickPrayer: _oldQuickPrayer,
    ...versionThreePlayer
  } = createNewPlayer('Prayer Migration', 'lumbridge');
  const migratedVersionThree = deserializeSave(
    JSON.stringify({ version: 3, player: versionThreePlayer })
  );
  assert(
    migratedVersionThree.prayer === 10 &&
      migratedVersionThree.maxPrayer === 10 &&
      migratedVersionThree.activePrayer === null &&
      migratedVersionThree.quickPrayer === 'battle',
    'version three saves gain prayer defaults'
  );
  const {
    activePrayer: _versionFourActive,
    quickPrayer: _versionFourQuick,
    ...versionFourPlayer
  } = createNewPlayer('Prayer Mode Migration', 'lumbridge');
  const migratedVersionFour = deserializeSave(
    JSON.stringify({
      version: 4,
      player: { ...versionFourPlayer, prayerActive: true },
    })
  );
  assert(
    migratedVersionFour.activePrayer === 'battle' &&
      migratedVersionFour.quickPrayer === 'battle',
    'version four active prayer migrates to Battle Prayer'
  );
  for (const bossId of [
    'general-graardor',
    'commander-zilyana',
    'kril-tsutsaroth',
    'kreearra',
    'elvarg',
    'dagannoth-rex',
    'bones-skeleton-king',
    'high-overlord-saurfang',
    'orc-king-thrall',
  ]) {
    assert(
      getMonster(bossId).drops.some((drop) => drop.itemId === 'prayer-potion'),
      `${getMonster(bossId).name} drops Prayer Potions`
    );
  }
  results.push('Prayer drains, restores, boosts combat, and drops from bosses');

  let collector = createNewPlayer('Collector', 'lumbridge');
  collector = recordCollectionDrop(collector, 'goblin', 'goblin-sword', 1);
  collector = recordCollectionDrop(collector, 'goblin', 'goblin-sword', 2);
  collector = recordCollectionDrop(collector, 'goblin', 'goblin-meat', 50);
  assert(
    collector.collectionLog.goblin?.['goblin-sword'] === 3,
    'unique quantities accumulate per monster'
  );
  assert(
    collector.collectionLog.goblin?.['goblin-meat'] === undefined,
    'ordinary drops stay out of collection log'
  );
  const loadedCollection = deserializeSave(serializeSave(collector));
  assert(
    loadedCollection.collectionLog.goblin?.['goblin-sword'] === 3,
    'collection log persists'
  );
  const { collectionLog: _oldCollection, ...versionTwoPlayer } = collector;
  const migratedVersionTwo = deserializeSave(
    JSON.stringify({ version: 2, player: versionTwoPlayer })
  );
  assert(
    Object.keys(migratedVersionTwo.collectionLog).length === 0,
    'version two saves gain an empty collection log'
  );
  for (const [monsterId, uniqueIds] of Object.entries(MONSTER_UNIQUES)) {
    const monster = getMonster(monsterId);
    for (const itemId of uniqueIds) {
      assert(
        monster.drops.some((drop) => drop.itemId === itemId),
        `${monster.name} collection unique ${itemId} exists in its drop table`
      );
    }
  }
  results.push('Collection uniques accumulate and persist per monster');

  const lumbridgeShop = getShopForArea('lumbridge');
  assert(lumbridgeShop !== null, 'Lumbridge has a general store');
  const starterArmourSlots = new Set(
    lumbridgeShop!.stock
      .map((itemId) => getItem(itemId))
      .filter((item) => item.category === 'armor')
      .map((item) => item.slot)
  );
  for (const slot of [
    'helm',
    'cape',
    'neck',
    'ammo',
    'body',
    'shield',
    'legs',
    'hands',
    'feet',
    'ring',
  ] as const) {
    assert(starterArmourSlots.has(slot), `general store stocks ${slot} armour`);
  }
  results.push('General Store stocks starter gear for every armour slot');

  for (const shop of SHOPS) {
    assert(
      AREAS.some((area) => area.id === shop.areaId),
      `${shop.name} sits in a real area`
    );
    assert(shop.stock.length > 0, `${shop.name} stocks something`);
    assert(
      new Set(shop.stock).size === shop.stock.length,
      `${shop.name} lists no item twice`
    );
    for (const itemId of shop.stock) getItem(itemId);
    assert(shop.greeting.length > 0 && shop.keeperName.length > 0, `${shop.name} has a keeper`);
  }
  assert(
    new Set(SHOPS.map((shop) => shop.areaId)).size === SHOPS.length,
    'each area has at most one shop'
  );
  assert(
    SHOPS.every((shop) => SHOPS.some((other) => other !== shop && !shop.stock.every((id) => other.stock.includes(id)))),
    'no shop stocks exactly what another does'
  );
  for (const areaId of ['dagannoth-cave', 'elvargs-lair', 'god-wars-dungeon']) {
    assert(getShopForArea(areaId) === null, `${areaId} has no trader`);
  }
  results.push('Every settled region has its own keeper and stock; frontiers have none');

  const ladder = MONSTERS.map((monster) => getMonsterCombatLevel(monster)).sort((a, b) => a - b);
  const widestGap = ladder.reduce(
    (widest, level, index) => (index === 0 ? widest : Math.max(widest, level - ladder[index - 1]!)),
    0
  );
  assert(widestGap <= 120, `no combat-level gap wider than 120 (widest is ${widestGap})`);
  for (const area of AREAS) {
    if (area.monsterIds.length < 2) continue;
    const levels = area.monsterIds.map((id) => getMonsterCombatLevel(id)).sort((a, b) => a - b);
    assert(
      levels[levels.length - 1]! > levels[0]!,
      `${area.name} offers more than one difficulty step`
    );
  }
  results.push('Creature levels climb without an unbridged jump');

  const allSlotItems = [
    'bone-crown',
    'fire-cape',
    'bone-amulet',
    'bone-arrows',
    'possessed-femur',
    'bone-plate',
    'bone-shield',
    'bone-greaves',
    'bone-gauntlets',
    'bone-boots',
    'berserker-ring',
  ];
  let geared = createNewPlayer('Armour Test', 'lumbridge');
  geared = { ...geared, level: 99, baseAtk: 99, baseStr: 99, baseDef: 99 };
  for (const itemId of allSlotItems) {
    geared = {
      ...geared,
      inventory: addToInventory(geared.inventory, itemId, 1),
    };
    geared = equipItem(geared, itemId);
  }
  assert(Object.keys(geared.equipment).length === 11, 'all eleven equipment slots work');
  const gearedProfile = getCombatProfile(geared);
  const barehandedProfile = getCombatProfile({ ...geared, equipment: {} });
  assert(
    gearedProfile.attackRoll > barehandedProfile.attackRoll,
    'equipment raises the attack roll'
  );
  assert(gearedProfile.maxHit > barehandedProfile.maxHit, 'equipment raises the max hit');
  assert(
    gearedProfile.defenceRoll > barehandedProfile.defenceRoll,
    'equipment raises the defence roll'
  );
  assert(
    getEffectiveStats(geared).atk === geared.baseAtk,
    'displayed Attack stays the level itself'
  );
  const loadedGear = deserializeSave(serializeSave(geared));
  assert(loadedGear.equipment.body === 'bone-plate', 'full equipment persists');

  // Worn gear lives in exactly one place: the equipment slot, not the pack.
  let mover = createNewPlayer('Equip Move', 'lumbridge');
  mover = { ...mover, level: 99 };
  mover = { ...mover, inventory: addToInventory(mover.inventory, 'steel-sword', 1) };
  mover = equipItem(mover, 'steel-sword');
  assert(
    getInventoryCount(mover.inventory, 'steel-sword') === 0,
    'equipping takes the item out of the pack'
  );
  assert(mover.equipment.weapon === 'steel-sword', 'equipping fills the slot');
  mover = { ...mover, inventory: addToInventory(mover.inventory, 'rune-sword', 1) };
  mover = equipItem(mover, 'rune-sword');
  assert(
    mover.equipment.weapon === 'rune-sword' &&
      getInventoryCount(mover.inventory, 'steel-sword') === 1 &&
      getInventoryCount(mover.inventory, 'rune-sword') === 0,
    'swapping a slot hands the displaced item back'
  );
  mover = unequipItem(mover, 'weapon');
  assert(
    mover.equipment.weapon === undefined &&
      getInventoryCount(mover.inventory, 'rune-sword') === 1,
    'unequipping returns the item to the pack'
  );

  let stuffed = createNewPlayer('Full Pack', 'lumbridge');
  stuffed = { ...stuffed, level: 99, inventory: addToInventory(stuffed.inventory, 'excalibur', 1) };
  stuffed = equipItem(stuffed, 'excalibur');
  const distinctFillers = ITEMS.filter((item) => item.id !== 'excalibur').slice(0, INVENTORY_SIZE);
  assert(distinctFillers.length === INVENTORY_SIZE, 'enough distinct items to fill a pack');
  for (const filler of distinctFillers) {
    stuffed = { ...stuffed, inventory: addToInventory(stuffed.inventory, filler.id, 1) };
  }
  assert(stuffed.inventory.length === INVENTORY_SIZE, 'pack is full');
  let refused = false;
  try {
    unequipItem(stuffed, 'weapon');
  } catch {
    refused = true;
  }
  assert(refused, 'gear cannot come off into a full pack');
  assert(stuffed.equipment.weapon === 'excalibur', 'the refused item stays equipped');

  const duplicated = createNewPlayer('Duplicate Gear', 'lumbridge');
  const migratedGear = deserializeSave(
    JSON.stringify({
      version: 5,
      player: {
        ...duplicated,
        inventory: [{ itemId: 'steel-sword', quantity: 2 }],
        equipment: { weapon: 'steel-sword' },
      },
    })
  );
  assert(
    getInventoryCount(migratedGear.inventory, 'steel-sword') === 1 &&
      migratedGear.equipment.weapon === 'steel-sword',
    'version five saves drop the duplicated worn copy'
  );
  results.push('Worn gear leaves the pack and needs a free slot to come off');

  for (const quest of QUESTS) {
    assert(
      AREAS.some((area) => area.id === quest.areaId),
      `${quest.name} belongs to a real area`
    );
    const monster = getMonster(quest.objective.monsterId);
    assert(
      AREAS.some(
        (area) => area.id === quest.areaId && area.monsterIds.includes(quest.objective.monsterId)
      ),
      `${quest.name} targets a creature that lives in ${quest.areaId}`
    );
    assert(quest.objective.count > 0, `${quest.name} asks for at least one kill`);
    assert(quest.reward.xp > 0 && quest.reward.gp > 0, `${quest.name} pays xp and coins`);
    if (quest.reward.itemId) {
      const reward = getItem(quest.reward.itemId);
      // A contract should never hand out something far beyond its target.
      assert(
        reward.value <= Math.max(2000, getMonsterCombatLevel(monster) * 1200),
        `${quest.name} reward ${reward.name} is proportionate to a level ${getMonsterCombatLevel(monster)} target`
      );
    }
    assert(getQuestsForMonster(quest.objective.monsterId).includes(quest), 'quest is indexed by its target');
  }
  assert(new Set(QUESTS.map((q) => q.id)).size === QUESTS.length, 'quest ids are unique');

  for (const quest of QUESTS) {
    if (!quest.requires) continue;
    const gate = QUESTS.find((other) => other.id === quest.requires);
    assert(gate !== undefined, `${quest.name} requires a real contract`);
    assert(
      gate!.areaId === quest.areaId,
      `${quest.name} follows a contract in its own region`
    );
    // A chain must escalate: the next step may not point at an easier creature.
    assert(
      getMonsterCombatLevel(quest.objective.monsterId) >=
        getMonsterCombatLevel(gate!.objective.monsterId),
      `${quest.name} targets something at least as tough as ${gate!.name}`
    );
    // Walking the chain must terminate, so no contract may depend on itself.
    const seen = new Set<string>([quest.id]);
    let cursor: string | undefined = quest.requires;
    while (cursor) {
      assert(!seen.has(cursor), `${quest.name} chain has no cycle`);
      seen.add(cursor);
      cursor = QUESTS.find((other) => other.id === cursor)?.requires;
    }
  }
  for (const area of AREAS) {
    const chain = QUESTS.filter((quest) => quest.areaId === area.id);
    if (chain.length === 0) continue;
    assert(
      chain.filter((quest) => !quest.requires).length === 1,
      `${area.name} has exactly one contract available on arrival`
    );
  }
  results.push('Contract chains escalate within their region and open one step at a time');
  for (const set of ARMOUR_SETS) {
    assert(set.pieces.length >= 3, `${set.name} needs at least three pieces`);
    assert(
      new Set(set.pieces).size === set.pieces.length,
      `${set.name} lists no piece twice`
    );
    const slots = set.pieces.map((piece) => getEquipmentSlot(getItem(piece)));
    assert(
      slots.every((slot) => slot !== null),
      `${set.name} is made of wearable pieces`
    );
    assert(
      new Set(slots).size === slots.length,
      `${set.name} uses each equipment slot once`
    );
  }
  // A piece may only belong to one set, or bonuses would double up.
  const owners = new Map<string, string>();
  for (const set of ARMOUR_SETS) {
    for (const piece of set.pieces) {
      assert(!owners.has(piece), `${piece} belongs to a single set`);
      owners.set(piece, set.id);
    }
  }

  let dressed = createNewPlayer('Set Test', 'lumbridge');
  dressed = { ...dressed, level: 99, baseAtk: 99, baseStr: 99, baseDef: 99 };
  const dharokSet = ARMOUR_SETS.find((set) => set.id === 'dharok')!;
  for (const piece of dharokSet.pieces) {
    dressed = { ...dressed, inventory: addToInventory(dressed.inventory, piece, 1) };
    dressed = equipItem(dressed, piece);
  }
  assert(getPlayerSets(dressed).some((set) => set.id === 'dharok'), 'a full set is detected');
  assert(hasSetEffect(dressed, 'dharok'), 'set effects resolve by id');
  const healthy = { ...dressed, hp: dressed.maxHp };
  const wounded = { ...dressed, hp: 1 };
  assert(
    getCombatProfile(wounded).maxHit > getCombatProfile(healthy).maxHit,
    "Dharok's max hit climbs as health falls"
  );
  const partial = unequipItem(dressed, 'weapon');
  assert(getPlayerSets(partial).length === 0, 'breaking a set removes its bonus');
  assert(
    getCombatProfile(partial).maxHit < getCombatProfile(healthy).maxHit,
    'the set bonus is what was lost'
  );

  let toragged = createNewPlayer('Torag Test', 'lumbridge');
  toragged = { ...toragged, level: 99, baseAtk: 99, baseStr: 99, baseDef: 99 };
  for (const piece of ARMOUR_SETS.find((set) => set.id === 'torag')!.pieces) {
    toragged = { ...toragged, inventory: addToInventory(toragged.inventory, piece, 1) };
    toragged = equipItem(toragged, piece);
  }
  assert(
    applyProtectionPrayer(20, toragged) < 20,
    "Torag's set blunts incoming damage"
  );
  results.push('Matched sets grant their bonus and effect, and break cleanly');

  // The defender ladder: ten cyclopes a rung, twenty-five elders for the last.
  const defenderChain = QUESTS.filter((quest) => quest.areaId === 'warriors-guild');
  assert(defenderChain.length === 8, 'eight defenders to earn');
  for (const quest of defenderChain) {
    const expected = quest.id === 'guild-dragon' ? 25 : 10;
    assert(
      quest.objective.count === expected,
      `${quest.name} asks for ${expected} kills`
    );
    assert(
      quest.reward.itemId !== undefined &&
        getEquipmentSlot(getItem(quest.reward.itemId)) === 'shield',
      `${quest.name} awards a defender`
    );
  }
  let rung = defenderChain.find((quest) => !quest.requires);
  let rungs = 0;
  while (rung) {
    rungs++;
    const next: typeof rung | undefined = defenderChain.find((q) => q.requires === rung!.id);
    if (next) {
      const previous = getItem(rung.reward.itemId!);
      const upgrade = getItem(next.reward.itemId!);
      assert(
        (upgrade.def ?? 0) > (previous.def ?? 0),
        `${upgrade.name} improves on ${previous.name}`
      );
    }
    rung = next;
  }
  assert(rungs === 8, 'the defender ladder is one unbroken chain');
  results.push('The defender ladder runs bronze to dragon, each rung stronger');

  for (const [monsterId, lines] of Object.entries(MONSTER_DIALOGUES)) {
    const monster = getMonster(monsterId);
    assert(lines.length > 0, `${monster.name} has something to say`);
    for (const line of lines) {
      assert(line.label.length > 0 && line.text.length > 0, `${monster.name} dialogue is filled in`);
    }
    assert(
      AREAS.some((area) => area.monsterIds.includes(monsterId)),
      `${monster.name} lives somewhere it can be spoken to`
    );
  }
  // Beasts stay beasts: nothing mindless should offer a conversation.
  for (const mindless of ['cow', 'giant-rat', 'giant-frog', 'tztok-jad', 'dagannoth-rex']) {
    assert(!canTalkToMonster(mindless), `${getMonster(mindless).name} cannot be talked to`);
  }
  results.push('Sentient creatures hold a conversation; beasts do not');

  // Kill experience must reward danger, not just fat health bars.
  for (const monster of MONSTERS) {
    assert(getMonsterKillXp(monster) > 0, `${monster.name} pays kill experience`);
  }
  assert(
    getMonsterKillXp('cyclops') > getMonsterKillXp('giant-rat'),
    'a cyclops is worth more than a rat'
  );
  assert(
    getMonsterKillXp('tztok-jad') > getMonsterKillXp('dharok'),
    'Jad is worth more than a Barrows brother'
  );
  // Same life, higher level: the tougher fight pays better.
  const sameLife = MONSTERS.filter((m) => m.maxHp === 255).sort(
    (a, b) => getMonsterCombatLevel(a) - getMonsterCombatLevel(b)
  );
  if (sameLife.length >= 2) {
    assert(
      getMonsterKillXp(sameLife[sameLife.length - 1]!) > getMonsterKillXp(sameLife[0]!),
      'combat level breaks the tie between equally tough hides'
    );
  }
  results.push('Kills pay experience weighted by life and combat level');

  // Gear scales the wearer instead of adding levels, so the same kit is worth
  // more in stronger hands and worth little to a novice.
  const runeKit = ['rune-sword', 'rune-platebody'];
  const scaledKit = (level: number): EffectiveStats => {
    let p = createNewPlayer('Scale', 'lumbridge');
    p = { ...p, level, baseAtk: level, baseStr: level, baseDef: level };
    for (const itemId of runeKit) {
      p = { ...p, inventory: addToInventory(p.inventory, itemId, 1) };
      p = equipItem(p, itemId);
    }
    return getEffectiveStats(p);
  };
  const barehanded = (level: number): EffectiveStats => {
    const p = createNewPlayer('Bare', 'lumbridge');
    return getEffectiveStats({ ...p, level, baseAtk: level, baseStr: level, baseDef: level });
  };
  const lowGain = scaledKit(40).maxHit - barehanded(40).maxHit;
  const highGain = scaledKit(99).maxHit - barehanded(99).maxHit;
  assert(highGain > lowGain, 'the same gear is worth more at a higher level');
  assert(
    scaledKit(40).maxHit > barehanded(40).maxHit,
    'gear is still a clear upgrade'
  );
  // A borrowed sword cannot make a novice into a veteran.
  assert(
    scaledKit(40).maxHit < barehanded(99).maxHit,
    'levels matter more than borrowed gear'
  );
  // Starter kit must matter at level 1, or early game feels dead.
  let novice = createNewPlayer('Novice', 'lumbridge');
  novice = { ...novice, inventory: addToInventory(novice.inventory, 'bronze-sword', 1) };
  novice = equipItem(novice, 'bronze-sword');
  assert(
    getCombatProfile(novice).attackRoll >
      getCombatProfile(createNewPlayer('N', 'lumbridge')).attackRoll,
    'a bronze sword beats bare hands at level 1'
  );
  assert(
    getEffectiveStats(novice).atk === 1 && getEffectiveStats(novice).str === 1,
    'a fresh adventurer shows level 1 in every combat stat'
  );

  // Hit chance behaves: better rolls land more often, and it stays in range.
  assert(hitChance(2000, 500) > hitChance(2000, 1500), 'weaker armour is easier to hit');
  assert(hitChance(500, 2000) < 0.5, 'out-classed attackers rarely land');
  for (const [atkRoll, defRoll] of [[1, 1], [10000, 1], [1, 10000], [640, 640]] as const) {
    const chance = hitChance(atkRoll, defRoll);
    assert(chance >= 0 && chance <= 1, 'hit chance stays a probability');
  }

  // Requirements: sensible tiers, enforced on equip.
  for (const item of ITEMS) {
    const slot = getEquipmentSlot(item);
    if (!slot) continue;
    const required = item.levelReq ?? 1;
    assert(required >= 1 && required <= 99, `${item.name} has a sane requirement`);
  }
  for (const [weaker, stronger] of [
    ['bronze-sword', 'steel-sword'],
    ['steel-sword', 'addy-sword'],
    ['addy-sword', 'rune-sword'],
    ['rune-sword', 'excalibur'],
    ['excalibur', 'doomhammer'],
    ['bronze-defender', 'dragon-defender'],
    ['steel-platebody', 'rune-platebody'],
    ['rune-platebody', 'bandos-chestplate'],
  ] as const) {
    assert(
      (getItem(stronger).levelReq ?? 1) > (getItem(weaker).levelReq ?? 1),
      `${getItem(stronger).name} demands more than ${getItem(weaker).name}`
    );
  }
  let weakling = createNewPlayer('Weakling', 'lumbridge');
  weakling = { ...weakling, inventory: addToInventory(weakling.inventory, 'doomhammer', 1) };
  let blocked = false;
  try {
    equipItem(weakling, 'doomhammer');
  } catch {
    blocked = true;
  }
  assert(blocked, 'a level one cannot wield endgame gear');
  assert(weakling.equipment.weapon === undefined, 'the refused weapon stays in the pack');
  const strongEnough = equipItem({ ...weakling, level: 85 }, 'doomhammer');
  assert(strongEnough.equipment.weapon === 'doomhammer', 'meeting the requirement allows it');
  // Accessories are gated by whatever dropped them, not by level: their power
  // is small beside weapons and armour, and boss capes are earned already.
  for (const item of ITEMS) {
    const slot = getEquipmentSlot(item);
    if (slot === 'neck' || slot === 'cape' || slot === 'ring' || slot === 'ammo') {
      assert(
        (item.levelReq ?? 1) === 1,
        `${item.name} is an accessory and asks nothing of the wearer`
      );
    }
  }
  for (const freeToWear of ['obsidian-cape', 'fire-cape', 'amulet-of-glory', 'amulet-of-power']) {
    assert((getItem(freeToWear).levelReq ?? 1) === 1, `${freeToWear} needs no level`);
  }

  // The stake sits between adamant and rune, as a mid-game step.
  const stake = getItem('sharpened-stake');
  const addy = getItem('addy-sword');
  const runeScim = getItem('rune-scim');
  assert(
    (stake.atk ?? 0) > (addy.atk ?? 0) && (stake.atk ?? 0) < (runeScim.atk ?? 0),
    'the stake out-strikes adamant but not rune'
  );
  assert(
    (stake.str ?? 0) > (addy.str ?? 0) && (stake.str ?? 0) < (runeScim.str ?? 0) + 1,
    'the stake sits below a rune scimitar for damage'
  );
  assert(
    getMonster('count-draynor').drops.some((drop) => drop.itemId === 'sharpened-stake'),
    'the Count gives up the stake'
  );
  assert(
    getMonster('goblin-general').drops.some((drop) => drop.itemId === 'amulet-of-glory'),
    'Grubeater carries the amulet of glory'
  );
  // Anything over a counter should be easier to get and weaker for it.
  const buyable = new Set(SHOPS.flatMap((shop) => shop.stock));
  const power = getItem('amulet-of-power');
  const glory = getItem('amulet-of-glory');
  const totalPoints = (item: typeof power): number =>
    (item.atk ?? 0) + (item.str ?? 0) + (item.def ?? 0) + (item.prayerBonus ?? 0);
  assert(buyable.has('amulet-of-power'), 'the weaker amulet is the one on sale');
  assert(!buyable.has('amulet-of-glory'), 'the stronger amulet must be earned');
  assert(
    totalPoints(glory) > totalPoints(power),
    'the dropped amulet beats the bought one'
  );
  results.push('Gear scales with the wearer and is gated by combat level');

  const fresh = createNewPlayer('Legacy Test', 'lumbridge');
  const { equipment: _equipment, ...legacyPlayer } = fresh;
  const migrated = deserializeSave(
    JSON.stringify({
      version: 1,
      player: { ...legacyPlayer, equippedWeaponId: 'bronze-sword' },
    })
  );
  assert(migrated.equipment.weapon === 'bronze-sword', 'version one weapon save migrates');
  results.push('Every equipment slot works and old saves migrate');

  assert(
    rollLoot(getMonster('tztok-jad'), () => 0.999).itemId === 'fire-cape',
    'Jad always drops a Fire Cape'
  );
  assert(
    getMonster('elvarg').drops.some((drop) => drop.itemId === 'rune-platebody'),
    'Elvarg has a rare Rune Platebody'
  );
  assert(
    ['berserker-ring', 'warrior-ring'].every((itemId) =>
      getMonster('dagannoth-rex').drops.some((drop) => drop.itemId === itemId)
    ),
    'Dagannoth Rex drops both rings'
  );
  assert(
    ['bone-plate', 'possessed-femur'].every((itemId) =>
      getMonster('bones-skeleton-king').drops.some((drop) => drop.itemId === itemId)
    ),
    'Bones drops his armour and possessed weapon'
  );
  assert(MONSTERS.every((monster) => getMonsterCombatLevel(monster) > 0), 'every creature has a combat level');
  const rankedAreas = [...AREAS].sort(
    (a, b) => getAreaAverageCombatLevel(a) - getAreaAverageCombatLevel(b)
  );
  assert(
    rankedAreas.every(
      (area, index) =>
        index === 0 ||
        getAreaAverageCombatLevel(rankedAreas[index - 1]!) <=
          getAreaAverageCombatLevel(area)
    ),
    'areas sort by average combat level'
  );
  results.push('Expansion bosses, levels and signature drops are present');

  for (const area of AREAS) {
    const spawn = area.playerSpawn;
    assert(isWalkable(area.id, spawn), `${area.name} player spawn is walkable`);
    for (const entity of area.spawns) {
      const approach = findInteractionPoint(area, spawn, entity);
      assert(approach !== null, `${area.name} ${entity.id} has a reachable interaction point`);
      assert(
        approach !== null && findWalkPath(area, spawn, approach) !== null,
        `${area.name} ${entity.id} can be reached from the entrance`
      );
    }
  }
  assert(isWalkable('lumbridge', { x: 510, y: 116 }), 'Lumbridge castle gate is a passage');
  assert(isWalkable('lumbridge', { x: 151, y: 414 }), 'Lumbridge bridge is a passage');
  assert(!isWalkable('lumbridge', { x: 500, y: 40 }), 'Lumbridge sky is blocked');
  assert(!isWalkable('lumbridge', { x: 280, y: 470 }), 'Lumbridge river is blocked');
  assert(!isWalkable('lumbridge', { x: 590, y: 260 }), 'Lumbridge buildings are blocked');
  assert(isWalkable('varrock', { x: 350, y: 400 }), 'Varrock plaza is walkable');
  assert(!isWalkable('varrock', { x: 463, y: 310 }), 'Varrock statue is blocked');
  assert(!isWalkable('varrock', { x: 610, y: 440 }), 'Varrock well is blocked');
  assert(!isWalkable('varrock', { x: 730, y: 250 }), 'Varrock buildings are blocked');
  assert(isWalkable('draynor-manor', { x: 380, y: 400 }), 'Draynor entrance road is walkable');
  assert(!isWalkable('draynor-manor', { x: 370, y: 235 }), 'Draynor courtyard tree is blocked');
  assert(!isWalkable('draynor-manor', { x: 380, y: 70 }), 'Draynor manor roof is blocked');
  assert(isWalkable('god-wars-dungeon', { x: 385, y: 210 }), 'God Wars nexus is walkable');
  assert(isWalkable('god-wars-dungeon', { x: 385, y: 400 }), 'God Wars entry bridge is walkable');
  // (220,300) is the broken Ancient court floor in the painting, so the chasm
  // check uses the gap between the north bridge and the western court.
  assert(!isWalkable('god-wars-dungeon', { x: 240, y: 120 }), 'God Wars chasm is blocked');
  assert(isWalkable('morytania-swamp', { x: 383, y: 400 }), 'Morytania causeway is walkable');
  assert(!isWalkable('morytania-swamp', { x: 50, y: 400 }), 'Morytania bog is blocked');
  assert(isWalkable('tzhaar-city', { x: 383, y: 235 }), 'TzHaar plaza is walkable');
  assert(!isWalkable('tzhaar-city', { x: 100, y: 100 }), 'TzHaar lava is blocked');
  assert(isWalkable('elvargs-lair', { x: 383, y: 244 }), 'Elvarg arena is walkable');
  assert(!isWalkable('elvargs-lair', { x: 700, y: 400 }), 'Elvarg lava cliff is blocked');
  assert(isWalkable('dagannoth-cave', { x: 383, y: 300 }), 'Dagannoth causeway is walkable');
  assert(!isWalkable('dagannoth-cave', { x: 250, y: 300 }), 'Dagannoth water is blocked');
  assert(!isWalkable('bone-king-graveyard', { x: 383, y: 235 }), 'Graveyard dead tree is blocked');
  assert(isWalkable('durotar-azeroth', { x: 383, y: 250 }), 'Durotar arena is walkable');
  assert(!isWalkable('durotar-azeroth', { x: 100, y: 350 }), 'Durotar tents are blocked');
  assert(isWalkable('the-shire', { x: 383, y: 400 }), 'Shire main lane is walkable');
  assert(!isWalkable('the-shire', { x: 150, y: 250 }), 'Shire stream is blocked');
  for (const area of AREAS) {
    // A mask that swallowed the whole painting would let players walk on air.
    let walkable = 0;
    let total = 0;
    for (let y = 2; y < area.mapHeight; y += 4) {
      for (let x = 2; x < area.mapWidth; x += 4) {
        total++;
        if (isWalkable(area.id, { x, y })) walkable++;
      }
    }
    const share = walkable / total;
    assert(share > 0.08, `${area.name} has usable ground (${(share * 100).toFixed(1)}%)`);
    assert(share < 0.62, `${area.name} is not mostly walkable (${(share * 100).toFixed(1)}%)`);

    // Everything walkable must be reachable, so no one can be dropped on an island.
    for (let y = 4; y < area.mapHeight; y += 12) {
      for (let x = 4; x < area.mapWidth; x += 12) {
        if (!isWalkable(area.id, { x, y })) continue;
        assert(
          findWalkPath(area, area.playerSpawn, { x, y }) !== null,
          `${area.name} ground at ${x},${y} is reachable from the entrance`
        );
      }
    }
  }
  results.push('Navigation follows the painted walkways and every step is reachable');

  return results;
}
