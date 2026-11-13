import { useState } from 'react';
import { agentDef, CARDS, cardsFor, missionDef, TIER_ORDER, TIERS } from '../../game/data';
import { maxEnergy, preflight, usedEnergy } from '../../game/engine';
import { progressOf } from '../../game/progress';
import type { Build, CardId, StepDef } from '../../game/types';
import { useGame } from '../../store';
import { Robot } from '../components/Robot';
import { Btn, Card, cx, Pill, pct, Sheet, Stars } from '../components/ui';
import { Briefing } from './MissionsScreen';

type SlotRef = { kind: 'step'; stepId: string; index: number } | { kind: 'common'; index: number };

export function DevScreen() {
  const { save, missionId, build, setBuild, startRun, showToast, run, setRunOpen } = useGame();
  const mission = missionDef(missionId);
  const [slot, setSlot] = useState<SlotRef | null>(null);
  const [brief, setBrief] = useState(false);
  const agent = save.agents.find((a) => a.id === build.agentId) ?? save.agents[0];
  const max = maxEnergy(mission, agent.id, agent.level);
  const used = usedEnergy(build);
  const check = preflight(mission, build, max);
  const available = cardsFor(mission);
  const last = progressOf(save, missionId).runs.at(-1);
  const busy = run && (run.status === 'running' || run.status === 'paused' || run.status === 'awaiting');

  const update = (fn: (b: Build) => void) => {
    const b = structuredClone(build);
    fn(b);
    setBuild(b);
  };
  const go = (mode: 'test' | 'real') => {
    if (busy) return setRunOpen(true);
    const err = startRun(mode);
    if (err) showToast(err);
  };

  const slotCard = (ref: SlotRef): CardId | null => (ref.kind === 'common' ? build.common[ref.index] : build.slots[ref.stepId][ref.index]);

  return (
    <div className="space-y-4">
      {/* 案件の見出し */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-soft text-3xl">{mission.clientEmoji}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold text-pink">CASE {mission.no}</div>
            <div className="truncate text-lg font-extrabold">{mission.title}</div>
          </div>
          <Btn tone="white" size="sm" onClick={() => setBrief(true)}>
            依頼書
          </Btn>
        </div>
        {last && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-cream px-3 py-2 text-xs font-bold">
            前回: 正答{pct(last.accuracy)}・自動{pct(last.auto)}・🪙{last.cost}
            <span className="ml-auto">
              <Stars n={last.stars} size="text-sm" />
            </span>
          </div>
        )}
      </Card>

      {/* 担当とポイント */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">⚡ 段取りポイント</div>
          <div className={cx('text-xl font-extrabold tabular-nums', used > max ? 'text-pink' : 'text-ink')}>
            {used} <span className="text-sm text-[#b7a3b8]">/ {max}</span>
          </div>
        </div>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: Math.max(max, used) }, (_, i) => (
            <span key={i} className={cx('h-4 flex-1 rounded-md', i < used ? (i < max ? 'bg-lemon shadow-[inset_0_-3px_0_#e6b020]' : 'bg-pink') : 'bg-[#f6e6ec]')} />
          ))}
        </div>

        <div className="mt-4 text-xs font-extrabold text-[#9a8aa0]">担当エージェント</div>
        <div className="no-scrollbar mt-1 flex gap-2 overflow-x-auto">
          {save.agents.map((a) => {
            const d = agentDef(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => update((b) => (b.agentId = a.id))}
                className={cx('press flex min-w-[96px] cursor-pointer items-center gap-1 rounded-2xl border-2 px-2 py-1', build.agentId === a.id ? 'border-pink bg-pink-soft' : 'border-[#f0d6df] bg-white')}
              >
                <Robot color={d.color} accent={d.accent} size={34} mood={build.agentId === a.id ? 'happy' : 'idle'} />
                <span className="text-left text-xs font-extrabold leading-tight">
                  {d.name}
                  <br />
                  <span className="font-bold text-[#9a8aa0]">Lv.{a.level}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-xs font-extrabold text-[#9a8aa0]">つかうLLM</div>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {TIER_ORDER.map((t) => {
            const d = TIERS[t];
            const on = build.tier === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => update((b) => (b.tier = t))}
                className={cx('press min-h-[84px] cursor-pointer rounded-2xl border-2 p-2 text-center', on ? 'border-sky bg-sky-soft' : 'border-[#f0d6df] bg-white')}
              >
                <div className="text-xl">{t === 'small' ? '🐣' : t === 'medium' ? '🐥' : '🦉'}</div>
                <div className="text-sm font-extrabold">{d.short}</div>
                <div className="text-[10px] font-bold leading-tight">
                  ⚡{d.energy} ・ 🪙{d.price}/回
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-center text-[11px]">{TIERS[build.tier].desc}</p>
      </Card>

      {/* ライン全体 */}
      {available.some((c) => CARDS[c].scope === 'common') && (
        <Card className="p-4">
          <div className="text-sm font-extrabold">🏭 ライン全体</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {build.common.map((c, i) => (
              <SlotButton key={i} card={c} onClick={() => setSlot({ kind: 'common', index: i })} />
            ))}
          </div>
        </Card>
      )}

      {/* ハーネスのフロー */}
      <div>
        <div className="mb-2 px-1 text-sm font-extrabold">🧩 ハーネス(仕事の流れ)</div>
        <div className="flex flex-col items-center">
          <FlowCap emoji="📨" label="お問い合わせメール" />
          {mission.steps.map((s) => (
            <div key={s.id} className="flex w-full flex-col items-center">
              <Arrow />
              <StepCard step={s} cards={build.slots[s.id]} onSlot={(index) => setSlot({ kind: 'step', stepId: s.id, index })} />
            </div>
          ))}
          <Arrow />
          <FlowCap emoji="💌" label="お客さまへお返事" />
        </div>
      </div>

      {(check.errors.length > 0 || check.warnings.length > 0) && (
        <div className="space-y-1.5 rounded-2xl bg-white p-3 text-sm">
          <div className="font-extrabold">📝 実行前チェック</div>
          {check.errors.map((e) => (
            <div key={e} className="font-bold text-pink">
              ⛔ {e}
            </div>
          ))}
          {check.warnings.map((w) => (
            <div key={w} className="text-[#b8860b]">
              ⚠️ {w}
            </div>
          ))}
        </div>
      )}

      {/* 実行ボタン */}
      <div className="sticky bottom-[78px] z-10 -mx-1 grid grid-cols-[1fr_1.4fr] gap-2 rounded-3xl bg-cream/90 p-1 backdrop-blur">
        <Btn tone="sky" onClick={() => go('test')} disabled={check.errors.length > 0 && !busy}>
          <span className="flex flex-col leading-tight">
            <span>🧪 テスト</span>
            <span className="text-[10px]">5件・報酬なし</span>
          </span>
        </Btn>
        <Btn tone="pink" onClick={() => go('real')} disabled={check.errors.length > 0 && !busy}>
          {busy ? (
            '⚙️ 実行中を見る'
          ) : (
            <span className="flex flex-col leading-tight">
              <span>🚀 本番実行</span>
              <span className="text-[10px]">{mission.emails}件・報酬あり</span>
            </span>
          )}
        </Btn>
      </div>

      {slot && (
        <CardPicker
          current={slotCard(slot)}
          scope={slot.kind === 'common' ? 'common' : 'step'}
          available={available}
          others={slot.kind === 'step' ? build.slots[slot.stepId].filter((_, i) => i !== slot.index) : build.common.filter((_, i) => i !== slot.index)}
          remaining={max - used + (slotCard(slot) ? CARDS[slotCard(slot)!].cost : 0)}
          title={slot.kind === 'common' ? 'ライン全体のカード' : `「${mission.steps.find((s) => s.id === slot.stepId)!.name}」に置くカード`}
          onPick={(c) => {
            update((b) => {
              if (slot.kind === 'common') b.common[slot.index] = c;
              else b.slots[slot.stepId][slot.index] = c;
            });
            setSlot(null);
          }}
          onClose={() => setSlot(null)}
        />
      )}
      {brief && <Briefing mission={mission} onClose={() => setBrief(false)} />}
    </div>
  );
}

function FlowCap({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold shadow-[0_3px_0_#f0d6df]">
      <span className="text-xl">{emoji}</span>
      {label}
    </div>
  );
}

function Arrow() {
  return <div className="my-1 h-5 w-1.5 rounded-full bg-[#f3c6d5]" aria-hidden />;
}

function StepCard({ step, cards, onSlot }: { step: StepDef; cards: (CardId | null)[]; onSlot: (i: number) => void }) {
  return (
    <div className="pop-shadow w-full rounded-3xl border-2 border-[#f6dbe4] bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cream text-2xl">{step.emoji}</span>
        <div className="flex-1">
          <div className="font-extrabold">{step.name}</div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {step.llm ? <Pill className="bg-sky-soft text-sky">🧠 LLMが考える</Pill> : <Pill className="bg-[#f3eef5] text-[#9a8aa0]">⚙️ 機械的な作業</Pill>}
            {step.needsTool && <Pill className="bg-lemon-soft text-[#b8860b]">🗄️ DBを見る</Pill>}
            {step.sends && <Pill className="bg-pink-soft text-pink">📤 外に送る</Pill>}
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {cards.map((c, i) => (
          <SlotButton key={i} card={c} onClick={() => onSlot(i)} />
        ))}
      </div>
    </div>
  );
}

function SlotButton({ card, onClick }: { card: CardId | null; onClick: () => void }) {
  if (!card)
    return (
      <button type="button" onClick={onClick} className="press flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[#e7b9c8] text-sm font-extrabold text-[#d79ab0]">
        ＋ カード
      </button>
    );
  const d = CARDS[card];
  return (
    <button type="button" onClick={onClick} className={cx('press anim-pop flex min-h-12 cursor-pointer items-center gap-1.5 rounded-2xl border-2 px-2 text-left', d.color)}>
      <span className="text-xl">{d.emoji}</span>
      <span className="text-sm font-extrabold leading-tight">
        {d.name}
        <span className="block text-[10px] font-bold opacity-70">⚡{d.cost}</span>
      </span>
    </button>
  );
}

function CardPicker(props: {
  current: CardId | null;
  scope: 'step' | 'common';
  available: CardId[];
  others: (CardId | null)[];
  remaining: number;
  title: string;
  onPick: (c: CardId | null) => void;
  onClose: () => void;
}) {
  const list = props.available.filter((c) => CARDS[c].scope === props.scope);
  return (
    <Sheet open onClose={props.onClose} title={props.title}>
      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm">ここに置けるカードはまだありません。</p>}
        {list.map((c) => {
          const d = CARDS[c];
          const dup = props.others.includes(c);
          const poor = d.cost > props.remaining;
          const on = props.current === c;
          return (
            <button
              key={c}
              type="button"
              disabled={(dup || poor) && !on}
              onClick={() => props.onPick(c)}
              className={cx('press flex w-full cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-left disabled:cursor-not-allowed disabled:opacity-40', on ? 'border-pink bg-pink-soft' : d.color)}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl">{d.emoji}</span>
              <span className="flex-1">
                <span className="block font-extrabold">
                  {d.name} <span className="text-[10px] font-bold opacity-60">{d.en}</span>
                </span>
                <span className="block text-xs leading-snug">{d.desc}</span>
                {dup && !on && <span className="block text-[11px] font-bold text-pink">同じカードはもう置いてあります</span>}
                {poor && !dup && !on && <span className="block text-[11px] font-bold text-pink">⚡が足りません</span>}
              </span>
              <span className="rounded-full bg-white px-2 py-1 text-sm font-extrabold">⚡{d.cost}</span>
            </button>
          );
        })}
      </div>
      {props.current && (
        <Btn tone="white" className="mt-3 w-full" onClick={() => props.onPick(null)}>
          🗑️ カードをはずす
        </Btn>
      )}
    </Sheet>
  );
}
