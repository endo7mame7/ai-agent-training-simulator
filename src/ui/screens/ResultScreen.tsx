import { rankFor, titlesFor } from '../../core/scoring';
import { BALANCE } from '../../data/balance';
import { KNACKS } from '../../data/knacks';
import { STAGES } from '../../data/stages';
import { useGame } from '../../store/gameStore';
import { Button, Panel, Stat } from '../components/common';
import { cx, man } from '../util';

const RANK_TEXT = {
  S: 'ハーネスを整え、安いモデルと人をうまく組み合わせた',
  A: '自動化で明確に利益を伸ばした',
  B: '何もしないよりは良くなった',
  C: '投資が回収できなかった',
} as const;

export function ResultScreen() {
  const { game, newGame, toTitle } = useGame();
  if (!game) return null;
  const over = game.flags.gameOver;
  const rank = rankFor(game.cash);
  const titles = titlesFor(game);
  const h = game.history;
  const total = (f: (r: (typeof h)[number]) => number) => h.reduce((a, r) => a + f(r), 0);

  // 担当の配分(工程×週)
  const alloc = { human: 0, small: 0, medium: 0, large: 0 };
  for (const r of h) for (const s of r.stageStats) alloc[s.assignee.type === 'human' ? 'human' : s.assignee.tier]++;
  const allocTotal = Math.max(1, Object.values(alloc).reduce((a, b) => a + b, 0));

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-5 pb-10 pt-6">
      <div className={cx('rounded-xl p-8 text-center text-white shadow-lg', over ? 'bg-rose-700' : 'bg-slate-800')}>
        {over ? (
          <>
            <div className="text-sm tracking-widest text-rose-200">PROJECT CANCELLED</div>
            <div className="mt-2 text-4xl font-bold">プロジェクト中止</div>
            <div className="mt-2 text-rose-100">第{game.week}週、資金が{man(BALANCE.gameOverCash)}を下回りました。</div>
          </>
        ) : (
          <>
            <div className="text-sm tracking-widest text-teal-300">24 WEEKS COMPLETE</div>
            <div className="mt-2 flex items-center justify-center gap-6">
              <div className={cx('text-8xl font-black', rank === 'S' ? 'text-amber-300' : rank === 'A' ? 'text-teal-300' : 'text-slate-200')}>{rank}</div>
              <div className="text-left">
                <div className="text-sm text-slate-300">最終資金</div>
                <div className="text-4xl font-bold tabular-nums">{man(game.cash)}</div>
                <div className="mt-1 text-slate-300">{RANK_TEXT[rank]}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              S {BALANCE.ranks.S.toLocaleString()}以上 / A {BALANCE.ranks.A.toLocaleString()}以上 / B {BALANCE.ranks.B.toLocaleString()}以上 ・ 何もしなかった場合はおよそ1,000万円
            </div>
          </>
        )}
        {titles.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {titles.map((t) => (
              <div key={t.id} className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-bold text-slate-900" title={t.desc}>
                🏅 {t.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <Panel title="資金の推移">
          <CashChart cash={[BALANCE.initialCash, ...h.map((r) => r.cashAfter)]} />
        </Panel>
        <Panel title="担当の配分(工程×週)">
          <div className="space-y-2">
            {(
              [
                ['human', '人', 'bg-amber-400'],
                ['small', '小モデル', 'bg-sky-400'],
                ['medium', '中モデル', 'bg-indigo-500'],
                ['large', '大モデル', 'bg-rose-500'],
              ] as const
            ).map(([k, label, color]) => (
              <div key={k}>
                <div className="flex justify-between text-xs">
                  <span>{label}</span>
                  <span className="tabular-nums">{Math.round((alloc[k] / allocTotal) * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-slate-100">
                  <div className={cx('h-full', color)} style={{ width: `${(alloc[k] / allocTotal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
            最終週の担当:
            <div className="mt-1 grid grid-cols-2 gap-x-2">
              {game.stages.map((s) => (
                <div key={s.id}>
                  {s.id} {STAGES.find((x) => x.id === s.id)!.name}:{s.assignee.type === 'human' ? '人' : `${{ small: '小', medium: '中', large: '大' }[s.assignee.tier]}モデル`}
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="まとめ">
        <div className="grid grid-cols-6 gap-4">
          <Stat label="出図" value={`${total((r) => r.shipped)}件`} />
          <Stat label="不良流出" value={`${total((r) => r.outflows.length)}件`} />
          <Stat label="売上" value={man(total((r) => r.revenue))} />
          <Stat label="トークン代" value={man(total((r) => r.tokens))} />
          <Stat label="開発費" value={man(total((r) => r.devCost))} />
          <Stat label="カンコツ" value={`${KNACKS.filter((k) => game.knacks[k.id].discovered).length}/15 判明`} />
        </div>
      </Panel>

      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={toTitle}>
          タイトルへ
        </Button>
        <Button variant="primary" onClick={() => newGame()}>
          もう一度プレイ
        </Button>
      </div>
    </div>
  );
}

function CashChart({ cash }: { cash: number[] }) {
  const W = 640;
  const H = 220;
  const pad = { l: 56, r: 12, t: 12, b: 26 };
  const lo = Math.min(0, ...cash);
  const hi = Math.max(BALANCE.ranks.A, ...cash);
  const x = (i: number) => pad.l + (i / Math.max(1, BALANCE.totalWeeks)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const pts = cash.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const lines = [0, BALANCE.ranks.B, BALANCE.ranks.A, BALANCE.ranks.S].filter((v) => v <= hi);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {lines.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#94a3b8' : '#e2e8f0'} strokeDasharray={v === 0 ? undefined : '4 4'} />
          <text x={pad.l - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#64748b">
            {v === 0 ? '0' : `${v === BALANCE.ranks.B ? 'B' : v === BALANCE.ranks.A ? 'A' : 'S'} ${v.toLocaleString()}`}
          </text>
        </g>
      ))}
      {[0, 6, 12, 18, 24].map((w) => (
        <text key={w} x={x(w)} y={H - 8} fontSize="10" textAnchor="middle" fill="#64748b">
          {w}週
        </text>
      ))}
      <polyline points={pts} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinejoin="round" />
      {cash.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="#0d9488" />
      ))}
    </svg>
  );
}
