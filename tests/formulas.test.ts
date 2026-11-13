import { describe, expect, it } from 'vitest';
import { setAssignee, startEncoding, startStagePart } from '../src/core/actions';
import {
  agentBreakdown,
  baseSuccess,
  contextLoad,
  demandFor,
  effectiveSuccess,
  humanStageInfo,
  revenueFactor,
  salaryTotal,
  tokenCostPerAttempt,
} from '../src/core/formulas';
import { createInitialState } from '../src/core/init';
import { createRng, pickWeighted } from '../src/core/rng';
import type { GameState } from '../src/core/types';

const unwrap = (r: ReturnType<typeof setAssignee>): GameState => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

/** 部品や落とし込みを直接付ける(テスト用) */
function withParts(s: GameState, stageId: number, parts: GameState['stages'][number]['parts']): GameState {
  const n = structuredClone(s);
  n.stages.find((x) => x.id === stageId)!.parts = parts;
  return n;
}

describe('rng', () => {
  it('同じシードなら同じ列', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it('state() から再開できる', () => {
    const a = createRng(7);
    a.next();
    const b = createRng(a.state());
    expect(b.next()).toBe(a.next());
  });
  it('pickWeighted は重みに比例', () => {
    const r = createRng(1);
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 10000; i++) counts[pickWeighted(r, [{ item: 'a' as const, weight: 1 }, { item: 'b' as const, weight: 3 }])]++;
    expect(counts.b / 10000).toBeCloseTo(0.75, 1);
  });
});

describe('エージェントの成功率 p = B×T×K×C', () => {
  const s0 = createInitialState(1);

  it('素の大モデルを工程4に置くと、ツールなし×未対応カンコツで大きく下がる', () => {
    const b = agentBreakdown(s0, 4, 'large');
    expect(b.B).toBe(0.88);
    expect(b.T).toBe(0.5);
    expect(b.K).toBeCloseTo(0.8 * 0.8 * 0.85, 10);
    expect(b.C).toBe(1);
    expect(b.p).toBeCloseTo(0.88 * 0.5 * 0.544, 10);
  });

  it('ツール不要の工程は T=1', () => {
    expect(agentBreakdown(s0, 1, 'small').T).toBe(1);
  });

  it('落とし込みは前提部品があるときだけ有効', () => {
    const s = structuredClone(s0);
    s.knacks.K02.encoding = 'checklist';
    expect(agentBreakdown(s, 1, 'small').K).toBeCloseTo(0.85 * 0.85 * 0.9, 10);
    const withLoop = withParts(s, 1, ['verifyLoop']);
    expect(agentBreakdown(withLoop, 1, 'small').K).toBeCloseTo(0.85 * (1 - 0.15 * 0.1) * 0.9, 10);
  });

  it('コンテキスト負荷が容量を超えると 0.92 のべき乗で下がる', () => {
    const s = withParts(createInitialState(1), 1, ['manual']);
    s.lineParts = ['caseMemory'];
    s.knacks.K01 = { discovered: true, encoding: 'memory', failCount: 0 };
    s.knacks.K02 = { discovered: true, encoding: 'rule', failCount: 0 };
    s.knacks.K03 = { discovered: true, encoding: 'rule', failCount: 0 };
    expect(contextLoad(s, 1)).toBe(1 + 2 + 1 + 1);
    expect(agentBreakdown(s, 1, 'small').C).toBeCloseTo(0.92 ** 2, 10);
    expect(agentBreakdown(s, 1, 'medium').C).toBe(1);
  });

  it('p は 0.05〜0.99 に収まる', () => {
    const s = structuredClone(s0);
    s.flags.modelGen = 2;
    for (const k of Object.keys(s.knacks)) s.knacks[k] = { discovered: true, failCount: 0 };
    expect(agentBreakdown(s, 5, 'large').p).toBeGreaterThanOrEqual(0.05);
    expect(baseSuccess('large', 'low', 2)).toBe(0.99);
  });

  it('原因タグの寄与:カンコツ w(1-c)、手段なし 0.5、モデルの限界 1-B', () => {
    const c = agentBreakdown(s0, 3, 'small').contributions;
    expect(c.find((x) => x.tag === 'K07')!.weight).toBeCloseTo(0.1, 10);
    expect(c.find((x) => x.tag === 'tool')!.weight).toBe(0.5);
    expect(c.find((x) => x.tag === 'model')!.weight).toBeCloseTo(0.2, 10);
    expect(c.find((x) => x.tag === 'context')).toBeUndefined();
  });

  it('検証ループ込みの実効成功率', () => {
    let s = unwrap(setAssignee(s0, 1, { type: 'agent', tier: 'small' }));
    const p = agentBreakdown(s, 1, 'small').p;
    s = withParts(s, 1, ['verifyLoop']);
    const q = 1 - p;
    expect(effectiveSuccess(s, 1)).toBeCloseTo(p + q * 0.6 * p + q * 0.6 * q * 0.6 * p, 10);
  });
});

