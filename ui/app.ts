import type { Game } from '../engine/game';
import { getEffectiveStats } from '../engine/state';
import type { GameEvent } from '../engine/types';
import { xpForLevel } from '../engine/xp';
import { Chatbox } from './chatbox';
import { EquipmentPanel } from './equipment';
import { InventoryPanel } from './inventory';
import { MinimapPanel } from './minimap';
import { showCollectionLogModal, showContextMenu, showQuestModal, showShopModal } from './modals';
import { SkillsPanel } from './skills';
import { Viewport } from './viewport';

export class GameUI {
  private chatbox: Chatbox;
  private inventory: InventoryPanel;
  private equipment: EquipmentPanel;
  private skills: SkillsPanel;
  private viewport: Viewport;
  private minimap: MinimapPanel;

  private hpFill: HTMLElement;
  private hpValue: HTMLElement;
  private prayerFill: HTMLElement;
  private prayerValue: HTMLElement;
  private xpFill: HTMLElement;
  private xpValue: HTMLElement;
  private hdrName: HTMLElement;
  private hdrArea: HTMLElement;
  private hdrLevel: HTMLElement;
  private hdrGold: HTMLElement;
  private stageArea: HTMLElement;

  constructor(private game: Game, root: HTMLElement) {
    root.innerHTML = `
      <div class="shell-scaler">
        <div class="game-shell">

          <header class="panel topbar">
            <div class="brand">Roka<span>Scape</span></div>
            <div class="topbar-sep"></div>
            <div class="crumb">
              <div class="mlabel">Adventurer</div>
              <div class="crumb-val" id="hdr-name">&mdash;</div>
            </div>
            <div class="topbar-sep"></div>
            <div class="crumb">
              <div class="mlabel">Region</div>
              <div class="crumb-val area" id="hdr-area">&mdash;</div>
            </div>
            <div class="topbar-sep"></div>
            <div class="crumb">
              <div class="mlabel">Combat</div>
              <div class="crumb-val" id="hdr-level">1</div>
            </div>
            <div class="topbar-sep"></div>
            <div class="crumb">
              <div class="mlabel">Coins</div>
              <div class="crumb-val gold" id="hdr-gold">0</div>
            </div>
            <div class="topbar-spacer"></div>
          </header>

          <section class="panel stage">
            <canvas id="viewport" width="765" height="503"></canvas>

            <div class="hud hud-area">
              <div>
                <div class="mlabel">You are in</div>
                <div class="name" id="stage-area">&mdash;</div>
              </div>
            </div>

            <div class="hud hud-vitals">
              <div class="orb orb-hp">
                <div class="orb-fill" id="hp-fill"></div>
                <span class="orb-value" id="hp-value">10</span>
                <span class="orb-cap mlabel">Life</span>
              </div>
              <div class="orb orb-prayer">
                <div class="orb-fill" id="prayer-fill"></div>
                <span class="orb-value" id="prayer-value">10</span>
                <span class="orb-cap mlabel">Prayer</span>
              </div>
              <div class="orb orb-xp">
                <div class="orb-fill" id="xp-fill"></div>
                <span class="orb-value" id="xp-value">1</span>
                <span class="orb-cap mlabel">Level</span>
              </div>
            </div>
          </section>

          <aside class="rail">
            <div class="panel minimap-panel" id="minimap-panel"></div>
            <div class="panel sidebar">
              <div class="tab-bar">
                <button type="button" class="tab-btn active" data-tab="inv">
                  <span class="ico pixel-icon pi-pack" aria-hidden="true"></span>Pack
                </button>
                <button type="button" class="tab-btn" data-tab="equip">
                  <span class="ico pixel-icon pi-shield" aria-hidden="true"></span>Worn
                </button>
                <button type="button" class="tab-btn" data-tab="skills">
                  <span class="ico pixel-icon pi-sword" aria-hidden="true"></span>Stats
                </button>
                <button type="button" class="tab-btn" data-tab="guide">
                  <span class="ico pixel-icon pi-book" aria-hidden="true"></span>Guide
                </button>
              </div>
              <div class="tab-panels">
                <div class="tab-content active" id="tab-inv" data-tab="inv"></div>
                <div class="tab-content" id="tab-equip" data-tab="equip"></div>
                <div class="tab-content" id="tab-skills" data-tab="skills"></div>
                <div class="tab-content" id="tab-guide" data-tab="guide">
                  <div class="sect mlabel">Controls</div>
                  <div class="inv-hint">
                    <b>Left click</b> a creature to walk over and attack it.<br/>
                    <b>Left click</b> an NPC to walk over and talk.<br/>
                    <b>Left click</b> the ground to stroll there.<br/>
                    <b>Right click</b> a creature for Attack, Talk to or Examine.<br/>
                    <b>Left click</b> a pack item to eat, drink or wear it.<br/>
                    <b>Right click</b> a pack item for every option.
                  </div>
                  <div class="sect mlabel">Travel</div>
                  <div class="inv-hint">
                    Use the globe on the minimap to move between regions.
                  </div>
                  <div class="sect mlabel">Survival</div>
                  <div class="inv-hint">
                    You no longer heal for free before a fight &mdash; carry food.
                    Battle Prayer boosts combat attributes; Protection Prayer reduces incoming damage.
                    Left-click quick prayer beside the minimap to toggle it, or right-click to set its mode.
                    Dying costs half your coins and sends you back to Lumbridge.
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div class="panel chatbox" id="chatbox"></div>

        </div>
      </div>
    `;

    const canvas = root.querySelector('#viewport') as HTMLCanvasElement;
    const stage = root.querySelector('.stage') as HTMLElement;

    this.chatbox = new Chatbox(root.querySelector('#chatbox') as HTMLElement);
    this.inventory = new InventoryPanel(root.querySelector('#tab-inv') as HTMLElement, game);
    this.equipment = new EquipmentPanel(root.querySelector('#tab-equip') as HTMLElement);
    this.skills = new SkillsPanel(root.querySelector('#tab-skills') as HTMLElement);
    this.minimap = new MinimapPanel(root.querySelector('#minimap-panel') as HTMLElement, game);
    this.viewport = new Viewport(canvas, game, stage);
    this.viewport.attachMinimap(this.minimap);

    this.hpFill = root.querySelector('#hp-fill') as HTMLElement;
    this.hpValue = root.querySelector('#hp-value') as HTMLElement;
    this.prayerFill = root.querySelector('#prayer-fill') as HTMLElement;
    this.prayerValue = root.querySelector('#prayer-value') as HTMLElement;
    this.xpFill = root.querySelector('#xp-fill') as HTMLElement;
    this.xpValue = root.querySelector('#xp-value') as HTMLElement;
    this.hdrName = root.querySelector('#hdr-name') as HTMLElement;
    this.hdrArea = root.querySelector('#hdr-area') as HTMLElement;
    this.hdrLevel = root.querySelector('#hdr-level') as HTMLElement;
    this.hdrGold = root.querySelector('#hdr-gold') as HTMLElement;
    this.stageArea = root.querySelector('#stage-area') as HTMLElement;

    this.setupTabs(root);
    this.wireActions();
    this.inventory.setContextHandler((itemId, x, y) => {
      showContextMenu(itemId, x, y, game, () => {});
    });
    this.equipment.onUnequip((slot) => game.unequip(slot));
    this.skills.onPrayerToggle((prayerType) => game.togglePrayer(prayerType));

    game.on((event) => this.handleEvent(event));
    this.syncAll();
    this.chatbox.welcome();
  }

