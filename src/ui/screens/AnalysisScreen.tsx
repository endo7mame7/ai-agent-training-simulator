import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { CARDS, missionDef, MISSIONS, TIERS } from '../../game/data';
import { CARD_ICON, HUE } from '../components/icons';
import { progressOf } from '../../game/progress';
import type { CardId, RunSummary } from '../../game/types';
import { useGame } from '../../store';
import { Card, cx, pct, Stars } from '../components/ui';

const SERIES = [
  { id: 'accuracy', label: '正答率', color: '#1d1f27', get: (r: RunSummary) => r.accuracy },
  { id: 'auto', label: '自動処理率', color: '#2fb35a', get: (r: RunSummary) => r.auto },
  { id: 'cost', label: 'コスト(対予算)', color: '#5b8fe8', get: (r: RunSummary) => Math.min(1.5, r.cost / ((missionDef(r.missionId).budget * r.total) / missionDef(r.missionId).emails)) },
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
        <Card className="p-8 text-center">
          <BarChart3 size={36} className="mx-auto text-faint" />
          <p className="mt-3 text-sm text-sub">本番実行の結果がここに蓄積され、改善の前後を比較できます。</p>
        </Card>
      </div>
    );

  const m = missionDef(missionId);
  const runs = progressOf(save, missionId).runs.slice(-10);
  const lastRun = runs.at(-1)!;
  const prev = runs.at(-2);

  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {withRuns.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setSel(x.id)}
            className={cx('press num flex min-h-10 shrink-0 cursor-pointer items-center rounded-full px-4 text-[13px] font-bold', x.id === missionId ? 'bg-ink text-white' : 'bg-white text-sub')}
          >
            CASE {x.no}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="font-bold">{m.title}</div>
          <div className="num text-xs text-sub">直近 {runs.length} 回</div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SERIES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setOn({ ...on, [s.id]: !on[s.id] })}
              className={cx('flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-bold', on[s.id] ? 'border-line bg-white text-ink' : 'border-transparent bg-bg text-faint')}
              aria-pressed={on[s.id]}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: on[s.id] ? s.color : '#d6d8de' }} />
              {s.label}
            </button>
          ))}
        </div>
        <Chart runs={runs} on={on} goal={m.goals.accuracy} />
      </Card>

      <Card className="p-4">
        <div className="text-sm font-bold">前回との比較</div>
        {prev ? (
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <Delta label="正答率" now={lastRun.accuracy} before={prev.accuracy} fmt={pct} />
            <Delta label="自動処理率" now={lastRun.auto} before={prev.auto} fmt={pct} />
            <Delta label="コスト" now={lastRun.cost} before={prev.cost} fmt={(v) => `🪙${Math.round(v)}`} lowerIsBetter />
          </div>
        ) : (
          <p className="mt-1 text-[13px] text-sub">もう一度本番実行すると比較できます。</p>
        )}
      </Card>

      <div className="space-y-2">
        {[...runs].reverse().map((r, i) => (
          <Card key={r.at} className="p-3">
            <div className="flex items-center gap-2">
              <span className="num text-xs font-bold text-faint">#{runs.length - i}</span>
              <Stars n={r.stars} size={13} />
              <span className="num ml-auto text-xs text-sub">
                正答 {pct(r.accuracy)} · 自動 {pct(r.auto)} · コスト {r.cost}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-full bg-ink px-2 py-0.5 font-bold text-white">{TIERS[r.build.tier].short}</span>
              {buildCards(r).map((c, k) => {
                const Icon = CARD_ICON[c];
                const hue = HUE[CARDS[c].hue];
                return (
                  <span key={k} className={cx('inline-flex h-6 w-6 items-center justify-center rounded-lg', hue.soft, hue.text)} title={CARDS[c].name}>
                    <Icon size={13} />
                  </span>
                );
              })}
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
    <div className="rounded-2xl bg-bg p-2">
      <div className="text-[10px] font-bold text-faint">{label}</div>
      <div className="num text-base font-bold">{fmt(now)}</div>
      <div className={cx('num text-[11px] font-bold', Math.abs(d) < 1e-9 ? 'text-faint' : good ? 'text-go' : 'text-coral')}>
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
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#eceef2" strokeWidth="1.5" />
          <text x={pad.l - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#a3a3ab">
            {v * 100}%
          </text>
        </g>
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="#ff6a4d" strokeDasharray="4 4" strokeWidth="1.5" opacity="0.6" />
      <text x={W - pad.r} y={y(goal) - 4} fontSize="9" textAnchor="end" fill="#ff6a4d">
        目標
      </text>
      {runs.map((_, i) => (
        <text key={i} x={x(i)} y={H - 6} fontSize="10" textAnchor="middle" fill="#a3a3ab">
          {i + 1}
        </text>
      ))}
      {SERIES.filter((s) => on[s.id]).map((s) => (
        <g key={s.id}>
          <polyline points={runs.map((r, i) => `${x(i)},${y(s.get(r))}`).join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {runs.map((r, i) => (
            <circle key={i} cx={x(i)} cy={y(s.get(r))} r="3.5" fill="white" stroke={s.color} strokeWidth="2" />
          ))}
        </g>
      ))}
    </svg>
  );
}
