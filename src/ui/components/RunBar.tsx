import { ChevronRight, Pause, TriangleAlert } from 'lucide-react';
import { missionDef } from '../../game/data';
import { useGame } from '../../store';
import { cx } from './ui';

/** 実行中の案件をどの画面からでも開けるバー */
export function RunBar() {
  const { run, setRunOpen } = useGame();
  if (!run || !(run.status === 'running' || run.status === 'paused' || run.status === 'awaiting')) return null;
  const awaiting = run.status === 'awaiting';
  return (
    <button
      type="button"
      onClick={() => setRunOpen(true)}
      className={cx(
        'press shadow-soft fixed bottom-[76px] left-1/2 z-30 flex w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left',
        awaiting ? 'anim-slide bg-coral text-white' : 'bg-ink text-white',
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
        {awaiting ? <TriangleAlert size={17} /> : run.status === 'paused' ? <Pause size={17} /> : <span className="anim-pulse h-2.5 w-2.5 rounded-full bg-[#7fe3a0]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold">{awaiting ? '確認が必要です' : run.status === 'paused' ? '一時停止中' : missionDef(run.missionId).title}</span>
        <span className="num block text-[11px] opacity-70">
          {run.cur} / {run.total}
        </span>
      </span>
      <ChevronRight size={18} className="opacity-70" />
    </button>
  );
}
