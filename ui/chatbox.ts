import type { ChatKind, GameEvent } from '../engine/types';

const FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'game', label: 'World' },
  { id: 'combat', label: 'Combat' },
  { id: 'npc', label: 'Dialogue' },
];

export class Chatbox {
  private root: HTMLElement;
  private logEl: HTMLElement;
  private shopBtn!: HTMLButtonElement;
  private tick = 0;

  constructor(container: HTMLElement) {
    this.root = container;
    container.innerHTML = `
      <div class="chat-tabs">
        ${FILTERS.map(
          (f, i) =>
            `<button type="button" class="chat-tab${i === 0 ? ' active' : ''}" data-filter="${f.id}">${f.label}</button>`
        ).join('')}
      </div>
      <div class="chat-log" id="chat-log" data-filter="all"></div>
      <div class="chat-actions">
        <button type="button" class="btn btn-sm" id="btn-shop">Shop</button>
        <button type="button" class="btn btn-sm" id="btn-quests">Quests</button>
        <button type="button" class="btn btn-sm" id="btn-collection">Collection Log</button>
        <button type="button" class="btn btn-sm btn-brass" id="btn-save">Save Progress</button>
        <div class="spacer"></div>
        <span class="hint">Click the world to move &middot; right-click items for actions</span>
      </div>
    `;
    this.logEl = container.querySelector('#chat-log') as HTMLElement;
    this.shopBtn = container.querySelector('#btn-shop') as HTMLButtonElement;
    this.setupFilters();
  }

  /** Names the local trader, or greys the button out where nobody trades. */
  setShop(shopName: string | null): void {
    this.shopBtn.textContent = shopName ?? 'No Shop Here';
    this.shopBtn.disabled = shopName === null;
    this.shopBtn.title = shopName
      ? `Trade at the ${shopName}`
      : 'Nothing in this region trades with the living';
  }

  private setupFilters(): void {
    const tabs = this.root.querySelectorAll<HTMLButtonElement>('.chat-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const filter = tab.dataset.filter ?? 'all';
        tabs.forEach((t) => t.classList.toggle('active', t === tab));
        this.logEl.dataset.filter = filter;
        this.logEl.scrollTop = this.logEl.scrollHeight;
      });
    });
  }

  onShop(cb: () => void): void {
    this.shopBtn.addEventListener('click', cb);
  }

  onQuests(cb: () => void): void {
    this.root.querySelector('#btn-quests')?.addEventListener('click', cb);
  }

  /** Nudges the Quests button when a contract becomes claimable. */
  setQuestsReady(ready: boolean): void {
    this.root.querySelector('#btn-quests')?.classList.toggle('btn-alert', ready);
  }

  onCollectionLog(cb: () => void): void {
    this.root.querySelector('#btn-collection')?.addEventListener('click', cb);
  }

  onSave(cb: () => void): void {
    this.root.querySelector('#btn-save')?.addEventListener('click', cb);
  }

  handleEvent(event: GameEvent): void {
    if (event.type === 'chat') {
      this.addLine(event.message, event.kind);
    }
  }

  addLine(message: string, kind: ChatKind): void {
    this.tick++;
    const line = document.createElement('div');
    line.className = `chat-line ${kind}`;

    const tick = document.createElement('span');
    tick.className = 'tick';
    tick.textContent = String(this.tick).padStart(3, '0');

    const msg = document.createElement('span');
    msg.className = 'msg';
    msg.textContent = message;

    line.append(tick, msg);
    this.logEl.appendChild(line);

    // Keep the log bounded so long sessions stay responsive.
    while (this.logEl.childElementCount > 300) {
      this.logEl.firstElementChild?.remove();
    }

    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  welcome(): void {
    this.addLine('The gates of Gielinor swing open before you.', 'game');
    this.addLine('Click a creature to close the distance and strike.', 'system');
    this.addLine('Click an NPC to walk over and speak with them.', 'system');
    this.addLine('Use the globe on your minimap to travel between regions.', 'system');
  }
}
