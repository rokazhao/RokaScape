import { getArea } from '../content/areas';
import type { Game } from '../engine/game';
import type { PrayerType } from '../engine/types';
import { showTravelModal } from './modals';

/** Decorative round minimap plus the world-map travel button.
 *  Not click-to-move: the stage canvas owns movement. */
export class MinimapPanel {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private backdrop = new Image();
  private tint: string | undefined;
  private prayerButton: HTMLButtonElement;

  private playerDot = { x: 0, y: 0 };
  private entityDots: { x: number; y: number; kind: string }[] = [];
  private mapW = 765;
  private mapH = 503;
  private pulse = 0;

  constructor(container: HTMLElement, game: Game) {
    container.innerHTML = `
      <div class="minimap-inner">
        <canvas id="minimap-canvas" width="190" height="190"></canvas>
        <div class="minimap-chrome">
          <div class="minimap-compass" title="North">N</div>
        </div>
      </div>
      <button
        type="button"
        class="quick-prayer-btn"
        id="quick-prayer-btn"
        data-prayer="battle"
        title="Quick Prayer: Battle (right-click to preset)"
        aria-label="Toggle quick prayer"
      ><span class="pixel-quick-prayer" aria-hidden="true"></span></button>
      <button
        type="button"
        class="world-map-btn"
        id="world-map-btn"
        title="Open World Map"
        aria-label="Open World Map"
      ><span class="pixel-globe" aria-hidden="true"></span></button>
      <div class="minimap-legend mlabel">
        <span><i class="dot-you"></i>You</span>
        <span><i class="dot-foe"></i>Foe</span>
        <span><i class="dot-npc"></i>Folk</span>
      </div>
    `;
    this.canvas = container.querySelector('#minimap-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.prayerButton = container.querySelector('#quick-prayer-btn') as HTMLButtonElement;

    this.prayerButton.addEventListener('click', () => game.toggleQuickPrayer());
    this.prayerButton.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.showPrayerPresetMenu(event.clientX, event.clientY, game);
    });

    container.querySelector('#world-map-btn')?.addEventListener('click', () => {
      showTravelModal(game, () => {});
    });

    this.loadArea(game.player.areaId);
    this.loop();
  }

  setArea(areaId: string): void {
    this.loadArea(areaId);
  }

  updatePrayer(
    activePrayer: PrayerType | null,
    quickPrayer: PrayerType,
    prayer: number,
    maxPrayer: number
  ): void {
    this.prayerButton.dataset.prayer = activePrayer ?? quickPrayer;
    this.prayerButton.classList.toggle('active', activePrayer !== null);
    this.prayerButton.classList.toggle('depleted', prayer <= 0);
    const preset = quickPrayer === 'battle' ? 'Battle' : 'Protection';
    const active = activePrayer
      ? `Active: ${activePrayer === 'battle' ? 'Battle' : 'Protection'} Prayer`
      : 'Inactive';
    this.prayerButton.title = `Quick Prayer: ${preset} · ${prayer}/${maxPrayer} · ${active} (right-click to preset)`;
  }

  /** Player + entity positions in map pixel space. */
  updateDots(
    player: { x: number; y: number },
    entities: { x: number; y: number; kind: string }[],
    mapW: number,
    mapH: number
  ): void {
    this.playerDot = player;
    this.entityDots = entities;
    this.mapW = mapW;
    this.mapH = mapH;
  }

  private loadArea(areaId: string): void {
    const area = getArea(areaId);
    this.backdrop.src = area.backdrop;
    this.tint = area.tint;
  }

  private loop = (): void => {
    this.pulse += 0.05;
    this.render();
    requestAnimationFrame(this.loop);
  };

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#171208';
    ctx.fillRect(0, 0, w, h);

    // Cover the square canvas with the area art, cropped to fill the circle.
    if (this.backdrop.complete && this.backdrop.naturalWidth > 0) {
      const scale = Math.max(w / this.backdrop.naturalWidth, h / this.backdrop.naturalHeight);
      const dw = this.backdrop.naturalWidth * scale;
      const dh = this.backdrop.naturalHeight * scale;
      ctx.drawImage(this.backdrop, (w - dw) / 2, (h - dh) / 2, dw, dh);
      if (this.tint) {
        ctx.fillStyle = this.tint;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.fillStyle = 'rgba(14, 10, 5, 0.34)';
      ctx.fillRect(0, 0, w, h);
    }

    const sx = w / this.mapW;
    const sy = h / this.mapH;

    for (const e of this.entityDots) {
      const color = e.kind === 'monster' ? '#d8453a' : '#6fd6e8';
      this.dot(e.x * sx, e.y * sy, 2.5, color, 'rgba(0,0,0,0.7)');
    }

    // Player marker with a soft pulsing ring so it stays findable.
    const px = this.playerDot.x * sx;
    const py = this.playerDot.y * sy;
    const ring = 6 + Math.sin(this.pulse) * 2;
    ctx.strokeStyle = 'rgba(255, 215, 94, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, ring, 0, Math.PI * 2);
    ctx.stroke();
    this.dot(px, py, 3.5, '#ffd75e', '#000');
  }

  private dot(x: number, y: number, r: number, fill: string, stroke: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  private showPrayerPresetMenu(x: number, y: number, game: Game): void {
    document.querySelector('.prayer-preset-menu')?.remove();
    const menu = document.createElement('div');
    menu.className = 'context-menu prayer-preset-menu';
    menu.innerHTML = '<div class="cm-head">Quick Prayer</div>';

    const options: { type: PrayerType; label: string }[] = [
      { type: 'battle', label: 'Battle Prayer' },
      { type: 'protection', label: 'Protection Prayer' },
    ];
    for (const option of options) {
      const button = document.createElement('button');
      button.textContent = `${game.player.quickPrayer === option.type ? '✓ ' : ''}${option.label}`;
      button.addEventListener('click', () => {
        game.setQuickPrayer(option.type);
        menu.remove();
      });
      menu.appendChild(button);
    }

    menu.style.left = `${Math.min(x, window.innerWidth - 170)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - 100)}px`;
    document.body.appendChild(menu);
    window.setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);
  }
}
