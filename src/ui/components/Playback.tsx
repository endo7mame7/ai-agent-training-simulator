import { useEffect, useState } from 'react';
import type { WeekReport } from '../../core/types';
import { STAGES } from '../../data/stages';
import { cx, signedMan } from '../util';
import { Button } from './common';

const COLS = ['受注', ...STAGES.map((s) => s.name), '出図'];
const TOTAL_MS = 4200;

/** 実行フェーズの演出:案件カードがラインを左から右へ流れる */
export function Playback({ report, onDone }: { report: WeekReport; onDone: () => void }) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    const a = requestAnimationFrame(() => requestAnimationFrame(() => setPhase(1)));
    const b = setTimeout(() => setPhase(2), 2900);
    const c = setTimeout(onDone, TOTAL_MS);
    return () => {
      cancelAnimationFrame(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [onDone]);

  const traces = report.traces.slice(0, 24);
  const colW = 100 / COLS.length;
  const pos = (index: number) => `${(index + 0.5) * colW}%`;
  const rowH = 30;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-white" onClick={onDone}>
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <div className="text-xs tracking-widest text-teal-300">EXECUTING</div>
          <div className="text-2xl font-bold">第{report.week}週を実行中…</div>
        </div>
        <Button variant="secondary" onClick={onDone}>
          スキップ ▶▶
        </Button>
      </div>
      {report.lineStopped && (
        <div className="mx-8 mb-2 rounded-lg bg-rose-600 px-4 py-2 text-center font-bold">💥 重大事故発生!今週はラインが止まりました</div>
      )}
      <div className="relative mx-8 flex-1 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
        <div className="absolute inset-0 flex">
          {COLS.map((c, i) => (
            <div key={c} className={cx('flex-1 border-r border-slate-700/70 pt-2 text-center text-xs', i === 0 || i === COLS.length - 1 ? 'bg-slate-700/30 text-slate-400' : 'text-slate-300')}>
              {i > 0 && i < COLS.length - 1 && <div className="text-[10px] text-slate-500">工程{i}</div>}
              {c}
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 top-12 bottom-0">
          {traces.map((t, i) => {
            const from = t.newCase ? 0 : t.fromIndex + 1;
            const to = t.shipped ? COLS.length - 1 : t.reworkTo ? t.reworkTo : t.toIndex + 1;
            const stamp = t.stamps[t.stamps.length - 1];
            return (
              <div
                key={t.caseId}
                className="absolute -translate-x-1/2"
                style={{
                  top: i * rowH,
                  left: pos(phase === 0 ? from : to),
                  transition: `left 2.2s cubic-bezier(.45,.05,.35,1) ${i * 45}ms`,
                }}
              >
                <div className={cx('relative w-24 rounded border px-2 py-0.5 text-center text-[11px] font-bold shadow', t.shipped ? 'border-teal-300 bg-teal-50 text-teal-900' : t.reworkTo ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-300 bg-white text-slate-800')}>
                  📄 {t.caseId}
                  {phase >= 1 && stamp && (
                    <span className="stamp absolute -top-2 left-full ml-1 whitespace-nowrap rounded border-2 border-rose-500 bg-white/90 px-1 text-[10px] text-rose-600" style={{ animationDelay: `${900 + i * 45}ms` }}>
                      {stamp.label}
                      {t.stamps.length > 1 && ` 他${t.stamps.length - 1}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {report.traces.length > traces.length && <div className="absolute bottom-2 left-4 text-xs text-slate-400">ほか{report.traces.length - traces.length}件</div>}
        </div>
      </div>
      <div className={cx('flex justify-center gap-10 px-8 py-5 transition-opacity duration-500', phase === 2 ? 'opacity-100' : 'opacity-0')}>
        <Summary label="出図" value={`${report.shipped}件`} />
        <Summary label="不良流出" value={`${report.outflows.length}件`} bad={report.outflows.length > 0} />
        <Summary label="週次利益" value={signedMan(report.profit)} bad={report.profit < 0} />
      </div>
    </div>
  );
}

function Summary({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={cx('text-2xl font-bold tabular-nums', bad ? 'text-rose-400' : 'text-teal-300')}>{value}</div>
    </div>
  );
}
