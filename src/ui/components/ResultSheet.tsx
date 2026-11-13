import { agentDef, missionDef, MISSIONS, TROUBLES } from '../../game/data';
import type { TroubleId } from '../../game/types';
import { useGame } from '../../store';
import { OUTCOME_UI } from '../screens/RunScreen';
import { Robot } from './Robot';
import { Btn, cx, Pill, pct, Sheet, Stars } from './ui';

export function ResultSheet() {
  const { result, closeResult, setTab, openMission } = useGame();
  if (!result) return null;
  const { summary: s, reward: r } = result;
  const m = missionDef(s.missionId);
  const agent = agentDef(s.build.agentId);
  const stopped = s.total < (s.mode === 'test' ? 5 : m.emails);
  const scaledBudget = (m.budget * s.total) / m.emails;
  const causes = (Object.entries(s.causes) as [TroubleId, number][]).sort((a, b) => b[1] - a[1]);
  const nextMission = MISSIONS.find((x) => x.no === m.no + 1);
  const title = stopped ? 'とちゅうで止めました' : s.mode === 'test' ? 'テスト結果' : s.stars === 3 ? 'パーフェクト!' : s.stars > 0 ? 'クリア!' : 'ざんねん…';

  const again = () => {
    closeResult();
    setTab('dev');
  };

  return (
    <Sheet open title={title} tall>
      <div className="flex flex-col items-center">
        <Robot color={agent.color} accent={agent.accent} mood={s.stars > 0 || s.mode === 'test' ? 'happy' : 'sad'} size={92} />
        {s.mode === 'real' && !stopped && <Stars n={s.stars} size="text-5xl" animate />}
        {r.levelUp && <Pill className="anim-pop mt-2 bg-grape text-white">🎉 {agent.name}がレベルアップ!⚡+1</Pill>}
        {r.firstClear && nextMission && <Pill className="anim-pop mt-2 bg-mint text-white">🔓 CASE {nextMission.no} がひらいた!</Pill>}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Goal label="正答率" value={pct(s.accuracy)} ok={s.accuracy + 1e-9 >= m.goals.accuracy} goal={`目標 ${pct(m.goals.accuracy)}`} />
        <Goal label="自動処理率" value={pct(s.auto)} ok={s.auto + 1e-9 >= m.goals.auto} goal={`目標 ${pct(m.goals.auto)}`} />
        <Goal label="運用コスト" value={`🪙${s.cost}`} ok={s.cost <= scaledBudget + 1e-9} goal={`予算 ${Math.round(scaledBudget)}`} />
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1 rounded-2xl bg-white p-2 text-center">
        {(Object.keys(OUTCOME_UI) as (keyof typeof OUTCOME_UI)[]).map((o) => (
          <div key={o}>
            <div className="text-lg">{OUTCOME_UI[o].emoji}</div>
            <div className={cx('text-sm font-extrabold', OUTCOME_UI[o].color)}>{s.outcomes[o]}</div>
            <div className="text-[9px] leading-tight">{OUTCOME_UI[o].label}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3">
        <div className="text-sm font-extrabold">🔎 失敗の原因</div>
        {causes.length === 0 ? (
          <p className="mt-1 text-sm">失敗はありませんでした!すごい!</p>
        ) : s.causesVisible ? (
          <ul className="mt-2 space-y-2">
            {causes.map(([t, n]) => (
              <li key={t} className="text-sm">
                <div className="flex items-center justify-between font-bold">
                  <span>
                    {TROUBLES[t].emoji} {TROUBLES[t].name}
                  </span>
                  <span>{n}件</span>
                </div>
                <div className="text-xs text-[#9a8aa0]">💡 {TROUBLES[t].fix}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-2 text-sm">
            ❔❔❔ 原因がわかりません…
            <div className="mt-1 text-xs text-[#9a8aa0]">💡 「ライン全体」に📊ログを置くと、何が起きたか見えるようになるよ</div>
          </div>
        )}
        {m.mentor && causes.length > 0 && <div className="mt-2 text-[11px] text-[#b7a3b8]">※ 見習い期間中は、先輩が原因を教えてくれています</div>}
      </div>

      <div className="mt-3 rounded-2xl bg-lemon-soft p-3 text-sm font-bold">
        <div className="flex justify-between">
          <span>報酬</span>
          <span>🪙 +{r.earned}</span>
        </div>
        {r.starBonus > 0 && (
          <div className="flex justify-between">
            <span>はじめての★ボーナス</span>
            <span>🪙 +{r.starBonus}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>運用コスト</span>
          <span>🪙 −{r.spent}</span>
        </div>
        {r.exp > 0 && (
          <div className="flex justify-between text-grape">
            <span>{agent.name}の経験値</span>
            <span>+{r.exp} EXP</span>
          </div>
        )}
        {s.mode === 'test' && <div className="mt-1 text-xs font-normal">テストは報酬なし。気軽に試してね!</div>}
      </div>

      <div className="mt-4 grid gap-2">
        <Btn size="lg" onClick={again}>
          🛠️ ハーネスを改善する
        </Btn>
        {s.stars > 0 && nextMission && s.mode === 'real' && (
          <Btn
            tone="mint"
            onClick={() => {
              closeResult();
              openMission(nextMission.id);
            }}
          >
            ▶ つぎの案件へ
          </Btn>
        )}
        <Btn
          tone="white"
          onClick={() => {
            closeResult();
            setTab('analysis');
          }}
        >
          📈 分析を見る
        </Btn>
      </div>
    </Sheet>
  );
}

function Goal({ label, value, ok, goal }: { label: string; value: string; ok: boolean; goal: string }) {
  return (
    <div className={cx('rounded-2xl border-2 p-2', ok ? 'border-mint bg-mint-soft' : 'border-pink bg-pink-soft')}>
      <div className="text-[10px] font-extrabold">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[10px]">
        {ok ? '✅' : '❌'} {goal}
      </div>
    </div>
  );
}
