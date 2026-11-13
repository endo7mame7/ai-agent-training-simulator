import { setSlot, startLogAnalysis } from '../../core/actions';
import { BALANCE } from '../../data/balance';
import { ENCODINGS, KNACK_KIND_LABEL, KNACKS } from '../../data/knacks';
import { STAGES } from '../../data/stages';
import { useGame } from '../../store/gameStore';
import { Button, Panel } from '../components/common';
import { cx } from '../util';

export function KnacksScreen() {
  const { game, apply, setScreen, selectStage, setMessage } = useGame();
  if (!game) return null;
  const found = KNACKS.filter((k) => game.knacks[k.id].discovered).length;
  const vet = game.staff.find((s) => s.rank === 'veteran')!;

  const interview = (stageId: number) => {
    if (vet.slots.some((x) => x.kind === 'interview' && x.stageId === stageId)) return setMessage('この工程のヒアリングはすでに指示しています');
    let idx = vet.slots.findIndex((x) => x.kind === 'idle');
    if (idx < 0) idx = vet.slots.map((x) => x.kind).lastIndexOf('work');
    if (idx < 0) return setMessage('ベテランのコマに空きがありません');
    if (apply((s) => setSlot(s, vet.id, idx, { kind: 'interview', stageId }))) setMessage(`ベテランのコマ${idx + 1}を工程${stageId}のヒアリングに回しました`);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-5 pb-10 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          カンコツ図鑑 <span className="text-base font-normal text-slate-500">{found} / {KNACKS.length} 判明</span>
        </h1>
        <Button variant="primary" onClick={() => setScreen('main')}>
          ラインに戻る
        </Button>
      </div>
      <Panel title="発掘のしかた">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-bold">🗣 ベテランにヒアリング</div>
            <div className="text-xs text-slate-500">ベテランの1コマ。翌週、指定した工程の未発見カンコツが1つ判明する。</div>
          </div>
          <div>
            <div className="font-bold">🔍 過去案件のログ分析</div>
            <div className="text-xs text-slate-500">開発枠1つを1週間、{BALANCE.logAnalysisCost}万円。感覚型は見つからない。</div>
          </div>
          <div>
            <div className="font-bold">📈 失敗から学ぶ</div>
            <div className="text-xs text-slate-500">ログ監視があれば、同じカンコツが原因のミス累計{BALANCE.autoDiscoverFails}件で自動判明する。</div>
          </div>
        </div>
      </Panel>
      <div className="grid grid-cols-6 gap-3">
        {STAGES.map((st) => (
          <div key={st.id} className="space-y-2">
            <div className="rounded-md bg-slate-700 px-3 py-1.5 text-white">
              <div className="text-[10px] text-slate-300">工程{st.id}</div>
              <div className="text-sm font-bold">{st.name}</div>
            </div>
            {KNACKS.filter((k) => k.stageId === st.id).map((k) => {
              const ks = game.knacks[k.id];
              if (!ks.discovered)
                return (
                  <div key={k.id} className="flex h-36 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400">
                    <div className="text-4xl font-bold">?</div>
                    <div className="text-[11px]">未発見</div>
                    {game.lineParts.includes('logMonitor') && ks.failCount > 0 && <div className="text-[10px] text-amber-600">関連ミス {ks.failCount}/{BALANCE.autoDiscoverFails}</div>}
                  </div>
                );
              return (
                <button
                  type="button"
                  key={k.id}
                  onClick={() => selectStage(st.id)}
                  className={cx(
                    'flex h-36 w-full cursor-pointer flex-col rounded-lg border-2 bg-white p-2.5 text-left shadow-sm hover:border-teal-400',
                    ks.encoding ? 'border-teal-400' : k.kind === 'sense' ? 'border-rose-300' : 'border-slate-200',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-slate-800 px-1.5 text-[11px] font-bold text-white">{k.id}</span>
                    <span className={cx('text-[10px]', k.kind === 'sense' ? 'font-bold text-rose-600' : 'text-slate-500')}>{KNACK_KIND_LABEL[k.kind]}</span>
                  </div>
                  <div className="mt-1.5 flex-1 text-[13px] leading-snug">{k.text}</div>
                  <div className="text-[10px] text-slate-500">影響度 {k.weight.toFixed(2)}</div>
                  <div className="text-[11px] font-bold">
                    {ks.encoding ? <span className="text-teal-700">✔ {ENCODINGS[ks.encoding].name}済み</span> : k.kind === 'sense' ? <span className="text-rose-600">自動化不可</span> : <span className="text-slate-400">未対応</span>}
                  </div>
                </button>
              );
            })}
            <div className="flex flex-col gap-1">
              <Button variant="secondary" className="text-xs" onClick={() => interview(st.id)}>
                🗣 ヒアリング
              </Button>
              <Button variant="secondary" className="text-xs" onClick={() => apply((s) => startLogAnalysis(s, st.id))}>
                🔍 ログ分析
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
