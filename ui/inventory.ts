import { getItem } from '../content/items';
import type { Game } from '../engine/game';
import { getEquipmentSlot, getHealAmount } from '../engine/state';
import type { InventorySlot } from '../engine/types';
import { createItemIconCanvas } from './sprites';


const SLOT_COUNT = 28;

export class InventoryPanel {
  private gridEl: HTMLElement;
  private countEl: HTMLElement;
  private tipEl: HTMLElement | null = null;
  private onContext: ((itemId: string, x: number, y: number) => void) | null = null;

  constructor(container: HTMLElement, private game: Game) {
    container.innerHTML = `
      <div class="inv-head">
        <span class="mlabel">Backpack</span>
        <span class="inv-count" id="inv-count">0 / ${SLOT_COUNT}</span>
      </div>
      <div class="inventory-grid" id="inv-grid"></div>
      <div class="inv-hint">Left-click an item to use it &mdash; eat, drink or wear. Right-click for every option.</div>
    `;
    this.gridEl = container.querySelector('#inv-grid') as HTMLElement;
    this.countEl = container.querySelector('#inv-count') as HTMLElement;
  }

  setContextHandler(handler: (itemId: string, x: number, y: number) => void): void {
    this.onContext = handler;
  }

  update(inventory: InventorySlot[]): void {
    this.hideTip();
    this.gridEl.innerHTML = '';
    this.countEl.textContent = `${inventory.length} / ${SLOT_COUNT}`;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      const entry = inventory[i];

      if (entry) {
        const item = getItem(entry.itemId);
        slot.classList.add('filled');
        slot.dataset.itemId = entry.itemId;
        slot.appendChild(createItemIconCanvas(entry.itemId, item.category, 30));

        if (entry.quantity > 1) {
          const qty = document.createElement('span');
          qty.className = 'qty';
          qty.textContent = entry.quantity > 9999 ? `${Math.floor(entry.quantity / 1000)}k` : String(entry.quantity);
          slot.appendChild(qty);
        }

        slot.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.hideTip();
          this.onContext?.(entry.itemId, e.clientX, e.clientY);
        });

        // Left click runs the item's default action, as the tooltip advertises.
        slot.addEventListener('click', () => {
          this.hideTip();
          this.runDefaultAction(entry.itemId);
        });

        slot.addEventListener('mouseenter', (e) => this.showTip(e, entry.itemId, entry.quantity));
        slot.addEventListener('mouseleave', () => this.hideTip());
      }

      this.gridEl.appendChild(slot);
    }
  }

  /**
   * The one obvious thing to do with an item: eat it, drink it, or put it on.
   * Anything else has no default and only answers to the right-click menu.
   */
  private runDefaultAction(itemId: string): void {
    const item = getItem(itemId);
    if (item.category === 'food' || item.category === 'potion') {
      this.game.consumeItem(itemId);
      return;
    }
    if (getEquipmentSlot(item)) {
      this.game.equip(itemId);
      return;
    }
    this.game.examineItem(itemId);
  }

  /** Verb shown on the tooltip so the click is never a guess. */
  private defaultActionLabel(itemId: string): string | null {
    const item = getItem(itemId);
    if (item.category === 'food') return 'Eat';
    if (item.category === 'potion') return 'Drink';
    const slot = getEquipmentSlot(item);
    if (slot) return slot === 'weapon' ? 'Wield' : 'Wear';
    return null;
  }

  private showTip(e: MouseEvent, itemId: string, quantity: number): void {
    this.hideTip();
    const item = getItem(itemId);

    const rows: string[] = [];
    if (getEquipmentSlot(item)) {
      const required = item.levelReq ?? 1;
      if (required > 1) {
        const met = this.game.player.level >= required;
        rows.push(
          `<div class="trow${met ? '' : ' treq'}">Requires combat level <span class="tstat">${required}</span>${
            met ? '' : ' &mdash; too strong for you yet'
          }</div>`
        );
      }
      rows.push(
        `<div class="trow">Attack <span class="tstat">+${item.atk ?? 0}</span> &middot; Strength <span class="tstat">+${item.str ?? 0}</span> &middot; Defence <span class="tstat">+${item.def ?? 0}</span> &middot; Prayer <span class="tstat">+${item.prayerBonus ?? 0}</span></div>`
      );
      rows.push(
        '<div class="trow thint">Bonuses raise accuracy and max hit, scaled by your own levels</div>'
      );
      if (item.attackSpeed) rows.push(`<div class="trow">Speed <span class="tstat">${item.attackSpeed}</span></div>`);
    }
    if (item.category === 'food') {
      const maxHp = this.game.player.maxHp;
      const total = getHealAmount(item, maxHp);
      rows.push(
        `<div class="trow">Heals <span class="tstat">${total}</span> life${
          item.healPercent
            ? ` &mdash; ${item.heal} plus ${item.healPercent}% of your ${maxHp}`
            : ''
        }</div>`
      );
    }
    if (item.category === 'potion') {
      rows.push(
        `<div class="trow">Restores <span class="tstat">${item.prayerRestore ?? 0}</span> Prayer</div>`
      );
    }
    rows.push(
      `<div class="trow">Worth <span class="tval">${item.value.toLocaleString()}</span> gp each</div>`
    );
    if (quantity > 1) rows.push(`<div class="trow">Carrying ${quantity.toLocaleString()}</div>`);
    const verb = this.defaultActionLabel(itemId);
    rows.push(
      `<div class="trow thint">${
        verb ? `Left click to <b>${verb}</b>` : 'No default action'
      } &middot; right click for more</div>`
    );

    const tip = document.createElement('div');
    tip.className = 'item-tip';
    tip.innerHTML = `<div class="tname">${item.name}</div>${rows.join('')}`;
    document.body.appendChild(tip);
    this.tipEl = tip;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const left = Math.max(6, rect.left - tipRect.width - 8);
    const top = Math.min(window.innerHeight - tipRect.height - 6, rect.top);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  private hideTip(): void {
    this.tipEl?.remove();
    this.tipEl = null;
  }
}
