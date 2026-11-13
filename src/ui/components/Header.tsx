import { companyLevel, totalStars } from '../../game/progress';
import { useGame } from '../../store';

export function Header() {
  const save = useGame((s) => s.save);
  return (
    <header className="sticky top-0 z-20 border-b-2 border-[#f6dbe4] bg-cream/95 px-4 pb-2 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="leading-none">
          <div className="text-[10px] font-extrabold tracking-[0.2em] text-pink">AGENT</div>
          <div className="text-lg font-extrabold tracking-wider">FACTORY</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="rounded-full bg-grape-soft px-2.5 py-1 text-xs font-extrabold text-grape">Lv.{companyLevel(save)}</span>
          <span className="rounded-full bg-lemon-soft px-2.5 py-1 text-xs font-extrabold text-[#b8860b]">⭐ {totalStars(save)}</span>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold shadow-[inset_0_0_0_2px_#ffe3a3]">🪙 {save.coins.toLocaleString()}</span>
        </div>
      </div>
    </header>
  );
}
