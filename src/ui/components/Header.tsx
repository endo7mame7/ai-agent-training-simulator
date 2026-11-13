import { Banknote } from 'lucide-react';
import { useGame, type Tab } from '../../store';

const TITLE: Record<Tab, string> = { office: 'オフィス', dev: '開発', missions: '案件', analysis: '分析' };

export function Header() {
  const { save, tab } = useGame();
  return (
    <header className="sticky top-0 z-20 bg-bg/90 px-4 pb-2 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur">
      <div className="flex items-center">
        <h1 className="text-[22px] font-bold tracking-tight">{TITLE[tab]}</h1>
        <span className="num ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-bold shadow-soft">
          <Banknote size={16} className="text-butter" />
          {save.coins.toLocaleString()}
        </span>
      </div>
    </header>
  );
}
