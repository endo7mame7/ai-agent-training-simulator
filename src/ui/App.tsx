import { Building2, ChartLine, ClipboardList, Workflow, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useGame, type Tab } from '../store';
import { Header } from './components/Header';
import { ResultSheet } from './components/ResultSheet';
import { RunBar } from './components/RunBar';
import { Toast } from './components/Toast';
import { cx } from './components/ui';
import { useRunTicker } from './components/useRunTicker';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { DevScreen } from './screens/DevScreen';
import { MissionsScreen } from './screens/MissionsScreen';
import { OfficeScreen } from './screens/OfficeScreen';
import { RunScreen } from './screens/RunScreen';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'office', label: 'オフィス', icon: Building2 },
  { id: 'dev', label: '開発', icon: Workflow },
  { id: 'missions', label: '案件', icon: ClipboardList },
  { id: 'analysis', label: '分析', icon: ChartLine },
];

export function App() {
  const { ready, init, tab, setTab, run, runOpen } = useGame();
  useEffect(() => {
    void init();
  }, [init]);
  useRunTicker();

  if (!ready) return <div className="min-h-dvh bg-grass" />;

  const office = tab === 'office';
  return (
    <div className={cx('relative mx-auto flex min-h-dvh max-w-[480px] flex-col', office ? 'bg-grass' : 'bg-bg')}>
      {!office && <Header />}
      <main className={cx('flex-1', office ? 'pb-24' : 'px-4 pb-44 pt-2')}>
        {office && <OfficeScreen />}
        {tab === 'dev' && <DevScreen />}
        {tab === 'missions' && <MissionsScreen />}
        {tab === 'analysis' && <AnalysisScreen />}
      </main>

      {!runOpen && !office && <RunBar />}

      <nav className="safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-white">
        <div className="grid grid-cols-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cx('relative flex min-h-[62px] cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-bold', on ? 'text-ink' : 'text-faint')}
                aria-current={on ? 'page' : undefined}
              >
                <Icon size={22} strokeWidth={on ? 2.4 : 2} />
                {t.label}
                {t.id === 'office' && run?.status === 'awaiting' && <span className="anim-pulse absolute right-[30%] top-2.5 h-2 w-2 rounded-full bg-coral" />}
              </button>
            );
          })}
        </div>
      </nav>

      {runOpen && run && <RunScreen />}
      <ResultSheet />
      <Toast />
    </div>
  );
}
