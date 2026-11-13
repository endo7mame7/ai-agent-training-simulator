import { useEffect } from 'react';
import { useGame } from '../../store';

export function Toast() {
  const { toast, showToast } = useGame();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => showToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast, showToast]);
  if (!toast) return null;
  return (
    <div className="anim-slide fixed left-1/2 top-4 z-[60] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 rounded-2xl bg-ink px-4 py-3 text-center text-[13px] font-bold text-white shadow-lg" role="status">
      {toast}
    </div>
  );
}
