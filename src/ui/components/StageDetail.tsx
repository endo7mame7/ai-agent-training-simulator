import {
  encodingReason,
  logAnalysisReason,
  setAssignee,
  setSlot,
  stagePartReason,
  startEncoding,
  startLogAnalysis,
  startStagePart,
} from '../../core/actions';
import { tokenCostPerAttempt, unitPrice } from '../../core/formulas';
import type { Encoding, GameState, ModelTier } from '../../core/types';
import { BALANCE } from '../../data/balance';
import { ENCODINGS, KNACK_KIND_LABEL, KNACKS } from '../../data/knacks';
import { MODELS, TIER_ORDER } from '../../data/models';
import { STAGE_PART_ORDER, STAGE_PARTS } from '../../data/parts';
import { RANKS } from '../../data/staff';
import { DIFFICULTY_LABEL } from '../../data/stages';
import { useGame } from '../../store/gameStore';
import { stageView } from '../selectors';
import { cx, hasBench, pct } from '../util';
import { Button, Modal, Tip } from './common';

export function StageDetail({ stageId }: { stageId: number }) {
  const { game, apply, selectStage, setScreen, setMessage } = useGame();
  if (!game) return null;
  const v = stageView(game, stageId);
  const bench = hasBench(game);
  const trial = game.week === 1 && game.flags.executiveTrial && stageId === 4;
  const knacks = KNACKS.filter((k) => k.stageId === stageId);

  const requestInterview = () => {
    const vet = game.staff.find((s) => s.rank === 'veteran')!;
    if (vet.slots.some((x) => x.kind === 'interview' && x.stageId === stageId)) {
      setMessage('この工程のヒアリングはすでに指示しています');
      return;
    }
    let idx = vet.slots.findIndex((x) => x.kind === 'idle');
    if (idx < 0) idx = vet.slots.map((x) => x.kind).lastIndexOf('work');
    if (idx < 0) {
      setMessage('ベテランのコマに空きがありません。人員配置で調整してください');
      return;
    }
    const before = vet.slots[idx];
    if (apply((s) => setSlot(s, vet.id, idx, { kind: 'interview', stageId })))
      setMessage(`ベテランのコマ${idx + 1}(${before.kind === 'work' ? `工程${before.stageId}の作業` : '空き'})をヒアリングに回しました`);
  };

  return (
    <Modal
      onClose={() => selectStage(null)}
      width="w-[960px]"
      title={
        <div className="flex items-baseline gap-3">
          <span className="text-slate-400">工程{v.def.id}</span>
          <span>{v.def.name}</span>
          <span className="text-sm font-normal text-slate-500">
            {v.def.desc} ・ {v.def.hours}時間/件 ・ 難度{DIFFICULTY_LABEL[v.def.difficulty]}
            {v.def.toolRequired && ` ・ ツール必須(${v.def.toolName})`}
          </span>
        </div>
      }
    >
      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {/* 左:担当と予測 */}
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-sm font-bold text-slate-700">担当</h3>
            <div className="grid grid-cols-4 gap-2">
              <AssigneeOption
                active={v.st.assignee.type === 'human'}
                disabled={trial}
                title="人"
                icon="👤"
                lines={['トークン代なし', '時間に限り']}
                onClick={() => apply((s) => setAssignee(s, stageId, { type: 'human' }))}
              />
              {TIER_ORDER.map((t) => (
                <AssigneeOption
                  key={t}
                  active={v.st.assignee.type === 'agent' && v.st.assignee.tier === t}
                  disabled={trial}
                  title={MODELS[t].name}
                  icon="🤖"
                  lines={[`単価 ${unitPrice(t, game.flags.modelGen).toFixed(3)}万`, `容量 ${MODELS[t].contextCap}`]}
                  onClick={() => apply((s) => setAssignee(s, stageId, { type: 'agent', tier: t }))}
                />
              ))}
            </div>
            {trial && <p className="mt-2 text-xs text-amber-700">今週は役員の一声で大モデルを無料で試用中です。</p>}
          </section>

          {v.isAgent ? <AgentForecast game={game} stageId={stageId} bench={bench} /> : <HumanInfo game={game} stageId={stageId} onStaff={() => setScreen('staff')} />}

          {v.risk && (
            <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
              ⚠ ツール接続ありで安全柵がないため、毎週{pct(BALANCE.accidentChance)}の確率で重大事故(ライン停止・復旧費{BALANCE.accidentCost}万円)が起きます。
            </div>
          )}
        </div>

        {/* 右:部品とカンコツ */}
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-sm font-bold text-slate-700">ハーネス部品(この工程)</h3>
            <div className="space-y-1.5">
              {STAGE_PART_ORDER.map((p) => {
                if (p === 'toolLink' && !v.def.toolRequired) return null;
                const def = STAGE_PARTS[p];
                const installed = v.st.parts.includes(p);
                const developing = game.devQueue.some((j) => j.kind === 'stagePart' && j.stageId === stageId && j.part === p);
                const reason = stagePartReason(game, stageId, p);
                return (
                  <div key={p} className={cx('flex items-center gap-3 rounded-md border px-3 py-2', installed ? 'border-teal-300 bg-teal-50' : 'border-slate-200')}>
                    <div className="text-xl">{def.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">{def.name}</div>
                      <div className="text-[11px] leading-snug text-slate-500">{def.desc}</div>
                      {p === 'approvalGate' && installed && (
                        <div className={cx('text-[11px]', v.reviewCap > 0 ? 'text-teal-700' : 'text-amber-700')}>
                          {v.reviewCap > 0 ? `レビュー担当:${v.reviewers.length}人・週${v.reviewCap}件まで確認` : 'レビュー担当のコマが未設定(人員配置で「承認レビュー」を割り当て)'}
                        </div>
                      )}
                      {!installed && !developing && reason && p !== 'approvalGate' && <div className="text-[11px] text-rose-600">{reason}</div>}
                    </div>
                    {p === 'approvalGate' ? (
                      <Button variant={installed ? 'primary' : 'secondary'} className="!py-1 text-xs" onClick={() => apply((s) => startStagePart(s, stageId, p))}>
                        {installed ? 'ON' : 'OFF'}
                      </Button>
                    ) : installed ? (
                      <span className="text-xs font-bold text-teal-700">設置済み</span>
                    ) : developing ? (
                      <span className="text-xs text-amber-700">開発中</span>
                    ) : (
                      <Button className="!py-1 text-xs" onClick={() => apply((s) => startStagePart(s, stageId, p))}>
                        {def.cost}万・{def.weeks}週
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">
                カンコツ<Tip text="現場の判断のコツ。ハーネスに落とし込まないと、エージェントの成功率が下がる" />
              </h3>
              <div className="flex gap-1">
                <Button variant="ghost" className="text-xs" onClick={requestInterview}>
                  🗣 ヒアリングを指示
                </Button>
                <Button
                  variant="ghost"
                  className="text-xs"
                  title={logAnalysisReason(game, stageId) ?? '開発枠1つを1週間使う。感覚型は見つからない'}
                  onClick={() => apply((s) => startLogAnalysis(s, stageId))}
                >
                  🔍 ログ分析({BALANCE.logAnalysisCost}万)
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {knacks.map((k) => {
                const ks = game.knacks[k.id];
                if (!ks.discovered)
                  return (
                    <div key={k.id} className="flex items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-200 font-bold text-slate-500">?</div>
                      <div className="text-xs text-slate-500">未発見のカンコツ。ベテランへのヒアリング、ログ分析、失敗の記録から見つかる</div>
                    </div>
                  );
                const devJob = game.devQueue.find((j) => j.kind === 'encoding' && j.knackId === k.id);
                return (
                  <div key={k.id} className="rounded-md border border-slate-200 px-3 py-2">
                    <div className="flex items-start gap-2">
                      <span className="rounded bg-slate-800 px-1.5 text-[11px] font-bold text-white">{k.id}</span>
                      <div className="flex-1 text-sm leading-snug">{k.text}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {KNACK_KIND_LABEL[k.kind]} ・ 影響度 {k.weight.toFixed(2)}
                      {ks.encoding && <span className="ml-2 font-bold text-teal-700">✔ {ENCODINGS[ks.encoding].name}済み</span>}
                      {devJob && devJob.kind === 'encoding' && <span className="ml-2 text-amber-700">{ENCODINGS[devJob.encoding].name}を開発中</span>}
                    </div>
                    {k.kind === 'sense' ? (
                      <div className="mt-1 text-[11px] text-rose-600">感覚型:ハーネスに落とせない。人が担当するか、承認ゲートで拾う</div>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(Object.keys(k.encodings) as Encoding[]).map((e) => {
                          const reason = encodingReason(game, k.id, e);
                          const def = ENCODINGS[e];
                          return (
                            <button
                              type="button"
                              key={e}
                              title={reason ?? `${def.cost}万円・${def.weeks}週${def.load ? `・コンテキスト負荷+${def.load}` : ''}`}
                              onClick={() => apply((s) => startEncoding(s, k.id, e))}
                              className={cx(
                                'cursor-pointer rounded border px-2 py-0.5 text-[11px]',
                                ks.encoding === e ? 'border-teal-500 bg-teal-50 font-bold text-teal-800' : reason ? 'border-slate-200 text-slate-400' : 'border-slate-300 hover:bg-slate-100',
                              )}
                            >
                              {def.short} {pct(k.encodings[e]!)}
                              <span className="ml-1 text-slate-400">{def.cost}万</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}

function AssigneeOption(props: { active: boolean; disabled?: boolean; title: string; icon: string; lines: string[]; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={cx(
        'cursor-pointer rounded-lg border-2 p-2 text-center transition disabled:cursor-not-allowed disabled:opacity-50',
        props.active ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-400',
      )}
    >
      <div className="text-2xl">{props.icon}</div>
      <div className="text-sm font-bold">{props.title}</div>
      {props.lines.map((l) => (
        <div key={l} className="text-[10px] text-slate-500">
          {l}
        </div>
      ))}
    </button>
  );
}

function AgentForecast({ game, stageId, bench }: { game: GameState; stageId: number; bench: boolean }) {
  const v = stageView(game, stageId);
  const b = v.breakdown!;
  const tier = (v.st.assignee as { tier: ModelTier }).tier;
  const unit = tokenCostPerAttempt(game, stageId, tier);
  return (
    <section className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
      <h3 className="mb-2 flex items-center justify-between text-sm font-bold text-slate-700">
        <span>
          成功率の予測<Tip text="評価ベンチがあると、配備前に予測値が見える" />
        </span>
        <span className="text-2xl tabular-nums">{bench ? pct(v.effective) : '???'}</span>
      </h3>
      {bench ? (
        <div className="space-y-1 text-xs">
          <Row label="1回の試行の成功率" value={pct(b.p)} />
          <Row label="モデルの基礎 B" value={b.B.toFixed(2)} />
          <Row label="ツール係数 T" value={b.T.toFixed(2)} bad={b.T < 1} />
          <Row label="カンコツ係数 K" value={b.K.toFixed(3)} bad={b.K < 0.9} />
          <Row label={`コンテキスト係数 C(負荷${b.L} / 容量${b.cap})`} value={b.C.toFixed(3)} bad={b.C < 1} />
          {v.st.parts.includes('verifyLoop') && <div className="text-[11px] text-slate-500">検証ループの再試行込みの値を大きく表示しています</div>}
        </div>
      ) : (
        <p className="text-xs text-slate-500">評価ベンチがないため、予測は見えません。実績は翌週のレポートで分かります。</p>
      )}
      <div className="mt-3 border-t border-indigo-100 pt-2 text-xs">
        <Row label="トークン代(1回の試行)" value={`${unit.toFixed(3)}万円`} />
        <Row label="トークン代(1件あたり見込み)" value={`${v.tokensPerCase.toFixed(3)}万円`} />
        <Row label="処理能力" value={`週${BALANCE.agentCapacityPerWeek}件まで`} />
        <Row label="コンテキスト負荷" value={`${b.L} / 容量${b.cap}`} bad={b.L > b.cap} />
      </div>
    </section>
  );
}

function HumanInfo({ game, stageId, onStaff }: { game: GameState; stageId: number; onStaff: () => void }) {
  const v = stageView(game, stageId);
  const h = v.human!;
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
      <h3 className="mb-2 flex items-center justify-between text-sm font-bold text-slate-700">
        <span>人の担当</span>
        <span className="text-2xl tabular-nums">{pct(h.rate)}</span>
      </h3>
      <div className="space-y-1 text-xs">
        {h.contributors.length === 0 && <div className="text-rose-600">作業コマが割り当てられていません</div>}
        {h.contributors.map((c) => (
          <Row key={c.staffId} label={`${game.staff.find((s) => s.id === c.staffId)!.name} ×${c.slots}コマ`} value={pct(RANKS[c.rank].success[v.def.difficulty])} />
        ))}
        <Row label="使える時間(繰り越し込み)" value={`${h.hours.toFixed(0)}時間`} />
        <Row label="処理能力" value={`週${h.capacity}件`} />
      </div>
      <Button variant="secondary" className="mt-3 w-full text-xs" onClick={onStaff}>
        人員配置を開く
      </Button>
    </section>
  );
}

function Row({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-600">{label}</span>
      <span className={cx('font-bold tabular-nums', bad && 'text-rose-600')}>{value}</span>
    </div>
  );
}
