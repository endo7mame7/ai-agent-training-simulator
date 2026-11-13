import { describe, expect, it } from 'vitest';
import { makeBuild } from '../scripts/balance';
import { missionDef, MISSIONS, RULES } from '../src/game/data';
import { advance, createRun, emptyBuild, maxEnergy, preflight, resolveApproval, runToEnd, starsFor, stopRun, summarize, usedEnergy } from '../src/game/engine';
import { applyRun, hireAgent, isUnlocked, newSave } from '../src/game/progress';
import { createRng } from '../src/game/rng';

const avg = (missionId: string, spec: Parameters<typeof makeBuild>[1], n = 300) => {
  let acc = 0;
  let missend = 0;
  let dropped = 0;
  for (let i = 0; i < n; i++) {
    const s = summarize(runToEnd(createRun(missionId, makeBuild(missionId, spec), 'real', i)));
    acc += s.accuracy;
    missend += s.outcomes.missend;
    dropped += s.outcomes.dropped;
  }
  return { acc: acc / n, missend: missend / n, dropped: dropped / n };
};

describe('rng', () => {
  it('同じシードなら同じ列', () => {
    const a = createRng(5);
    const b = createRng(5);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });
});

describe('エンジン', () => {
  it('同じシード・構成・判断なら同じ結果', () => {
    const b = makeBuild('m5', { tier: 'small', slots: { read: ['human'], lookup: ['tool'] }, common: ['log'] });
    const a = runToEnd(createRun('m5', b, 'real', 42));
    const c = runToEnd(createRun('m5', b, 'real', 42));
    expect(JSON.stringify(a)).toBe(JSON.stringify(c));
  });

  it('advance は引数を書き換えない', () => {
    const r = createRun('m3', emptyBuild(missionDef('m3')), 'real', 1);
    const snap = JSON.stringify(r);
    advance(r);
    expect(JSON.stringify(r)).toBe(snap);
  });

  it('全件処理すると done になり、結果の合計が件数と一致する', () => {
    for (const m of MISSIONS) {
      const r = runToEnd(createRun(m.id, emptyBuild(m), 'real', 7));
      expect(r.status).toBe('done');
      expect(Object.values(r.outcomes).reduce((a, b) => a + b, 0)).toBe(m.emails);
    }
  });

  it('テスト実行は5件', () => {
    const r = runToEnd(createRun('m1', emptyBuild(missionDef('m1')), 'test', 3));
    expect(r.total).toBe(RULES.testEmails);
  });

  it('チェックで正答率が上がる', () => {
    expect(avg('m1', { tier: 'small', slots: { draft: ['validate'] } }).acc).toBeGreaterThan(avg('m1', { tier: 'small' }).acc + 0.2);
  });

  it('ツールがないと顧客検索で大きくまちがえる', () => {
    expect(avg('m2', { tier: 'large' }).acc).toBeLessThan(0.5);
    expect(avg('m2', { tier: 'small', slots: { lookup: ['tool'] } }).acc).toBeGreaterThan(0.6);
  });

  it('リトライでタイムアウトが減り、送信のリトライはガードがないと誤送信を生む', () => {
    const none = avg('m3', { tier: 'small', slots: { lookup: ['tool'] } });
    const retry = avg('m3', { tier: 'small', slots: { inbox: ['retry'], lookup: ['tool', 'retry'], send: ['retry'] } });
    const guarded = avg('m3', { tier: 'small', slots: { inbox: ['retry'], lookup: ['tool', 'retry'], send: ['retry', 'guard'] } });
    expect(retry.dropped).toBeLessThan(none.dropped / 3);
    expect(retry.missend).toBeGreaterThan(0.3);
    expect(guarded.missend).toBe(0);
  });

  it('人の承認:差し戻すと人の手で正解、OKするとまちがいのまま', () => {
    const b = makeBuild('m4', { tier: 'small', slots: { read: ['human'], lookup: ['tool'] } });
    let seed = 0;
    let r = createRun('m4', b, 'real', seed);
    while (r.status !== 'awaiting' || !r.pending?.bad) {
      r = r.status === 'done' ? createRun('m4', b, 'real', ++seed) : r.status === 'awaiting' ? resolveApproval(r, 'approve') : advance(r);
    }
    const trouble = r.pending!.trouble!;
    const rejected = resolveApproval(r, 'reject');
    const approved = resolveApproval(r, 'approve');
    expect(rejected.email.errors).not.toContain(trouble);
    expect(rejected.email.human).toBe(true);
    expect(approved.email.errors).toContain(trouble);
    expect(rejected.status).toBe('running');
  });

  it('⚡ポイントを超えると実行できない', () => {
    const m = missionDef('m1');
    const b = makeBuild('m1', { tier: 'large', slots: { draft: ['validate'] } });
    expect(usedEnergy(b)).toBe(6);
    expect(preflight(m, b, maxEnergy(m, 'ai', 1)).errors.length).toBe(1);
    expect(maxEnergy(m, 'bell', 3)).toBe(m.energy + 3);
  });

  it('ツール未設定は実行前チェックで警告', () => {
    const m = missionDef('m2');
    expect(preflight(m, emptyBuild(m), 10).warnings.length).toBe(1);
  });

  it('★の判定', () => {
    const m = missionDef('m1');
    const o = { ok: 11, okHuman: 0, wrong: 1, missend: 0, dropped: 0 };
    expect(starsFor(m, { accuracy: 0.7, auto: 0.7, cost: 10, outcomes: o }, 12)).toBe(0);
    expect(starsFor(m, { accuracy: 0.9, auto: 0.9, cost: 10, outcomes: o }, 12)).toBe(3);
    expect(starsFor(m, { accuracy: 0.9, auto: 0.9, cost: 99, outcomes: o }, 12)).toBe(2);
    expect(starsFor(m, { accuracy: 0.9, auto: 0.9, cost: 10, outcomes: { ...o, missend: 1 } }, 12)).toBe(1);
  });

  it('途中で止めると★なし・報酬なし', () => {
    let r = createRun('m1', emptyBuild(missionDef('m1')), 'real', 1);
    for (let i = 0; i < 7; i++) r = advance(r);
    const s = summarize(stopRun(r));
    expect(s.stars).toBe(0);
    expect(s.earned).toBe(0);
    expect(s.total).toBe(2);
  });
});

