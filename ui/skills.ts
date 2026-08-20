import { xpForLevel } from '../engine/xp';
import type { PrayerType } from '../engine/types';

export class SkillsPanel {
  private prayerToggle?: (prayerType: PrayerType) => void;

  constructor(private container: HTMLElement) {}

  onPrayerToggle(callback: (prayerType: PrayerType) => void): void {
    this.prayerToggle = callback;
  }

  update(
    level: number,
    xp: number,
    atk: number,
    str: number,
    def: number,
    gp: number,
    prayer: number,
    maxPrayer: number,
    activePrayer: PrayerType | null,
    maxHp: number
  ): void {
    const floor = xpForLevel(level);
    const ceil = xpForLevel(Math.min(99, level + 1));
    const band = Math.max(1, ceil - floor);
    const into = Math.max(0, xp - floor);
    const pct = level >= 99 ? 100 : Math.max(0, Math.min(100, (into / band) * 100));
    const remaining = level >= 99 ? 0 : Math.max(0, ceil - xp);

    this.container.innerHTML = `
      <div class="combat-card">
        <div class="lvl-row">
          <span class="mlabel">Combat Level</span>
          <span class="lvl-num">${level}</span>
        </div>
        <div class="xpbar"><i style="width:${pct.toFixed(1)}%"></i></div>
        <div class="xp-meta">
          <span>${xp.toLocaleString()} xp</span>
          <span>${level >= 99 ? 'Mastered' : `${remaining.toLocaleString()} to go`}</span>
        </div>
      </div>

      <div class="sect mlabel">Attributes</div>
      <div class="skills-grid">
        ${skillBox('pi-sword', 'Attack', atk)}
        ${skillBox('pi-strength', 'Strength', str)}
        ${skillBox('pi-shield', 'Defence', def)}
        ${skillBox('pi-life', 'Life', maxHp)}
        <div class="skill-box wide prayer-points">
          <span class="sico"><i class="pixel-icon pi-prayer" aria-hidden="true"></i></span>
          <span class="mlabel">Prayer</span>
          <span class="sval">${prayer}/${maxPrayer}</span>
        </div>
        <div class="prayer-options">
          <button type="button" class="prayer-choice${activePrayer === 'battle' ? ' active' : ''}" data-prayer="battle" ${prayer <= 0 && activePrayer !== 'battle' ? 'disabled' : ''}>
            <span class="pixel-icon pi-sword" aria-hidden="true"></span>
            <span><b>Battle Prayer</b><small>+15% combat stats</small></span>
          </button>
          <button type="button" class="prayer-choice${activePrayer === 'protection' ? ' active' : ''}" data-prayer="protection" ${prayer <= 0 && activePrayer !== 'protection' ? 'disabled' : ''}>
            <span class="pixel-icon pi-shield" aria-hidden="true"></span>
            <span><b>Protection Prayer</b><small>40% less damage</small></span>
          </button>
        </div>
        <div class="skill-box wide">
          <span class="sico"><i class="pixel-icon pi-coins" aria-hidden="true"></i></span>
          <span class="sbody">
            <span class="mlabel">Coin Purse</span>
            <span class="sval">${gp.toLocaleString()} gp</span>
          </span>
        </div>
      </div>
    `;
    this.container.querySelectorAll<HTMLButtonElement>('[data-prayer]').forEach((button) => {
      button.addEventListener('click', () => {
        this.prayerToggle?.(button.dataset.prayer as PrayerType);
      });
    });
  }
}

function skillBox(iconClass: string, label: string, value: number): string {
  return `
    <div class="skill-box">
      <span class="sico"><i class="pixel-icon ${iconClass}" aria-hidden="true"></i></span>
      <span class="sbody">
        <span class="mlabel">${label}</span>
        <span class="sval">${value}</span>
      </span>
    </div>
  `;
}
