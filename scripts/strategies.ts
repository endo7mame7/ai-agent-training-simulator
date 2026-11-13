/**
 * ヘッドレス実行用の自動プレイ戦略。各週の計画フェーズで state を受け取り、計画済みの state を返す。
 */
import {
  setAssignee,
  setSlot,
  startEncoding,
  startLinePart,
  startLogAnalysis,
  startStagePart,
  toggleApprovalGate,
  type ActionResult,
} from '../src/core/actions';
import { effectiveSuccess, getStage } from '../src/core/formulas';
import type { Encoding, GameState, LinePart, ModelTier, SlotAssignment, StagePart } from '../src/core/types';
import { BALANCE } from '../src/data/balance';
import { KNACKS } from '../src/data/knacks';
import { RANKS } from '../src/data/staff';
import { STAGES, stageDef } from '../src/data/stages';

export type Strategy = (state: GameState) => GameState;

const apply = (state: GameState, r: ActionResult) => (r.ok ? r.state : state);

export const doNothing: Strategy = (s) => s;

/** 全工程に大モデルを素で配備(人は遊ばせる) */
export const allLargeRaw: Strategy = (s) => {
  let st = s;
  for (const stage of STAGES) st = apply(st, setAssignee(st, stage.id, { type: 'agent', tier: 'large' }));
  return st;
};

type Plan =
  | { t: 'line'; part: LinePart }
  | { t: 'stage'; stageId: number; part: StagePart }
  | { t: 'enc'; knackId: string; enc: Encoding }
  | { t: 'log'; stageId: number };

/** 模範プレイの開発順(上から、着手できるものを着手する) */
export const MODEL_PLAN: Plan[] = [
  { t: 'line', part: 'logMonitor' },
  { t: 'stage', stageId: 1, part: 'manual' },
  { t: 'stage', stageId: 1, part: 'verifyLoop' },
  { t: 'enc', knackId: 'K02', enc: 'checklist' },
  { t: 'enc', knackId: 'K01', enc: 'rule' },
  { t: 'enc', knackId: 'K03', enc: 'rule' },
  { t: 'stage', stageId: 5, part: 'toolLink' },
  { t: 'stage', stageId: 5, part: 'guardrail' },
  { t: 'enc', knackId: 'K13', enc: 'tool' },
  { t: 'stage', stageId: 5, part: 'manual' },
  { t: 'enc', knackId: 'K12', enc: 'rule' },
  { t: 'stage', stageId: 3, part: 'toolLink' },
  { t: 'stage', stageId: 3, part: 'guardrail' },
  { t: 'stage', stageId: 3, part: 'verifyLoop' },
  { t: 'enc', knackId: 'K07', enc: 'checklist' },
  { t: 'enc', knackId: 'K08', enc: 'checklist' },
  { t: 'log', stageId: 3 },
  { t: 'stage', stageId: 6, part: 'manual' },
  { t: 'stage', stageId: 6, part: 'verifyLoop' },
  { t: 'enc', knackId: 'K14', enc: 'checklist' },
  { t: 'enc', knackId: 'K15', enc: 'rule' },
  { t: 'log', stageId: 6 },
  { t: 'stage', stageId: 5, part: 'verifyLoop' },
  // 以下は工程2・4も任せる場合
  { t: 'stage', stageId: 4, part: 'toolLink' },
  { t: 'stage', stageId: 4, part: 'guardrail' },
  { t: 'stage', stageId: 4, part: 'verifyLoop' },
  { t: 'enc', knackId: 'K09', enc: 'tool' },
  { t: 'line', part: 'caseMemory' },
  { t: 'enc', knackId: 'K10', enc: 'memory' },
  { t: 'stage', stageId: 2, part: 'verifyLoop' },
  { t: 'enc', knackId: 'K04', enc: 'checklist' },
  { t: 'enc', knackId: 'K05', enc: 'memory' },
];