describe('進行', () => {
  it('★1でクリアすると次の案件がひらき、★ボーナスと経験値が入る', () => {
    const save = newSave();
    expect(isUnlocked(save, 'm2')).toBe(false);
    let s = summarize(runToEnd(createRun('m1', makeBuild('m1', { tier: 'small', slots: { draft: ['validate'] } }), 'real', 3)));
    let seed = 3;
    while (s.stars === 0) s = summarize(runToEnd(createRun('m1', makeBuild('m1', { tier: 'small', slots: { draft: ['validate'] } }), 'real', ++seed)));
    const r = applyRun(save, s);
    expect(isUnlocked(r.save, 'm2')).toBe(true);
    expect(r.starBonus).toBe(s.stars * RULES.starBonus);
    expect(r.save.coins).toBe(save.coins + s.earned + r.starBonus - s.cost);
    expect(r.save.agents[0].exp).toBeGreaterThan(0);
    // 2回目は★ボーナスなし
    expect(applyRun(r.save, s).starBonus).toBe(0);
  });

  it('テスト実行は記録に残らず、報酬もない', () => {
    const s = summarize(runToEnd(createRun('m1', emptyBuild(missionDef('m1')), 'test', 1)));
    const r = applyRun(newSave(), s);
    expect(r.save.missions.m1.runs).toHaveLength(0);
    expect(r.earned).toBe(0);
  });

  it('コインがあれば採用できる', () => {
    const save = newSave();
    expect(typeof hireAgent(save, 'bell')).toBe('string');
    const rich = { ...save, coins: 1000 };
    const r = hireAgent(rich, 'bell');
    expect(typeof r).toBe('object');
    if (typeof r === 'object') expect(r.agents.map((a) => a.id)).toEqual(['ai', 'bell']);
  });
});
