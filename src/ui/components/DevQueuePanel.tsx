import { cancelDev, linePartReason, startLinePart } from '../../core/actions';
import { describeJob } from '../../core/simulateWeek';
import { BALANCE } from '../../data/balance';
import { LINE_PART_ORDER, LINE_PARTS } from '../../data/parts';
import { useGame } from '../../store/gameStore';
import { cx } from '../util';
import { Button, Panel } from './common';

export function DevQueuePanel() {
  const { game, apply } = useGame();
  if (!game) return null;
  const slots = Array.from({ length: BALANCE.maxConcurrentDev }, (_, i) => game.devQueue[i]);
  return (
    <div className="space-y-4">
      <Panel title="開発キュー" right={<span className="text-xs text-slate-500">同時に{BALANCE.maxConcurrentDev}件まで</span>}>
        <div className="space-y-2">
          {slots.map((job, i) =>
            job ? (
              <div key={job.id} className="rounded-md border border-amber-300 bg-amber-50 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold leading-tight">{describeJob(job)}</div>
                  {job.startedWeek === game.week && (
                    <button type="button" className="cursor-pointer text-xs text-slate-500 hover:text-rose-600" onClick={() => apply((s) => cancelDev(s, job.id))}>
                      取消
                    </button>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                  <span>{job.startedWeek === game.week ? `今週着手・${job.cost}万円` : '開発中'}</span>
                  <span>あと{job.weeksLeft}週</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-amber-200">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.max(8, 100 - job.weeksLeft * 33)}%` }} />
                </div>
              </div>
            ) : (
              <div key={`empty${i}`} className="rounded-md border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
                空き枠 — 工程をクリックして部品や落とし込みを選ぶ
              </div>
            ),
          )}
        </div>
      </Panel>
      <Panel title="ライン全体の部品">
        <div className="space-y-2">
          {LINE_PART_ORDER.map((p) => {
            const def = LINE_PARTS[p];
            const installed = game.lineParts.includes(p);
            const reason = linePartReason(game, p);
            const developing = game.devQueue.some((j) => j.kind === 'linePart' && j.part === p);
            return (
              <div key={p} className={cx('rounded-md border p-2', installed ? 'border-teal-300 bg-teal-50' : 'border-slate-200')}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold">
                    {def.icon} {def.name}
                  </div>
                  {installed ? (
                    <span className="text-xs font-bold text-teal-700">設置済み</span>
                  ) : developing ? (
                    <span className="text-xs text-amber-700">開発中</span>
                  ) : (
                    <Button variant="secondary" className="!px-2 !py-0.5 text-xs" title={reason ?? undefined} onClick={() => apply((s) => startLinePart(s, p))}>
                      {def.cost}万・{def.weeks}週
                    </Button>
                  )}
                </div>
                <div className="mt-1 text-[11px] leading-snug text-slate-500">{def.desc}</div>
                {!installed && !developing && reason && <div className="mt-0.5 text-[11px] text-rose-600">{reason}</div>}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
