import { getArea } from '../content/areas';
import {
  getMonster,
  getMonsterCombatLevel,
  getMonsterDialogues,
} from '../content/monsters';
import {
  findInteractionPoint,
  findWalkPath,
  isWalkable,
  type NavPoint,
} from '../content/navigation';
import { getNpc } from '../content/npcs';
import type { Game } from '../engine/game';
import type { GameEvent } from '../engine/types';
import type { MinimapPanel } from './minimap';
import { showWorldMenu } from './modals';
import {
  drawAnimatedEntity,
  drawHoverTooltip,
  drawHitsplat,
  drawHpBar,
  drawXpDrop,
  getEntityClickHitbox,
} from './sprites';

interface EntityTarget {
  kind: 'monster' | 'npc';
  id: string;
  x: number;
  y: number;
  size: number;
  animOffset: number;
}

interface WalkTarget {
  kind: 'monster' | 'npc' | 'ground';
  id: string;
  x: number;
  y: number;
  /** What to do once the walk finishes. */
  action?: 'attack' | 'talk';
}

interface FloatingText {
  x: number;
  y: number;
  amount: number;
  life: number;
}

interface HitsplatAnim {
  x: number;
  y: number;
  damage: number;
  missed: boolean;
  life: number;
}

const WALK_SPEED = 2.6;

export class Viewport {
  canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: Game;
  private minimap: MinimapPanel | null = null;
  private backdrop = new Image();
  private targets: EntityTarget[] = [];
  private playerPos = { x: 398, y: 428, size: 36 };
  private playerFacing: -1 | 1 = 1;
  private walkTarget: WalkTarget | null = null;
  private walkPath: NavPoint[] = [];
  private walkMarker: { x: number; y: number } | null = null;
  private blockedMarker: { x: number; y: number; life: number } | null = null;
  private selectedMonsterId: string | null = null;
  private hoveredTargetId: string | null = null;
  private monsterHp: Map<string, { hp: number; maxHp: number }> = new Map();
  private floatingXp: FloatingText[] = [];
  private hitsplats: HitsplatAnim[] = [];
  private dialogueEl: HTMLElement;
  private combatBanner!: HTMLElement;
  private combatFoeEl!: HTMLElement;
  private animFrame = 0;

