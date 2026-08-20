import { getItem } from '../content/items';
import type { EquipmentLoadout, EquipmentSlot } from '../engine/types';
import { createItemIconCanvas } from './sprites';

const SLOTS: { key: EquipmentSlot; abbr: string; title: string }[] = [
  { key: 'helm', abbr: 'Head', title: 'Head' },
  { key: 'cape', abbr: 'Back', title: 'Back' },
  { key: 'neck', abbr: 'Neck', title: 'Neck' },
  { key: 'ammo', abbr: 'Ammo', title: 'Ammunition' },
  { key: 'weapon', abbr: 'Weap', title: 'Weapon' },
  { key: 'body', abbr: 'Body', title: 'Torso' },
  { key: 'shield', abbr: 'Off', title: 'Off-hand' },
  { key: 'legs', abbr: 'Legs', title: 'Legs' },
  { key: 'hands', abbr: 'Hand', title: 'Hands' },
  { key: 'feet', abbr: 'Feet', title: 'Feet' },
  { key: 'ring', abbr: 'Ring', title: 'Ring' },
];

export class EquipmentPanel {
  private dollEl: HTMLElement;
  private summaryEl: HTMLElement;
  private unequipBtn: HTMLButtonElement;

  constructor(container: HTMLElement) {
    container.innerHTML = `
      <div class="sect mlabel">Worn Equipment</div>
      <div class="doll" id="doll">
        ${SLOTS.map(
          (s) =>
            `<div class="doll-slot" data-slot="${s.key}" title="${s.title}"><span class="sk">${s.abbr}</span></div>`
        ).join('')}
      </div>
      <div class="sect mlabel">Combat Bonuses</div>
      <div class="equip-summary" id="equip-summary"></div>
      <button type="button" class="btn btn-sm" id="btn-unequip" style="width:100%">Remove All</button>
    `;
    this.dollEl = container.querySelector('#doll') as HTMLElement;
    this.summaryEl = container.querySelector('#equip-summary') as HTMLElement;
    this.unequipBtn = container.querySelector('#btn-unequip') as HTMLButtonElement;
  }

  onUnequip(cb: (slot?: EquipmentSlot) => void): void {
    this.unequipBtn.addEventListener('click', () => cb());
    this.dollEl.addEventListener('click', (event) => {
      const socket = (event.target as HTMLElement).closest<HTMLElement>('.doll-slot.active');
      const slot = socket?.dataset.slot as EquipmentSlot | undefined;
      if (slot) cb(slot);
    });
  }

  update(equipment: EquipmentLoadout): void {
    let atk = 0;
    let str = 0;
    let def = 0;
    let prayer = 0;
    let speed: number | null = null;
    let equippedCount = 0;

    for (const slot of SLOTS) {
      const socket = this.dollEl.querySelector<HTMLElement>(`[data-slot="${slot.key}"]`);
      if (!socket) continue;
      const itemId = equipment[slot.key];
      if (itemId) {
        const item = getItem(itemId);
        equippedCount++;
        atk += item.atk ?? 0;
        str += item.str ?? 0;
        def += item.def ?? 0;
        prayer += item.prayerBonus ?? 0;
        if (slot.key === 'weapon') speed = item.attackSpeed ?? 4;
        socket.classList.add('active');
        socket.title = item.name;
        socket.innerHTML = '';
        socket.appendChild(createItemIconCanvas(itemId, item.category, 30));
      } else if (socket) {
        socket.classList.remove('active');
        socket.title = slot.title;
        socket.innerHTML = `<span class="sk">${slot.abbr}</span>`;
      }
    }

    if (equippedCount > 0) {
      this.summaryEl.innerHTML = `
        <div class="eqname">${equippedCount} / ${SLOTS.length} slots worn</div>
        <div class="bonus-row"><span class="k">Attack</span><span class="v${atk > 0 ? ' pos' : ''}">+${atk}</span></div>
        <div class="bonus-row"><span class="k">Strength</span><span class="v${str > 0 ? ' pos' : ''}">+${str}</span></div>
        <div class="bonus-row"><span class="k">Defence</span><span class="v${def > 0 ? ' pos' : ''}">+${def}</span></div>
        <div class="bonus-row"><span class="k">Prayer</span><span class="v${prayer > 0 ? ' pos' : ''}">+${prayer}</span></div>
        ${speed === null ? '' : `<div class="bonus-row"><span class="k">Weapon speed</span><span class="v">${speed}</span></div>`}
      `;
    } else {
      this.summaryEl.innerHTML = `
        <div class="eqnone">Nothing worn. Equip items from your pack.</div>
        <div class="bonus-row"><span class="k">Attack</span><span class="v">+0</span></div>
        <div class="bonus-row"><span class="k">Strength</span><span class="v">+0</span></div>
        <div class="bonus-row"><span class="k">Defence</span><span class="v">+0</span></div>
        <div class="bonus-row"><span class="k">Prayer</span><span class="v">+0</span></div>
      `;
    }
    this.unequipBtn.disabled = equippedCount === 0;
  }
}
