import { demandFor, pendingDevCost } from '../../core/formulas';
import { BALANCE } from '../../data/balance';
import { useGame, type Screen } from '../../store/gameStore';
import { cx, man } from '../util';
import { Tip } from './common';

const NAV: { id: Screen; label: string }[] = [
  { id: 'main', label: 'ライン' },
  { id: 'staff', label: '人員配置' },
  { id: 'knacks', label: 'カンコツ図鑑' },
  { id: 'report', label: '週次レポート' },
];

export function TopBar() {
  const { game, screen, setScreen, setHowTo, toTitle, openReport } = useGame();
  if (!game) return null;
  const demand = demandFor(game.reputation, game.flags.demandBonus);
  const pending = pendingDevCost(game);
  const done = game.flags.finished || game.flags.gameOver;
  return (
    <header className="sticky top-0 z-30 border-b border-slate-700 bg-slate-800 text-white shadow">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-5 py-2">
        <button type="button" onClick={toTitle} className="cursor-pointer text-left">
          <div className="text-[10px] tracking-widest text-teal-300">HARNESS WORKS</div>
          <div className="text-sm font-bold">ハーネス・ワークス</div>
        </button>
        <div className="flex items-end gap-6">
          <div>
            <div className="text-[10px] text-slate-400">週</div>
            <div className="text-xl font-bold tabular-nums">
              {done ? '終了' : `第${game.week}週`}
              <span className="text-xs font-normal text-slate-400"> / {BALANCE.totalWeeks}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">資金</div>
            <div className={cx('text-xl font-bold tabular-nums', game.cash < 0 && 'text-rose-300')}>{man(game.cash)}</div>
            {pending > 0 && <div className="text-[10px] text-amber-300">今週の開発費 −{pending}万円</div>}
          </div>
          <div>
            <div className="text-[10px] text-slate-400">
              評判<Tip text="0〜100。納期内の出図で上がり、遅延・不良流出・受注断りで下がる" />
            </div>
            <div className="text-xl font-bold tabular-nums">{game.reputation.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">
              需要<Tip text="毎週の引き合い件数。評判÷10(上限10件)" />
            </div>
            <div className="text-xl font-bold tabular-nums">
              {demand}
              <span className="text-xs font-normal">件/週</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">
              受注残<Tip text={`未出図の案件。${BALANCE.backlogLimit}件を超える分は受注を断る`} />
            </div>
            <div className="text-xl font-bold tabular-nums">
              {game.cases.length}
              <span className="text-xs font-normal">件</span>
            </div>
          </div>
        </div>
        <nav className="ml-auto flex items-center gap-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              disabled={n.id === 'report' && game.history.length === 0}
              onClick={() => (n.id === 'report' ? openReport(game.history[game.history.length - 1].week) : setScreen(n.id))}
              className={cx(
                'cursor-pointer rounded-md px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-30',
                screen === n.id ? 'bg-white text-slate-900' : 'text-slate-200 hover:bg-slate-700',
              )}
            >
              {n.label}
            </button>
          ))}
          {done && (
            <button type="button" onClick={() => setScreen('result')} className="cursor-pointer rounded-md bg-amber-400 px-3 py-1.5 text-sm font-bold text-slate-900">
              最終結果
            </button>
          )}
          <button type="button" onClick={() => setHowTo(true)} className="ml-2 cursor-pointer rounded-md px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
            遊び方
          </button>
        </nav>
      </div>
    </header>
  );
}
