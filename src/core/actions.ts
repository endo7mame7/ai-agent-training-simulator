/**
 * 計画フェーズの操作。どれも state を書き換えず、新しい state か、できない理由(1行)を返す。
 */
import { BALANCE } from '../data/balance';
import { ENCODINGS, knackDef } from '../data/knacks';
import { LINE_PARTS, STAGE_PARTS } from '../data/parts';
import { stageDef } from '../data/stages';
import { availableCash, getStage } from './formulas';
import { clone } from './init';
import type { Assignee, DevJob, Encoding, GameState, LinePart, SlotAssignment, StagePart } from './types';

export type ActionResult = { ok: true; state: GameState } | { ok: false; reason: string };

const ok = (state: GameState): ActionResult => ({ ok: true, state });
const ng = (reason: string): ActionResult => ({ ok: false, reason });

export function setAssignee(state: GameState, stageId: number, assignee: Assignee): ActionResult {
  if (state.week === 1 && state.flags.executiveTrial && stageId === 4) return ng('今週の工程4は役員の一声で大モデルを試用中です');
  const next = clone(state);
  getStage(next, stageId).assignee = clone(assignee);
  return ok(next);
}

export function setSlot(state: GameState, staffId: string, index: number, slot: SlotAssignment): ActionResult {
  const st = state.staff.find((s) => s.id === staffId);
  if (!st) return ng('人員が見つかりません');
  if (index < 0 || index >= BALANCE.slotsPerStaff) return ng('コマの番号が不正です');
  if (slot.kind === 'interview' && st.rank !== 'veteran') return ng('ヒアリングに協力できるのはベテランだけです');
  const next = clone(state);
  next.staff.find((s) => s.id === staffId)!.slots[index] = clone(slot);
  return ok(next);
}

export function toggleApprovalGate(state: GameState, stageId: number): ActionResult {
  const next = clone(state);
  const s = getStage(next, stageId);
  s.parts = s.parts.includes('approvalGate') ? s.parts.filter((p) => p !== 'approvalGate') : [...s.parts, 'approvalGate'];
  return ok(next);
}

export function setExecutiveTrial(state: GameState, on: boolean): ActionResult {
  if (state.week !== 1) return ng('役員の一声は第1週だけです');
  if (state.flags.executiveTrial === on) return ok(state);
  const next = clone(state);
  const s4 = getStage(next, 4);
  if (on) {
    next.flags.trialPrevAssignee = clone(s4.assignee);
    s4.assignee = { type: 'agent', tier: 'large' };
  } else {
    s4.assignee = next.flags.trialPrevAssignee ?? { type: 'human' };
    next.flags.trialPrevAssignee = undefined;
  }
  next.flags.executiveTrial = on;
  return ok(next);
}

function devSlotReason(state: GameState, cost: number): string | null {
  if (state.devQueue.length >= BALANCE.maxConcurrentDev) return `同時に進められる開発は${BALANCE.maxConcurrentDev}件までです`;
  if (availableCash(state) < cost) return `予算が足りません(必要 ${cost}万円 / 使える資金 ${Math.floor(availableCash(state))}万円)`;
  return null;
}

type NewJob = DevJob extends infer J ? (J extends DevJob ? Omit<J, 'id' | 'startedWeek'> : never) : never;

function pushJob(state: GameState, job: NewJob): GameState {
  const next = clone(state);
  next.devQueue.push({ ...job, id: `J${next.nextJobNo++}`, startedWeek: next.week } as DevJob);
  return next;
}

export function stagePartReason(state: GameState, stageId: number, part: StagePart): string | null {
  const s = getStage(state, stageId);
  if (part === 'approvalGate') return null;
  if (s.parts.includes(part)) return '設置済みです';
  if (state.devQueue.some((j) => j.kind === 'stagePart' && j.stageId === stageId && j.part === part)) return '開発中です';
  if (part === 'toolLink' && !stageDef(stageId).toolRequired) return 'この工程にはつなぐツールがありません';
  return devSlotReason(state, STAGE_PARTS[part].cost);
}

export function startStagePart(state: GameState, stageId: number, part: StagePart): ActionResult {
  if (part === 'approvalGate') return toggleApprovalGate(state, stageId);
  const reason = stagePartReason(state, stageId, part);
  if (reason) return ng(reason);
  const def = STAGE_PARTS[part];
  return ok(pushJob(state, { kind: 'stagePart', stageId, part, weeksLeft: def.weeks, cost: def.cost }));
}

export function linePartReason(state: GameState, part: LinePart): string | null {
  if (state.lineParts.includes(part)) return '設置済みです';
  if (state.devQueue.some((j) => j.kind === 'linePart' && j.part === part)) return '開発中です';
  return devSlotReason(state, LINE_PARTS[part].cost);
}

export function startLinePart(state: GameState, part: LinePart): ActionResult {
  const reason = linePartReason(state, part);
  if (reason) return ng(reason);
  const def = LINE_PARTS[part];
  return ok(pushJob(state, { kind: 'linePart', part, weeksLeft: def.weeks, cost: def.cost }));
}

export function encodingReason(state: GameState, knackId: string, encoding: Encoding): string | null {
  const k = knackDef(knackId);
  const ks = state.knacks[knackId];
  if (!ks.discovered) return 'まだ判明していないカンコツです';
  if (k.kind === 'sense') return '感覚型のカンコツはハーネスに落とせません';
  if (k.encodings[encoding] === undefined) return `このカンコツは${ENCODINGS[encoding].name}できません`;
  if (ks.encoding === encoding) return '落とし込み済みです';
  if (state.devQueue.some((j) => j.kind === 'encoding' && j.knackId === knackId)) return 'このカンコツは開発中です';
  const req = ENCODINGS[encoding].requires;
  if (req.scope === 'line' && !state.lineParts.includes(req.part)) return `前提の${LINE_PARTS[req.part].name}が未設置です`;
  if (req.scope === 'stage' && !getStage(state, k.stageId).parts.includes(req.part))
    return `前提の${STAGE_PARTS[req.part].name}(工程${k.stageId})が未設置です`;
  return devSlotReason(state, ENCODINGS[encoding].cost);
}

export function startEncoding(state: GameState, knackId: string, encoding: Encoding): ActionResult {
  const reason = encodingReason(state, knackId, encoding);
  if (reason) return ng(reason);
  const def = ENCODINGS[encoding];
  return ok(pushJob(state, { kind: 'encoding', knackId, encoding, weeksLeft: def.weeks, cost: def.cost }));
}

export function logAnalysisReason(state: GameState, stageId: number): string | null {
  if (state.devQueue.some((j) => j.kind === 'logAnalysis' && j.stageId === stageId)) return 'この工程のログ分析は実施中です';
  return devSlotReason(state, BALANCE.logAnalysisCost);
}

export function startLogAnalysis(state: GameState, stageId: number): ActionResult {
  const reason = logAnalysisReason(state, stageId);
  if (reason) return ng(reason);
  return ok(pushJob(state, { kind: 'logAnalysis', stageId, weeksLeft: BALANCE.logAnalysisWeeks, cost: BALANCE.logAnalysisCost }));
}

/** 今週着手した開発だけ取り消せる(費用はまだ計上されていない) */
export function cancelDev(state: GameState, jobId: string): ActionResult {
  const job = state.devQueue.find((j) => j.id === jobId);
  if (!job) return ng('開発が見つかりません');
  if (job.startedWeek !== state.week) return ng('先週以前に着手した開発は取り消せません');
  const next = clone(state);
  next.devQueue = next.devQueue.filter((j) => j.id !== jobId);
  return ok(next);
}
