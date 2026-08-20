import type { NpcDef } from '../engine/types';

export const NPCS: NpcDef[] = [
  {
    id: 'hans',
    name: 'Hans',
    dialogues: [
      { label: 'Weather', text: "It sure is nice out, isn't it?" },
      { label: 'Threaten', text: "EEEEK! Don't hurt me!" },
    ],
  },
  {
    id: 'chef',
    name: 'Chef',
    dialogues: [
      { label: 'How to cook', text: "I'd teach you how to cook but it hasn't been added yet." },
    ],
  },
  {
    id: 'king-roald',
    name: 'King Roald',
    dialogues: [
      { label: 'Greet', text: 'Welcome to Varrock, adventurer! I am King Roald.' },
    ],
  },
  {
    id: 'sir-tiffy-cashien',
    name: 'Sir Tiffy Cashien',
    dialogues: [
      {
        label: 'Falador',
        text: 'White walls do not make a city virtuous. Good people standing watch do.',
      },
      {
        label: 'Sir Kitbreaker',
        text: 'Kitbreaker tests every challenger at the eastern court. He is considerably less polite than I am.',
      },
      {
        label: 'The dwarves',
        text: 'The miners keep the city supplied with ore. Mind their tempers—and their pickaxes.',
      },
    ],
  },
  {
    id: 'ava',
    name: 'Ava',
    dialogues: [
      {
        label: "Ava's assembler",
        text: "This is my latest assembler: reinforced frame, better attraction field, fewer arrows lodged in the wearer's hat.",
      },
      {
        label: 'The manor',
        text: 'The manor is excellent for experiments. Nobody complains about the noise, although the Count occasionally complains about the sunlight.',
      },
      {
        label: 'Your workshop',
        text: 'I turn improbable machinery into reliable equipment. Please do not touch anything that hums.',
      },
    ],
  },
  {
    id: 'zaros',
    name: 'Zaros',
    combatLevel: 1000,
    dialogues: [
      {
        label: 'The ancient court',
        text: 'This citadel remembers an empire the surface chose to forget.',
      },
      {
        label: 'The war below',
        text: 'Four generals mistake occupation for dominion. Time will correct them.',
      },
      {
        label: 'Your power',
        text: 'Power is not announced, adventurer. It is noticed after resistance has become irrelevant.',
      },
    ],
  },
  {
    id: 'fallen-soldier',
    name: 'Fallen Soldier',
    dialogues: [
      {
        label: 'Check on him',
        text: 'The man is in too much pain to say anything.',
      },
    ],
  },
  {
    id: 'bilbo',
    name: 'Bilbo',
    dialogues: [
      {
        label: "What's up?",
        text: 'A quiet morning, a full pantry, and no unexpected visitors. Nearly perfect.',
      },
      {
        label: 'Adventures',
        text: 'Adventures are uncomfortable while happening and excellent once written down.',
      },
    ],
  },
  {
    id: 'gandalf',
    name: 'Gandalf',
    combatLevel: 500,
    dialogues: [
      {
        label: 'Your aura',
        text: 'Power is best carried lightly. Those who display all of it rarely understand it.',
      },
      {
        label: 'Advice',
        text: 'Choose the road that leaves you kinder, not merely stronger.',
      },
    ],
  },
  {
    id: 'frodo',
    name: 'Frodo',
    dialogues: [
      {
        label: 'The road',
        text: 'I used to think the road ended at the edge of the Shire. Now I know every road changes whoever walks it.',
      },
      {
        label: 'Home',
        text: 'After enough danger, a garden and a warm fire become treasures beyond price.',
      },
    ],
  },
  {
    id: 'samwise',
    name: 'Samwise',
    dialogues: [
      {
        label: 'Gardening',
        text: 'Good soil needs patience, steady work, and fewer people trampling through it.',
      },
      {
        label: 'Courage',
        text: "You don't need to feel fearless. You only need a reason worth taking the next step for.",
      },
    ],
  },
];

export const npcMap = new Map(NPCS.map((n) => [n.id, n]));

export function getNpc(id: string): NpcDef {
  const npc = npcMap.get(id);
  if (!npc) throw new Error(`Unknown NPC: ${id}`);
  return npc;
}
