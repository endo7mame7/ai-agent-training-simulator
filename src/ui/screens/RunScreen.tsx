import { Check, ChevronLeft, CircleCheck, CircleX, Copy, Hourglass, Pause, Play, Square, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BAD_DRAFTS, CARDS, EMAILS, missionDef, TROUBLES } from '../../game/data';
import { causesVisible } from '../../game/engine';
import type { LogEntry, Outcome, RunState } from '../../game/types';
import { APPROVAL_SECONDS, useGame } from '../../store';
import { CARD_ICON, STEP_ICON } from '../components/icons';
import { OfficeScene, type AgentStatus } from '../components/OfficeScene';
import { Btn, cx, Meter, Sheet } from '../components/ui';

export const OUTCOME_UI: Record<Outcome, { label: string; color: string; icon: typeof Check }> = {
  ok: { label: '自動で成功', color: 'text-go', icon: CircleCheck },
  okHuman: { label: '人が対応', color: 'text-sky', icon: UserCheck },
  wrong: { label: '誤回答', color: 'text-coral', icon: CircleX },
  missend: { label: '誤送信', color: 'text-rose', icon: Copy },
  dropped: { label: '未処理', color: 'text-butter', icon: Hourglass },
};

function statusFor(run: RunState, last?: LogEntry): AgentStatus {
  if (run.status === 'awaiting') return 'wait';
  if (run.status === 'paused') return 'sleep';
  if (run.status === 'done' || run.status === 'stopped') return 'done';
  if (last && (last.kind === 'trouble' || last.kind === 'drop' || last.kind === 'missend')) return 'trouble';
  return 'work';
}

export function logText(l: LogEntry, show: boolean, stepName: string): string {
  const t = l.trouble ? (show ? TROUBLES[l.trouble].name : '原因不明の問題') : '';
  switch (l.kind) {
    case 'ok':
      return `${stepName} 完了`;
    case 'trouble':
      return `${stepName}:${t}`;
    case 'fixed':
      return `チェックで修正(${t})`;
    case 'retry':
      return 'リトライで復旧';
    case 'blocked':
      return 'ガードが重複送信をブロック';
    case 'ask':
      return 'あなたに確認を依頼';
    case 'human':
      return 'あなたが判断';
    case 'drop':
      return `${t}で処理停止`;
    case 'missend':
      return '同じメールを二重送信';
    case 'done':
      return `#${l.email + 1} ${OUTCOME_UI[l.outcome!].label}`;
  }
}

