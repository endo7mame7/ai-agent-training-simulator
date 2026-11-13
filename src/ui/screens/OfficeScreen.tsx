import { ChevronRight, Banknote, Star } from 'lucide-react';
import { useState } from 'react';
import { agentDef, LEVEL_EXP, MAX_LEVEL, missionDef, MISSIONS } from '../../game/data';
import { companyLevel, isUnlocked, progressOf, totalStars } from '../../game/progress';
import type { AgentState, MissionDef } from '../../game/types';
import { useGame } from '../../store';
import { AgentAvatar } from '../components/AgentAvatar';
import { CLIENT_HUE, CLIENT_ICON, HUE } from '../components/icons';
import { OfficeScene, type AgentStatus } from '../components/OfficeScene';
import { Btn, cx, Label, Meter, Pill, Sheet, Stars, Tile } from '../components/ui';

export function OfficeScreen() {
  const { save, run, setRunOpen, openMission, hire, welcome } = useGame();
  const [agentSheet, setAgentSheet] = useState<string | null>(null);
  const active = run && (run.status === 'running' || run.status === 'paused' || run.status === 'awaiting') ? run : null;
  const day = Object.values(save.missions).reduce((a, m) => a + m.runs.length, 0) + 1;

  const statusOf = (id: string): AgentStatus => {
    if (active && active.build.agentId === id) return active.status === 'awaiting' ? 'wait' : active.status === 'paused' ? 'sleep' : 'work';
    return 'idle';
  };

  const next = MISSIONS.find((m) => isUnlocked(save, m.id) && !progressOf(save, m.id).cleared) ?? MISSIONS.find((m) => progressOf(save, m.id).stars < 3);

  return (
    <div className="relative">
      {/* HUD */}
      <div className="flex items-center px-5 pt-[max(18px,env(safe-area-inset-top))] text-white">
        <span className="num inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 text-[13px] font-bold">
          <Star size={14} className="fill-white" strokeWidth={0} />
          {totalStars(save)}
          <span className="ml-1 opacity-80">Lv.{companyLevel(save)}</span>
        </span>
        <div className="num absolute left-1/2 -translate-x-1/2 text-[22px] font-bold tracking-wide drop-shadow-sm">DAY {day}</div>
        <span className="num ml-auto inline-flex items-center gap-1.5 text-[20px] font-bold drop-shadow-sm">
          <Banknote size={22} strokeWidth={2.4} />
          {save.coins.toLocaleString()}
        </span>
      </div>

      <div className="mt-3 flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-bold shadow-soft">
          <span className={cx('h-2 w-2 rounded-full', active ? (active.status === 'awaiting' ? 'anim-pulse bg-coral' : 'anim-pulse bg-go') : 'bg-faint')} />
          {active ? (active.status === 'awaiting' ? '確認待ち' : active.status === 'paused' ? '一時停止中' : '稼働中') : '待機中'}
        </span>
      </div>

      <div className="-mt-6 px-1">
        <OfficeScene agents={save.agents} status={statusOf} busy={!!active && active.status === 'running'} onAgent={setAgentSheet} hireCost />
      </div>

      {/* 下のカード */}
      <div className="-mt-6 px-4">
        {active ? (
          <button type="button" onClick={() => setRunOpen(true)} className="press shadow-soft w-full cursor-pointer rounded-3xl bg-white p-4 text-left">
            <div className="flex items-center gap-3">
              <ClientTile icon={missionDef(active.missionId).icon} />
              <div className="min-w-0 flex-1">
                <Label>{active.mode === 'test' ? 'テスト実行中' : '本番実行中'}</Label>
                <div className="truncate text-[15px] font-bold">{missionDef(active.missionId).title}</div>
              </div>
              <span className="num text-sm font-bold">
                {active.cur}/{active.total}
              </span>
              <ChevronRight size={18} className="text-faint" />
            </div>
            <Meter value={active.cur} max={active.total} tone="bg-go" className="mt-3" />
          </button>
        ) : (
          next && (
            <div className="shadow-soft rounded-3xl bg-white p-4">
              <div className="flex items-center gap-3">
                <ClientTile icon={next.icon} />
                <div className="min-w-0 flex-1">
                  <Label>NEXT · CASE {next.no}</Label>
                  <div className="truncate text-[15px] font-bold">{next.title}</div>
                  <div className="truncate text-xs text-sub">{next.client}</div>
                </div>
                <Stars n={progressOf(save, next.id).stars} size={15} />
              </div>
              <Btn className="mt-3 w-full" onClick={() => openMission(next.id)}>
                ハーネスを組む
              </Btn>
            </div>
          )
        )}
      </div>

      {agentSheet && (
        <AgentSheet
          id={agentSheet}
          owned={save.agents.find((a) => a.id === agentSheet)}
          coins={save.coins}
          onHire={() => hire(agentSheet)}
          onClose={() => setAgentSheet(null)}
          working={active?.build.agentId === agentSheet ? missionDef(active.missionId).title : undefined}
        />
      )}

      <Sheet open={!save.welcomed} title="AGENT FACTORY へようこそ">
        <p className="text-sm leading-relaxed text-sub">
          あなたは AI エージェント開発会社の責任者です。賢いモデルを用意するのではなく、
          <b className="text-ink">エージェントが確実に働ける環境(ハーネス)</b>を設計して、案件を成功に導いてください。
        </p>
        <ol className="mt-4 space-y-2.5 text-sm">
          {[
            ['案件を選ぶ', '依頼内容とクリア条件を確認'],
            ['ハーネスを組む', '工程ごとにカードを配置'],
            ['実行して見守る', '必要なときはあなたが判断'],
            ['結果から改善', '原因を分析して再挑戦'],
          ].map(([t, d], i) => (
            <li key={t} className="flex items-center gap-3 rounded-2xl bg-white p-3">
              <span className="num flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
              <span>
                <b>{t}</b>
                <span className="block text-xs text-sub">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <Btn size="lg" className="mt-5 w-full" onClick={welcome}>
          はじめる
        </Btn>
      </Sheet>
    </div>
  );
}

export function ClientTile({ icon, size = 44 }: { icon: MissionDef['icon']; size?: number }) {
  const Icon = CLIENT_ICON[icon];
  const hue = HUE[CLIENT_HUE[icon]];
  return (
    <Tile size={size} className={cx(hue.soft, hue.text)}>
      <Icon size={size * 0.48} strokeWidth={2} />
    </Tile>
  );
}

function AgentSheet({ id, owned, coins, onHire, onClose, working }: { id: string; owned?: AgentState; coins: number; onHire: () => void; onClose: () => void; working?: string }) {
  const def = agentDef(id);
  const next = owned && owned.level < MAX_LEVEL ? LEVEL_EXP[owned.level] : undefined;
  return (
    <Sheet open onClose={onClose} title={owned ? def.name : `${def.name} を採用`}>
      <div className="flex items-center gap-4">
        <AgentAvatar id={id} size={72} />
        <div className="flex-1">
          <Pill className="bg-lav-soft text-lav">{def.perk}</Pill>
          <p className="mt-1 text-sm text-sub">{def.perkDesc}</p>
        </div>
      </div>
      {owned && (
        <div className="mt-4 rounded-2xl bg-white p-4">
          <div className="flex items-baseline justify-between">
            <span className="num text-lg font-bold">Lv.{owned.level}</span>
            <span className="num text-xs text-sub">{next ? `次のレベルまで ${next - owned.exp} EXP` : 'MAX'}</span>
          </div>
          <Meter value={owned.exp} max={next ?? owned.exp} tone="bg-lav" className="mt-2" />
          <p className="mt-3 text-xs leading-relaxed text-sub">レベルが上がるたびに段取りポイントが +1 されます。モデルが賢くなるのではなく、経験によって準備がうまくなる、という扱いです。</p>
        </div>
      )}
      {owned ? (
        <div className="mt-3 text-center text-sm text-sub">{working ? `「${working}」を担当中` : '待機中'}</div>
      ) : (
        <Btn className="mt-4 w-full" size="lg" disabled={coins < def.hireCost} onClick={onHire}>
          <span className="num">{def.hireCost}</span> コインで採用
        </Btn>
      )}
    </Sheet>
  );
}