  constructor(canvas: HTMLCanvasElement, game: Game, wrap: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.game = game;

    const dialogue = document.createElement('div');
    dialogue.className = 'dialogue-box';
    wrap.appendChild(dialogue);
    this.dialogueEl = dialogue;

    const banner = document.createElement('div');
    banner.className = 'hud hud-combat';
    banner.innerHTML = `
      <span class="mlabel">Fighting</span>
      <span class="foe" id="combat-foe"></span>
      <button type="button" class="btn btn-sm btn-danger" id="btn-flee">Flee</button>
    `;
    wrap.appendChild(banner);
    this.combatBanner = banner;
    this.combatFoeEl = banner.querySelector('#combat-foe') as HTMLElement;
    banner.querySelector('#btn-flee')?.addEventListener('click', () => game.fleeCombat());

    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseleave', () => {
      this.hoveredTargetId = null;
      this.canvas.style.cursor = 'default';
    });

    this.resizeToArea(game.player.areaId);
    this.loadArea(game.player.areaId);
    this.rebuildTargets();
    this.loop();
  }

  attachMinimap(minimap: MinimapPanel): void {
    this.minimap = minimap;
  }

  private resizeToArea(areaId: string): void {
    const area = getArea(areaId);
    this.canvas.width = area.mapWidth;
    this.canvas.height = area.mapHeight;
  }

  private loop = (): void => {
    this.animFrame++;
    this.updateWalk();
    this.render();
    this.syncMinimap();
    requestAnimationFrame(this.loop);
  };

  private syncMinimap(): void {
    if (!this.minimap) return;
    const area = this.game.getCurrentArea();
    this.minimap.updateDots(
      { x: this.playerPos.x, y: this.playerPos.y },
      this.targets.map((t) => ({ x: t.x, y: t.y, kind: t.kind })),
      area.mapWidth,
      area.mapHeight
    );
  }

  handleEvent(event: GameEvent): void {
    switch (event.type) {
      case 'areaChanged':
        this.resizeToArea(event.areaId);
        this.loadArea(event.areaId);
        this.rebuildTargets();
        this.walkTarget = null;
        this.walkPath = [];
        this.walkMarker = null;
        this.blockedMarker = null;
        this.hoveredTargetId = null;
        this.minimap?.setArea(event.areaId);
        break;
      case 'combatStart':
        this.selectedMonsterId = event.monsterId;
        this.walkTarget = null;
        this.walkPath = [];
        this.walkMarker = null;
        this.dialogueEl.classList.remove('visible');
        this.combatFoeEl.textContent = getMonster(event.monsterId).name;
        this.combatBanner.classList.add('visible');
        break;
      case 'combatEnd':
        this.selectedMonsterId = null;
        this.combatBanner.classList.remove('visible');
        break;
      case 'monsterHp':
        this.monsterHp.set(event.monsterId, { hp: event.hp, maxHp: event.maxHp });
        break;
      case 'monsterRespawn':
        this.monsterHp.delete(event.monsterId);
        break;
      case 'hitsplat': {
        const target = this.targets.find(
          (t) => t.kind === 'monster' && t.id === this.game.player.combatTargetId
        );
        const x = event.target === 'monster' && target ? target.x : this.playerPos.x;
        const y = event.target === 'monster' && target ? target.y - 30 : this.playerPos.y - 20;
        this.hitsplats.push({ x, y, damage: event.damage, missed: event.missed, life: 40 });
        break;
      }
      case 'xpDrop':
        this.floatingXp.push({ x: this.playerPos.x, y: this.playerPos.y - 40, amount: event.amount, life: 50 });
        break;
    }
  }

  private loadArea(areaId: string): void {
    this.backdrop.src = getArea(areaId).backdrop;
  }

  private rebuildTargets(): void {
    const area = this.game.getCurrentArea();
    const ps = area.playerSpawn;
    this.playerPos = { x: ps.x, y: ps.y, size: ps.scale ?? 36 };
    this.targets = area.spawns.map((spawn, i) => ({
      kind: spawn.kind,
      id: spawn.id,
      x: spawn.x,
      y: spawn.y,
      size: spawn.scale ?? 40,
      animOffset: i * 15,
    }));
  }

  private beginWalk(target: WalkTarget, destination: NavPoint): boolean {
    const path = findWalkPath(this.game.getCurrentArea(), this.playerPos, destination);
    if (!path || path.length === 0) return false;
    this.walkTarget = target;
    this.walkPath = path;
    this.walkMarker = destination;
    this.blockedMarker = null;
    this.dialogueEl.classList.remove('visible');
    return true;
  }

  private updateWalk(): void {
    if (!this.walkTarget || this.walkPath.length === 0 || this.game.player.inCombat) return;

    const waypoint = this.walkPath[0]!;
    const dx = waypoint.x - this.playerPos.x;
    const dy = waypoint.y - this.playerPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= 3) {
      this.playerPos.x = waypoint.x;
      this.playerPos.y = waypoint.y;
      this.walkPath.shift();
      if (this.walkPath.length > 0) return;

      const pending = this.walkTarget;
      this.walkTarget = null;
      this.walkMarker = null;
      if (pending.kind !== 'ground') {
        this.onArrived(pending);
      }
      return;
    }

    const step = Math.min(WALK_SPEED, dist);
    if (Math.abs(dx) > 0.25) this.playerFacing = dx < 0 ? -1 : 1;
    const next = {
      x: this.playerPos.x + (dx / dist) * step,
      y: this.playerPos.y + (dy / dist) * step,
    };

    // The route is already collision checked, but retain this guard so malformed
    // future navigation data can never move the player through solid scenery.
    if (!isWalkable(this.game.player.areaId, next)) {
      this.walkTarget = null;
      this.walkPath = [];
      this.walkMarker = null;
      return;
    }
    this.playerPos.x = next.x;
    this.playerPos.y = next.y;
  }

  private onArrived(target: WalkTarget): void {
    if (target.kind === 'monster') {
      if (target.action === 'talk') {
        this.showMonsterDialogue(target.id);
      } else {
        this.game.startCombat(target.id);
      }
    } else if (target.kind === 'npc') {
      this.showDialogue(target.id);
    }
  }

  /** Walks over to an entity, then performs the chosen action. */
  private approachAndAct(target: EntityTarget, action: 'attack' | 'talk'): void {
    const approach = findInteractionPoint(
      this.game.getCurrentArea(),
      this.playerPos,
      { x: target.x, y: target.y }
    );
    if (
      !approach ||
      !this.beginWalk(
        { kind: target.kind, id: target.id, x: approach.x, y: approach.y, action },
        approach
      )
    ) {
      this.showBlockedMarker(target.x, target.y);
    }
  }

  /**
   * Right-click menu for whatever is under the cursor: attack, talk when the
   * creature has anything to say, examine, or simply walk there.
   */
  private onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    if (this.game.player.inCombat) return;
    const { x, y } = this.canvasCoords(event);
    const hit = this.findTargetAt(x, y);

    const actions: { label: string; run: () => void; danger?: boolean }[] = [];
    let heading = 'Here';

    if (hit && hit.kind === 'monster') {
      const monster = getMonster(hit.id);
      heading = `${monster.name} (level ${getMonsterCombatLevel(monster)})`;
      actions.push({
        label: `Attack ${monster.name}`,
        run: () => this.approachAndAct(hit, 'attack'),
        danger: true,
      });
      if (this.game.canTalkToMonster(hit.id)) {
        actions.push({
          label: `Talk to ${monster.name}`,
          run: () => this.approachAndAct(hit, 'talk'),
        });
      }
      actions.push({ label: 'Examine', run: () => this.game.examineMonster(hit.id) });
    } else if (hit && hit.kind === 'npc') {
      const npc = getNpc(hit.id);
      heading = npc.name;
      actions.push({
        label: `Talk to ${npc.name}`,
        run: () => this.approachAndAct(hit, 'talk'),
      });
      actions.push({ label: 'Examine', run: () => this.game.examineNpc(hit.id) });
    } else if (isWalkable(this.game.player.areaId, { x, y })) {
      actions.push({
        label: 'Walk here',
        run: () => {
          if (!this.beginWalk({ kind: 'ground', id: '', x, y }, { x, y })) {
            this.showBlockedMarker(x, y);
          }
        },
      });
    } else {
      actions.push({ label: 'Nothing to do here', run: () => this.showBlockedMarker(x, y) });
    }

    showWorldMenu(heading, actions, event.clientX, event.clientY);
  }

  private canvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  private findTargetAt(x: number, y: number): EntityTarget | null {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i]!;
      const hitbox = getEntityClickHitbox(
        target.id,
        target.x,
        target.y,
        target.size,
        this.animFrame + target.animOffset
      );
      if (
        x >= hitbox.left &&
        x <= hitbox.left + hitbox.width &&
        y >= hitbox.top &&
        y <= hitbox.top + hitbox.height
      ) {
        return target;
      }
    }
    return null;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.game.player.inCombat) {
      this.canvas.style.cursor = 'default';
      return;
    }
    const { x, y } = this.canvasCoords(e);
    const hit = this.findTargetAt(x, y);
    this.hoveredTargetId = hit ? `${hit.kind}:${hit.id}` : null;
    this.canvas.style.cursor = hit
      ? 'pointer'
      : isWalkable(this.game.player.areaId, { x, y })
        ? 'crosshair'
        : 'not-allowed';
  }

  private onClick(e: MouseEvent): void {
    if (this.game.player.inCombat) return;

    const { x, y } = this.canvasCoords(e);
    const target = this.findTargetAt(x, y);

    if (target) {
      const approach = findInteractionPoint(
        this.game.getCurrentArea(),
        this.playerPos,
        { x: target.x, y: target.y }
      );
      if (
        !approach ||
        !this.beginWalk(
          { kind: target.kind, id: target.id, x: approach.x, y: approach.y },
          approach
        )
      ) {
        this.showBlockedMarker(x, y);
      }
      return;
    }

    if (!isWalkable(this.game.player.areaId, { x, y })) {
      this.showBlockedMarker(x, y);
      return;
    }

    if (!this.beginWalk({ kind: 'ground', id: '', x, y }, { x, y })) {
      this.showBlockedMarker(x, y);
    }
  }

  private showBlockedMarker(x: number, y: number): void {
    this.blockedMarker = { x, y, life: 28 };
  }

  private showDialogue(npcId: string): void {
    const npc = getNpc(npcId);
    this.openDialogue(npc.name, npc.dialogues, (index) => this.game.talkToNpc(npcId, index));
  }

  private showMonsterDialogue(monsterId: string): void {
    const monster = getMonster(monsterId);
    this.openDialogue(monster.name, getMonsterDialogues(monsterId), (index) =>
      this.game.talkToMonster(monsterId, index)
    );
  }

  /** Shared conversation panel for anyone with something to say. */
  private openDialogue(
    name: string,
    options: { label: string; text: string }[],
    onPick: (index: number) => void
  ): void {
    if (options.length === 0) return;
    this.dialogueEl.innerHTML = `
      <div class="dialogue-head">
        <span class="npc-name">${name}</span>
        <button type="button" class="dialogue-close" id="dlg-close" title="End conversation">&times;</button>
      </div>
      <div class="dialogue-options" id="dialogue-options"></div>
    `;
    this.dialogueEl.querySelector('#dlg-close')?.addEventListener('click', () => {
      this.dialogueEl.classList.remove('visible');
    });

    const opts = this.dialogueEl.querySelector('#dialogue-options')!;
    options.forEach((option, index) => {
      const btn = document.createElement('button');
      btn.innerHTML = `<span class="idx">${index + 1}</span><span>${option.label}</span>`;
      btn.addEventListener('click', () => {
        onPick(index);
        this.dialogueEl.classList.remove('visible');
      });
      opts.appendChild(btn);
    });
    this.dialogueEl.classList.add('visible');
  }

  private drawWalkMarker(ctx: CanvasRenderingContext2D): void {
    if (this.walkMarker) {
      const { x, y } = this.walkMarker;
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 6, y);
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.blockedMarker) {
      const marker = this.blockedMarker;
      marker.life--;
      const alpha = Math.max(0, marker.life / 28);
      const radius = 6 + (1 - alpha) * 4;
      ctx.strokeStyle = `rgba(235, 63, 48, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(marker.x - radius, marker.y - radius);
      ctx.lineTo(marker.x + radius, marker.y + radius);
      ctx.moveTo(marker.x + radius, marker.y - radius);
      ctx.lineTo(marker.x - radius, marker.y + radius);
      ctx.stroke();
      if (marker.life <= 0) this.blockedMarker = null;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.backdrop.complete) {
      ctx.drawImage(this.backdrop, 0, 0, this.canvas.width, this.canvas.height);
      const tint = this.game.getCurrentArea().tint;
      if (tint) {
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    } else {
      ctx.fillStyle = '#2d5016';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.drawWalkMarker(ctx);

    type DrawItem =
      | { type: 'player'; y: number }
      | { type: 'entity'; y: number; target: EntityTarget };

    const drawOrder: DrawItem[] = [
      { type: 'player', y: this.playerPos.y },
      ...this.targets.map((t) => ({ type: 'entity' as const, y: t.y, target: t })),
    ];
    drawOrder.sort((a, b) => a.y - b.y);

    const walking = this.walkTarget !== null && !this.game.player.inCombat;
    const nightPalette =
      this.game.player.areaId === 'varrock' ||
      this.game.player.areaId === 'draynor-manor' ||
      this.game.player.areaId === 'god-wars-dungeon' ||
      this.game.player.areaId === 'morytania-swamp' ||
      this.game.player.areaId === 'tzhaar-city' ||
      this.game.player.areaId === 'elvargs-lair' ||
      this.game.player.areaId === 'dagannoth-cave' ||
      this.game.player.areaId === 'bone-king-graveyard';

    for (const item of drawOrder) {
      if (item.type === 'player') {
        drawAnimatedEntity(
          ctx,
          'player',
          this.playerPos.x,
          this.playerPos.y,
          this.playerPos.size,
          walking ? this.animFrame * 2 : this.animFrame,
          {
            hovered: false,
            inCombat: this.game.player.inCombat,
            night: nightPalette,
            facing: this.playerFacing,
            equipment: this.game.player.equipment,
          }
        );
        continue;
      }

      const target = item.target;
      const key = `${target.kind}:${target.id}`;
      const hovered = this.hoveredTargetId === key;
      const inCombat = target.kind === 'monster' && target.id === this.selectedMonsterId;
      const frame = this.animFrame + target.animOffset;
      const playerDistance = Math.hypot(this.playerPos.x - target.x, this.playerPos.y - target.y);
      const awareOfPlayer = hovered || inCombat || playerDistance < 105;
      const facing: -1 | 1 = awareOfPlayer
        ? this.playerPos.x < target.x
          ? -1
          : 1
        : target.animOffset % 2 === 0
          ? 1
          : -1;

      const bounds = drawAnimatedEntity(ctx, target.id, target.x, target.y, target.size, frame, {
        hovered,
        inCombat,
        night: nightPalette,
        facing,
      });

      if (hovered && !this.game.player.inCombat) {
        const monster = target.kind === 'monster' ? getMonster(target.id) : null;
        const npc = target.kind === 'npc' ? getNpc(target.id) : null;
        const name = monster
          ? `${monster.name} (level ${getMonsterCombatLevel(monster)})`
          : `${npc!.name}${npc!.combatLevel ? ` (level ${npc!.combatLevel})` : ''}`;
        const action =
          target.kind === 'monster' ? 'Walk here to attack' : 'Walk here to talk';
        drawHoverTooltip(ctx, target.x, bounds.top, name, action);
      }

      if (target.kind === 'monster') {
        const hpData = this.monsterHp.get(target.id);
        if (hpData && hpData.hp < hpData.maxHp) {
          drawHpBar(ctx, target.x - 28, bounds.top - 6, 56, hpData.hp, hpData.maxHp);
        }
      }
    }

    this.hitsplats = this.hitsplats.filter((h) => {
      h.life--;
      if (h.life > 0) {
        drawHitsplat(ctx, h.x, h.y - (40 - h.life), h.damage, h.missed);
        return true;
      }
      return false;
    });

    this.floatingXp = this.floatingXp.filter((f) => {
      f.life--;
      f.y -= 0.5;
      if (f.life > 0) {
        drawXpDrop(ctx, f.x, f.y, f.amount, f.life / 50);
        return true;
      }
      return false;
    });
  }
}
