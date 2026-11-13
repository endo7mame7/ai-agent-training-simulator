import { BALANCE } from '../data/balance';
import { isVeteranAway } from '../data/events';
import { ENCODINGS, KNACKS, knackDef } from '../data/knacks';
import { LINE_PARTS, STAGE_PARTS } from '../data/parts';
import { STAGES, stageDef } from '../data/stages';
import { applyWeekEvents } from './events';
import {
  agentBreakdown,
  clamp,
  demandFor,
  humanStageInfo,
  reviewPool,
  revenueFactor,
  salaryTotal,
  tokenCostPerAttempt,
} from './formulas';
import { clone } from './init';
import { createRng, pickWeighted } from './rng';
import { tagLabel } from './tags';
import type { CaseState, CaseTrace, DevJob, FailureRecord, GameState, StageWeekStats, WeekReport } from './types';

export const currentStageId = (c: CaseState): number => (c.rework.length > 0 ? c.rework[0] : STAGES[c.stageIndex].id);

const caseOrder = (a: CaseState, b: CaseState) =>
  a.acceptedWeek - b.acceptedWeek || Number(a.id.slice(1)) - Number(b.id.slice(1));

export function describeJob(job: DevJob): string {
  switch (job.kind) {
    case 'stagePart':
      return `工程${job.stageId}の${STAGE_PARTS[job.part].name}`;
    case 'linePart':
      return LINE_PARTS[job.part].name;
    case 'encoding':
      return `${job.knackId}の${ENCODINGS[job.encoding].name}`;
    case 'logAnalysis':
      return `工程${job.stageId}の過去案件ログ分析`;
  }
}

interface AttemptResult {
  success: boolean;
  tag: string;
}

/**
 * 1週間ぶんのシミュレーション。引数は書き換えず、新しい state とレポートを返す純粋関数。
 */
