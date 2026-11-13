/**
 * 実行エンジン。画面に依存しない純粋関数で、run を1歩ずつ進める。
 * 同じシード・同じ構成・同じ承認判断なら、結果は必ず同じになる。
 */
import { agentDef, CARDS, EMAILS, LEVEL_EXP, missionDef, RULES, TIERS, TROUBLES } from './data';
import { createRng } from './rng';
import type { Approval, Build, CardId, EmailState, LogEntry, MissionDef, Outcome, RunMode, RunState, RunSummary, StepDef, TroubleId } from './types';

const LOG_KEEP = 60;

export const emptyOutcomes = (): Record<Outcome, number> => ({ ok: 0, okHuman: 0, wrong: 0, missend: 0, dropped: 0 });

export function emptyBuild(mission: MissionDef, agentId = 'ai'): Build {
  const slots: Build['slots'] = {};
  for (const s of mission.steps) slots[s.id] = Array(RULES.stepSlots).fill(null);
  return { tier: 'small', slots, common: Array(RULES.commonSlots).fill(null), agentId };
}

export function hasCommon(build: Build, card: CardId) {
  return build.common.includes(card);
}

export function agentEnergyBonus(agentId: string, level: number) {
  return level - 1 + (agentDef(agentId).id === 'bell' ? 1 : 0);
}

export function maxEnergy(mission: MissionDef, agentId: string, level: number) {
  return mission.energy + agentEnergyBonus(agentId, level);
}

export function usedEnergy(build: Build): number {
  const cards = [...Object.values(build.slots).flat(), ...build.common].filter((c): c is CardId => c !== null);
  return TIERS[build.tier].energy + cards.reduce((a, c) => a + CARDS[c].cost, 0);
}

/** 実行前チェック */
export function preflight(mission: MissionDef, build: Build, energyMax: number): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const used = usedEnergy(build);
  if (used > energyMax) errors.push(`⚡段取りポイントが足りません(${used} / ${energyMax})`);
  for (const s of mission.steps) {
    if (s.needsTool && !(build.slots[s.id] ?? []).includes('tool')) warnings.push(`「${s.name}」にツールがないと、DBを見られません`);
  }
  return { errors, warnings };
}

function newEmail(index: number, seed: number): EmailState {
  return { index, template: (index * 7 + seed) % EMAILS.length, errors: [], human: false, dropped: false, missend: false };
}

export function createRun(missionId: string, build: Build, mode: RunMode, seed: number): RunState {
  const mission = missionDef(missionId);
  const total = mode === 'test' ? RULES.testEmails : mission.emails;
  return {
    missionId,
    mode,
    build: structuredClone(build),
    seed: seed >>> 0,
    rng: seed >>> 0,
    total,
    cur: 0,
    stepIdx: 0,
    email: newEmail(0, seed),
    status: 'running',
    log: [],
    logCount: 0,
    cost: 0,
    outcomes: emptyOutcomes(),
    causes: {},
    asks: 0,
  };
}

function priceFor(run: RunState) {
  const base = TIERS[run.build.tier].price;
  return agentDef(run.build.agentId).id === 'koro' ? base * 0.75 : base;
}

export function troubleChance(mission: MissionDef, step: StepDef, build: Build, t: TroubleId): number {
  let p = step.troubles[t] ?? 0;
  if (TROUBLES[t].llm) p *= TIERS[build.tier].mult;
  if (hasCommon(build, 'memory')) p *= RULES.memoryFactor[t] ?? 1;
  void mission;
  return Math.min(0.95, p);
}

