import { useEffect, useRef } from 'react';
import { useGame } from '../../store';

/** 実行中の案件を、画面を移動しても進め続ける */
export function useRunTicker() {
  const status = useGame((s) => s.run?.status);
  const speed = useGame((s) => s.speed);
  const tick = useGame((s) => s.tick);
  const last = useRef(0);
  useEffect(() => {
    if (status !== 'running') return;
    const interval = 420 / speed;
    let raf = 0;
    const loop = (t: number) => {
      if (t - last.current >= interval) {
        last.current = t;
        tick();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status, speed, tick]);
}
