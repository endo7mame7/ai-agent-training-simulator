import { BALANCE } from '../data/balance';
import { isVeteranAway } from '../data/events';
import { ENCODINGS, KNACKS } from '../data/knacks';
import { MODELS } from '../data/models';
import { RANKS } from '../data/staff';
import { stageDef } from '../data/stages';
import type { Difficulty, GameState, KnackDef, ModelTier, StaffRank, StageState } from './types';

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const getStage = (state: GameState, stageId: number): StageState => {
  const s = state.stages.find((x) => x.id === stageId);
  if (!s) throw new Error(`stage ${stageId}`);
  return s;
};

export const hasStagePart = (state: GameState, stageId: number, part: StageState['parts'][number]) =>
  getStage(state, stageId).parts.includes(part);

/** モデル等級と難度で決まる基礎成功率 B(新世代補正込み) */
export function baseSuccess(tier: ModelTier, difficulty: Difficulty, modelGen: number): number {
  const b = MODELS[tier].base[difficulty];
  return modelGen >= 2 ? Math.min(BALANCE.maxSuccess, b + BALANCE.newGenBonus) : b;
}

export function unitPrice(tier: ModelTier, modelGen: number): number {
  const p = MODELS[tier].unitPrice;
  return modelGen >= 2 ? p * BALANCE.newGenPriceFactor : p;
}

/** 落とし込みが有効か(前提部品が設置済みのときだけ有効) */
export function encodingActive(state: GameState, knack: KnackDef): boolean {
  const ks = state.knacks[knack.id];
  if (!ks?.encoding) return false;
  const req = ENCODINGS[ks.encoding].requires;
  if (req.scope === 'line') return state.lineParts.includes(req.part);
  return hasStagePart(state, knack.stageId, req.part);
}

/** カンコツの解消率 c(未対応なら0) */
export function knackResolution(state: GameState, knack: KnackDef): number {
  if (!encodingActive(state, knack)) return 0;
  const enc = state.knacks[knack.id].encoding!;
  return knack.encodings[enc] ?? 0;
}

/** コンテキスト負荷 L = 手順書1 + ルール化数×1 + 事例メモリ化数×2 */
export function contextLoad(state: GameState, stageId: number): number {
  let L = hasStagePart(state, stageId, 'manual') ? 1 : 0;
  for (const k of KNACKS) {
    if (k.stageId !== stageId || !encodingActive(state, k)) continue;
    L += ENCODINGS[state.knacks[k.id].encoding!].load;
  }
  return L;
}

export interface AgentBreakdown {
  B: number;
  T: number;
  K: number;
  C: number;
  L: number;
  cap: number;
  p: number;
  /** 原因タグの寄与(タグ → 大きさ) */
  contributions: { tag: string; weight: number }[];
}

export function agentBreakdown(state: GameState, stageId: number, tier: ModelTier): AgentBreakdown {
  const def = stageDef(stageId);
  const B = baseSuccess(tier, def.difficulty, state.flags.modelGen);
  const T = def.toolRequired && !hasStagePart(state, stageId, 'toolLink') ? BALANCE.noToolFactor : 1;
  let K = 1;
  const contributions: { tag: string; weight: number }[] = [];
  for (const k of KNACKS) {
    if (k.stageId !== stageId) continue;
    const c = knackResolution(state, k);
    const w = k.weight * (1 - c);
    K *= 1 - w;
    if (w > 0) contributions.push({ tag: k.id, weight: w });
  }
  const L = contextLoad(state, stageId);
  const cap = MODELS[tier].contextCap;
  const C = Math.pow(BALANCE.contextPenaltyBase, Math.max(0, L - cap));
  if (T < 1) contributions.push({ tag: 'tool', weight: 1 - T });
  if (C < 1) contributions.push({ tag: 'context', weight: 1 - C });
  if (B < 1) contributions.push({ tag: 'model', weight: 1 - B });
  const p = clamp(B * T * K * C, BALANCE.minSuccess, BALANCE.maxSuccess);
  return { B, T, K, C, L, cap, p, contributions };
}

/** 試行1回あたりのトークン代 = 単価 × 処理単位 × (1 + 0.15 × L) */
export function tokenCostPerAttempt(state: GameState, stageId: number, tier: ModelTier): number {
  const def = stageDef(stageId);
  return unitPrice(tier, state.flags.modelGen) * def.hours * (1 + BALANCE.tokenLoadFactor * contextLoad(state, stageId));
}

export interface Contributor {
  staffId: string;
  rank: StaffRank;
  slots: number;
}

