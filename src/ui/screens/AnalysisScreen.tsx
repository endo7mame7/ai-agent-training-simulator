import { useState } from 'react';
import { CARDS, missionDef, MISSIONS, TIERS } from '../../game/data';
import { progressOf } from '../../game/progress';
import type { CardId, RunSummary } from '../../game/types';
import { useGame } from '../../store';
import { Card, cx, pct, Stars } from '../components/ui';

const SERIES = [
  { id: 'accuracy', label: '正答率', color: '#ff6f96', get: (r: RunSummary) => r.accuracy },
  { id: 'auto', label: '自動処理率', color: '#34b384', get: (r: RunSummary) => r.auto },
  { id: 'cost', label: 'コスト(対予算)', color: '#5bb8f5', get: (r: RunSummary) => Math.min(1.5, r.cost / ((missionDef(r.missionId).budget * r.total) / missionDef(r.missionId).emails)) },
] as const;

type SeriesId = (typeof SERIES)[number]['id'];

export function AnalysisScreen() {
  const save = useGame((s) => s.save);
  const withRuns = MISSIONS.filter((m) => progressOf(save, m.id).runs.length > 0);
  const [sel, setSel] = useState<string | null>(null);
  const [on, setOn] = useState<Record<SeriesId, boolean>>({ accuracy: true, auto: true, cost: false });
  const missionId = sel ?? withRuns.at(-1)?.id;

  if (!missionId)
    return (
      <div className="space-y-3">
        <h1 className="px-1 text-xl font-extrabold">📈 分析</h1>
        <Card className="p-6 text-center">
          <div className="text-5xl">📊</div>
          <p className="mt-2 text-sm">本番実行をすると、ここに成績がたまっていきます。改善の前とあとをくらべてみよう!</p>
        </Card>
      </div>
    );

  const m = missionDef(missionId);
  const runs = progressOf(save, missionId).runs.slice(-10);
  const lastRun = runs.at(-1)!;
  const prev = runs.at(-2);

  return (
    <div className="space-y-3">
      <h1 className="px-1 text-xl font-extrabold">📈 分析</h1>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {withRuns.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setSel(x.id)}
            className={cx('press flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-full border-2 px-3 text-sm font-extrabold', x.id === missionId ? 'border-pink bg-pink text-white' : 'border-[#f0d6df] bg-white')}
          >
            {x.clientEmoji} CASE {x.no}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="font-extrabold">{m.title}</div>
          <div className="text-xs">直近{runs.length}回</div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SERIES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setOn({ ...on, [s.id]: !on[s.id] })}
              className={cx('flex min-h-9 cursor-pointer items-center gap-1 rounded-full border-2 px-2.5 text-xs font-extrabold', on[s.id] ? 'bg-white' : 'border-[#eee] bg-[#f7f2f4] text-[#c3b3c6]')}
              style={on[s.id] ? { borderColor: s.color, color: s.color } : undefined}
              aria-pressed={on[s.id]}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: on[s.id] ? s.color : '#ddd' }} />
              {s.label}
            </button>
          ))}
        </div>
        <Chart runs={runs} on={on} goal={m.goals.accuracy} />
      </Card>

      <Card className="p-4">
        <div className="text-sm font-extrabold">🔁 前回とくらべると</div>
        {prev ? (
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <Delta label="正答率" now={lastRun.accuracy} before={prev.accuracy} fmt={pct} />
            <Delta label="自動処理率" now={lastRun.auto} before={prev.auto} fmt={pct} />
            <Delta label="コスト" now={lastRun.cost} before={prev.cost} fmt={(v) => `🪙${Math.round(v)}`} lowerIsBetter />
          </div>
        ) : (
          <p className="mt-1 text-sm">もう1回本番実行すると、くらべられます。</p>
        )}
      </Card>

      <div className="space-y-2">
        {[...runs].reverse().map((r, i) => (
          <Card key={r.at} className="p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#b7a3b8]">#{runs.length - i}</span>
              <Stars n={r.stars} size="text-sm" />
              <span className="ml-auto text-xs font-bold">
                正答{pct(r.accuracy)}・自動{pct(r.auto)}・🪙{r.cost}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
              <span className="rounded-full bg-sky-soft px-2 py-0.5 font-bold text-sky">{TIERS[r.build.tier].short}</span>
              {buildCards(r).map((c, k) => (
                <span key={k} title={CARDS[c].name}>
                  {CARDS[c].emoji}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const buildCards = (r: RunSummary): CardId[] => [...r.build.common, ...Object.values(r.build.slots).flat()].filter((c): c is CardId => c !== null);

function Delta({ label, now, before, fmt, lowerIsBetter }: { label: string; now: number; before: number; fmt: (v: number) => string; lowerIsBetter?: boolean }) {
  const d = now - before;
  const good = lowerIsBetter ? d < 0 : d > 0;
  return (
    <div className="rounded-2xl bg-cream p-2">
      <div className="text-[10px] font-extrabold">{label}</div>
      <div className="text-base font-extrabold">{fmt(now)}</div>
      <div className={cx('text-[11px] font-extrabold', Math.abs(d) < 1e-9 ? 'text-[#b7a3b8]' : good ? 'text-mint' : 'text-pink')}>
        {Math.abs(d) < 1e-9 ? '±0' : `${d > 0 ? '▲' : '▼'} ${fmt(Math.abs(d))}`}
      </div>
    </div>
  );
}

function Chart({ runs, on, goal }: { runs: RunSummary[]; on: Record<SeriesId, boolean>; goal: number }) {
  const W = 320;
  const H = 170;
  const pad = { l: 34, r: 10, t: 10, b: 22 };
  const n = Math.max(2, runs.length);
  const x = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 1.2) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="成績の推移">
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#f3e3ea" strokeWidth="1.5" />
          <text x={pad.l - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#b7a3b8">
            {v * 100}%
          </text>
        </g>
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="#ff6f96" strokeDasharray="4 4" strokeWidth="1.5" opacity="0.6" />
      <text x={W - pad.r} y={y(goal) - 4} fontSize="9" textAnchor="end" fill="#ff6f96">
        目標
      </text>
      {runs.map((_, i) => (
        <text key={i} x={x(i)} y={H - 6} fontSize="10" textAnchor="middle" fill="#b7a3b8">
          {i + 1}
        </text>
      ))}
      {SERIES.filter((s) => on[s.id]).map((s) => (
        <g key={s.id}>
          <polyline points={runs.map((r, i) => `${x(i)},${y(s.get(r))}`).join(' ')} fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          {runs.map((r, i) => (
            <circle key={i} cx={x(i)} cy={y(s.get(r))} r="4.5" fill="white" stroke={s.color} strokeWidth="2.5" />
          ))}
        </g>
      ))}
    </svg>
  );
}
