import { useEffect } from 'react';
import { useGame } from '../../store/gameStore';

export function Toast() {
  const { message, setMessage } = useGame();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message, setMessage]);
  if (!message) return null;
  return (
    <div className="fadein fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg" role="status">
      {message}
    </div>
  );
}
