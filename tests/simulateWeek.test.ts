import { describe, expect, it } from 'vitest';
import { setAssignee, setExecutiveTrial, startLinePart, startStagePart } from '../src/core/actions';
import { createInitialState } from '../src/core/init';
import { rankFor, titlesFor } from '../src/core/scoring';
import { simulateWeek } from '../src/core/simulateWeek';
import type { GameState } from '../src/core/types';
import { modelPlay } from '../scripts/strategies';

const unwrap = (r: { ok: true; state: GameState } | { ok: false; reason: string }) => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

const run = (s: GameState, weeks: number, plan: (s: GameState) => GameState = (x) => x) => {
  for (let i = 0; i < weeks && !s.flags.finished && !s.flags.gameOver; i++) s = simulateWeek(plan(s)).state;
  return s;
};

describe('simulateWeek', () => {
  it('純粋関数:引数を書き換えない', () => {
    const s = createInitialState(5);
    const snapshot = JSON.stringify(s);
    simulateWeek(s);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('同じシードと同じ操作列なら同じ結果', () => {
    const a = run(createInitialState(99), 24, modelPlay());
    const b = run(createInitialState(99), 24, modelPlay());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = run(createInitialState(100), 24, modelPlay());
    expect(c.cash).not.toBe(a.cash);
  });

  it('シードは週ごとに進む', () => {
    const s = createInitialState(3);
    expect(simulateWeek(s).state.seed).not.toBe(s.seed);
  });

  it('第1週は需要6件を受注し、人件費・固定費を計上する', () => {
    const { state, report } = simulateWeek(createInitialState(1));
    expect(report.accepted).toBe(6);
    expect(report.salaries).toBe(73);
    expect(report.profit).toBeCloseTo(report.revenue - report.refunds - 73 - report.fixedCost - report.tokens - report.devCost - report.accidentCost, 10);
    expect(state.week).toBe(2);
    expect(state.cash).toBeCloseTo(300 + report.profit, 10);
  });

  it('能力が足りれば1週で全工程を通過して出図できる', () => {
    let s = createInitialState(1);
    for (let id = 1; id <= 6; id++) s = unwrap(setAssignee(s, id, { type: 'agent', tier: 'large' }));
    const { report } = simulateWeek(s);
    expect(report.shipped + report.stageStats.reduce((a, x) => a + x.backlogAfter, 0)).toBe(6);
    expect(report.stageStats[0].processed).toBe(6);
  });

  it('開発費は着手した週に計上し、1週の部品は翌週から有効', () => {
    let s = unwrap(startStagePart(createInitialState(1), 1, 'manual'));
    const r1 = simulateWeek(s);
    expect(r1.report.devCost).toBe(10);
    expect(r1.state.stages[0].parts).toContain('manual');
    expect(r1.state.devQueue).toHaveLength(0);
    s = unwrap(startLinePart(r1.state, 'caseMemory'));
    const r2 = simulateWeek(s);
    expect(r2.state.devQueue[0].weeksLeft).toBe(2);
    expect(r2.state.lineParts).not.toContain('caseMemory');
    const r4 = run(r2.state, 2);
    expect(r4.lineParts).toContain('caseMemory');
  });

  it('ログ監視がなければ原因タグは「原因不明」', () => {
    let s = createInitialState(2);
    s = unwrap(setAssignee(s, 4, { type: 'agent', tier: 'small' }));
    const { report } = simulateWeek(s);
    expect(report.failures.length).toBeGreaterThan(0);
    expect(new Set(report.failures.map((f) => f.label))).toEqual(new Set(['原因不明']));
  });

  it('ログ監視があれば原因タグが見え、同じカンコツのミス3件で自動判明', () => {
    let s = createInitialState(2);
    s.lineParts = ['logMonitor'];
    s = unwrap(setAssignee(s, 4, { type: 'agent', tier: 'small' }));
    s = run(s, 4);
    const labels = new Set(s.history.flatMap((h) => h.failures.map((f) => f.label)));
    expect([...labels].some((l) => l.startsWith('知識不足') || l === '手段なし')).toBe(true);
    expect(s.knacks.K09.discovered || s.knacks.K10.discovered || s.knacks.K11.discovered).toBe(true);
  });

  it('潜在不良を残して出図した案件は2週後に流出し、返金+20と評判−5', () => {
    const s = createInitialState(4);
    s.week = 5;
    s.shipped = [
      { caseId: 'C900', week: 3, revenue: 47, hasDefect: true, defectTags: ['K09'] },
      { caseId: 'C901', week: 3, revenue: 47, hasDefect: false, defectTags: [] },
      { caseId: 'C902', week: 4, revenue: 47, hasDefect: true, defectTags: ['human'] },
    ];
    const { report } = simulateWeek(s);
    expect(report.outflows.map((o) => o.caseId)).toEqual(['C900']);
    expect(report.refunds).toBe(67);
    expect(report.outflows[0].labels).toEqual(['原因不明']);
    const base = simulateWeek({ ...s, shipped: [] }).report;
    expect(report.repAfter).toBeCloseTo(base.repAfter - 5, 10);
  });

  it('設計レビューで見つかった不良は該当工程に差し戻される', () => {
    let s = createInitialState(8);
    s.cases = Array.from({ length: 4 }, (_, i) => ({ id: `C${900 + i}`, acceptedWeek: 1, stageIndex: 5, defects: [{ stageId: 3, tag: 'human' }], rework: [] }));
    s.reputation = 0;
    const r = simulateWeek(s);
    expect(r.report.reviewCatches.length).toBeGreaterThan(0);
    const sent = r.state.cases.filter((c) => c.id.startsWith('C9') && c.rework.length > 0);
    expect(sent.length).toBe(r.report.reviewCatches.length);
    expect(sent.every((c) => c.rework[0] === 3 && c.defects.length === 0)).toBe(true);
  });

  it('重大事故は「エージェント・ツール接続あり・安全柵なし」のときだけ', () => {
    let s = createInitialState(11);
    s.stages[2].parts = ['toolLink'];
    s.stages[2].assignee = { type: 'agent', tier: 'small' };
    let unsafe = 0;
    for (let i = 0; i < 300; i++) {
      s.seed = i;
      s.week = 2;
      unsafe += simulateWeek(s).report.accidents.length;
    }
    expect(unsafe).toBeGreaterThan(0);
    s.stages[2].parts = ['toolLink', 'guardrail'];
    let safe = 0;
    for (let i = 0; i < 300; i++) {
      s.seed = i;
      safe += simulateWeek(s).report.accidents.length;
    }
    expect(safe).toBe(0);
  });

  it('役員の一声:第1週だけ工程4に大モデル、トークン代は無料、翌週は元に戻る', () => {
    const s = unwrap(setExecutiveTrial(createInitialState(1), true));
    expect(s.stages[3].assignee).toEqual({ type: 'agent', tier: 'large' });
    const r = simulateWeek(s);
    expect(r.report.stageStats[3].tokens).toBe(0);
    expect(r.state.stages[3].assignee).toEqual({ type: 'human' });
    expect(r.state.flags.usedLarge).toBe(false);
  });

  it('第12週に新世代モデル', () => {
    const s = run(createInitialState(1), 12);
    expect(s.flags.modelGen).toBe(2);
  });

  it('資金が −100 を下回ると中止', () => {
    const s = createInitialState(1);
    s.cash = -50;
    expect(simulateWeek(s).state.flags.gameOver).toBe(true);
  });

  it('24週で終了し、ランクと称号が付く', () => {
    const s = run(createInitialState(1), 30);
    expect(s.flags.finished).toBe(true);
    expect(s.history).toHaveLength(24);
    expect(['S', 'A', 'B', 'C']).toContain(rankFor(s.cash));
    expect(titlesFor(s).some((t) => t.id === 'safe')).toBe(true);
  });
});