describe('トークン代', () => {
  it('単価 × 処理単位 × (1 + 0.15 L)', () => {
    const s = withParts(createInitialState(1), 3, ['manual']);
    expect(tokenCostPerAttempt(s, 3, 'small')).toBeCloseTo(0.02 * 10 * 1.15, 10);
    expect(tokenCostPerAttempt(createInitialState(1), 3, 'large')).toBeCloseTo(5, 10);
  });
  it('新世代モデルで単価 −30%', () => {
    const s = createInitialState(1);
    s.flags.modelGen = 2;
    expect(tokenCostPerAttempt(s, 3, 'medium')).toBeCloseTo(0.07 * 10, 10);
  });
  it('仕様書の参考試算:手順書のみ・全工程で小 0.92', () => {
    let s = createInitialState(1);
    let total = 0;
    for (let id = 1; id <= 6; id++) s = withParts(s, id, ['manual']);
    for (let id = 1; id <= 6; id++) total += tokenCostPerAttempt(s, id, 'small');
    expect(total).toBeCloseTo(0.92, 10);
  });
});

describe('処理能力・需要・納期', () => {
  it('開始時の配置は各工程ちょうど週4件', () => {
    const s = createInitialState(1);
    for (let id = 1; id <= 6; id++) expect(humanStageInfo(s, id).capacity).toBe(4);
  });
  it('第16週はベテランのコマが0', () => {
    const s = createInitialState(1);
    expect(humanStageInfo(s, 2, 16).capacity).toBe(1);
  });
  it('人の成功率はコマ数で加重平均', () => {
    const s = createInitialState(1);
    expect(humanStageInfo(s, 2).rate).toBeCloseTo((0.97 * 2 + 0.9) / 3, 10);
  });
  it('需要は評判÷10を四捨五入、上限10', () => {
    expect(demandFor(60, 0)).toBe(6);
    expect(demandFor(64, 0)).toBe(6);
    expect(demandFor(65, 0)).toBe(7);
    expect(demandFor(95, 2)).toBe(10);
  });
  it('4週以内は満額、超過1週ごとに20%減、下限40%', () => {
    expect(revenueFactor(4)).toBe(1);
    expect(revenueFactor(5)).toBeCloseTo(0.8, 10);
    expect(revenueFactor(7)).toBeCloseTo(0.4, 10);
    expect(revenueFactor(12)).toBe(0.4);
  });
  it('人件費は週73', () => {
    expect(salaryTotal(createInitialState(1))).toBe(73);
  });
});

describe('計画フェーズの操作', () => {
  it('前提部品がないと落とし込めない', () => {
    const r = startEncoding(createInitialState(1), 'K02', 'checklist');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('検証ループ');
  });
  it('未発見や感覚型は落とし込めない', () => {
    const s = createInitialState(1);
    expect(startEncoding(s, 'K01', 'rule').ok).toBe(false);
    s.knacks.K06.discovered = true;
    const r = startEncoding(s, 'K06', 'rule');
    expect(r.ok).toBe(false);
  });
  it('同時開発は2件まで、予算も確認する', () => {
    let s = createInitialState(1);
    s = unwrap(startStagePart(s, 1, 'manual'));
    s = unwrap(startStagePart(s, 2, 'manual'));
    expect(startStagePart(s, 3, 'manual').ok).toBe(false);
    const poor = createInitialState(1);
    poor.cash = 30;
    expect(startStagePart(poor, 3, 'toolLink').ok).toBe(false);
  });
  it('ツール不要の工程にはツール接続を付けられない', () => {
    expect(startStagePart(createInitialState(1), 1, 'toolLink').ok).toBe(false);
  });
});
