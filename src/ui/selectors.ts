import { accidentRiskStages } from '../core/events';
import {
  agentBreakdown,
  demandFor,
  effectiveSuccess,
  expectedTokensPerCase,
  getStage,
  humanStageInfo,
  reviewPool,
  stageCapacity,
} from '../core/formulas';
import { currentStageId } from '../core/simulateWeek';
import type { GameState } from '../core/types';
import { stageDef } from '../data/stages';

export function stageView(s: GameState, id: number) {
  const def = stageDef(id);
  const st = getStage(s, id);
  const waiting = s.cases.filter((c) => currentStageId(c) === id).length;
  const capacity = stageCapacity(s, id);
  const last = s.history[s.history.length - 1]?.stageStats.find((x) => x.stageId === id);
  const lastActual = last && last.attempts > 0 ? last.attemptSuccesses / last.attempts : null;
  const isAgent = st.assignee.type === 'agent';
  const breakdown = st.assignee.type === 'agent' ? agentBreakdown(s, id, st.assignee.tier) : null;
  const human = isAgent ? null : humanStageInfo(s, id);
  const p = breakdown ? breakdown.p : human!.rate;
  const effective = effectiveSuccess(s, id);
  const tokensPerCase = st.assignee.type === 'agent' ? expectedTokensPerCase(s, id, st.assignee.tier) : 0;
  const reviewers = reviewPool(s, id);
  const reviewCap = reviewers.reduce((a, r) => a + r.remaining, 0);
  const risk = accidentRiskStages(s).includes(id);
  const workSlotsWasted = isAgent && human === null && s.staff.some((m) => m.slots.some((x) => x.kind === 'work' && x.stageId === id));
  return { def, st, waiting, capacity, lastActual, last, isAgent, breakdown, human, p, effective, tokensPerCase, reviewers, reviewCap, risk, workSlotsWasted };
}

export type StageView = ReturnType<typeof stageView>;

/** ボトルネック:滞留が能力を超えた工程と、ほかより能力が低く需要に届かない工程 */
export function bottlenecks(s: GameState): { stages: Set<number>; lineShort: boolean; minCap: number } {
  const demand = demandFor(s.reputation, s.flags.demandBonus);
  const views = s.stages.map((x) => stageView(s, x.id));
  const caps = views.map((v) => v.capacity);
  const minCap = Math.min(...caps);
  const allEqual = caps.every((c) => c === minCap);
  const stages = new Set<number>();
  for (const v of views) {
    if (v.waiting > v.capacity) stages.add(v.def.id);
    else if (!allEqual && v.capacity === minCap && minCap < demand) stages.add(v.def.id);
  }
  return { stages, lineShort: minCap < demand, minCap };
}

export function weeklyTokenEstimate(s: GameState): number {
  const demand = demandFor(s.reputation, s.flags.demandBonus);
  let t = 0;
  for (const st of s.stages) {
    if (st.assignee.type !== 'agent') continue;
    if (s.week === 1 && s.flags.executiveTrial && st.id === 4) continue;
    const v = stageView(s, st.id);
    const flow = Math.min(v.capacity, Math.max(demand, v.waiting));
    t += v.tokensPerCase * flow;
  }
  return t;
}