/** run を1工程ぶん進める。承認待ちや終了なら何もしない */
export function advance(input: RunState): RunState {
  if (input.status !== 'running') return input;
  const run: RunState = { ...input, email: { ...input.email, errors: [...input.email.errors] }, outcomes: { ...input.outcomes }, causes: { ...input.causes }, log: input.log.slice(-LOG_KEEP) };
  const rng = createRng(run.rng);
  const mission = missionDef(run.missionId);
  const step = mission.steps[run.stepIdx];
  const cards = run.build.slots[step.id] ?? [];
  const has = (c: CardId) => cards.includes(c);
  const e = run.email;
  const log = (kind: LogEntry['kind'], trouble?: TroubleId, outcome?: Outcome) => {
    run.log.push({ n: run.logCount++, email: run.cur, step: run.stepIdx, kind, trouble, outcome });
  };
  const cause = (t: TroubleId) => (run.causes[t] = (run.causes[t] ?? 0) + 1);
  const think = () => {
    if (step.llm) run.cost += priceFor(run);
  };

  think();
  let stepError: TroubleId | undefined;

  // 顧客情報を見ずに回答
  if (step.needsTool && !has('tool') && rng.next() < RULES.noToolLookup) {
    stepError = 'nolookup';
  }

  for (const t of Object.keys(step.troubles) as TroubleId[]) {
    if (e.dropped || e.missend) break;
    if (rng.next() >= troubleChance(mission, step, run.build, t)) continue;
    log('trouble', t);
    if (t === 'timeout') {
      if (has('retry') && rng.next() < RULES.retryFix) {
        think();
        log('retry', t);
        if (step.sends && rng.next() < RULES.retryDuplicate) {
          // 送信のリトライは、じつは1通目が届いていて二重送信になることがある
          if (has('guard')) log('blocked', 'duplicate');
          else {
            e.missend = true;
            cause('duplicate');
            log('missend', 'duplicate');
          }
        }
      } else {
        e.dropped = true;
        cause('timeout');
        log('drop', 'timeout');
      }
    } else if (t === 'duplicate') {
      if (has('guard')) log('blocked', t);
      else {
        e.missend = true;
        cause('duplicate');
        log('missend', 'duplicate');
      }
    } else if (!stepError) {
      stepError = t;
    }
  }

  if (stepError && !e.dropped) {
    if (has('validate') && stepError !== 'missing' && rng.next() < RULES.validateFix) {
      think();
      log('fixed', stepError);
      stepError = undefined;
    }
  }

  // 人の承認
  if (has('human') && !e.dropped && !e.missend) {
    const ask = stepError ? rng.next() < RULES.askWhenBad : rng.next() < RULES.askWhenOk;
    if (ask) {
      const pending: Approval = { email: run.cur, step: run.stepIdx, bad: !!stepError, trouble: stepError, template: e.template };
      if (stepError) e.errors.push(stepError);
      log('ask', stepError);
      run.asks++;
      run.pending = pending;
      run.status = 'awaiting';
      run.rng = rng.state();
      return run;
    }
  }

  if (stepError) e.errors.push(stepError);
  if (!stepError && !e.dropped && !e.missend) log('ok');
  run.rng = rng.state();
  return nextStep(run);
}

/** 承認待ちに答える。approve = そのまま進める / reject = 差し戻して人が直す */
export function resolveApproval(input: RunState, decision: 'approve' | 'reject'): RunState {
  if (input.status !== 'awaiting' || !input.pending) return input;
  const run: RunState = { ...input, email: { ...input.email, errors: [...input.email.errors] }, log: input.log.slice(-LOG_KEEP), pending: undefined, status: 'running' };
  const p = input.pending;
  run.email.human = true;
  if (decision === 'reject' && p.trouble) {
    const i = run.email.errors.lastIndexOf(p.trouble);
    if (i >= 0) run.email.errors.splice(i, 1);
  }
  run.log.push({ n: run.logCount++, email: run.cur, step: run.stepIdx, kind: 'human', trouble: decision === 'approve' ? p.trouble : undefined });
  return nextStep(run);
}

