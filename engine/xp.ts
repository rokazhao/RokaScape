const XP_TABLE: number[] = [0];

for (let level = 1; level <= 99; level++) {
  const prev = XP_TABLE[level - 1] ?? 0;
  XP_TABLE[level] = prev + Math.floor(level + 300 * Math.pow(2, level / 7));
}

export function xpForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(99, level));
  return Math.floor(XP_TABLE[clamped]! / 4);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 2; i <= 99; i++) {
    if (xp >= xpForLevel(i)) {
      level = i;
    } else {
      break;
    }
  }
  return level;
}

export function xpToNextLevel(xp: number, level: number): number {
  if (level >= 99) return 0;
  return xpForLevel(level + 1) - xp;
}

export interface LevelUpResult {
  newLevel: number;
  levelsGained: number;
  statBonus: { maxHp: number; atk: number; str: number; def: number };
}

export function applyXp(currentXp: number, currentLevel: number, amount: number): {
  xp: number;
  level: number;
  levelUp: LevelUpResult | null;
} {
  let xp = currentXp + amount;
  let level = currentLevel;
  let levelsGained = 0;

  while (level < 99 && xp >= xpForLevel(level + 1)) {
    level++;
    levelsGained++;
  }

  const levelUp =
    levelsGained > 0
      ? {
          newLevel: level,
          levelsGained,
          statBonus: {
            maxHp: 5 * levelsGained,
            atk: levelsGained,
            str: levelsGained,
            def: levelsGained,
          },
        }
      : null;

  return { xp, level, levelUp };
}
