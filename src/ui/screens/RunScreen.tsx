import { useEffect, useState } from 'react';
import { agentDef, BAD_DRAFTS, CARDS, EMAILS, missionDef, TROUBLES } from '../../game/data';
import { causesVisible } from '../../game/engine';
import type { LogEntry, Outcome, RunState } from '../../game/types';
import { APPROVAL_SECONDS, useGame } from '../../store';
import { Robot, type Mood } from '../components/Robot';
import { Btn, cx, Meter, Sheet } from '../components/ui';

export const OUTCOME_UI: Record<Outcome, { emoji: string; label: string; color: string }> = {
  ok: { emoji: '✅', label: '自動で成功', color: 'text-mint' },
  okHuman: { emoji: '🙋', label: '人の手で成功', color: 'text-sky' },
  wrong: { emoji: '😵', label: 'まちがい', color: 'text-pink' },
  missend: { emoji: '💥', label: '誤送信', color: 'text-pink' },
  dropped: { emoji: '⏳', label: '未処理', color: 'text-[#b8860b]' },
};

function moodFor(run: RunState, lastLog?: LogEntry): Mood {
  if (run.status === 'awaiting') return 'wait';
  if (run.status === 'paused') return 'sleep';
  if (run.status === 'done' || run.status === 'stopped') return 'happy';
  if (!lastLog) return 'think';
  if (lastLog.kind === 'trouble' || lastLog.kind === 'drop' || lastLog.kind === 'missend') return 'sad';
  if (lastLog.kind === 'done' && (lastLog.outcome === 'ok' || lastLog.outcome === 'okHuman')) return 'happy';
  if (lastLog.kind === 'done') return 'sad';
  return 'work';
}

function logText(l: LogEntry, show: boolean, stepName: string): string {
  const t = l.trouble ? (show ? `${TROUBLES[l.trouble].emoji}${TROUBLES[l.trouble].name}` : '❔なにか問題') : '';
  switch (l.kind) {
    case 'ok':
      return `${stepName} OK`;
    case 'trouble':
      return `${stepName}で ${t}!`;
    case 'fixed':
      return `🔍チェックで ${t} を直した`;
    case 'retry':
      return '🔁リトライで復活';
    case 'blocked':
      return '🛡️ガードが二重送信をブロック';
    case 'ask':
      return '🙋あなたに確認をお願い';
    case 'human':
      return '🙋あなたが判断した';
    case 'drop':
      return `${t}で止まっちゃった…`;
    case 'missend':
      return '💥同じメールを二重に送ってしまった!';
    case 'done':
      return `${OUTCOME_UI[l.outcome!].emoji} メール #${l.email + 1} ${OUTCOME_UI[l.outcome!].label}`;
  }
}