export function RunScreen() {
  const { run, save, setRunOpen, pause, resume, stop, speed, setSpeed, approve } = useGame();
  const [confirmStop, setConfirmStop] = useState(false);
  if (!run) return null;
  const mission = missionDef(run.missionId);
  const show = causesVisible(mission, run.build);
  const last = run.log.at(-1);
  const finished = run.status === 'done' || run.status === 'stopped';
  const stepNow = finished ? -1 : run.stepIdx;
  const recent = run.log.slice(-5).reverse();
  const st = statusFor(run, last);

  return (
    <div className="anim-fade fixed inset-0 z-40 flex justify-center bg-ink/30">
      <div className="flex h-dvh w-full max-w-[480px] flex-col bg-bg">
        {/* シーン */}
        <div className="relative bg-grass pt-[max(10px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2 px-3 text-white">
            <button type="button" onClick={() => setRunOpen(false)} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/25" aria-label="戻る">
              <ChevronLeft size={22} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold opacity-80">{run.mode === 'test' ? 'TEST RUN' : 'PRODUCTION'}</div>
              <div className="truncate text-[15px] font-bold">{mission.title}</div>
            </div>
            <div className="num text-xl font-bold">
              {Math.min(run.cur + (finished ? 0 : 1), run.total)}
              <span className="text-sm opacity-70">/{run.total}</span>
            </div>
          </div>
          <div className="-mb-2 -mt-6 overflow-hidden" style={{ height: 210 }}>
            <OfficeScene agents={save.agents} status={(id) => (id === run.build.agentId ? st : 'idle')} busy={run.status === 'running'} onAgent={() => {}} height={250} showHire={false} />
          </div>
        </div>

        {/* 進捗 */}
        <div className="bg-white px-4 py-3">
          <Meter value={run.cur} max={run.total} tone="bg-go" />
          <div className="mt-3 grid grid-cols-5 gap-1 text-center">
            {(Object.keys(OUTCOME_UI) as Outcome[]).map((o) => {
              const Icon = OUTCOME_UI[o].icon;
              return (
                <div key={o}>
                  <Icon size={16} className={cx('mx-auto', OUTCOME_UI[o].color)} />
                  <div className="num text-base font-bold">{run.outcomes[o]}</div>
                  <div className="text-[9px] text-sub">{OUTCOME_UI[o].label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-1.5">
            {mission.steps.map((s, i) => {
              const Icon = STEP_ICON[s.id];
              const here = i === stepNow;
              const trouble = here && last && last.step === i && last.email === run.cur && last.kind === 'trouble';
              return (
                <div key={s.id} className={cx('relative flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors', here ? 'bg-ink text-white' : 'bg-white')}>
                  <Icon size={17} className={here ? 'text-white' : 'text-sub'} />
                  <span className="flex-1 text-[13px] font-bold">{s.name}</span>
                  <span className="flex gap-1.5">
                    {run.build.slots[s.id].filter(Boolean).map((c) => {
                      const CI = CARD_ICON[c!];
                      return <CI key={c} size={15} className={here ? 'text-white/70' : 'text-faint'} aria-label={CARDS[c!].name} />;
                    })}
                  </span>
                  {here && <span className={cx('h-2 w-2 rounded-full', trouble ? 'bg-coral' : 'anim-pulse bg-[#7fe3a0]')} />}
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-2xl bg-white p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-faint">
              <span>LOG</span>
              {!show && <span>ログカードなし:原因は表示されません</span>}
            </div>
            <ul className="mt-1.5 space-y-1 text-xs">
              {recent.length === 0 && <li className="text-sub">開始します</li>}
              {recent.map((l) => (
                <li key={l.n} className={cx('anim-slide truncate', (l.kind === 'trouble' || l.kind === 'drop' || l.kind === 'missend') && 'text-coral')}>
                  <span className="num text-faint">#{l.email + 1}</span> {logText(l, show, mission.steps[l.step]?.name ?? '')}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="safe-bottom border-t border-line bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            {run.status === 'paused' ? (
              <Btn className="flex-1" onClick={resume}>
                <Play size={16} /> 再開
              </Btn>
            ) : (
              <Btn tone="secondary" className="flex-1" onClick={pause} disabled={run.status !== 'running'}>
                <Pause size={16} /> 一時停止
              </Btn>
            )}
            <div className="flex rounded-2xl bg-bg p-1">
              {([1, 2, 4] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSpeed(s)} className={cx('num h-10 w-11 cursor-pointer rounded-xl text-sm font-bold', speed === s ? 'bg-white shadow-soft' : 'text-faint')}>
                  ×{s}
                </button>
              ))}
            </div>
            <Btn tone="secondary" size="sm" onClick={() => setConfirmStop(true)} disabled={finished} ariaLabel="停止" className="w-12 !px-0">
              <Square size={15} />
            </Btn>
          </div>
        </div>
      </div>

      {run.status === 'awaiting' && run.pending && <ApprovalSheet run={run} onDecide={approve} />}
      <Sheet open={confirmStop} onClose={() => setConfirmStop(false)} title="実行を停止しますか?">
        <p className="text-sm text-sub">ここまでの結果で集計します。★と報酬は付きません。</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Btn tone="secondary" onClick={() => setConfirmStop(false)}>
            続ける
          </Btn>
          <Btn
            tone="accent"
            onClick={() => {
              setConfirmStop(false);
              stop();
            }}
          >
            停止する
          </Btn>
        </div>
      </Sheet>
    </div>
  );
}

/** 承認:エージェントの回答案を見て、承認か差し戻しかを決める */
function ApprovalSheet({ run, onDecide }: { run: RunState; onDecide: (d: 'approve' | 'reject') => void }) {
  const p = run.pending!;
  const mission = missionDef(run.missionId);
  const tpl = EMAILS[p.template];
  const bad = p.trouble ? BAD_DRAFTS[p.trouble](tpl) : null;
  const [left, setLeft] = useState(APPROVAL_SECONDS);
  useEffect(() => {
    setLeft(APPROVAL_SECONDS);
    const t = setInterval(() => setLeft((x) => x - 0.1), 100);
    return () => clearInterval(t);
  }, [run.asks]);
  useEffect(() => {
    if (left <= 0) onDecide('reject');
  }, [left, onDecide]);
  const missing = p.trouble === 'missing';

  return (
    <Sheet open title="承認リクエスト">
      <div className="num text-xs text-sub">
        #{p.email + 1} · {mission.steps[p.step].name}
      </div>
      <div className="mt-2 rounded-2xl bg-white p-4 text-sm">
        <div className="text-[11px] font-bold text-faint">
          FROM {tpl.from} · {missing ? '商品が届かない' : tpl.subject}
        </div>
        <div className="mt-1">{missing ? '注文した商品がまだ届きません。どうなっていますか?' : tpl.body}</div>
      </div>
      <div className="mt-2 rounded-2xl border border-sky/30 bg-sky-soft p-4 text-sm">
        <div className="text-[11px] font-bold text-sky">エージェントの回答案</div>
        <div className="mt-1 font-bold leading-relaxed">{bad ? bad.draft : tpl.good}</div>
      </div>
      <div className="mt-2 rounded-2xl bg-white p-3 text-xs leading-relaxed text-sub">
        <b className="text-ink">社内ルール</b> 返品・返金は30日以内 / 注文番号がなければ確認 / 宛名は顧客DBで確認
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-ink transition-[width] duration-100 ease-linear" style={{ width: `${(left / APPROVAL_SECONDS) * 100}%` }} />
      </div>
      <p className="mt-1.5 text-center text-[11px] text-sub">時間切れの場合は、安全のため差し戻しになります</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Btn tone="accent" size="lg" onClick={() => onDecide('reject')}>
          差し戻す
        </Btn>
        <Btn size="lg" onClick={() => onDecide('approve')}>
          承認する
        </Btn>
      </div>
      <p className="mt-2 text-center text-[11px] text-sub">差し戻すと人が修正して送信します(自動処理には数えません)</p>
    </Sheet>
  );
}
