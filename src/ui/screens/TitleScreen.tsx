import { useState } from 'react';
import { useGame } from '../../store/gameStore';
import { Button } from '../components/common';

export function TitleScreen() {
  const { hasSave, newGame, continueGame, setHowTo } = useGame();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 px-6 text-white">
      <div className="text-xs tracking-[0.4em] text-teal-300">HARNESS WORKS</div>
      <h1 className="mt-3 text-6xl font-black tracking-tight">ハーネス・ワークス</h1>
      <p className="mt-4 max-w-xl text-center text-slate-300">
        ベテラン頼みのギヤユニット設計課。予算300万円と24週間で、AIエージェントとハーネスを組み合わせ、受けきれていない案件をこなして利益を伸ばせ。
      </p>
      <div className="mt-10 flex items-end gap-3 text-4xl" aria-hidden>
        <span>👤</span>
        <span className="text-slate-500">▶</span>
        <span>🤖</span>
        <span className="text-slate-500">▶</span>
        <span>📘🔁✅🛡️</span>
        <span className="text-slate-500">▶</span>
        <span>📤</span>
      </div>
      <div className="mt-10 flex w-72 flex-col gap-3">
        {confirm ? (
          <div className="rounded-lg bg-slate-700 p-4 text-center text-sm">
            <p>セーブデータを上書きして、はじめから始めますか?</p>
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                やめる
              </Button>
              <Button variant="primary" onClick={() => newGame()}>
                はじめから
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="primary" className="!py-3 !text-base" onClick={() => (hasSave ? setConfirm(true) : newGame())}>
            はじめから
          </Button>
        )}
        <Button variant="secondary" className="!py-3 !text-base" disabled={!hasSave} onClick={continueGame}>
          つづきから
        </Button>
        <Button variant="ghost" className="!py-2 !text-slate-300 hover:!bg-slate-700" onClick={() => setHowTo(true)}>
          遊び方
        </Button>
      </div>
      <p className="mt-10 text-[11px] text-slate-500">LLMの挙動は確率モデルによる擬似再現です。外部のAPIは呼びません。</p>
    </div>
  );
}
