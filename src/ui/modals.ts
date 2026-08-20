import { getItem } from '../content/items';
import { getAreaAverageCombatLevel } from '../content/areas';
import {
  getMonster,
  getMonsterCombatLevel,
  getMonsterUniqueDrops,
} from '../content/monsters';
import type { Game } from '../engine/game';
import { getEquipmentSlot } from '../engine/state';
import { createItemIconCanvas, createShopkeeperPortraitCanvas } from './sprites';

export function showContextMenu(
  itemId: string,
  x: number,
  y: number,
  game: Game,
  onClose: () => void
): void {
  const item = getItem(itemId);
  const menu = document.createElement('div');
  menu.className = 'context-menu';

  const head = document.createElement('div');
  head.className = 'cm-head';
  head.textContent = item.name;
  menu.appendChild(head);

  const actions: { label: string; action: () => void; danger?: boolean }[] = [];
  if (item.category === 'food') {
    actions.push({ label: `Eat ${item.name}`, action: () => game.consumeItem(itemId) });
  } else if (item.category === 'potion') {
    actions.push({ label: `Drink ${item.name}`, action: () => game.consumeItem(itemId) });
  }
  // Worn gear lives in the equipment panel, never in the pack, so an item
  // reachable from here can only ever be put on.
  const equipmentSlot = getEquipmentSlot(item);
  if (equipmentSlot) {
    actions.push({
      label: equipmentSlot === 'weapon' ? 'Wield' : 'Wear',
      action: () => game.equip(itemId),
    });
  }
  actions.push({ label: 'Drop', action: () => game.dropItem(itemId, 1), danger: true });

  for (const { label, action, danger } of actions) {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (danger) btn.classList.add('danger');
    btn.addEventListener('click', () => {
      action();
      menu.remove();
      onClose();
    });
    menu.appendChild(btn);
  }

  document.body.appendChild(menu);

  // Keep the menu on screen near the cursor.
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(x, window.innerWidth - rect.width - 6)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - rect.height - 6)}px`;

  const close = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      menu.remove();
      document.removeEventListener('click', close);
      onClose();
    }
  };
  setTimeout(() => document.addEventListener('click', close), 0);
}

/** Shared modal chrome. Returns the body element for callers to fill. */
function openModal(
  title: string,
  headExtra: string,
  onClose: () => void
): { overlay: HTMLElement; body: HTMLElement; close: () => void } {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h2>${title}</h2>
        <span id="modal-head-extra">${headExtra}</span>
      </div>
      <div class="modal-body" id="modal-body"></div>
      <div class="modal-foot">
        <button type="button" class="btn" id="modal-close">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  overlay.querySelector('#modal-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', onKey);

  return { overlay, body: overlay.querySelector('#modal-body') as HTMLElement, close };
}

export function showShopModal(game: Game, onClose: () => void): void {
  const shop = game.getShop();
  if (!shop) {
    // Frontier areas have no trader; the button is normally disabled anyway.
    const { body } = openModal('No Trader Here', '', onClose);
    body.innerHTML =
      '<div class="modal-empty">Nothing in this region trades with the living. Travel to a settlement to buy and sell.</div>';
    return;
  }

  const { overlay, body } = openModal(shop.name, '', onClose);
  overlay.querySelector('.modal')?.classList.add('shop-modal');
  const purse = overlay.querySelector('#modal-head-extra') as HTMLElement;
  purse.className = 'modal-purse';

  body.innerHTML = `
    <div class="shop-keeper">
      <div class="keeper-portrait" id="keeper-portrait"></div>
      <div class="keeper-speech">
        <div class="keeper-name">${shop.keeperName}</div>
        <p class="keeper-bubble" id="keeper-bubble">${shop.greeting}</p>
      </div>
    </div>
    <div class="shop-bar">
      <div class="seg">
        <button type="button" class="active" data-mode="buy">Buy</button>
        <button type="button" data-mode="sell">Sell</button>
      </div>
      <span class="shop-hint">Stock sells at full price &middot; he buys at half</span>
    </div>
    <ul class="modal-list shop-wares" id="shop-list"></ul>
  `;

  const portrait = body.querySelector('#keeper-portrait') as HTMLElement;
  portrait.appendChild(createShopkeeperPortraitCanvas(shop.keeper, 160));
  const bubble = body.querySelector('#keeper-bubble') as HTMLElement;
  const say = (line: string): void => {
    bubble.textContent = line;
    bubble.classList.remove('spoke');
    // Restart the little pop animation on every new line.
    void bubble.offsetWidth;
    bubble.classList.add('spoke');
  };

  const list = body.querySelector('#shop-list') as HTMLElement;
  const segButtons = body.querySelectorAll<HTMLButtonElement>('.seg button');
  let mode: 'buy' | 'sell' = 'buy';

  const row = (
    itemId: string,
    sub: string,
    btnLabel: string,
    onClick: () => void,
    disabled = false
  ): HTMLLIElement => {
    const item = getItem(itemId);
    const li = document.createElement('li');
    li.appendChild(createItemIconCanvas(itemId, item.category, 26));

    const bodyEl = document.createElement('div');
    bodyEl.className = 'li-body';
    bodyEl.innerHTML = `<span class="li-name">${item.name}</span><span class="li-sub">${sub}</span>`;
    li.appendChild(bodyEl);

    const btns = document.createElement('div');
    btns.className = 'li-btns';
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm';
    btn.textContent = btnLabel;
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    btns.appendChild(btn);
    li.appendChild(btns);

    return li;
  };

  const render = () => {
    purse.textContent = `${game.player.gp.toLocaleString()} gp`;
    list.innerHTML = '';

    if (mode === 'buy') {
      const stock = game.getShopItems();
      if (stock.length === 0) {
        list.innerHTML = '<div class="modal-empty">The shelves are bare.</div>';
        return;
      }
      for (const item of stock) {
        const detail = getEquipmentSlot(item)
          ? `Atk +${item.atk ?? 0} &middot; Str +${item.str ?? 0} &middot; Def +${item.def ?? 0} &middot; Prayer +${item.prayerBonus ?? 0}`
          : item.category === 'food'
            ? `Heals ${item.heal ?? 0}`
            : item.category === 'potion'
              ? `Restores ${item.prayerRestore ?? 0} Prayer`
            : 'General goods';
        list.appendChild(
          row(
            item.id,
            `<b>${item.value.toLocaleString()} gp</b> &middot; ${detail}`,
            'Buy',
            () => {
              const before = game.player.gp;
              game.buyItem(item.id, 1);
              say(game.player.gp < before ? shop.thanks : 'You cannot afford that, I am afraid.');
              render();
            },
            game.player.gp < item.value
          )
        );
      }
    } else {
      const carried = game.player.inventory;
      if (carried.length === 0) {
        list.innerHTML = '<div class="modal-empty">Your pack is empty.</div>';
        return;
      }
      for (const slot of carried) {
        const item = getItem(slot.itemId);
        const price = Math.floor(item.value / 2);
        list.appendChild(
          row(
            slot.itemId,
            `Carrying ${slot.quantity} &middot; <b>${price.toLocaleString()} gp</b> each`,
            'Sell',
            () => {
              const before = game.player.gp;
              game.sellItem(slot.itemId, 1);
              if (game.player.gp > before) say(`${price.toLocaleString()} gp. Pleasure doing business.`);
              render();
            }
          )
        );
      }
    }
  };

  segButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = (btn.dataset.mode as 'buy' | 'sell') ?? 'buy';
      segButtons.forEach((b) => b.classList.toggle('active', b === btn));
      say(mode === 'buy' ? shop.greeting : shop.sellLine);
      render();
    });
  });

  render();
}

export function showCollectionLogModal(game: Game, onClose: () => void): void {
  const { overlay, body } = openModal('Collection Log', '', onClose);
  overlay.querySelector('.modal')?.classList.add('collection-modal');

  const allEntries = game
    .getAreas()
    .flatMap((area) => area.monsterIds)
    .flatMap((monsterId) =>
      getMonsterUniqueDrops(monsterId).map((itemId) => ({ monsterId, itemId }))
    );
  const unlocked = allEntries.filter(
    ({ monsterId, itemId }) => (game.player.collectionLog[monsterId]?.[itemId] ?? 0) > 0
  ).length;
  const progress = overlay.querySelector('#modal-head-extra') as HTMLElement;
  progress.className = 'modal-purse';
  progress.textContent = `${unlocked} / ${allEntries.length}`;

  const note = document.createElement('p');
  note.className = 'modal-note';
  note.textContent =
    'Unique drops are recorded under the creature that awarded them. Locked entries remain grey until obtained.';
  body.appendChild(note);

  const log = document.createElement('div');
  log.className = 'collection-log';
  body.appendChild(log);

  for (const area of game.getAreas()) {
    if (area.monsterIds.length === 0) continue;

    const group = document.createElement('section');
    group.className = 'collection-area';
    const areaHead = document.createElement('div');
    areaHead.className = 'collection-area-head';
    areaHead.textContent = area.name;
    group.appendChild(areaHead);

    for (const monsterId of area.monsterIds) {
      const monster = getMonster(monsterId);
      const uniqueIds = getMonsterUniqueDrops(monsterId);
      const card = document.createElement('div');
      card.className = 'collection-monster';

      const monsterHead = document.createElement('div');
      monsterHead.className = 'collection-monster-head';
      monsterHead.innerHTML = `
        <span>${monster.name}</span>
        <small>Level ${getMonsterCombatLevel(monster)}</small>
      `;
      card.appendChild(monsterHead);

      const uniques = document.createElement('div');
      uniques.className = 'collection-uniques';
      if (uniqueIds.length === 0) {
        uniques.innerHTML = '<span class="collection-none">No unique drops</span>';
      } else {
        for (const itemId of uniqueIds) {
          const item = getItem(itemId);
          const count = game.player.collectionLog[monsterId]?.[itemId] ?? 0;
          const entry = document.createElement('div');
          entry.className = `collection-unique ${count > 0 ? 'unlocked' : 'locked'}`;
          entry.title = item.name;
          entry.appendChild(createItemIconCanvas(itemId, item.category, 30));

          const label = document.createElement('span');
          label.className = 'collection-item-name';
          label.textContent = item.name;
          entry.appendChild(label);

          const amount = document.createElement('strong');
          amount.textContent = count > 0 ? `×${count.toLocaleString()}` : 'Not obtained';
          entry.appendChild(amount);
          uniques.appendChild(entry);
        }
      }
      card.appendChild(uniques);
      group.appendChild(card);
    }
    log.appendChild(group);
  }
}

export function showTravelModal(game: Game, onClose: () => void): void {
  const { body, close } = openModal('World Map', '', onClose);

  body.innerHTML = `
    <p class="modal-note">Choose a region to journey to.</p>
    <div class="travel-grid" id="travel-grid"></div>
  `;
  const grid = body.querySelector('#travel-grid') as HTMLElement;

  const rankedAreas = game
    .getAreas()
    .map((area) => {
      return { area, averageLevel: getAreaAverageCombatLevel(area) };
    })
    .sort((a, b) => a.averageLevel - b.averageLevel || a.area.name.localeCompare(b.area.name));

  for (const { area, averageLevel } of rankedAreas) {
    const here = area.id === game.player.areaId;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'travel-card';
    card.disabled = here;

    const foes = area.spawns.filter((s) => s.kind === 'monster').length;
    const folk = area.spawns.filter((s) => s.kind === 'npc').length;

    card.innerHTML = `
      <img class="tc-thumb" src="${area.backdrop}" alt="" />
      <span class="tc-body">
        <span class="tc-name">${area.name}</span>
        <span class="tc-sub">Avg. combat ${averageLevel || 'Peaceful'} &middot; ${foes} creature${foes === 1 ? '' : 's'} &middot; ${folk} local${folk === 1 ? '' : 's'}</span>
      </span>
      ${here ? '<span class="tc-here">Here</span>' : ''}
    `;

    card.addEventListener('click', () => {
      game.travel(area.id);
      close();
    });
    grid.appendChild(card);
  }
}

export function showTitleScreen(onStart: (name: string, load: boolean) => void): HTMLElement {
  const screen = document.createElement('div');
  screen.className = 'title-screen';
  screen.innerHTML = `
    <h1>Roka<span>Scape</span></h1>
    <p class="title-tag">A world of unlikely legends</p>
    <div class="title-rule"></div>
    <div class="title-field">
      <label class="mlabel" for="hero-name">Name your adventurer</label>
      <input type="text" id="hero-name" placeholder="Adventurer" maxlength="20" autocomplete="off" />
    </div>
    <div class="title-btns">
      <button type="button" class="btn btn-brass" id="btn-new">Begin a New Journey</button>
      <button type="button" class="btn" id="btn-continue">Continue Saved Game</button>
    </div>
    <p class="title-foot">Progress is stored in this browser.</p>
  `;

  const input = screen.querySelector('#hero-name') as HTMLInputElement;
  const name = () => input.value.trim() || 'Adventurer';

  screen.querySelector('#btn-new')?.addEventListener('click', () => onStart(name(), false));
  screen.querySelector('#btn-continue')?.addEventListener('click', () => onStart(name(), true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onStart(name(), false);
  });
  setTimeout(() => input.focus(), 0);

  return screen;
}