  private setupTabs(root: HTMLElement): void {
    const tabs = root.querySelectorAll<HTMLButtonElement>('.tab-btn');
    const panels = root.querySelectorAll<HTMLElement>('.tab-content');

    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const name = tab.dataset.tab;
        if (!name) return;
        tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
        panels.forEach((p) => p.classList.toggle('active', p.dataset.tab === name));
      });
    });
  }

  private wireActions(): void {
    this.chatbox.onShop(() => showShopModal(this.game, () => {}));
    this.chatbox.onQuests(() =>
      showQuestModal(this.game, () => this.refreshQuestBadge())
    );
    this.chatbox.onCollectionLog(() => showCollectionLogModal(this.game, () => {}));
    this.chatbox.onSave(() => {
      this.game.save();
      this.chatbox.addLine('Progress committed to the ledger.', 'system');
    });
  }

  private handleEvent(event: GameEvent): void {
    this.chatbox.handleEvent(event);
    this.viewport.handleEvent(event);
    switch (event.type) {
      case 'playerHp':
        this.updateHp(event.hp, event.maxHp);
        break;
      case 'playerStats':
        this.skills.update(
          event.level,
          event.xp,
          event.atk,
          event.str,
          event.def,
          event.gp,
          event.prayer,
          event.maxPrayer,
          event.activePrayer,
          this.game.player.maxHp
        );
        this.updatePrayer(event.prayer, event.maxPrayer);
        this.minimap.updatePrayer(
          event.activePrayer,
          event.quickPrayer,
          event.prayer,
          event.maxPrayer
        );
        this.updateHeaderStats(event.level, event.xp, event.gp);
        break;
      case 'questReady':
      case 'questClaimed':
        this.refreshQuestBadge();
        break;
      case 'inventoryChanged':
        this.inventory.update(event.inventory);
        break;
      case 'equipmentChanged':
        this.equipment.setMaxHit(getEffectiveStats(this.game.player).maxHit);
        this.equipment.update(event.equipment);
        this.inventory.update(this.game.player.inventory);
        break;
      case 'areaChanged': {
        this.setArea(event.areaName);
        this.chatbox.addLine(`You arrive at ${event.areaName}.`, 'game');
        const shop = this.game.getShop();
        this.chatbox.setShop(shop?.name ?? null);
        if (shop) {
          this.chatbox.addLine(`${shop.keeperName} keeps the ${shop.name} here.`, 'system');
        }
        break;
      }
    }
  }

  /** Lights the Quests button while any contract is waiting to be handed in. */
  private refreshQuestBadge(): void {
    const ready = this.game.getQuests().some((quest) => this.game.isQuestReady(quest.id));
    this.chatbox.setQuestsReady(ready);
  }

  private setArea(name: string): void {
    this.hdrArea.textContent = name;
    this.stageArea.textContent = name;
  }

  private updateHp(hp: number, maxHp: number): void {
    const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
    this.hpFill.style.height = `${pct}%`;
    this.hpValue.textContent = String(Math.max(0, Math.round(hp)));
  }

  private updatePrayer(prayer: number, maxPrayer: number): void {
    const pct =
      maxPrayer > 0 ? Math.max(0, Math.min(100, (prayer / maxPrayer) * 100)) : 0;
    this.prayerFill.style.height = `${pct}%`;
    // The orb reads like the Life orb: current points only, counting down to 0.
    this.prayerValue.textContent = String(Math.max(0, Math.round(prayer)));
    this.prayerValue.title = `${Math.max(0, Math.round(prayer))} of ${maxPrayer} Prayer points`;
  }

  private updateHeaderStats(level: number, xp: number, gp: number): void {
    this.hdrLevel.textContent = String(level);
    this.hdrGold.textContent = gp.toLocaleString();
    this.xpValue.textContent = String(level);

    const floor = xpForLevel(level);
    const ceil = xpForLevel(Math.min(99, level + 1));
    const band = Math.max(1, ceil - floor);
    const pct = level >= 99 ? 100 : Math.max(0, Math.min(100, ((xp - floor) / band) * 100));
    this.xpFill.style.height = `${pct}%`;
  }

  private syncAll(): void {
    const p = this.game.player;
    const eff = getEffectiveStats(p);
    this.hdrName.textContent = p.name;
    this.setArea(this.game.getCurrentArea().name);
    this.chatbox.setShop(this.game.getShop()?.name ?? null);
    this.refreshQuestBadge();
    this.updateHp(p.hp, p.maxHp);
    this.updatePrayer(p.prayer, p.maxPrayer);
    this.updateHeaderStats(p.level, p.xp, p.gp);
    this.skills.update(
      p.level,
      p.xp,
      eff.atk,
      eff.str,
      eff.def,
      p.gp,
      p.prayer,
      p.maxPrayer,
      p.activePrayer,
      p.maxHp
    );
    this.minimap.updatePrayer(p.activePrayer, p.quickPrayer, p.prayer, p.maxPrayer);
    this.inventory.update(p.inventory);
    this.equipment.setMaxHit(eff.maxHit);
    this.equipment.update(p.equipment);
  }
}
