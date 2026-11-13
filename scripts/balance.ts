/**
 * バランス検証:ミッションごとに代表的な構成を N 回実行し、★の分布を出す。
 *   npm run balance -- [回数]
 * 承認は「正しく判断するプレイヤー」として自動で答える。
 */
import { MISSIONS, missionDef } from '../src/game/data';
import { createRun, emptyBuild, maxEnergy, runToEnd, summarize, usedEnergy } from '../src/game/engine';
import type { Build, CardId, Tier } from '../src/game/types';

type Spec = { tier: Tier; slots?: Record<string, CardId[]>; common?: CardId[] };

export const BUILDS: Record<string, Record<string, Spec>> = {
  m1: {
    'ミニ・なにもなし': { tier: 'small' },
    'ビッグ・なにもなし': { tier: 'large' },
    'ミニ+チェック': { tier: 'small', slots: { draft: ['validate'] } },
  },
  m2: {
    'ミニ・チェックのみ': { tier: 'small', slots: { draft: ['validate'] } },
    'ビッグ+ツール': { tier: 'large', slots: { lookup: ['tool'] } },
    'ミニ+ツール+チェック': { tier: 'small', slots: { lookup: ['tool'], draft: ['validate'] } },
  },
  m3: {
    'ミニ+ツール+チェック': { tier: 'small', slots: { lookup: ['tool'], draft: ['validate'] } },
    'リトライ全部(ガードなし)': { tier: 'small', slots: { inbox: ['retry'], lookup: ['tool', 'retry'], draft: ['validate'], send: ['retry'] } },
    'リトライ+送信ガード': { tier: 'small', slots: { inbox: ['retry'], lookup: ['tool', 'retry'], draft: ['validate'], send: ['retry', 'guard'] } },
  },
  m4: {
    'ミニ+ツール+チェック': { tier: 'small', slots: { lookup: ['tool'], draft: ['validate'] } },
    'ミドル+ツール+チェック': { tier: 'medium', slots: { lookup: ['tool'], draft: ['validate'] } },
    '+人の承認(理解)': { tier: 'small', slots: { read: ['human', 'validate'], lookup: ['tool'], draft: ['validate'] } },
  },
  m5: {
    'ミニ+ツール+チェック': { tier: 'small', slots: { lookup: ['tool'], draft: ['validate'] } },
    'ビッグ+ツール': { tier: 'large', slots: { lookup: ['tool'] } },
    '模範': { tier: 'small', slots: { inbox: ['retry'], read: ['human', 'validate'], lookup: ['tool', 'retry'], draft: ['validate'], send: ['retry', 'guard'] }, common: ['memory', 'log'] },
    '模範(⚡12版)': { tier: 'small', slots: { inbox: ['retry'], read: ['human'], lookup: ['tool', 'retry'], draft: ['validate'], send: ['retry', 'guard'] }, common: ['memory', 'log'] },
  },
  m6: {
    'm5の模範そのまま': { tier: 'small', slots: { inbox: ['retry'], read: ['human', 'validate'], lookup: ['tool', 'retry'], draft: ['validate'], send: ['retry', 'guard'] }, common: ['memory', 'log'] },
    'ミドル模範': { tier: 'medium', slots: { inbox: ['retry'], read: ['human', 'validate'], lookup: ['tool', 'retry'], draft: ['validate'], send: ['retry', 'guard'] }, common: ['memory'] },
    'ビッグ+ツール+ガード': { tier: 'large', slots: { lookup: ['tool'], send: ['guard'] } },
    'ミニ全部盛り(⚡16)': { tier: 'small', slots: { inbox: ['retry'], read: ['human', 'validate'], lookup: ['tool', 'retry'], draft: ['validate', 'human'], send: ['retry', 'guard'] }, common: ['memory', 'log'] },
    'ミニ全部盛り(ログなし⚡15)': { tier: 'small', slots: { inbox: ['retry'], read: ['human', 'validate'], lookup: ['tool', 'retry'], draft: ['validate', 'human'], send: ['retry', 'guard'] }, common: ['memory'] },
  },
};

export function makeBuild(missionId: string, spec: Spec): Build {
  const b = emptyBuild(missionDef(missionId));
  b.tier = spec.tier;
  for (const [k, v] of Object.entries(spec.slots ?? {})) b.slots[k] = [v[0] ?? null, v[1] ?? null];
  b.common = [spec.common?.[0] ?? null, spec.common?.[1] ?? null];
  return b;
}

function main() {
  const n = Number(process.argv[2] ?? 500);
  for (const m of MISSIONS) {
    console.log(`\n■ ${m.no}. ${m.title}(⚡${m.energy} / 予算${m.budget} / 目標 正答${m.goals.accuracy * 100}% 自動${m.goals.auto * 100}%)`);
    for (const [name, spec] of Object.entries(BUILDS[m.id])) {
      const b = makeBuild(m.id, spec);
      const stars = [0, 0, 0, 0];
      let acc = 0, auto = 0, cost = 0, asks = 0, missend = 0;
      for (let i = 0; i < n; i++) {
        const r = runToEnd(createRun(m.id, b, 'real', 1000 + i));
        const s = summarize(r);
        stars[s.stars]++;
        acc += s.accuracy; auto += s.auto; cost += s.cost; asks += r.asks; missend += s.outcomes.missend;
      }
      const e = usedEnergy(b);
      const over = e > maxEnergy(m, 'ai', 1) ? ' ⚠⚡オーバー' : '';
      console.log(`  ${name.padEnd(16, ' ')} ⚡${e}${over} 正答${((acc / n) * 100).toFixed(0)}% 自動${((auto / n) * 100).toFixed(0)}% コスト${(cost / n).toFixed(0)} 承認${(asks / n).toFixed(1)}回 誤送信${(missend / n).toFixed(2)} | ★0:${pct(stars[0], n)} ★1:${pct(stars[1], n)} ★2:${pct(stars[2], n)} ★3:${pct(stars[3], n)}`);
    }
  }
}
const pct = (a: number, n: number) => `${Math.round((a / n) * 100)}%`;

if (process.argv[1]?.includes('balance')) main();
