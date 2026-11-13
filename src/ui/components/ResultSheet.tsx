import { Lightbulb, LockOpen, Sparkles } from 'lucide-react';
import { agentDef, missionDef, MISSIONS, TROUBLES } from '../../game/data';
import type { TroubleId } from '../../game/types';
import { useGame } from '../../store';
import { OUTCOME_UI } from '../screens/RunScreen';
import { AgentAvatar } from './AgentAvatar';
import { Btn, cx, Pill, pct, Sheet, Stars } from './ui';

export function ResultSheet() {
  const { result, closeResult, setTab, openMission } = useGame();
  if (!result) return null;
  const { summary: s, reward: r } = result;
  const m = missionDef(s.missionId);
  const agent = agentDef(s.build.agentId);
  const stopped = s.total < (s.mode === 'test' ? 5 : m.emails);
  const budget = (m.budget * s.total) / m.emails;
  const causes = (Object.entries(s.causes) as [TroubleId, number][]).sort((a, b) => b[1] - a[1]);
  const nextMission = MISSIONS.find((x) => x.no === m.no + 1);
  const title = stopped ? '停止しました' : s.mode === 'test' ? 'テスト結果' : s.stars > 0 ? 'クリア' : '未達成';

  return (
    <Sheet open title={title} tall>
      <div className="flex flex-col items-center rounded-3xl bg-grass px-4 pb-5 pt-4 text-white">
        <AgentAvatar id={agent.id} size={64} bg="rgba(255,255,255,0.25)" />
        {s.mode === 'real' && !stopped ? (
          <div className="mt-3 rounded-full bg-white px-4 py-2">
            <Stars n={s.stars} size={30} animate />
          </div>
        ) : (
          <div className="mt-2 text-sm font-bold opacity-90">{stopped ? `${s.total}件まで処理` : '報酬・記録の対象外です'}</div>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {r.firstClear && nextMission && (
            <Pill className="anim-pop bg-white text-ink">
              <LockOpen size={12} /> CASE {nextMission.no} 解放
            </Pill>
          )}
          {r.levelUp && (
            <Pill className="anim-pop bg-white text-ink">
              <Sparkles size={12} /> {agent.name} レベルアップ
            </Pill>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Goal label="正答率" value={pct(s.accuracy)} ok={s.accuracy + 1e-9 >= m.goals.accuracy} goal={`目標 ${pct(m.goals.accuracy)}`} />
        <Goal label="自動処理率" value={pct(s.auto)} ok={s.auto + 1e-9 >= m.goals.auto} goal={`目標 ${pct(m.goals.auto)}`} />
        <Goal label="コスト" value={`${s.cost}`} ok={s.cost <= budget + 1e-9} goal={`予算 ${Math.round(budget)}`} />
      </div>

      <div className="mt-2 grid grid-cols-5 gap-1 rounded-2xl bg-white p-3 text-center">
        {(Object.keys(OUTCOME_UI) as (keyof typeof OUTCOME_UI)[]).map((o) => {
          const Icon = OUTCOME_UI[o].icon;
          return (
            <div key={o}>
              <Icon size={16} className={cx('mx-auto', OUTCOME_UI[o].color)} />
              <div className="num text-base font-bold">{s.outcomes[o]}</div>
              <div className="text-[9px] leading-tight text-sub">{OUTCOME_UI[o].label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 rounded-2xl bg-white p-4">
        <div className="text-sm font-bold">失敗の原因</div>
        {causes.length === 0 ? (
          <p className="mt-1 text-[13px] text-sub">失敗はありませんでした。</p>
        ) : s.causesVisible ? (
          <ul className="mt-2 space-y-3">
            {causes.map(([t, n]) => (
              <li key={t} className="text-[13px]">
                <div className="flex items-center justify-between font-bold">
                  <span>{TROUBLES[t].name}</span>
                  <span className="num">{n}件</span>
                </div>
                <div className="mt-0.5 flex items-start gap-1.5 text-xs text-sub">
                  <Lightbulb size={13} className="mt-0.5 shrink-0 text-butter" /> {TROUBLES[t].fix}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-1 text-[13px]">
            <span className="text-sub">失敗が {Object.values(s.causes).reduce((a, b) => a + b, 0)} 件ありましたが、原因は記録されていません。</span>
            <div className="mt-1 flex items-start gap-1.5 text-xs text-sub">
              <Lightbulb size={13} className="mt-0.5 shrink-0 text-butter" /> ライン全体にログを置くと、原因を分析できます
            </div>
          </div>
        )}
        {m.mentor && causes.length > 0 && <div className="mt-3 text-[11px] text-faint">※ 序盤は先輩がログの代わりに原因を教えてくれます</div>}
      </div>

      <div className="num mt-2 space-y-1 rounded-2xl bg-white p-4 text-[13px]">
        <Row label="報酬" value={`+${r.earned}`} />
        {r.starBonus > 0 && <Row label="★獲得ボーナス" value={`+${r.starBonus}`} />}
        <Row label="運用コスト" value={`−${r.spent}`} />
        {r.exp > 0 && <Row label={`${agent.name} 経験値`} value={`+${r.exp} EXP`} />}
      </div>

      <div className="mt-4 grid gap-2">
        <Btn
          size="lg"
          onClick={() => {
            closeResult();
            setTab('dev');
          }}
        >
          ハーネスを改善する
        </Btn>
        {s.stars > 0 && nextMission && s.mode === 'real' && (
          <Btn
            tone="secondary"
            onClick={() => {
              closeResult();
              openMission(nextMission.id);
            }}
          >
            次の案件へ
          </Btn>
        )}
        <Btn
          tone="ghost"
          onClick={() => {
            closeResult();
            setTab('analysis');
          }}
        >
          分析を見る
        </Btn>
      </div>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sub">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function Goal({ label, value, ok, goal }: { label: string; value: string; ok: boolean; goal: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="text-[11px] font-bold text-faint">{label}</div>
      <div className={cx('num text-xl font-bold', ok ? 'text-go' : 'text-coral')}>{value}</div>
      <div className="num text-[10px] text-sub">{goal}</div>
    </div>
  );
}