export function simulateWeek(input: GameState): { state: GameState; report: WeekReport } {
  const state = clone(input);
  const rng = createRng(state.seed);
  const week = state.week;
  const repBefore = state.reputation;
  let repDelta = 0;
  const logs: string[] = [];
  const failures: FailureRecord[] = [];
  const reviewCatches: { stageId: number; label: string }[] = [];
  const discoveries: string[] = [];
  const completedDev: string[] = [];
  const traceMap = new Map<string, CaseTrace>();
  const trial = week === 1 && state.flags.executiveTrial;

  if (state.stages.some((s) => s.assignee.type === 'agent' && s.assignee.tier === 'large' && !(trial && s.id === 4))) {
    state.flags.usedLarge = true;
  }

  // 1. 開発の進行は週末に行う(着手した週の終わりに1週ぶん進む)。ここでは今週着手分の費用を確定する
  const devCost = state.devQueue.filter((j) => j.startedWeek === week).reduce((s, j) => s + j.cost, 0);

  // 2. イベント判定
  const ev = applyWeekEvents(state, rng);
  const lineStopped = ev.accidents.length > 0;
  state.flags.accidents += ev.accidents.length;
  const accidentCost = ev.accidents.length * BALANCE.accidentCost;

  // 3. 受注
  const demand = demandFor(state.reputation, state.flags.demandBonus);
  const room = Math.max(0, BALANCE.backlogLimit - state.cases.length);
  const accepted = Math.min(demand, room);
  const refused = demand - accepted;
  for (let i = 0; i < accepted; i++) {
    state.cases.push({ id: `C${state.nextCaseNo++}`, acceptedWeek: week, stageIndex: 0, defects: [], rework: [] });
  }
  repDelta += refused * BALANCE.repRefuse;
  if (refused > 0) logs.push(`受注残がいっぱいで ${refused} 件の引き合いを断った`);

  // 4. 工程1〜6を順に処理
  const stageStats: StageWeekStats[] = [];
  let tokens = 0;
  const shippedNow: CaseState[] = [];
  for (const c of state.cases) {
    traceMap.set(c.id, { caseId: c.id, fromIndex: currentStageId(c) - 1, toIndex: currentStageId(c) - 1, shipped: false, stamps: [] });
  }

  for (const st of state.stages) {
    const def = stageDef(st.id);
    const isAgent = st.assignee.type === 'agent';
    const stat: StageWeekStats = {
      stageId: st.id,
      processed: 0,
      attempts: 0,
      attemptSuccesses: 0,
      defectsMade: 0,
      backlogAfter: 0,
      capacity: 0,
      tokens: 0,
      assignee: clone(st.assignee),
    };
    const human = isAgent ? null : humanStageInfo(state, st.id, week);
    let hoursLeft = human ? human.hours : 0;
    let agentLeft = BALANCE.agentCapacityPerWeek;
    stat.capacity = isAgent ? BALANCE.agentCapacityPerWeek : human!.capacity;
    const reviewers = st.parts.includes('approvalGate') ? reviewPool(state, st.id, week) : [];
    const breakdown = st.assignee.type === 'agent' ? agentBreakdown(state, st.id, st.assignee.tier) : null;
    const unitTokens = st.assignee.type === 'agent' ? tokenCostPerAttempt(state, st.id, st.assignee.tier) : 0;
    const free = trial && st.id === 4;

    const attempt = (): AttemptResult => {
      stat.attempts++;
      if (breakdown) {
        if (!free) {
          tokens += unitTokens;
          stat.tokens += unitTokens;
        }
        if (rng.next() < breakdown.p) {
          stat.attemptSuccesses++;
          return { success: true, tag: '' };
        }
        return { success: false, tag: pickWeighted(rng, breakdown.contributions.map((c) => ({ item: c.tag, weight: c.weight }))) };
      }
      if (rng.next() < human!.rate) {
        stat.attemptSuccesses++;
        return { success: true, tag: '' };
      }
      return { success: false, tag: 'human' };
    };

    const noteFailure = (tag: string, caught: FailureRecord['caught'], c: CaseState) => {
      const label = tagLabel(state, tag);
      failures.push({ stageId: st.id, label, caught });
      traceMap.get(c.id)!.stamps.push({ stageId: st.id, label });
      if (/^K\d\d$/.test(tag) && state.lineParts.includes('logMonitor')) state.knacks[tag].failCount++;
    };

    const waiting = lineStopped ? [] : state.cases.filter((c) => currentStageId(c) === st.id).sort(caseOrder);
    for (const c of waiting) {
      if (isAgent) {
        if (agentLeft <= 0) break;
        agentLeft--;
      } else {
        if (hoursLeft + 1e-9 < def.hours) break;
        hoursLeft -= def.hours;
      }
      stat.processed++;

      let res = attempt();
      // 検証ループ(エージェントのみ)
      if (!res.success && isAgent && st.parts.includes('verifyLoop')) {
        for (let i = 0; i < BALANCE.verifyMaxRetries && !res.success; i++) {
          if (rng.next() < BALANCE.verifyDetect) {
            noteFailure(res.tag, 'verify', c);
            res = attempt();
          } else break;
        }
      }
      // 承認ゲート
      const reviewer = reviewers.find((r) => r.remaining > 0);
      if (reviewer) {
        reviewer.remaining--;
        if (!res.success && rng.next() < reviewer.rate) {
          noteFailure(res.tag, 'gate', c);
          res = attempt();
        }
      }
      if (!res.success) {
        noteFailure(res.tag, 'none', c);
        c.defects.push({ stageId: st.id, tag: res.tag });
        stat.defectsMade++;
      }

      // 次の行き先
      if (c.rework.length > 0) {
        c.rework.shift();
        if (c.rework.length === 0) c.stageIndex = STAGES.length - 1;
      } else if (st.id !== 6) {
        c.stageIndex++;
      }

      if (st.id === 6) {
        if (res.success && c.defects.length > 0) {
          const found = c.defects.filter(() => rng.next() < BALANCE.finalReviewDetect);
          if (found.length > 0) {
            c.defects = c.defects.filter((d) => !found.includes(d));
            c.rework = [...new Set(found.map((d) => d.stageId))].sort((a, b) => a - b);
            for (const d of found) reviewCatches.push({ stageId: d.stageId, label: tagLabel(state, d.tag) });
            traceMap.get(c.id)!.reworkTo = c.rework[0];
            logs.push(`${c.id}:設計レビューで不良${found.length}件を検出、工程${c.rework.join('・')}へ差し戻し`);
            continue;
          }
        }
        shippedNow.push(c);
      }
    }
    if (!isAgent) {
      const remaining = state.cases.some((c) => currentStageId(c) === st.id);
      st.carryHours = remaining ? Math.max(0, Math.min(hoursLeft, def.hours - 1e-6)) : 0;
    }
    stageStats.push(stat);
  }

  // 5. 出図した案件の売上
  let revenue = 0;
  let shippedOnTime = 0;
  let shippedLate = 0;
  for (const c of shippedNow) {
    const taken = week - c.acceptedWeek;
    const factor = revenueFactor(taken);
    const r = BALANCE.caseRevenue * factor;
    revenue += r;
    if (factor >= 1) {
      shippedOnTime++;
      repDelta += BALANCE.repOnTime;
    } else {
      shippedLate++;
      repDelta += BALANCE.repLate;
    }
    state.shipped.push({ caseId: c.id, week, revenue: r, hasDefect: c.defects.length > 0, defectTags: c.defects.map((d) => d.tag) });
    const tr = traceMap.get(c.id)!;
    tr.shipped = true;
  }
  const shippedIds = new Set(shippedNow.map((c) => c.id));
  state.cases = state.cases.filter((c) => !shippedIds.has(c.id));
  for (const c of state.cases) {
    const tr = traceMap.get(c.id);
    if (tr) tr.toIndex = currentStageId(c) - 1;
  }
  for (const tr of traceMap.values()) if (tr.shipped) tr.toIndex = STAGES.length;
  for (const stat of stageStats) stat.backlogAfter = state.cases.filter((c) => currentStageId(c) === stat.stageId).length;

  // 6. 2週前に出図した案件の不良流出
  const outflows: WeekReport['outflows'] = [];
  let refunds = 0;
  for (const s of state.shipped) {
    if (s.week !== week - BALANCE.outflowDelayWeeks || !s.hasDefect) continue;
    const penalty = s.revenue + BALANCE.outflowPenalty;
    refunds += penalty;
    repDelta += BALANCE.repOutflow;
    outflows.push({ caseId: s.caseId, labels: s.defectTags.map((t) => tagLabel(state, t)), penalty });
  }

  // 7. 費用
  const salaries = salaryTotal(state);
  const fixedCost = BALANCE.fixedCostPerWeek;
  const profit = revenue - refunds - salaries - fixedCost - tokens - devCost - accidentCost;
  state.cash += profit;

  // 8. 評判
  state.reputation = clamp(state.reputation + repDelta, 0, 100);

  // 9. 発見(ヒアリング・失敗から学ぶ)、開発の進行
  const reveal = (stageId: number, allowSense: boolean, how: string) => {
    const pool = KNACKS.filter((k) => k.stageId === stageId && !state.knacks[k.id].discovered && (allowSense || k.kind !== 'sense'));
    if (pool.length === 0) {
      logs.push(`${how}:工程${stageId}には新しいカンコツは見つからなかった`);
      return;
    }
    const k = pool[Math.floor(rng.next() * pool.length)];
    state.knacks[k.id].discovered = true;
    discoveries.push(`${how}で ${k.id}「${k.text}」が判明`);
  };
  if (state.lineParts.includes('logMonitor')) {
    for (const k of KNACKS) {
      const ks = state.knacks[k.id];
      if (!ks.discovered && ks.failCount >= BALANCE.autoDiscoverFails) {
        ks.discovered = true;
        discoveries.push(`失敗の記録から ${k.id}「${k.text}」が判明`);
      }
    }
  }
  if (!isVeteranAway(week)) {
    for (const st of state.staff) {
      if (st.rank !== 'veteran') continue;
      for (const slot of st.slots) if (slot.kind === 'interview') reveal(slot.stageId, true, 'ベテランへのヒアリング');
    }
  }
  const stillRunning: DevJob[] = [];
  for (const job of state.devQueue) {
    job.weeksLeft--;
    if (job.weeksLeft > 0) {
      stillRunning.push(job);
      continue;
    }
    completedDev.push(describeJob(job));
    if (job.kind === 'stagePart') {
      const s = state.stages.find((x) => x.id === job.stageId)!;
      if (!s.parts.includes(job.part)) s.parts.push(job.part);
    } else if (job.kind === 'linePart') {
      if (!state.lineParts.includes(job.part)) state.lineParts.push(job.part);
    } else if (job.kind === 'encoding') {
      knackDef(job.knackId);
      state.knacks[job.knackId].encoding = job.encoding;
    } else {
      reveal(job.stageId, false, '過去案件のログ分析');
    }
  }
  state.devQueue = stillRunning;

  // 役員の一声は1週だけ
  if (trial) {
    const s4 = state.stages.find((s) => s.id === 4)!;
    s4.assignee = state.flags.trialPrevAssignee ?? { type: 'human' };
    state.flags.trialPrevAssignee = undefined;
  }

  const report: WeekReport = {
    week,
    revenue,
    refunds,
    salaries,
    fixedCost,
    tokens,
    devCost,
    accidentCost,
    profit,
    cashAfter: state.cash,
    repBefore,
    repAfter: state.reputation,
    demand,
    accepted,
    refused,
    shipped: shippedNow.length,
    shippedOnTime,
    shippedLate,
    outflows,
    failures,
    reviewCatches,
    stageStats,
    events: ev.messages,
    discoveries,
    completedDev,
    accidents: ev.accidents,
    lineStopped,
    traces: [...traceMap.values()].filter((t) => t.toIndex !== t.fromIndex || t.stamps.length > 0 || t.shipped),
    logs,
  };

  state.history.push(report);
  state.seed = rng.state();
  if (state.cash < BALANCE.gameOverCash) state.flags.gameOver = true;
  if (week >= BALANCE.totalWeeks) state.flags.finished = true;
  if (!state.flags.gameOver && !state.flags.finished) state.week = week + 1;
  return { state, report };
}