export function RunScreen() {
  const { run, setRunOpen, pause, resume, stop, speed, setSpeed, approve } = useGame();
  const [confirmStop, setConfirmStop] = useState(false);
  if (!run) return null;
  const mission = missionDef(run.missionId);
  const show = causesVisible(mission, run.build);
  const agent = agentDef(run.build.agentId);
  const last = run.log.at(-1);
  const mood = moodFor(run, last);
  const stepNow = run.status === 'done' ? mission.steps.length - 1 : run.stepIdx;
  const recent = run.log.slice(-6).reverse();
  const finished = run.status === 'done' || run.status === 'stopped';

  return (
    <div className="anim-fade fixed inset-0 z-40 flex justify-center bg-[#4a3b55]/30">
      <div className="flex h-dvh w-full max-w-[480px] flex-col bg-cream">
        {/* 上部 */}
        <div className="border-b-2 border-[#f6dbe4] px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setRunOpen(false)} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-xl shadow" aria-label="もどる">
              ‹
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-extrabold text-pink">{run.mode === 'test' ? '🧪 テスト実行' : '🚀 本番実行'}</div>
              <div className="truncate font-extrabold">
                {mission.clientEmoji} {mission.title}
              </div>
            </div>
            <div className="text-right text-sm font-extrabold tabular-nums">
              {Math.min(run.cur + (finished ? 0 : 1), run.total)}/{run.total}
            </div>
          </div>
          <Meter value={run.cur} max={run.total} tone="bg-mint" className="mt-2" />
          <div className="mt-2 grid grid-cols-5 gap-1 text-center">
            {(Object.keys(OUTCOME_UI) as Outcome[]).map((o) => (
              <div key={o} className="rounded-xl bg-white py-1">
                <div className="text-base leading-none">{OUTCOME_UI[o].emoji}</div>
                <div className={cx('text-sm font-extrabold tabular-nums', OUTCOME_UI[o].color)}>{run.outcomes[o]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* フロー */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-3">
          <div className="flex flex-col gap-1.5">
            {mission.steps.map((s, i) => {
              const here = i === stepNow && !finished;
              const cards = [...run.build.slots[s.id]].filter(Boolean);
              const stepLog = here && last && last.step === i && last.email === run.cur ? last : undefined;
              return (
                <div key={s.id} className={cx('relative flex items-center gap-2 rounded-2xl border-2 bg-white px-3 py-2 transition-all', here ? 'scale-[1.02] border-pink shadow-[0_4px_0_#ffc2d4]' : 'border-[#f6dbe4]')}>
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="flex-1 text-sm font-extrabold">{s.name}</span>
                  <span className="flex gap-0.5">
                    {cards.map((c) => (
                      <span key={c} className="text-base" title={CARDS[c!].name}>
                        {CARDS[c!].emoji}
                      </span>
                    ))}
                  </span>
                  {here && (
                    <span className="absolute -left-2 -top-2">
                      <span className="anim-pop inline-block rounded-lg bg-pink px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow">📩 #{run.cur + 1}</span>
                    </span>
                  )}
                  {stepLog && stepLog.kind === 'trouble' && <span className="anim-float absolute right-14 top-1 text-xl">{show ? TROUBLES[stepLog.trouble!].emoji : '❔'}</span>}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-end gap-3">
            <Robot color={agent.color} accent={agent.accent} mood={mood} size={84} />
            <div className="relative mb-6 flex-1 rounded-2xl rounded-bl-none bg-white p-3 text-sm font-bold shadow">
              {run.status === 'awaiting'
                ? 'ちょっと自信がないです…確認してもらえますか?'
                : run.status === 'paused'
                  ? 'ひと休み中…'
                  : finished
                    ? 'おわりました!結果を見てください!'
                    : last
                      ? logText(last, show, mission.steps[last.step]?.name ?? '')
                      : 'がんばります!'}
            </div>
          </div>

          <div className="mt-2 rounded-2xl bg-white p-3">
            <div className="flex items-center justify-between text-xs font-extrabold text-[#9a8aa0]">
              <span>📜 ログ</span>
              {!show && <span>📊ログカードがないので原因は ❔</span>}
            </div>
            <ul className="mt-1 space-y-1 text-xs">
              {recent.map((l) => (
                <li key={l.n} className="anim-slide truncate">
                  <span className="text-[#c3b3c6]">#{l.email + 1}</span> {logText(l, show, mission.steps[l.step]?.name ?? '')}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 操作 */}
        <div className="safe-bottom border-t-2 border-[#f6dbe4] bg-white px-4 pb-3 pt-3">
          <div className="flex items-center gap-2">
            {run.status === 'paused' ? (
              <Btn tone="mint" className="flex-1" onClick={resume}>
                ▶ 再開
              </Btn>
            ) : (
              <Btn tone="white" className="flex-1" onClick={pause} disabled={run.status !== 'running'}>
                ⏸ 一時停止
              </Btn>
            )}
            <div className="flex rounded-2xl bg-cream p-1">
              {([1, 2, 4] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSpeed(s)} className={cx('h-10 w-11 cursor-pointer rounded-xl text-sm font-extrabold', speed === s ? 'bg-pink text-white' : 'text-[#9a8aa0]')}>
                  ×{s}
                </button>
              ))}
            </div>
            <Btn tone="white" size="sm" onClick={() => setConfirmStop(true)} disabled={finished} ariaLabel="停止">
              ⏹
            </Btn>
          </div>
        </div>
      </div>

      {run.status === 'awaiting' && run.pending && <ApprovalSheet run={run} onDecide={approve} />}
      <Sheet open={confirmStop} onClose={() => setConfirmStop(false)} title="実行を止めますか?">
        <p className="text-sm">ここまでの結果で集計します。★はつきません。</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Btn tone="white" onClick={() => setConfirmStop(false)}>
            つづける
          </Btn>
          <Btn
            tone="pink"
            onClick={() => {
              setConfirmStop(false);
              stop();
            }}
          >
            止める
          </Btn>
        </div>
      </Sheet>
    </div>
  );
}

/** 承認ミニゲーム:エージェントの回答案を見て、OKか差し戻しかを決める */
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

  return (
    <Sheet open title={<span className="anim-wiggle inline-block">🙋 確認してください!</span>}>
      <div className="text-xs font-bold text-[#9a8aa0]">
        メール #{p.email + 1} ・ {mission.steps[p.step].emoji} {mission.steps[p.step].name}
      </div>
      <div className="mt-2 rounded-2xl bg-white p-3 text-sm">
        <div className="text-[11px] font-extrabold text-[#9a8aa0]">📨 {tpl.from}より「{p.trouble === 'missing' ? '商品が届かない' : tpl.subject}」</div>
        <div className="mt-1">{p.trouble === 'missing' ? '注文した商品がまだ届きません。どうなっていますか?' : tpl.body}</div>
      </div>
      <div className="mt-2 rounded-2xl border-2 border-sky bg-sky-soft p-3 text-sm">
        <div className="text-[11px] font-extrabold text-sky">🤖 エージェントの回答案</div>
        <div className="mt-1 font-bold">{bad ? bad.draft : tpl.good}</div>
      </div>
      <div className="mt-2 rounded-2xl bg-lemon-soft p-3 text-xs">
        <b>🗒️ 社内ルール</b>:返品・返金は30日以内/注文番号がないときは確認する/お名前は顧客DBで確認
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f6e6ec]">
        <div className="h-full rounded-full bg-lemon transition-[width] duration-100 ease-linear" style={{ width: `${(left / APPROVAL_SECONDS) * 100}%` }} />
      </div>
      <p className="mt-1 text-center text-[11px]">時間切れになると、安全のため差し戻しになります</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Btn tone="pink" size="lg" onClick={() => onDecide('reject')}>
          ✋ 差し戻す
        </Btn>
        <Btn tone="mint" size="lg" onClick={() => onDecide('approve')}>
          👍 OK!
        </Btn>
      </div>
      <p className="mt-2 text-center text-[11px]">差し戻すと、人が直して送ります(自動処理にはなりません)</p>
    </Sheet>
  );
}
