import { CircleAlert, FileText, FlaskConical, Mail, Plus, Rocket, Send, Trash2, TriangleAlert, Zap } from 'lucide-react';
import { useState } from 'react';
import { agentDef, CARDS, cardsFor, missionDef, TIER_ORDER, TIERS } from '../../game/data';
import { maxEnergy, preflight, usedEnergy } from '../../game/engine';
import { progressOf } from '../../game/progress';
import type { Build, CardId, StepDef } from '../../game/types';
import { useGame } from '../../store';
import { AgentAvatar } from '../components/AgentAvatar';
import { CARD_ICON, HUE, STEP_ICON } from '../components/icons';
import { Btn, Card, cx, Label, Pill, pct, Sheet, Stars, Tile } from '../components/ui';
import { Briefing } from './MissionsScreen';
import { ClientTile } from './OfficeScreen';

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
    <div className="space-y-3">
      {/* 案件 */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <ClientTile icon={mission.icon} />
          <div className="min-w-0 flex-1">
            <Label>CASE {mission.no}</Label>
            <div className="truncate text-[15px] font-bold">{mission.title}</div>
          </div>
          <Btn tone="secondary" size="sm" onClick={() => setBrief(true)}>
            <FileText size={15} /> 依頼書
          </Btn>
        </div>
        {last && (
          <div className="num mt-3 flex items-center gap-2 rounded-xl bg-bg px-3 py-2 text-xs text-sub">
            前回 正答 {pct(last.accuracy)} · 自動 {pct(last.auto)} · コスト {last.cost}
            <span className="ml-auto">
              <Stars n={last.stars} size={13} />
            </span>
          </div>
        )}
      </Card>

      {/* 段取りポイント・担当・LLM */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-bold">
            <Zap size={16} className="text-butter" /> 段取りポイント
          </span>
          <span className={cx('num text-xl font-bold', used > max && 'text-coral')}>
            {used}
            <span className="text-sm text-faint"> / {max}</span>
          </span>
        </div>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: Math.max(max, used) }, (_, i) => (
            <span key={i} className={cx('h-2 flex-1 rounded-full', i < used ? (i < max ? 'bg-ink' : 'bg-coral') : 'bg-line')} />
          ))}
        </div>

        <Label className="mt-5">担当エージェント</Label>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {save.agents.map((a) => {
            const on = build.agentId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => update((b) => (b.agentId = a.id))}
                className={cx('press flex min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-2xl border py-1.5 pl-1.5 pr-3', on ? 'border-ink bg-ink text-white' : 'border-line bg-white')}
              >
                <AgentAvatar id={a.id} size={34} />
                <span className="text-left text-xs font-bold leading-tight">
                  {agentDef(a.id).name}
                  <span className={cx('num block font-medium', on ? 'text-white/60' : 'text-faint')}>Lv.{a.level}</span>
                </span>
              </button>
            );
          })}
        </div>

        <Label className="mt-5">モデル</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {TIER_ORDER.map((t) => {
            const d = TIERS[t];
            const on = build.tier === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => update((b) => (b.tier = t))}
                className={cx('press min-h-[70px] cursor-pointer rounded-2xl border p-2.5 text-left', on ? 'border-ink bg-ink text-white' : 'border-line bg-white')}
              >
                <div className="text-sm font-bold">{d.short}</div>
                <div className={cx('num mt-1 text-[11px] leading-snug', on ? 'text-white/70' : 'text-sub')}>
                  段取り {d.energy}
                  <br />
                  {d.price} コイン/回
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-sub">{TIERS[build.tier].desc}</p>
      </Card>

      {/* ライン全体 */}
      {available.some((c) => CARDS[c].scope === 'common') && (
        <Card className="p-4">
          <div className="text-sm font-bold">ライン全体</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {build.common.map((c, i) => (
              <SlotButton key={i} card={c} onClick={() => setSlot({ kind: 'common', index: i })} />
            ))}
          </div>
        </Card>
      )}

      {/* ワークフロー */}
      <div className="pt-2">
        <div className="mb-2 px-1 text-sm font-bold">ワークフロー</div>
        <div className="relative">
          <div className="absolute bottom-6 left-[34px] top-6 w-0.5 bg-line" aria-hidden />
          <div className="relative space-y-2.5">
            <Cap icon={<Mail size={18} />} label="問い合わせメール" />
            {mission.steps.map((s) => (
              <StepCard key={s.id} step={s} cards={build.slots[s.id]} onSlot={(index) => setSlot({ kind: 'step', stepId: s.id, index })} />
            ))}
            <Cap icon={<Send size={18} />} label="お客さまへ返信" />
          </div>
        </div>
      </div>

      {(check.errors.length > 0 || check.warnings.length > 0) && (
        <div className="space-y-1.5 rounded-2xl bg-white p-4 text-[13px]">
          <div className="font-bold">実行前チェック</div>
          {check.errors.map((e) => (
            <div key={e} className="flex items-start gap-2 text-coral">
              <CircleAlert size={16} className="mt-0.5 shrink-0" /> {e}
            </div>
          ))}
          {check.warnings.map((w) => (
            <div key={w} className="flex items-start gap-2 text-butter">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {w}
            </div>
          ))}
        </div>
      )}

      <div className="sticky bottom-[76px] z-10 -mx-1 grid grid-cols-[1fr_1.5fr] gap-2 rounded-3xl bg-bg/90 p-1 backdrop-blur">
        <Btn tone="secondary" onClick={() => go('test')} disabled={check.errors.length > 0 && !busy}>
          <FlaskConical size={17} />
          <span className="flex flex-col items-start leading-tight">
            <span>テスト</span>
            <span className="num text-[10px] font-medium text-sub">5件 · 報酬なし</span>
          </span>
        </Btn>
        <Btn tone="primary" onClick={() => go('real')} disabled={check.errors.length > 0 && !busy}>
          <Rocket size={17} />
          {busy ? (
            '実行中を表示'
          ) : (
            <span className="flex flex-col items-start leading-tight">
              <span>本番実行</span>
              <span className="num text-[10px] font-medium text-white/60">{mission.emails}件 · 報酬あり</span>
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
          title={slot.kind === 'common' ? 'ライン全体' : mission.steps.find((s) => s.id === slot.stepId)!.name}
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

function Cap({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 px-3">
      <Tile size={44} className="bg-ink text-white">
        {icon}
      </Tile>
      <span className="text-[13px] font-bold text-sub">{label}</span>
    </div>
  );
}

function StepCard({ step, cards, onSlot }: { step: StepDef; cards: (CardId | null)[]; onSlot: (i: number) => void }) {
  const Icon = STEP_ICON[step.id];
  return (
    <div className="shadow-soft rounded-3xl bg-white p-3">
      <div className="flex items-center gap-3">
        <Tile size={44} className="bg-floor text-white">
          <Icon size={20} />
        </Tile>
        <div className="flex-1">
          <div className="text-[15px] font-bold">{step.name}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {step.llm ? <Pill className="bg-sky-soft text-sky">LLM 推論</Pill> : <Pill>定型処理</Pill>}
            {step.needsTool && <Pill className="bg-butter-soft text-butter">DB 参照</Pill>}
            {step.sends && <Pill className="bg-coral-soft text-coral">外部送信</Pill>}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
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
      <button type="button" onClick={onClick} className="press flex min-h-12 cursor-pointer items-center justify-center gap-1 rounded-2xl border border-dashed border-[#cfd3db] text-[13px] font-bold text-faint hover:border-ink hover:text-ink">
        <Plus size={15} /> カード
      </button>
    );
  const d = CARDS[card];
  const Icon = CARD_ICON[card];
  const hue = HUE[d.hue];
  return (
    <button type="button" onClick={onClick} className={cx('press anim-pop flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl px-2.5 text-left', hue.soft)}>
      <Icon size={17} className={hue.text} />
      <span className="flex-1 text-[13px] font-bold">{d.name}</span>
      <span className="num text-[11px] font-bold text-sub">{d.cost}</span>
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
        {list.length === 0 && <p className="text-sm text-sub">ここに置けるカードはまだありません。</p>}
        {list.map((c) => {
          const d = CARDS[c];
          const Icon = CARD_ICON[c];
          const hue = HUE[d.hue];
          const dup = props.others.includes(c);
          const poor = d.cost > props.remaining;
          const on = props.current === c;
          return (
            <button
              key={c}
              type="button"
              disabled={(dup || poor) && !on}
              onClick={() => props.onPick(c)}
              className={cx('press flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-white p-3 text-left disabled:cursor-not-allowed disabled:opacity-40', on ? 'border-ink' : 'border-transparent')}
            >
              <Tile size={44} className={cx(hue.soft, hue.text)}>
                <Icon size={20} />
              </Tile>
              <span className="flex-1">
                <span className="block text-sm font-bold">
                  {d.name} <span className="ml-1 text-[11px] font-medium text-faint">{d.en}</span>
                </span>
                <span className="block text-xs leading-snug text-sub">{d.desc}</span>
                {dup && !on && <span className="block text-[11px] font-bold text-coral">この工程に配置済み</span>}
                {poor && !dup && !on && <span className="block text-[11px] font-bold text-coral">段取りポイントが不足</span>}
              </span>
              <span className="num inline-flex items-center gap-0.5 text-sm font-bold">
                <Zap size={13} className="text-butter" />
                {d.cost}
              </span>
            </button>
          );
        })}
      </div>
      {props.current && (
        <Btn tone="secondary" className="mt-3 w-full" onClick={() => props.onPick(null)}>
          <Trash2 size={16} /> 外す
        </Btn>
      )}
    </Sheet>
  );
}