const tryPlan = (s: GameState, p: Plan): ActionResult => {
  switch (p.t) {
    case 'line':
      return startLinePart(s, p.part);
    case 'stage':
      return startStagePart(s, p.stageId, p.part);
    case 'enc':
      return startEncoding(s, p.knackId, p.enc);
    case 'log':
      return startLogAnalysis(s, p.stageId);
  }
};

const planDone = (s: GameState, p: Plan): boolean => {
  switch (p.t) {
    case 'line':
      return s.lineParts.includes(p.part) || s.devQueue.some((j) => j.kind === 'linePart' && j.part === p.part);
    case 'stage':
      return getStage(s, p.stageId).parts.includes(p.part) || s.devQueue.some((j) => j.kind === 'stagePart' && j.stageId === p.stageId && j.part === p.part);
    case 'enc':
      return s.knacks[p.knackId].encoding === p.enc || s.devQueue.some((j) => j.kind === 'encoding' && j.knackId === p.knackId);
    case 'log':
      return !KNACKS.some((k) => k.stageId === p.stageId && k.kind !== 'sense' && !s.knacks[k.id].discovered);
  }
};

const planStage = (p: Plan): number | undefined =>
  p.t === 'line' ? undefined : p.t === 'enc' ? KNACKS.find((k) => k.id === p.knackId)!.stageId : p.stageId;

type Rank = keyof typeof RANKS;

/**
 * 20コマを配る。順番は ヒアリング → 必須レビュー → 人の工程 → 任意レビュー → 残りを人の工程へ
 */
export function allocateStaff(
  s: GameState,
  humanStages: number[],
  requiredGates: number[],
  optionalGates: number[],
  maxTarget: number,
  interviewStage?: number,
): GameState {
  const pool: { staffId: string; index: number; rank: Rank }[] = [];
  for (const st of s.staff) for (let i = 0; i < BALANCE.slotsPerStaff; i++) pool.push({ staffId: st.id, index: i, rank: st.rank });
  const assign = new Map<string, SlotAssignment>();
  const key = (x: { staffId: string; index: number }) => `${x.staffId}:${x.index}`;
  const free = () => pool.filter((p) => !assign.has(key(p))).length;
  const take = (order: Rank[]) => {
    for (const r of order) {
      const x = pool.find((p) => p.rank === r && !assign.has(key(p)));
      if (x) return x;
    }
    return undefined;
  };
  const reviewNeed = Math.ceil(maxTarget / BALANCE.reviewCasesPerSlot);
  if (interviewStage !== undefined) {
    const v = take(['veteran']);
    if (v) assign.set(key(v), { kind: 'interview', stageId: interviewStage });
  }
  for (const id of requiredGates) {
    for (let i = 0; i < reviewNeed; i++) {
      const x = take(['veteran', 'mid', 'junior']);
      if (x) assign.set(key(x), { kind: 'review', stageId: id });
    }
  }
  const slotsNeeded = (t: number) => humanStages.reduce((a, id) => a + Math.ceil((t * stageDef(id).hours) / BALANCE.hoursPerSlot), 0);
  let target = maxTarget;
  while (target > 1 && slotsNeeded(target) > free()) target--;
  const d = { high: 0, mid: 1, low: 2 } as const;
  const order = [...humanStages].sort((a, b) => d[stageDef(a).difficulty] - d[stageDef(b).difficulty]);
  for (const id of order) {
    const def = stageDef(id);
    const need = Math.ceil((target * def.hours) / BALANCE.hoursPerSlot);
    const ranks: Rank[] = def.difficulty === 'high' ? ['veteran', 'mid', 'junior'] : def.difficulty === 'mid' ? ['mid', 'junior', 'veteran'] : ['junior', 'mid', 'veteran'];
    for (let i = 0; i < need; i++) {
      const x = take(ranks);
      if (x) assign.set(key(x), { kind: 'work', stageId: id });
    }
  }
  for (const id of optionalGates) {
    for (let i = 0; i < reviewNeed && free() > 0; i++) {
      const x = take(['mid', 'veteran', 'junior']);
      if (x) assign.set(key(x), { kind: 'review', stageId: id });
    }
  }
  for (const x of pool) {
    if (assign.has(key(x)) || order.length === 0) continue;
    assign.set(key(x), { kind: 'work', stageId: order[0] });
  }
  let next = s;
  for (const x of pool) next = apply(next, setSlot(next, x.staffId, x.index, assign.get(key(x)) ?? { kind: 'idle' }));
  // レビュー担当がついた工程だけ承認ゲートを有効に
  for (const st of next.stages) {
    const reviewed = next.staff.some((m) => m.slots.some((sl) => sl.kind === 'review' && sl.stageId === st.id));
    if (reviewed !== st.parts.includes('approvalGate')) next = apply(next, toggleApprovalGate(next, st.id));
  }
  return next;
}

