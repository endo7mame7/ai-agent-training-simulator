import { setExecutiveTrial } from '../../core/actions';
import { demandFor, pendingDevCost, salaryTotal } from '../../core/formulas';
import { BALANCE } from '../../data/balance';
import { eventForWeek } from '../../data/events';
import { useGame } from '../../store/gameStore';
import { Button, Panel, Stat } from '../components/common';
import { DevQueuePanel } from '../components/DevQueuePanel';
import { StationCard } from '../components/StationCard';
import { bottlenecks, weeklyTokenEstimate } from '../selectors';
import { cx, man, signedMan } from '../util';

export function MainScreen() {
  const { game, selectStage, executeWeek, resetPlan, apply, openReport, setScreen } = useGame();
  if (!game) return null;
  const ev = eventForWeek(game.week);
  const bn = bottlenecks(game);
  const tokens = weeklyTokenEstimate(game);
  const dev = pendingDevCost(game);
  const fixed = salaryTotal(game) + BALANCE.fixedCostPerWeek;
  const last = game.history[game.history.length - 1];
  const demand = demandFor(game.reputation, game.flags.demandBonus);
  const done = game.flags.finished || game.flags.gameOver;

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-28 pt-4">
      {ev && !done && (
        <div className="fadein mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="text-2xl">📣</div>
          <div className="flex-1">
            <div className="text-sm font-bold text-amber-900">
              第{ev.week}週のできごと:{ev.title}
            </div>
            <div className="text-sm text-amber-900/80">{ev.text}</div>
          </div>
          {ev.id === 'executive' && (
            <Button variant={game.flags.executiveTrial ? 'primary' : 'secondary'} onClick={() => apply((s) => setExecutiveTrial(s, !s.flags.executiveTrial))}>
              {game.flags.executiveTrial ? '試用する(解除)' : '試してみる'}
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_260px] gap-4">
        <div className="min-w-0 space-y-4">
          <Panel
            title="設計ライン"
            right={
              <span className="text-xs text-slate-500">
                工程をクリックして担当・部品・カンコツを設定
                {bn.stages.size > 0 && <span className="ml-2 font-bold text-rose-600">赤枠 = ボトルネック</span>}
                {bn.lineShort && <span className="ml-2 font-bold text-rose-600">ライン全体の能力({bn.minCap}件/週)が需要に届いていません</span>}
              </span>
            }
          >
            <div className="flex items-stretch gap-1">
              <div className="flex w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-center text-[11px] text-slate-500">
                <div className="text-xl">📥</div>
                受注
                <div className="text-base font-bold text-slate-700">{demand}</div>
                件/週
              </div>
              {game.stages.map((s, i) => (
                <div key={s.id} className="flex min-w-0 flex-1 items-center gap-1">
                  <StationCard game={game} stageId={s.id} bottleneck={bn.stages.has(s.id)} onClick={() => selectStage(s.id)} />
                  {i < game.stages.length - 1 && <div className="shrink-0 text-[10px] text-slate-300">▶</div>}
                </div>
              ))}
              <div className="flex w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-teal-50 text-center text-[11px] text-teal-700">
                <div className="text-xl">📤</div>
                出図
                {last && <div className="text-base font-bold">{last.shipped}</div>}
                {last && '先週'}
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-4">
            <Panel title="今週の見込み">
              <div className="grid grid-cols-3 gap-4">
                <Stat label="人件費+固定費" value={man(fixed)} />
                <Stat label="トークン代(見込み)" value={man(tokens, 1)} tone={tokens > 50 ? 'bad' : 'neutral'} />
                <Stat label="着手する開発費" value={man(dev)} tone={dev > 0 ? 'bad' : 'neutral'} />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                案件1件の売上は満額{BALANCE.caseRevenue}万円。受注から{BALANCE.dueWeeks}週を超えると目減りします。
              </p>
            </Panel>
            <Panel
              title={last ? `先週(第${last.week}週)の結果` : '先週の結果'}
              right={last && <Button variant="ghost" className="text-xs" onClick={() => openReport(last.week)}>レポートを見る</Button>}
            >
              {last ? (
                <div className="grid grid-cols-4 gap-4">
                  <Stat label="週次利益" value={signedMan(last.profit)} tone={last.profit >= 0 ? 'good' : 'bad'} />
                  <Stat label="出図" value={`${last.shipped}件`} sub={last.shippedLate > 0 ? `うち遅延${last.shippedLate}` : undefined} />
                  <Stat label="不良流出" value={`${last.outflows.length}件`} tone={last.outflows.length > 0 ? 'bad' : 'neutral'} />
                  <Stat label="評判" value={`${last.repAfter >= last.repBefore ? '+' : ''}${(last.repAfter - last.repBefore).toFixed(1)}`} tone={last.repAfter >= last.repBefore ? 'good' : 'bad'} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  設計課は4名で週4件ほど。需要の週6件に追いついていません。まずは工程を1つクリックして、何ができるか見てみましょう。
                </p>
              )}
            </Panel>
          </div>
        </div>
        <DevQueuePanel />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-5 py-3">
          <div className="text-sm text-slate-600">
            {done ? 'プロジェクトは終了しました。' : '計画は「今週を実行」を押すまで何度でもやり直せます。'}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" onClick={() => setScreen('staff')}>
              人員配置
            </Button>
            <Button variant="ghost" onClick={() => setScreen('knacks')}>
              カンコツ図鑑
            </Button>
            <Button variant="secondary" onClick={resetPlan} disabled={done}>
              計画をやり直す
            </Button>
            {done ? (
              <Button variant="primary" onClick={() => setScreen('result')}>
                最終結果へ
              </Button>
            ) : (
              <Button variant="primary" className={cx('!px-6 !text-base')} onClick={executeWeek}>
                ▶ 第{game.week}週を実行
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
