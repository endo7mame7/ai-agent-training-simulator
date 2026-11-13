/**
 * バランス検証:各戦略を N 回(シードを変えて)プレイし、最終資金の分布を出す。
 *   npm run headless -- [回数] [--verbose]
 */
import { createInitialState } from '../src/core/init';
import { rankFor } from '../src/core/scoring';
import { simulateWeek } from '../src/core/simulateWeek';
import type { GameState } from '../src/core/types';
import { STRATEGIES, type Strategy } from './strategies';

export function playGame(seed: number, strategy: Strategy): GameState {
  let s = createInitialState(seed);
  while (!s.flags.finished && !s.flags.gameOver) s = simulateWeek(strategy(s)).state;
  return s;
}

const pct = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.floor((xs.length - 1) * p))];

function main() {
  const args = process.argv.slice(2);
  const n = Number(args.find((a) => /^\d+$/.test(a)) ?? 1000);
  const verbose = args.includes('--verbose');
  for (const [name, strategy] of Object.entries(STRATEGIES)) {
    const finals: number[] = [];
    const ranks: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, 中止: 0 };
    let shipped = 0, outflow = 0, tokens = 0, accidents = 0, rep = 0;
    for (let i = 0; i < n; i++) {
      const s = playGame(1000 + i, strategy);
      finals.push(s.cash);
      ranks[s.flags.gameOver ? '中止' : rankFor(s.cash)]++;
      shipped += s.history.reduce((a, r) => a + r.shipped, 0);
      outflow += s.history.reduce((a, r) => a + r.outflows.length, 0);
      tokens += s.history.reduce((a, r) => a + r.tokens, 0);
      accidents += s.flags.accidents;
      rep += s.reputation;
      if (verbose && i === 0) {
        for (const r of s.history)
          console.log(`  w${r.week} cash=${r.cashAfter.toFixed(0)} rev=${r.revenue.toFixed(0)} tok=${r.tokens.toFixed(1)} dev=${r.devCost} ship=${r.shipped} acc=${r.accepted}/${r.demand} out=${r.outflows.length} rep=${r.repAfter.toFixed(1)} ${r.stageStats.map((x) => `${x.stageId}:${x.assignee.type === 'agent' ? x.assignee.tier[0] : 'h'}${x.backlogAfter}`).join(' ')}`);
      }
    }
    finals.sort((a, b) => a - b);
    console.log(`\n■ ${name}(${n}回)`);
    console.log(`  最終資金  min ${pct(finals, 0).toFixed(0)} / p10 ${pct(finals, 0.1).toFixed(0)} / 中央値 ${pct(finals, 0.5).toFixed(0)} / p90 ${pct(finals, 0.9).toFixed(0)} / max ${pct(finals, 1).toFixed(0)}`);
    console.log(`  ランク    ${Object.entries(ranks).map(([k, v]) => `${k}:${((v / n) * 100).toFixed(1)}%`).join(' ')}`);
    console.log(`  平均      出図 ${(shipped / n).toFixed(1)}件 / 流出 ${(outflow / n).toFixed(1)}件 / トークン代 ${(tokens / n).toFixed(0)}万 / 事故 ${(accidents / n).toFixed(2)}回 / 最終評判 ${(rep / n).toFixed(1)}`);
  }
}

if (process.argv[1]?.includes('headless')) main();
