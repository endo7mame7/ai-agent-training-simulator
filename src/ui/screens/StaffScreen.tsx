import { setSlot } from '../../core/actions';
import type { SlotAssignment } from '../../core/types';
import { BALANCE } from '../../data/balance';
import { isVeteranAway } from '../../data/events';
import { RANKS } from '../../data/staff';
import { STAGES } from '../../data/stages';
import { useGame } from '../../store/gameStore';
import { Button, Panel } from '../components/common';
import { stageView } from '../selectors';
import { assigneeLabel, cx } from '../util';

const encode = (s: SlotAssignment) => (s.kind === 'idle' ? 'idle' : `${s.kind}:${s.stageId}`);
const decode = (v: string): SlotAssignment => {
  if (v === 'idle') return { kind: 'idle' };
  const [kind, id] = v.split(':');
  return { kind: kind as 'work' | 'review' | 'interview', stageId: Number(id) };
};
const slotTone = (s: SlotAssignment) =>
  s.kind === 'work' ? 'border-sky-300 bg-sky-50' : s.kind === 'review' ? 'border-violet-300 bg-violet-50' : s.kind === 'interview' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50 text-slate-400';

export function StaffScreen() {
  const { game, apply, setScreen } = useGame();
  if (!game) return null;
  const away = isVeteranAway(game.week);
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-5 pb-10 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">人員配置</h1>
        <Button variant="primary" onClick={() => setScreen('main')}>
          ラインに戻る
        </Button>
      </div>
      {away && <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-800">今週はベテランが不在のため、ベテランのコマはすべて0として扱われます。</div>}
      <Panel title={`コマの割り振り(1人週${BALANCE.slotsPerStaff}コマ・1コマ = ${BALANCE.hoursPerSlot}時間)`}>
        <table className="w-full border-separate border-spacing-y-1.5 text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="w-56">人員</th>
              {Array.from({ length: BALANCE.slotsPerStaff }, (_, i) => (
                <th key={i}>コマ{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {game.staff.map((m) => {
              const r = RANKS[m.rank];
              return (
                <tr key={m.id} className={cx(away && m.rank === 'veteran' && 'opacity-40')}>
                  <td className="pr-3">
                    <div className="font-bold">{m.name}</div>
                    <div className="text-[11px] text-slate-500">
                      週給{r.salary}万 ・ 成功率 低{r.success.low}/中{r.success.mid}/高{r.success.high} ・ レビュー検出{r.reviewDetect}
                    </div>
                  </td>
                  {m.slots.map((slot, i) => (
                    <td key={i} className="pr-2">
                      <select
                        value={encode(slot)}
                        onChange={(e) => apply((s) => setSlot(s, m.id, i, decode(e.target.value)))}
                        className={cx('w-full cursor-pointer rounded-md border px-2 py-1.5 text-xs', slotTone(slot))}
                      >
                        <option value="idle">空き</option>
                        <optgroup label="工程作業">
                          {STAGES.map((st) => (
                            <option key={st.id} value={`work:${st.id}`}>
                              作業:{st.id} {st.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="承認レビュー">
                          {STAGES.map((st) => (
                            <option key={st.id} value={`review:${st.id}`}>
                              レビュー:{st.id} {st.name}
                            </option>
                          ))}
                        </optgroup>
                        {m.rank === 'veteran' && (
                          <optgroup label="ヒアリング協力">
                            {STAGES.map((st) => (
                              <option key={st.id} value={`interview:${st.id}`}>
                                ヒアリング:{st.id} {st.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-3 flex gap-4 text-[11px] text-slate-500">
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-sky-300" />
            作業:人が担当する工程の処理能力になる
          </span>
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-violet-300" />
            承認レビュー:承認ゲートのある工程で1コマ{BALANCE.reviewCasesPerSlot}件まで確認
          </span>
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-300" />
            ヒアリング:翌週、その工程の未発見カンコツが1つ判明(ベテランのみ)
          </span>
        </div>
      </Panel>

      <Panel title="工程ごとのまとめ">
        <div className="grid grid-cols-6 gap-3">
          {STAGES.map((st) => {
            const v = stageView(game, st.id);
            const work = game.staff.reduce((a, m) => a + m.slots.filter((x) => x.kind === 'work' && x.stageId === st.id).length, 0);
            const review = game.staff.reduce((a, m) => a + m.slots.filter((x) => x.kind === 'review' && x.stageId === st.id).length, 0);
            const gate = v.st.parts.includes('approvalGate');
            return (
              <div key={st.id} className="rounded-md border border-slate-200 p-3 text-xs">
                <div className="text-[11px] text-slate-400">工程{st.id}</div>
                <div className="font-bold">{st.name}</div>
                <div className="mt-1">担当:{assigneeLabel(v.st.assignee)}</div>
                <div>作業コマ:{work}({v.isAgent ? '—' : `週${v.capacity}件`})</div>
                <div>レビューコマ:{review}</div>
                <div className="mt-1 space-y-0.5 text-[11px]">
                  {v.isAgent && work > 0 && <div className="text-amber-700">エージェント担当なので作業コマは使われない</div>}
                  {!v.isAgent && work === 0 && <div className="text-rose-600">作業コマがない</div>}
                  {review > 0 && !gate && <div className="text-amber-700">承認ゲートがOFFなのでレビューは使われない</div>}
                  {gate && review === 0 && <div className="text-amber-700">承認ゲートにレビュー担当がいない</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