/** その週に工程作業/レビュー/ヒアリングに使えるコマ(ベテラン不在週はベテラン0) */
export function slotsFor(state: GameState, kind: 'work' | 'review' | 'interview', stageId: number, week = state.week): Contributor[] {
  const out: Contributor[] = [];
  for (const st of state.staff) {
    if (st.rank === 'veteran' && isVeteranAway(week)) continue;
    const n = st.slots.filter((s) => s.kind === kind && s.stageId === stageId).length;
    if (n > 0) out.push({ staffId: st.id, rank: st.rank, slots: n });
  }
  return out;
}

export interface HumanStageInfo {
  hours: number;
  capacity: number;
  rate: number;
  contributors: Contributor[];
}

/** 人の工程の処理能力と成功率(コマ数で加重平均) */
export function humanStageInfo(state: GameState, stageId: number, week = state.week): HumanStageInfo {
  const def = stageDef(stageId);
  const contributors = slotsFor(state, 'work', stageId, week);
  const slotTotal = contributors.reduce((s, c) => s + c.slots, 0);
  const hours = getStage(state, stageId).carryHours + slotTotal * BALANCE.hoursPerSlot;
  const rate =
    slotTotal === 0 ? 0 : contributors.reduce((s, c) => s + RANKS[c.rank].success[def.difficulty] * c.slots, 0) / slotTotal;
  return { hours, capacity: Math.floor(hours / def.hours + 1e-9), rate, contributors };
}

export interface ReviewerPool {
  rate: number;
  remaining: number;
}

/** 承認ゲートのレビュー担当(検出率の高い順) */
export function reviewPool(state: GameState, stageId: number, week = state.week): ReviewerPool[] {
  return slotsFor(state, 'review', stageId, week)
    .map((c) => ({ rate: RANKS[c.rank].reviewDetect, remaining: c.slots * BALANCE.reviewCasesPerSlot }))
    .sort((a, b) => b.rate - a.rate);
}

/** その工程の週あたり処理能力(件) */
export function stageCapacity(state: GameState, stageId: number, week = state.week): number {
  const s = getStage(state, stageId);
  if (s.assignee.type === 'agent') return BALANCE.agentCapacityPerWeek;
  return humanStageInfo(state, stageId, week).capacity;
}

/** 1回の試行の成功率(人なら加重平均) */
export function stageSuccess(state: GameState, stageId: number, week = state.week): number {
  const s = getStage(state, stageId);
  if (s.assignee.type === 'agent') return agentBreakdown(state, stageId, s.assignee.tier).p;
  return humanStageInfo(state, stageId, week).rate;
}

export function demandFor(reputation: number, bonus: number): number {
  return Math.min(BALANCE.demandMax, Math.round(reputation / BALANCE.demandDivisor) + bonus);
}

/** 受注から出図までの週数に応じた売上の係数 */
export function revenueFactor(weeksTaken: number): number {
  if (weeksTaken <= BALANCE.dueWeeks) return 1;
  return Math.max(BALANCE.lateFloor, 1 - BALANCE.latePenaltyPerWeek * (weeksTaken - BALANCE.dueWeeks));
}

export const salaryTotal = (state: GameState) => state.staff.reduce((s, st) => s + RANKS[st.rank].salary, 0);

/** 今週着手した(まだ計上されていない)開発費 */
export const pendingDevCost = (state: GameState) =>
  state.devQueue.filter((j) => j.startedWeek === state.week).reduce((s, j) => s + j.cost, 0);

export const availableCash = (state: GameState) => state.cash - pendingDevCost(state);

/** 期待トークン代(件あたり、再試行の期待値込み) */
export function expectedTokensPerCase(state: GameState, stageId: number, tier: ModelTier): number {
  const { p } = agentBreakdown(state, stageId, tier);
  const unit = tokenCostPerAttempt(state, stageId, tier);
  let attempts = 1;
  if (hasStagePart(state, stageId, 'verifyLoop')) {
    let reach = 1;
    for (let i = 0; i < BALANCE.verifyMaxRetries; i++) {
      reach *= (1 - p) * BALANCE.verifyDetect;
      attempts += reach;
    }
  }
  return unit * attempts;
}

/** 工程の実効成功率(検証ループ込みで、最終的に潜在不良が残らない確率。承認ゲートは除く) */
export function effectiveSuccess(state: GameState, stageId: number): number {
  const s = getStage(state, stageId);
  const p = stageSuccess(state, stageId);
  if (s.assignee.type !== 'agent' || !s.parts.includes('verifyLoop')) return p;
  let fail = 1 - p;
  let res = p;
  for (let i = 0; i < BALANCE.verifyMaxRetries; i++) {
    const retry = fail * BALANCE.verifyDetect;
    res += retry * p;
    fail = retry * (1 - p);
  }
  return res;
}
