import { getItem } from '../content/items';
import { AREAS, getAreaAverageCombatLevel } from '../content/areas';
import {
  getMonster,
  getMonsterCombatLevel,
  getMonsterUniqueDrops,
} from '../content/monsters';
import type { Game } from '../engine/game';
import type { SaveSummary } from '../engine/state';
import { getQuest, getQuestChainStep } from '../content/quests';
import { getEffectiveStats, getEquipmentSlot, getHealAmount } from '../engine/state';
import { createItemIconCanvas, createShopkeeperPortraitCanvas, drawAnimatedEntity } from './sprites';

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

/**
 * Right-click menu for the world: a heading plus whatever actions apply to the
 * thing under the cursor. Shares the chrome used by the pack's item menu.
 */
export function showWorldMenu(
  heading: string,
  actions: { label: string; run: () => void; danger?: boolean }[],
  x: number,
  y: number
): void {
  document.querySelector('.world-menu')?.remove();
  const menu = document.createElement('div');
  menu.className = 'context-menu world-menu';

  const head = document.createElement('div');
  head.className = 'cm-head';
  head.textContent = heading;
  menu.appendChild(head);

  for (const action of actions) {
    const button = document.createElement('button');
    button.textContent = action.label;
    if (action.danger) button.classList.add('danger');
    button.addEventListener('click', () => {
      action.run();
      menu.remove();
    });
    menu.appendChild(button);
  }

  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(x, window.innerWidth - rect.width - 6)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - rect.height - 6)}px`;

  const close = (event: MouseEvent): void => {
    if (!menu.contains(event.target as Node)) {
      menu.remove();
      document.removeEventListener('click', close);
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
          ? `${(item.levelReq ?? 1) > 1 ? `Level ${item.levelReq} &middot; ` : ''}` +
            `Atk ${item.atk ?? 0} &middot; Str ${item.str ?? 0} &middot; Def ${item.def ?? 0} &middot; Prayer +${item.prayerBonus ?? 0}`
          : item.category === 'food'
            ? `Heals ${getHealAmount(item, game.player.maxHp)}${
                item.healPercent ? ` (${item.heal} + ${item.healPercent}%)` : ''
              }`
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

export function showQuestModal(game: Game, onClose: () => void): void {
  const { overlay, body } = openModal('Quest Journal', '', onClose);
  overlay.querySelector('.modal')?.classList.add('collection-modal');

  const quests = game.getQuests();
  const done = quests.filter((quest) => game.getQuestProgress(quest.id).claimed > 0).length;
  const progressLabel = overlay.querySelector('#modal-head-extra') as HTMLElement;
  progressLabel.className = 'modal-purse';
  progressLabel.textContent = `${done} / ${quests.length} completed`;

  const note = document.createElement('p');
  note.className = 'modal-note';
  note.textContent =
    'Contracts track automatically as you fight. Hand one in here for coins and experience; the listed item comes with the first completion only, and a contract can be run again for the rest.';
  body.appendChild(note);

  const list = document.createElement('div');
  list.className = 'quest-list';
  body.appendChild(list);

  const render = (): void => {
    list.innerHTML = '';
    progressLabel.textContent = `${
      quests.filter((quest) => game.getQuestProgress(quest.id).claimed > 0).length
    } / ${quests.length} completed`;

    for (const area of game.getAreas()) {
      const areaQuests = quests.filter((quest) => quest.areaId === area.id);
      if (areaQuests.length === 0) continue;

      const group = document.createElement('section');
      group.className = 'collection-area';
      const head = document.createElement('div');
      head.className = 'collection-area-head';
      head.textContent = area.name;
      group.appendChild(head);

      for (const quest of [...areaQuests].sort(
        (a, b) => getQuestChainStep(a) - getQuestChainStep(b)
      )) {
        const progress = game.getQuestProgress(quest.id);
        const unlocked = game.isQuestUnlocked(quest.id);
        const gate = quest.requires ? getQuest(quest.requires) : null;
        const target = quest.objective.count;
        const banked = Math.min(progress.kills, target);
        const ready = progress.kills >= target;
        const monster = getMonster(quest.objective.monsterId);
        const rewardItem = quest.reward.itemId ? getItem(quest.reward.itemId) : null;
        const owed = rewardItem && progress.claimed === 0;

        const card = document.createElement('div');
        card.className =
          `quest-card${ready ? ' ready' : ''}${progress.claimed > 0 ? ' done' : ''}` +
          `${unlocked ? '' : ' locked'}`;
        card.innerHTML = `
          <div class="quest-head">
            <span class="quest-name">${quest.name}</span>
            <span class="quest-state">${
              !unlocked
                ? `Locked &middot; step ${getQuestChainStep(quest)}`
                : ready
                  ? 'Ready to hand in'
                  : `${banked} / ${target}`
            }</span>
          </div>
          <p class="quest-summary">${quest.summary}</p>
          <div class="quest-task">
            ${
              unlocked
                ? `Defeat <b>${monster.name}</b> &times;${target}`
                : `Complete <b>${gate!.name}</b> to unlock`
            }
            ${quest.giver ? `&middot; posted by ${quest.giver}` : ''}
            ${progress.claimed > 0 ? `&middot; completed ${progress.claimed}&times;` : ''}
          </div>
          <div class="quest-bar"><i style="width:${Math.round((banked / target) * 100)}%"></i></div>
          <div class="quest-foot">
            <span class="quest-reward">${quest.reward.xp} xp &middot; ${quest.reward.gp.toLocaleString()} gp${
              owed ? ` &middot; ${rewardItem!.name}` : ''
            }</span>
          </div>
        `;

        const foot = card.querySelector('.quest-foot') as HTMLElement;
        if (owed) {
          foot.prepend(createItemIconCanvas(rewardItem!.id, rewardItem!.category, 22));
        }
        const claim = document.createElement('button');
        claim.type = 'button';
        claim.className = 'btn btn-sm btn-brass';
        claim.textContent = 'Hand In';
        claim.disabled = !ready;
        if (!unlocked) claim.textContent = 'Locked';
        claim.addEventListener('click', () => {
          game.claimQuest(quest.id);
          render();
        });
        foot.appendChild(claim);

        group.appendChild(card);
      }
      list.appendChild(group);
    }
  };

  render();
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

export interface TitleChoice {
  slot: number;
  /** Set when starting a fresh character in this slot. */
  newName?: string;
}

/**
 * Character select. Each slot shows the hero as they are actually dressed,
 * idling on the spot, beside their name and combat level.
 */
export function showTitleScreen(
  onStart: (choice: TitleChoice) => void,
  getSlots: () => (SaveSummary | null)[],
  onDelete: (slot: number) => void
): HTMLElement {
  const screen = document.createElement('div');
  screen.className = 'title-screen';
  const timers: number[] = [];

  const stopAnimations = (): void => {
    while (timers.length > 0) cancelAnimationFrame(timers.pop()!);
  };

  /** Opening screen: name your hero and go, or dig out an old save. */
  const renderTitle = (): void => {
    stopAnimations();
    const saved = getSlots().filter(Boolean).length;
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
        <button type="button" class="btn" id="btn-load"${saved === 0 ? ' disabled' : ''}>
          Continue Journey
        </button>
      </div>
      <p class="title-foot">
        ${
          saved === 0
            ? 'Progress is stored in this browser.'
            : `${saved} of ${getSlots().length} character slots in use.`
        }
      </p>
    `;

    const input = screen.querySelector('#hero-name') as HTMLInputElement;
    const begin = (): void => {
      const name = input.value.trim() || 'Adventurer';
      const slots = getSlots();
      const free = slots.findIndex((entry) => entry === null);
      if (free === -1) {
        // Every slot is taken: let them choose which character to replace.
        renderSlots('All three slots are full. Delete a character to make room.');
        return;
      }
      onStart({ slot: free + 1, newName: name });
    };

    screen.querySelector('#btn-new')?.addEventListener('click', begin);
    screen.querySelector('#btn-load')?.addEventListener('click', () => renderSlots());
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') begin();
    });
    setTimeout(() => input.focus(), 0);
  };

  /** Save picker: each character shown as they are dressed, idling. */
  const renderSlots = (notice?: string): void => {
    stopAnimations();
    screen.innerHTML = `
      <h1>Roka<span>Scape</span></h1>
      <p class="title-tag">Choose a character</p>
      <div class="title-rule"></div>
      ${notice ? `<p class="title-notice">${notice}</p>` : ''}
      <div class="slot-list" id="slot-list"></div>
      <div class="title-btns">
        <button type="button" class="btn" id="btn-back">Back</button>
      </div>
    `;
    screen.querySelector('#btn-back')?.addEventListener('click', renderTitle);
    const list = screen.querySelector('#slot-list') as HTMLElement;

    getSlots().forEach((entry, index) => {
      const slot = index + 1;
      const card = document.createElement('div');
      card.className = `slot-card${entry ? '' : ' empty'}`;

      if (!entry) {
        card.innerHTML = `
          <div class="slot-portrait empty-portrait">+</div>
          <div class="slot-body">
            <div class="slot-name">Empty slot ${slot}</div>
            <label class="mlabel" for="hero-name-${slot}">Name your adventurer</label>
            <input type="text" id="hero-name-${slot}" placeholder="Adventurer" maxlength="20" autocomplete="off" />
          </div>
          <div class="slot-actions">
            <button type="button" class="btn btn-brass slot-create">New Hero</button>
          </div>
        `;
        const input = card.querySelector('input') as HTMLInputElement;
        const begin = (): void => onStart({ slot, newName: input.value.trim() || 'Adventurer' });
        card.querySelector('.slot-create')?.addEventListener('click', begin);
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') begin();
        });
        list.appendChild(card);
        return;
      }

      const { player } = entry;
      const stats = getEffectiveStats(player);
      card.innerHTML = `
        <div class="slot-portrait"></div>
        <div class="slot-body">
          <div class="slot-name">${player.name}</div>
          <div class="slot-meta">Combat level ${player.level} &middot; ${areaName(player.areaId)}</div>
          <div class="slot-stats">
            Atk ${stats.atk} &middot; Str ${stats.str} &middot; Def ${stats.def}
            &middot; ${player.gp.toLocaleString()} gp
          </div>
        </div>
        <div class="slot-actions">
          <button type="button" class="btn btn-brass slot-play">Play</button>
          <button type="button" class="btn btn-sm slot-delete danger">Delete</button>
        </div>
      `;

      // Idle animation: the same two-frame bounce used in the world.
      const holder = card.querySelector('.slot-portrait') as HTMLElement;
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 104;
      holder.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let frame = 0;
        const tick = (): void => {
          frame++;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = false;
          drawAnimatedEntity(ctx, 'player', canvas.width / 2, canvas.height - 6, 90, frame, {
            hovered: false,
            inCombat: false,
            equipment: player.equipment,
          });
          timers.push(requestAnimationFrame(tick));
        };
        tick();
      }

      card.querySelector('.slot-play')?.addEventListener('click', () => onStart({ slot }));
      card.querySelector('.slot-delete')?.addEventListener('click', () => {
        const button = card.querySelector('.slot-delete') as HTMLButtonElement;
        if (button.dataset.confirm !== 'yes') {
          button.dataset.confirm = 'yes';
          button.textContent = 'Really delete?';
          return;
        }
        onDelete(slot);
        renderSlots();
      });
      list.appendChild(card);
    });
  };

  renderTitle();
  return screen;
}

/** Area names for the character screen without pulling in the whole engine. */
function areaName(areaId: string): string {
  return AREAS.find((area) => area.id === areaId)?.name ?? 'Unknown';
}
