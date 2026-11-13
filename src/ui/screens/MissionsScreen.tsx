import { useState } from 'react';
import { CARDS, missionDef, MISSIONS } from '../../game/data';
import { isUnlocked, progressOf } from '../../game/progress';
import type { MissionDef } from '../../game/types';
import { useGame } from '../../store';
import { Btn, Card, cx, Pill, pct, Sheet, Stars } from '../components/ui';

export function MissionsScreen() {
  const { save, openMission } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <h1 className="px-1 text-xl font-extrabold">📋 案件ボード</h1>
      <p className="px-1 text-sm">★1つでクリア。次の案件がひらきます。</p>
      {MISSIONS.map((m) => {
        const unlocked = isUnlocked(save, m.id);
        const p = progressOf(save, m.id);
        return (
          <Card key={m.id} onClick={unlocked ? () => setOpen(m.id) : undefined} className={cx('p-4', !unlocked && 'opacity-55')}>
            <div className="flex items-center gap-3">
              <span className={cx('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl', p.cleared ? 'bg-mint-soft' : 'bg-pink-soft')}>{unlocked ? m.clientEmoji : '🔒'}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-extrabold text-pink">CASE {m.no}</div>
                <div className="truncate text-base font-extrabold">{unlocked ? m.title : '???'}</div>
                <div className="truncate text-xs">{unlocked ? `${m.client}・${m.emails}件` : '前の案件をクリアするとひらく'}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Stars n={p.stars} size="text-lg" />
                {unlocked && <span className="text-[11px] font-extrabold text-[#b8860b]">🪙 {m.reward}</span>}
              </div>
            </div>
          </Card>
        );
      })}
      {open && <Briefing mission={missionDef(open)} onClose={() => setOpen(null)} onGo={() => (setOpen(null), openMission(open))} />}
    </div>
  );
}

export function Briefing({ mission: m, onClose, onGo }: { mission: MissionDef; onClose: () => void; onGo?: () => void }) {
  const save = useGame((s) => s.save);
  const p = progressOf(save, m.id);
  return (
    <Sheet open onClose={onClose} title={`CASE ${m.no} ${m.title}`} tall>
      <div className="flex items-start gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-4xl shadow">{m.clientEmoji}</span>
        <div className="relative flex-1 rounded-2xl rounded-tl-none bg-white p-3 text-sm leading-relaxed shadow">
          <div className="text-[11px] font-extrabold text-[#9a8aa0]">{m.client}</div>
          {m.request}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4">
        <div className="text-sm font-extrabold">🎯 クリア条件</div>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <Stars n={1} max={1} size="text-base" /> 正答率 <b>{pct(m.goals.accuracy)}</b> 以上
          </li>
          <li className="flex items-center gap-2">
            <Stars n={1} max={1} size="text-base" />
            <Stars n={1} max={1} size="text-base" /> さらに <b>誤送信 0件</b>
          </li>
          <li className="flex items-center gap-2">
            <Stars n={3} max={3} size="text-base" /> さらに 自動処理率 <b>{pct(m.goals.auto)}</b> 以上、運用コスト <b>🪙{m.budget}</b> 以内
          </li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill className="bg-sky-soft text-sky">📨 {m.emails}件</Pill>
          <Pill className="bg-lemon-soft text-[#b8860b]">⚡ {m.energy}ポイント</Pill>
          <Pill className="bg-mint-soft text-mint">🪙 報酬 {m.reward}</Pill>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-4">
        <div className="text-sm font-extrabold">🧭 仕事の流れ</div>
        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs font-bold">
          {m.steps.map((s, i) => (
            <span key={s.id} className="flex items-center gap-1">
              <span className="rounded-full bg-cream px-2 py-1">
                {s.emoji} {s.name}
              </span>
              {i < m.steps.length - 1 && <span className="text-[#d6b8c4]">›</span>}
            </span>
          ))}
        </div>
      </div>

      {m.newCards.length > 0 && (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-pink bg-pink-soft/50 p-3">
          <div className="text-sm font-extrabold text-pink">✨ 新しいカード</div>
          {m.newCards.map((c) => (
            <div key={c} className="mt-1 text-sm">
              {CARDS[c].emoji} <b>{CARDS[c].name}</b>:{CARDS[c].desc}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 rounded-2xl bg-lemon-soft p-3 text-sm">💡 {m.hint}</div>
      {p.runs.length > 0 && <div className="mt-2 text-center text-xs">これまで {p.runs.length} 回挑戦・最高 {'★'.repeat(p.stars) || 'なし'}</div>}
      {onGo && (
        <Btn size="lg" className="mt-4 w-full" onClick={onGo}>
          🛠️ この案件を受ける
        </Btn>
      )}
    </Sheet>
  );
}
