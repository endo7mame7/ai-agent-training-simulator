import { Lock, Mail, Target, Zap, Coins, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { CARDS, missionDef, MISSIONS } from '../../game/data';
import { isUnlocked, progressOf } from '../../game/progress';
import type { MissionDef } from '../../game/types';
import { useGame } from '../../store';
import { CARD_ICON, HUE, STEP_ICON } from '../components/icons';
import { Btn, Card, cx, Label, pct, Sheet, Stars, Tile } from '../components/ui';
import { ClientTile } from './OfficeScreen';

export function MissionsScreen() {
  const { save, openMission } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-2.5">
      <p className="px-1 pb-1 text-[13px] text-sub">★1つでクリア。次の案件が解放されます。</p>
      {MISSIONS.map((m) => {
        const unlocked = isUnlocked(save, m.id);
        const p = progressOf(save, m.id);
        return (
          <Card key={m.id} onClick={unlocked ? () => setOpen(m.id) : undefined} className={cx('p-4', !unlocked && 'opacity-50')}>
            <div className="flex items-center gap-3">
              {unlocked ? (
                <ClientTile icon={m.icon} />
              ) : (
                <Tile className="bg-slate-soft text-faint">
                  <Lock size={20} />
                </Tile>
              )}
              <div className="min-w-0 flex-1">
                <Label>CASE {m.no}</Label>
                <div className="truncate text-[15px] font-bold">{unlocked ? m.title : 'ロック中'}</div>
                <div className="truncate text-xs text-sub">{unlocked ? m.client : '前の案件をクリアすると解放'}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Stars n={p.stars} size={15} />
                {unlocked && (
                  <span className="num inline-flex items-center gap-1 text-xs font-bold text-sub">
                    <Coins size={12} /> {m.reward}
                  </span>
                )}
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
    <Sheet open onClose={onClose} title={m.title} tall>
      <div className="flex items-center gap-3">
        <ClientTile icon={m.icon} size={48} />
        <div>
          <Label>CASE {m.no} · CLIENT</Label>
          <div className="font-bold">{m.client}</div>
        </div>
      </div>
      <p className="mt-3 rounded-2xl bg-white p-4 text-sm leading-relaxed">「{m.request}」</p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Spec icon={<Mail size={16} />} label="件数" value={`${m.emails}`} />
        <Spec icon={<Zap size={16} />} label="段取り" value={`${m.energy}`} />
        <Spec icon={<Coins size={16} />} label="報酬" value={`${m.reward}`} />
      </div>

      <div className="mt-3 rounded-2xl bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Target size={16} /> 評価基準
        </div>
        <ul className="mt-3 space-y-2.5 text-[13px]">
          <li className="flex items-center gap-3">
            <Stars n={1} size={14} /> 正答率 <b className="num">{pct(m.goals.accuracy)}</b> 以上
          </li>
          <li className="flex items-center gap-3">
            <Stars n={2} size={14} /> さらに誤送信 <b className="num">0</b> 件
          </li>
          <li className="flex items-center gap-3">
            <Stars n={3} size={14} />
            <span>
              さらに自動処理率 <b className="num">{pct(m.goals.auto)}</b> 以上・コスト <b className="num">{m.budget}</b> 以内
            </span>
          </li>
        </ul>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-4">
        <div className="text-sm font-bold">ワークフロー</div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {m.steps.map((s, i) => {
            const Icon = STEP_ICON[s.id];
            return (
              <span key={s.id} className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 text-xs font-bold">
                  <Icon size={13} /> {s.name}
                </span>
                {i < m.steps.length - 1 && <span className="text-faint">→</span>}
              </span>
            );
          })}
        </div>
      </div>

      {m.newCards.length > 0 && (
        <div className="mt-3 rounded-2xl bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Sparkles size={16} className="text-coral" /> 新しく使えるカード
          </div>
          <div className="mt-2 space-y-2">
            {m.newCards.map((c) => {
              const Icon = CARD_ICON[c];
              const hue = HUE[CARDS[c].hue];
              return (
                <div key={c} className="flex items-center gap-3">
                  <Tile size={36} className={cx(hue.soft, hue.text)}>
                    <Icon size={17} />
                  </Tile>
                  <div className="text-[13px]">
                    <b>{CARDS[c].name}</b>
                    <span className="block text-xs text-sub">{CARDS[c].desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-3 rounded-2xl bg-butter-soft p-4 text-[13px] leading-relaxed">{m.hint}</p>
      {p.runs.length > 0 && <div className="mt-2 text-center text-xs text-sub">挑戦 {p.runs.length} 回 · 最高 ★{p.stars}</div>}
      {onGo && (
        <Btn size="lg" className="mt-4 w-full" onClick={onGo}>
          この案件を受ける
        </Btn>
      )}
    </Sheet>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="flex items-center gap-1 text-faint">
        {icon}
        <span className="text-[11px] font-bold">{label}</span>
      </div>
      <div className="num mt-0.5 text-xl font-bold">{value}</div>
    </div>
  );
}
