import type { GameState } from '../../core/types';
import { DIFFICULTY_LABEL } from '../../data/stages';
import { STAGE_PART_ORDER, STAGE_PARTS } from '../../data/parts';
import { TIER_SHORT } from '../../data/models';
import { stageView } from '../selectors';
import { cx, hasBench, pct } from '../util';

export function StationCard(props: { game: GameState; stageId: number; bottleneck: boolean; onClick: () => void }) {
  const { game } = props;
  const v = stageView(game, props.stageId);
  const developing = game.devQueue.filter((j) => j.kind === 'stagePart' && j.stageId === props.stageId).map((j) => (j.kind === 'stagePart' ? j.part : null));
  const showP = !v.isAgent || hasBench(game);
  const usable = STAGE_PART_ORDER.filter((p) => p !== 'toolLink' || v.def.toolRequired);
  const trial = game.week === 1 && game.flags.executiveTrial && props.stageId === 4;
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cx(
        'group relative flex w-full min-w-0 cursor-pointer flex-col rounded-lg border-2 bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
        props.bottleneck ? 'alarm border-rose-400' : 'border-slate-200 hover:border-teal-400',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold text-slate-400">工程{v.def.id}</div>
        <div className={cx('rounded px-1.5 text-[10px] font-bold', v.def.difficulty === 'high' ? 'bg-rose-100 text-rose-700' : v.def.difficulty === 'mid' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
          難度 {DIFFICULTY_LABEL[v.def.difficulty]}
        </div>
      </div>
      <div className="mt-0.5 truncate text-sm font-bold leading-tight text-slate-800">{v.def.name}</div>
      <div className="truncate text-[10px] text-slate-400">
        {v.def.hours}時間/件{v.def.toolRequired && ` ・ ${v.def.toolName}`}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl', v.isAgent ? 'bg-indigo-100' : 'bg-amber-100')}>
          {v.isAgent ? '🤖' : '👤'}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold">
            {v.st.assignee.type === 'agent' ? `${TIER_SHORT[v.st.assignee.tier]}モデル` : '人'}
            {trial && <span className="ml-1 rounded bg-amber-300 px-1 text-[10px]">試用</span>}
          </div>
          <div className="text-[11px] text-slate-500">
            能力<span className="font-bold tabular-nums text-slate-700">{v.capacity}</span>件
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-0.5">
        {usable.map((p) => {
          const on = v.st.parts.includes(p);
          const dev = developing.includes(p);
          return (
            <span
              key={p}
              title={`${STAGE_PARTS[p].name}${on ? '(設置済み)' : dev ? '(開発中)' : '(未設置)'}`}
              className={cx(
                'flex h-6 w-6 items-center justify-center rounded text-xs',
                on ? 'border border-teal-300 bg-teal-50' : dev ? 'border border-dashed border-amber-400 bg-amber-50 opacity-70' : 'border border-dashed border-slate-300 opacity-35 grayscale',
              )}
            >
              {STAGE_PARTS[p].icon}
            </span>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-1 border-t border-slate-100 pt-1.5 text-[10px] leading-relaxed">
        <div className="text-slate-500">予測</div>
        <div className="text-right font-bold tabular-nums">{showP ? pct(v.effective) : '???'}</div>
        <div className="text-slate-500">先週実績</div>
        <div className="text-right tabular-nums">{v.lastActual === null ? '—' : pct(v.lastActual)}</div>
        {v.isAgent && (
          <>
            <div className="text-slate-500">トークン代</div>
            <div className="text-right tabular-nums">{trial ? '無料' : `${v.tokensPerCase.toFixed(2)}万/件`}</div>
          </>
        )}
      </div>

      <div className={cx('mt-2 flex items-center justify-between rounded px-2 py-1 text-xs', v.waiting > v.capacity ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600')}>
        <span>仕掛かり</span>
        <span className="font-bold tabular-nums">{v.waiting}件</span>
      </div>

      {(v.risk || (v.st.parts.includes('approvalGate') && v.reviewCap === 0) || v.workSlotsWasted || (!v.isAgent && v.capacity === 0)) && (
        <div className="mt-2 space-y-0.5 text-[10px] leading-snug">
          {v.risk && <div className="text-rose-600">⚠ 安全柵なし:重大事故のおそれ</div>}
          {v.st.parts.includes('approvalGate') && v.reviewCap === 0 && <div className="text-amber-700">⚠ 承認ゲートのレビュー担当がいない</div>}
          {v.workSlotsWasted && <div className="text-amber-700">⚠ 人の作業コマが空回り</div>}
          {!v.isAgent && v.capacity === 0 && <div className="text-rose-600">⚠ 担当コマがない</div>}
        </div>
      )}
    </button>
  );
}