function nextStep(run: RunState): RunState {
  const mission = missionDef(run.missionId);
  const e = run.email;
  run.stepIdx++;
  if (run.stepIdx < mission.steps.length && !e.dropped) return run;
  // メール1通の処理が完了
  let outcome: Outcome;
  if (e.dropped) outcome = 'dropped';
  else if (e.missend) outcome = 'missend';
  else if (e.errors.length > 0) outcome = 'wrong';
  else if (e.human) outcome = 'okHuman';
  else outcome = 'ok';
  if (outcome === 'wrong') for (const t of e.errors) run.causes[t] = (run.causes[t] ?? 0) + 1;
  run.outcomes = { ...run.outcomes, [outcome]: run.outcomes[outcome] + 1 };
  run.log.push({ n: run.logCount++, email: run.cur, step: Math.min(run.stepIdx, mission.steps.length - 1), kind: 'done', outcome });
  run.cur++;
  run.stepIdx = 0;
  if (run.cur >= run.total) {
    run.status = 'done';
    return run;
  }
  run.email = newEmail(run.cur, run.seed);
  return run;
}

export function stopRun(run: RunState): RunState {
  if (run.status === 'done') return run;
  return { ...run, status: 'stopped', pending: undefined };
}

export const pauseRun = (run: RunState): RunState => (run.status === 'running' ? { ...run, status: 'paused' } : run);
export const resumeRun = (run: RunState): RunState => (run.status === 'paused' ? { ...run, status: 'running' } : run);

export function causesVisible(mission: MissionDef, build: Build) {
  return mission.mentor || hasCommon(build, 'log');
}

export function starsFor(mission: MissionDef, s: { accuracy: number; auto: number; cost: number; outcomes: Record<Outcome, number> }, total: number): number {
  if (s.accuracy + 1e-9 < mission.goals.accuracy) return 0;
  let stars = 1;
  if (s.outcomes.missend === 0) stars = 2;
  const budget = (mission.budget * total) / mission.emails;
  if (stars === 2 && s.auto + 1e-9 >= mission.goals.auto && s.cost <= budget + 1e-9) stars = 3;
  return stars;
}

/** 処理済みの件数で集計する(途中停止でも) */
export function summarize(run: RunState): RunSummary {
  const mission = missionDef(run.missionId);
  const processed = Object.values(run.outcomes).reduce((a, b) => a + b, 0);
  const total = run.status === 'done' ? run.total : Math.max(processed, 1);
  const good = run.outcomes.ok + run.outcomes.okHuman;
  const accuracy = processed === 0 ? 0 : good / total;
  const auto = processed === 0 ? 0 : run.outcomes.ok / total;
  const base = { accuracy, auto, cost: Math.round(run.cost), outcomes: run.outcomes };
  const stars = run.status === 'done' ? starsFor(mission, base, run.total) : 0;
  const earned =
    run.mode === 'real' && run.status === 'done' ? Math.max(0, Math.round(mission.reward * accuracy) - run.outcomes.missend * RULES.missendPenalty) : 0;
  return {
    at: Date.now(),
    missionId: run.missionId,
    mode: run.mode,
    total: run.status === 'done' ? run.total : processed,
    outcomes: { ...run.outcomes },
    accuracy,
    auto,
    cost: base.cost,
    stars,
    causes: { ...run.causes },
    causesVisible: causesVisible(mission, run.build),
    build: structuredClone(run.build),
    earned,
  };
}

export function levelFor(exp: number): number {
  let lv = 1;
  for (let i = 0; i < LEVEL_EXP.length; i++) if (exp >= LEVEL_EXP[i]) lv = i + 1;
  return lv;
}

/** 自動で最後まで回す(テスト・バランス検証用)。承認は judge が答える */
export function runToEnd(run: RunState, judge: (a: Approval) => 'approve' | 'reject' = (a) => (a.bad ? 'reject' : 'approve')): RunState {
  let r = run;
  let guard = 0;
  while (r.status === 'running' || r.status === 'awaiting') {
    r = r.status === 'awaiting' ? resolveApproval(r, judge(r.pending!)) : advance(r);
    if (++guard > 100000) throw new Error('runToEnd: loop');
  }
  return r;
}
