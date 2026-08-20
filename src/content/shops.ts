import type { ShopDef } from '../engine/types';

/**
 * One shop per settled region. Frontier areas — Elvarg's lair, the Dagannoth
 * cave, the God Wars nexus — deliberately have none: nobody trades where the
 * only residents are trying to eat you.
 *
 * Stock is listed explicitly so each keeper carries a recognisable regional
 * selection rather than one shared catalogue.
 */
export const SHOPS: ShopDef[] = [
  {
    areaId: 'lumbridge',
    name: 'Lumbridge General Store',
    keeperName: 'Shopkeeper Wilkin',
    keeper: 'general',
    greeting: 'Welcome to my store! What would you like to buy?',
    sellLine: 'Anything you no longer need? I pay half its worth.',
    thanks: 'A fine choice. Mind the goblins on the west path.',
    stock: [
      'bronze-sword',
      'steel-sword',
      'steel-full-helm',
      'steel-platebody',
      'steel-platelegs',
      'steel-kiteshield',
      'steel-arrows',
      'adventurer-cape',
      'bronze-amulet',
      'leather-gloves',
      'leather-boots',
      'copper-ring',
      'shrimp',
      'trout',
    ],
  },
  {
    areaId: 'varrock',
    name: 'Varrock Swordshop',
    keeperName: 'Blademistress Thessa',
    keeper: 'blacksmith',
    greeting: 'Welcome to the Swordshop. What would you like to buy?',
    sellLine: 'Bring me steel and I will weigh it fairly. Half its worth.',
    thanks: 'Keep the edge oiled and it will keep you breathing.',
    stock: [
      'steel-sword',
      'addy-sword',
      'rune-sword',
      'rune-scim',
      'steel-knuckles',
      'addy-knuckles',
      'steel-kiteshield',
      'varrock-rations',
      'shark',
    ],
  },
  {
    areaId: 'falador',
    name: 'Falador Armoury',
    keeperName: 'Doric Ironhand',
    keeper: 'dwarf',
    greeting: 'Aye, welcome in! What would you like to buy?',
    sellLine: 'Scrap plate? I will take it off you for half its worth.',
    thanks: 'Good plate, well fitted. The knights would approve.',
    stock: [
      'steel-full-helm',
      'steel-platebody',
      'steel-platelegs',
      'steel-kiteshield',
      'knight-tabard',
      'leather-gloves',
      'leather-boots',
      'prayer-potion',
      'shark',
    ],
  },
  {
    areaId: 'draynor-manor',
    name: "Ava's Workshop",
    keeperName: 'Ava',
    keeper: 'inventor',
    greeting: 'Mind the humming crate. What would you like to buy?',
    sellLine: 'Spare parts are always welcome. Half their worth in coin.',
    thanks: 'It will hold. Probably. Do not test it near the Count.',
    stock: [
      'avas-assembler',
      'steel-arrows',
      'bone-arrows',
      'adventurer-cape',
      'bronze-amulet',
      'prayer-potion',
    ],
  },
  {
    areaId: 'the-shire',
    name: 'Bagshot Grocer',
    keeperName: 'Rosie Bagshot',
    keeper: 'hobbit',
    greeting: 'Second breakfast is on. What would you like to buy?',
    sellLine: 'If it keeps in a pantry, I will buy it at half its worth.',
    thanks: 'Eat it while it is warm, dear.',
    stock: ['shire-pie', 'shrimp', 'trout', 'shark', 'manta', 'varrock-rations', 'leather-boots'],
  },
  {
    areaId: 'morytania-swamp',
    name: 'Bogwater Barter',
    keeperName: 'Malkath the Pale',
    keeper: 'vampyre',
    greeting: 'You still have colour in you. What would you like to buy?',
    sellLine: 'I trade in leavings. Half their worth, no questions asked.',
    thanks: 'Wear it. The bog is less forgiving than I am.',
    stock: ['swamp-cloak', 'swamp-snelm', 'swamp-ration', 'bone-arrows', 'prayer-potion'],
  },
  {
    areaId: 'tzhaar-city',
    name: "TzHaar-Hur-Lek's Ore Store",
    keeperName: 'TzHaar-Hur-Lek',
    keeper: 'tzhaar',
    greeting: 'JalYt-Ket, you stand in my forge. What would you like to buy?',
    sellLine: 'Obsidian for coin. I give half worth, no haggling.',
    thanks: 'It is cut from the mountain. It will not fail you.',
    stock: ['obsidian-cape', 'tzhaar-gauntlets', 'lava-eel', 'manta', 'prayer-potion'],
  },
  {
    areaId: 'bone-king-graveyard',
    name: 'Ossuary Exchange',
    keeperName: 'Marrowmonger',
    keeper: 'skeleton',
    greeting: 'A customer with skin. What would you like to buy?',
    sellLine: 'I buy anything you can carry. Half its worth in old coin.',
    thanks: 'Wear it well. Everything here was worn by someone once.',
    stock: ['ossuary-charm', 'bone-arrows', 'bone-broth', 'prayer-potion', 'adventurer-cape'],
  },
  {
    areaId: 'durotar-azeroth',
    name: 'Kor’kron Quartermaster',
    keeperName: 'Quartermaster Gorzek',
    keeper: 'orc',
    greeting: 'Lok-tar, outsider. What would you like to buy?',
    sellLine: 'Loot from the ring? The Horde pays half its worth.',
    thanks: 'Swing it like you mean it. Victory or death.',
    stock: ['orcish-cleaver', 'war-god-ration', 'manta', 'prayer-potion', 'steel-arrows'],
  },
];

export const shopMap = new Map(SHOPS.map((shop) => [shop.areaId, shop]));

export function getShopForArea(areaId: string): ShopDef | null {
  return shopMap.get(areaId) ?? null;
}
