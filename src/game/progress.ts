import { AGENTS, agentDef, LEVEL_EXP, MAX_LEVEL, MISSIONS, RULES } from './data';
import { levelFor } from './engine';
import type { MissionProgress, RunSummary, SaveData } from './types';

export function newSave(): SaveData {
  return { v: 1, coins: 100, missions: {}, agents: [{ id: 'ai', level: 1, exp: 0 }], welcomed: false };
}

export const progressOf = (save: SaveData, id: string): MissionProgress => save.missions[id] ?? { stars: 0, cleared: false, runs: [] };

export function isUnlocked(save: SaveData, id: string): boolean {
  const i = MISSIONS.findIndex((m) => m.id === id);
  return i <= 0 || progressOf(save, MISSIONS[i - 1].id).cleared;
}

export const totalStars = (save: SaveData) => Object.values(save.missions).reduce((a, m) => a + m.stars, 0);
export const companyLevel = (save: SaveData) => 1 + Math.floor(totalStars(save) / 3);

export interface RewardResult {
  save: SaveData;
  earned: number;
  starBonus: number;
  spent: number;
  exp: number;
  levelUp: boolean;
  newStars: number;
  firstClear: boolean;
}

/** 実行結果を反映する。テスト実行は運用コストだけかかる */
export function applyRun(save: SaveData, summary: RunSummary): RewardResult {
  const next: SaveData = structuredClone(save);
  const prev = progressOf(next, summary.missionId);
  const mp: MissionProgress = { ...prev, runs: [...prev.runs] };
  const spent = summary.cost;
  let starBonus = 0;
  let newStars = 0;
  let firstClear = false;
  if (summary.mode === 'real') {
    mp.runs.push(summary);
    if (mp.runs.length > 30) mp.runs.shift();
    if (summary.stars > mp.stars) {
      newStars = summary.stars - mp.stars;
      starBonus = newStars * RULES.starBonus;
      mp.stars = summary.stars;
    }
    if (summary.stars >= 1 && !mp.cleared) {
      mp.cleared = true;
      firstClear = true;
    }
  }
  mp.build = structuredClone(summary.build);
  next.missions[summary.missionId] = mp;
  next.coins = Math.max(0, next.coins + summary.earned + starBonus - spent);

  // 経験値:処理したメール1通につき1(本番のみ)、★ごとに+10
  let exp = 0;
  let levelUp = false;
  if (summary.mode === 'real') {
    const a = next.agents.find((x) => x.id === summary.build.agentId);
    if (a) {
      exp = Math.round((summary.total + summary.stars * 10) * (agentDef(a.id).id === 'ai' ? 1.2 : 1));
      const before = a.level;
      a.exp = Math.min(LEVEL_EXP[MAX_LEVEL - 1], a.exp + exp);
      a.level = levelFor(a.exp);
      levelUp = a.level > before;
    }
  }
  return { save: next, earned: summary.earned, starBonus, spent, exp, levelUp, newStars, firstClear };
}

export function hireAgent(save: SaveData, id: string): SaveData | string {
  const def = AGENTS.find((a) => a.id === id);
  if (!def) return 'その子はいません';
  if (save.agents.some((a) => a.id === id)) return 'もう仲間です';
  if (save.coins < def.hireCost) return `コインが足りません(${def.hireCost}🪙 必要)`;
  const next = structuredClone(save);
  next.coins -= def.hireCost;
  next.agents.push({ id, level: 1, exp: 0 });
  return next;
}