export interface ModelPlayOptions {
  /** 工程1〜5をエージェントに任せる実効成功率の下限 */
  threshold?: number;
  /** 工程6をエージェントに任せる実効成功率の下限 */
  finalThreshold?: number;
  /** 感覚型カンコツのある工程2・4は人に残す */
  senseStagesHuman?: boolean;
  tiers?: ModelTier[];
}

/** 模範プレイ:ハーネスを整え、整った工程から小・中モデルに任せる。感覚型の残る工程は人 */
export function modelPlay(options: ModelPlayOptions = {}): Strategy {
  const threshold = options.threshold ?? 0.85;
  const finalThreshold = options.finalThreshold ?? 0.93;
  const senseHuman = options.senseStagesHuman ?? true;
  const tiers = options.tiers ?? ['small', 'medium'];
  const humanOnly = senseHuman ? [2, 4] : [];
  return (input) => {
    let s = input;
    for (const p of MODEL_PLAN) {
      if (s.devQueue.length >= BALANCE.maxConcurrentDev) break;
      const sid = planStage(p);
      if (sid !== undefined && humanOnly.includes(sid)) continue;
      if (p.t === 'line' && p.part === 'caseMemory' && senseHuman) continue;
      if (planDone(s, p)) continue;
      // 前週までに使える資金を残しておく
      s = apply(s, tryPlan(s, p));
    }
    const humanStages: number[] = [];
    const requiredGates: number[] = [];
    const optionalGates: number[] = [];
    for (const def of STAGES) {
      const st = getStage(s, def.id);
      if (humanOnly.includes(def.id)) {
        humanStages.push(def.id);
        continue;
      }
      const need = def.id === 6 ? finalThreshold : threshold;
      let chosen: ModelTier | null = null;
      for (const tier of tiers) {
        const trial = apply(s, setAssignee(s, def.id, { type: 'agent', tier }));
        if (effectiveSuccess(trial, def.id) >= need) {
          chosen = tier;
          break;
        }
      }
      const safe = !st.parts.includes('toolLink') || st.parts.includes('guardrail');
      if (chosen && safe && (!def.toolRequired || st.parts.includes('toolLink'))) {
        s = apply(s, setAssignee(s, def.id, { type: 'agent', tier: chosen }));
        (def.id === 6 ? requiredGates : optionalGates).push(def.id);
      } else {
        s = apply(s, setAssignee(s, def.id, { type: 'human' }));
        humanStages.push(def.id);
      }
    }
    const interviewOrder = [1, 5, 3, 6, ...humanOnly, 2, 4].filter((v, i, a) => a.indexOf(v) === i);
    const interview = interviewOrder.find((id) => KNACKS.some((k) => k.stageId === id && !s.knacks[k.id].discovered));
    return allocateStaff(s, humanStages, requiredGates, optionalGates, 10, interview);
  };
}

export const STRATEGIES: Record<string, Strategy> = {
  何もしない: doNothing,
  全工程に大モデルを素で配備: allLargeRaw,
  模範プレイ: modelPlay(),
};
