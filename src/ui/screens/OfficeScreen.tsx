import { useState } from 'react';
import { AGENTS, agentDef, LEVEL_EXP, MAX_LEVEL, missionDef, MISSIONS } from '../../game/data';
import { isUnlocked, progressOf } from '../../game/progress';
import type { AgentState } from '../../game/types';
import { useGame } from '../../store';
import { Robot, type Mood } from '../components/Robot';
import { Btn, Card, cx, Meter, Pill, pct, Sheet, Stars } from '../components/ui';

export function OfficeScreen() {
  const { save, run, setRunOpen, openMission, hire, welcome } = useGame();
  const [agentSheet, setAgentSheet] = useState<string | null>(null);
  const active = run && (run.status === 'running' || run.status === 'paused' || run.status === 'awaiting') ? run : null;

  const moodOf = (id: string): Mood => {
    if (active && active.build.agentId === id) return active.status === 'awaiting' ? 'wait' : active.status === 'paused' ? 'sleep' : 'work';
    return 'idle';
  };

  const next = MISSIONS.find((m) => isUnlocked(save, m.id) && !progressOf(save, m.id).cleared) ?? MISSIONS.find((m) => progressOf(save, m.id).stars < 3);
  const recent = Object.values(save.missions)
    .flatMap((m) => m.runs)
    .sort((a, b) => b.at - a.at)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      {/* オフィスの部屋 */}
      <div className="pop-shadow relative overflow-hidden rounded-[28px] border-2 border-[#f6dbe4]" style={{ height: 300 }}>
        {/* 壁 */}
        <div className="absolute inset-x-0 top-0 h-[46%]" style={{ background: 'repeating-linear-gradient(90deg,#fff3d6 0 22px,#ffecc2 22px 44px)' }} />
        {/* 床 */}
        <div className="absolute inset-x-0 bottom-0 h-[54%]" style={{ background: 'repeating-linear-gradient(45deg,#ffd9e4 0 18px,#ffe5ed 18px 36px)' }} />
        {/* 窓 */}
        <div className="absolute left-4 top-4 h-20 w-24 rounded-xl border-4 border-white bg-gradient-to-b from-sky-soft to-[#bfe6ff]">
          <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-white" />
          <span className="absolute left-2 top-2 text-lg">☁️</span>
          <span className="absolute bottom-1 right-2 text-sm">🌤️</span>
        </div>
        {/* ホワイトボード(会議スペース) */}
        <div className="absolute left-[38%] top-5 h-16 w-28 rounded-lg border-4 border-[#d9c6ce] bg-white px-2 py-1 text-[9px] font-bold leading-tight text-[#9a8aa0]">
          今日の目標
          <div className="text-pink">🎯 ミスゼロ!</div>
          <div className="text-mint">📈 ★をあつめる</div>
        </div>
        {/* サーバー(研究設備) */}
        <div className="absolute right-4 top-6 flex h-28 w-14 flex-col gap-1.5 rounded-xl bg-[#6b5b7b] p-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex h-4 items-center gap-1 rounded bg-[#4a3b55] px-1">
              <span className={cx('h-1.5 w-1.5 rounded-full', active ? 'animate-pulse bg-[#8ff0d0]' : 'bg-[#8ff0d0]/40')} style={{ animationDelay: `${i * 0.2}s` }} />
              <span className="h-1 flex-1 rounded bg-[#6b5b7b]" />
            </div>
          ))}
        </div>
        <span className="absolute bottom-3 left-2 text-3xl">🪴</span>
        <span className="absolute bottom-3 right-3 text-2xl">☕</span>

        {/* デスクとエージェント */}
        <div className="absolute inset-x-6 bottom-3 grid grid-cols-3 gap-2">
          {AGENTS.map((def) => {
            const owned = save.agents.find((a) => a.id === def.id);
            return (
              <button key={def.id} type="button" onClick={() => setAgentSheet(def.id)} className="relative flex cursor-pointer flex-col items-center" aria-label={`${def.name}の詳細`}>
                {owned ? (
                  <Robot color={def.color} accent={def.accent} mood={moodOf(def.id)} size={58} />
                ) : (
                  <div className="flex h-[70px] w-[58px] items-center justify-center rounded-2xl border-2 border-dashed border-[#e7b9c8] bg-white/60 text-xs font-extrabold text-pink">
                    ＋採用
                  </div>
                )}
                {/* デスク */}
                <div className="relative mt-1 h-7 w-full rounded-lg bg-[#c99a7a] shadow-[0_4px_0_#a87c5f]">
                  <div className={cx('absolute -top-4 left-1/2 h-5 w-9 -translate-x-1/2 rounded-md border-2 border-[#6b5b7b]', owned && moodOf(def.id) === 'work' ? 'bg-[#8ff0d0]' : 'bg-[#cfe9f7]')} />
                </div>
                <span className={cx('mt-1.5 rounded-full px-2 text-[10px] font-extrabold shadow', owned ? 'bg-white' : 'bg-white/60 text-pink')}>
                  {owned ? `${def.name} Lv.${owned.level}` : `🪙${def.hireCost}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 進行中の案件 */}
      {active ? (
        <Card onClick={() => setRunOpen(true)} className={cx('p-4', active.status === 'awaiting' && 'border-lemon')}>
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#9a8aa0]">
            <span>進行中の案件</span>
            {active.status === 'awaiting' && <Pill className="anim-wiggle bg-lemon-soft text-[#b8860b]">🙋 確認待ち</Pill>}
          </div>
          <div className="mt-1 text-lg font-extrabold">
            {missionDef(active.missionId).clientEmoji} {missionDef(active.missionId).title}
            {active.mode === 'test' && <span className="ml-1 text-xs text-sky">(テスト)</span>}
          </div>
          <Meter value={active.cur} max={active.total} tone="bg-mint" className="mt-2" />
          <div className="mt-1 flex justify-between text-xs font-bold">
            <span>
              {active.cur}/{active.total}件
            </span>
            <span className="text-pink">ようすを見る ›</span>
          </div>
        </Card>
      ) : (
        next && (
          <Card className="p-4">
            <div className="text-xs font-extrabold text-[#9a8aa0]">つぎの案件</div>
            <div className="mt-1 flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-soft text-3xl">{next.clientEmoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-extrabold">{next.title}</div>
                <div className="text-xs">{next.client}</div>
              </div>
              <Stars n={progressOf(save, next.id).stars} size="text-base" />
            </div>
            <Btn className="mt-3 w-full" onClick={() => openMission(next.id)}>
              🛠️ ハーネスを組みにいく
            </Btn>
          </Card>
        )
      )}

      {/* 直近の成果 */}
      <Card className="p-4">
        <div className="text-xs font-extrabold text-[#9a8aa0]">直近の成果</div>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm">まだ実績はありません。最初の案件にチャレンジしよう!</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {recent.map((r) => {
              const m = missionDef(r.missionId);
              return (
                <li key={r.at} className="flex items-center gap-2 text-sm">
                  <span className="text-xl">{m.clientEmoji}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{m.title}</span>
                  <span className="text-xs">正答{pct(r.accuracy)}</span>
                  <Stars n={r.stars} size="text-sm" />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {agentSheet && <AgentSheet id={agentSheet} owned={save.agents.find((a) => a.id === agentSheet)} coins={save.coins} onHire={() => hire(agentSheet)} onClose={() => setAgentSheet(null)} working={active?.build.agentId === agentSheet ? missionDef(active.missionId).title : undefined} />}

      <Sheet open={!save.welcomed} title="AGENT FACTORY へようこそ!">
        <div className="flex flex-col items-center text-center">
          <Robot color="#ffb3c7" accent="#ff6f96" mood="happy" size={110} />
          <p className="mt-3 text-sm leading-relaxed">
            あなたはAIエージェント開発会社の社長さん。
            <br />
            エージェントの<b className="text-pink">アイ</b>といっしょに、お客さまの案件をこなしていこう!
          </p>
          <div className="mt-4 w-full space-y-2 rounded-2xl bg-white p-4 text-left text-sm">
            <div>
              📋 <b>案件</b>をえらぶ
            </div>
            <div>
              🛠️ <b>カード</b>を置いて、働く環境(ハーネス)を組む
            </div>
            <div>
              ⚙️ <b>実行</b>して、ようすを見守る。困ったら助けてあげて
            </div>
            <div>
              ⭐ 結果を見て、<b>改善</b>してもう一回!
            </div>
          </div>
          <p className="mt-3 text-xs text-[#9a8aa0]">かしこいAIを作るゲームじゃなくて、AIが働きやすい環境を作るゲームです。</p>
          <Btn size="lg" className="mt-4 w-full" onClick={welcome}>
            はじめる!
          </Btn>
        </div>
      </Sheet>
    </div>
  );
}

function AgentSheet({ id, owned, coins, onHire, onClose, working }: { id: string; owned?: AgentState; coins: number; onHire: () => void; onClose: () => void; working?: string }) {
  const def = agentDef(id);
  const next = owned && owned.level < MAX_LEVEL ? LEVEL_EXP[owned.level] : undefined;
  return (
    <Sheet open onClose={onClose} title={owned ? def.name : `${def.name}を採用する?`}>
      <div className="flex items-center gap-4">
        <Robot color={def.color} accent={def.accent} mood={owned ? (working ? 'work' : 'happy') : 'think'} size={96} />
        <div className="flex-1">
          <Pill className="bg-grape-soft text-grape">{def.perk}</Pill>
          <p className="mt-1 text-sm">{def.perkDesc}</p>
          {owned && (
            <>
              <div className="mt-2 text-sm font-extrabold">Lv.{owned.level}</div>
              <Meter value={owned.exp} max={next ?? owned.exp} tone="bg-grape" />
              <div className="mt-0.5 text-[11px]">{next ? `つぎのレベルまで ${next - owned.exp} EXP` : 'レベルMAX!'}</div>
            </>
          )}
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-white p-3 text-xs leading-relaxed">
        レベルが上がると<b>段取り力</b>がつき、⚡段取りポイントが1ずつ増えます。
        <br />
        (LLMが賢くなるわけではありません。経験で、準備がうまくなるのです)
      </div>
      {owned ? (
        <div className="mt-3 text-center text-sm font-bold">{working ? `いまは「${working}」を担当中!` : 'いまは待機中。案件をまってるよ'}</div>
      ) : (
        <Btn className="mt-4 w-full" size="lg" disabled={coins < def.hireCost} onClick={onHire}>
          🪙 {def.hireCost} で採用する
        </Btn>
      )}
    </Sheet>
  );
}
