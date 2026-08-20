import {
  INVENTORY_SIZE,
  addToInventory,
  applyProtectionPrayer,
  createNewPlayer,
  deserializeSave,
  equipItem,
  getEffectiveStats,
  getInventoryCount,
  getPrayerDrainTicks,
  recordCollectionDrop,
  restorePrayer,
  serializeSave,
  unequipItem,
} from './state';
import { rollLoot, validateDropTable } from './loot';
import { AREAS, getAreaAverageCombatLevel } from '../content/areas';
import {
  getMonster,
  getMonsterCombatLevel,
  MONSTERS,
  MONSTER_UNIQUES,
} from '../content/monsters';
import { ITEMS, getItem } from '../content/items';
import { SHOPS, getShopForArea } from '../content/shops';
import { findInteractionPoint, findWalkPath, isWalkable } from '../content/navigation';
import { applyXp } from './xp';

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
  const boostedPrayerStats = getEffectiveStats({ ...prayerPlayer, activePrayer: 'battle' });
  assert(
    boostedPrayerStats.atk > unboostedPrayerStats.atk &&
      boostedPrayerStats.str > unboostedPrayerStats.str &&
      boostedPrayerStats.def > unboostedPrayerStats.def,
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
  for (const itemId of allSlotItems) {
    geared = {
      ...geared,
      inventory: addToInventory(geared.inventory, itemId, 1),
    };
    geared = equipItem(geared, itemId);
  }
  assert(Object.keys(geared.equipment).length === 11, 'all eleven equipment slots work');
  const gearedStats = getEffectiveStats(geared);
  assert(gearedStats.atk > geared.baseAtk, 'equipment grants attack');
  assert(gearedStats.str > geared.baseStr, 'equipment grants strength');
  assert(gearedStats.def > geared.baseDef, 'equipment grants defence');
  const loadedGear = deserializeSave(serializeSave(geared));
  assert(loadedGear.equipment.body === 'bone-plate', 'full equipment persists');

  // Worn gear lives in exactly one place: the equipment slot, not the pack.
  let mover = createNewPlayer('Equip Move', 'lumbridge');
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
  stuffed = { ...stuffed, inventory: addToInventory(stuffed.inventory, 'excalibur', 1) };
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
  assert(!isWalkable('god-wars-dungeon', { x: 220, y: 300 }), 'God Wars chasm is blocked');
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
  results.push('Navigation stays on traced paths and avoids scenery');

  return results;
}
