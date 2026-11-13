import { useEffect } from 'react';
import { useGame, type Tab } from '../store';
import { Header } from './components/Header';
import { ResultSheet } from './components/ResultSheet';
import { Toast } from './components/Toast';
import { useRunTicker } from './components/useRunTicker';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { DevScreen } from './screens/DevScreen';
import { MissionsScreen } from './screens/MissionsScreen';
import { OfficeScreen } from './screens/OfficeScreen';
import { RunScreen } from './screens/RunScreen';
import { cx } from './components/ui';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'office', label: 'オフィス', icon: '🏢' },
  { id: 'dev', label: '開発', icon: '🛠️' },
  { id: 'missions', label: '案件', icon: '📋' },
  { id: 'analysis', label: '分析', icon: '📈' },
];

export function App() {
  const { ready, init, tab, setTab, run, runOpen, setRunOpen } = useGame();
  useEffect(() => {
    void init();
  }, [init]);
  useRunTicker();

  if (!ready)
    return (
      <div className="flex min-h-dvh items-center justify-center text-2xl font-extrabold text-pink">
        <span className="anim-bob">🤖 よみこみ中…</span>
      </div>
    );

  const active = run && (run.status === 'running' || run.status === 'paused' || run.status === 'awaiting');

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-[480px] flex-col bg-cream shadow-[0_0_0_1px_#f6dbe4,0_10px_40px_rgba(255,111,150,0.15)]">
      <Header />
      <main className="flex-1 px-4 pb-40 pt-3">
        {tab === 'office' && <OfficeScreen />}
        {tab === 'dev' && <DevScreen />}
        {tab === 'missions' && <MissionsScreen />}
        {tab === 'analysis' && <AnalysisScreen />}
      </main>

      {active && !runOpen && (
        <button
          type="button"
          onClick={() => setRunOpen(true)}
          className={cx(
            'press pop-shadow fixed bottom-[86px] left-1/2 z-30 flex w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-left',
            run.status === 'awaiting' ? 'anim-slide border-lemon bg-lemon-soft' : 'border-mint bg-mint-soft',
          )}
        >
          <span className={cx('text-2xl', run.status === 'awaiting' && 'anim-wiggle')}>{run.status === 'awaiting' ? '🙋' : run.status === 'paused' ? '⏸️' : '⚙️'}</span>
          <span className="flex-1">
            <span className="block text-sm font-extrabold">{run.status === 'awaiting' ? 'エージェントが確認を待っています!' : run.status === 'paused' ? '一時停止中' : '案件を実行中…'}</span>
            <span className="block text-xs">
              {run.cur}/{run.total}件 処理ずみ
            </span>
          </span>
          <span className="text-sm font-extrabold text-pink">見る ›</span>
        </button>
      )}

      <nav className="safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t-2 border-[#f6dbe4] bg-white/95 backdrop-blur">
        <div className="grid grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cx('relative flex min-h-[64px] cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold', tab === t.id ? 'text-pink' : 'text-[#b7a3b8]')}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              <span className={cx('text-2xl transition-transform', tab === t.id && '-translate-y-0.5 scale-110')}>{t.icon}</span>
              {t.label}
              {tab === t.id && <span className="absolute top-0 h-1 w-10 rounded-b-full bg-pink" />}
            </button>
          ))}
        </div>
      </nav>

      {runOpen && run && <RunScreen />}
      <ResultSheet />
      <Toast />
    </div>
  );
}
