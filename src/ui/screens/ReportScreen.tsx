import type { WeekReport } from '../../core/types';
import { STAGES } from '../../data/stages';
import { useGame } from '../../store/gameStore';
import { Button, Panel, Stat } from '../components/common';
import { assigneeLabel, cx, man, pct, signedMan } from '../util';

export function ReportScreen() {
  const { game, viewReportWeek, openReport, setScreen } = useGame();
  if (!game || game.history.length === 0) return null;
  const report = game.history.find((h) => h.week === viewReportWeek) ?? game.history[game.history.length - 1];
  const done = game.flags.finished || game.flags.gameOver;
  const isLatest = report.week === game.history[game.history.length - 1].week;
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-5 pb-10 pt-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">週次レポート</h1>
        <div className="flex flex-wrap gap-1">
          {game.history.map((h) => (
            <button
              type="button"
              key={h.week}
              onClick={() => openReport(h.week)}
              className={cx(
                'h-7 w-7 cursor-pointer rounded text-xs tabular-nums',
                h.week === report.week ? 'bg-slate-800 text-white' : h.profit >= 0 ? 'bg-white text-slate-600 hover:bg-slate-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
              )}
            >
              {h.week}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          {done && isLatest ? (
            <Button variant="primary" onClick={() => setScreen('result')}>
              最終結果へ
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setScreen('main')}>
              {isLatest ? `第${game.week}週の計画へ` : 'ラインに戻る'}
            </Button>
          )}
        </div>
      </div>
      <ReportBody report={report} />
    </div>
  );
}

export function ReportBody({ report }: { report: WeekReport }) {
  const tagCounts = new Map<string, { total: number; escaped: number }>();
  for (const f of report.failures) {
    const e = tagCounts.get(f.label) ?? { total: 0, escaped: 0 };
    e.total++;
    if (f.caught === 'none') e.escaped++;
    tagCounts.set(f.label, e);
  }
  const tags = [...tagCounts.entries()].sort((a, b) => b[1].total - a[1].total);
  const maxTag = Math.max(1, ...tags.map((t) => t[1].total));
  const notices = [...report.events, ...report.accidents.map((a) => `💥 ${a}`), ...report.discoveries.map((d) => `💡 ${d}`), ...report.completedDev.map((d) => `🔧 ${d} が完成`)];

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
      <Panel title={`第${report.week}週の損益`} className="row-span-2">
        <div className="mb-3 flex items-end justify-between">
          <Stat label="週次利益" value={signedMan(report.profit, 1)} tone={report.profit >= 0 ? 'good' : 'bad'} />
          <Stat label="週末の資金" value={man(report.cashAfter)} />
        </div>
        <table className="w-full text-sm">
          <tbody>
            <PL label={`売上(出図${report.shipped}件)`} v={report.revenue} />
            <PL label={`不良流出の返金とペナルティ(${report.outflows.length}件)`} v={-report.refunds} />
            <PL label="人件費" v={-report.salaries} />
            <PL label="固定費" v={-report.fixedCost} />
            <PL label="トークン代" v={-report.tokens} />
            <PL label="開発費" v={-report.devCost} />
            <PL label="重大事故の復旧費" v={-report.accidentCost} />
          </tbody>
        </table>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
          <Stat label="引き合い / 受注" value={`${report.demand} / ${report.accepted}`} sub={report.refused > 0 ? `断り ${report.refused}件` : undefined} />
          <Stat label="納期内 / 遅延" value={`${report.shippedOnTime} / ${report.shippedLate}`} />
          <Stat label="評判" value={report.repAfter.toFixed(1)} sub={`${report.repAfter - report.repBefore >= 0 ? '+' : ''}${(report.repAfter - report.repBefore).toFixed(1)}`} tone={report.repAfter >= report.repBefore ? 'good' : 'bad'} />
        </div>
      </Panel>

      <Panel title="不良の原因タグ">
        {tags.length === 0 ? (
          <p className="text-sm text-slate-500">今週のミスはありませんでした。</p>
        ) : (
          <div className="space-y-1.5">
            {tags.map(([label, c]) => (
              <div key={label}>
                <div className="flex justify-between text-xs">
                  <span className="font-bold">{label}</span>
                  <span className="tabular-nums text-slate-500">
                    {c.total}件{c.escaped > 0 && <span className="text-rose-600">(すり抜け{c.escaped})</span>}
                  </span>
                </div>
                <div className="mt-0.5 flex h-2 overflow-hidden rounded bg-slate-100">
                  <div className="bg-slate-400" style={{ width: `${((c.total - c.escaped) / maxTag) * 100}%` }} />
                  <div className="bg-rose-400" style={{ width: `${(c.escaped / maxTag) * 100}%` }} />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-slate-500">灰:検証ループや承認ゲートで拾えたミス/赤:潜在不良として次工程へ流れたミス</p>
          </div>
        )}
        {report.reviewCatches.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600">
            設計レビューで差し戻し:{report.reviewCatches.length}件
          </div>
        )}
      </Panel>

      <Panel title="できごと">
        {notices.length === 0 && report.outflows.length === 0 ? (
          <p className="text-sm text-slate-500">特になし。</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {notices.map((n, i) => (
              <li key={i} className="leading-snug">
                {n}
              </li>
            ))}
            {report.outflows.map((o) => (
              <li key={o.caseId} className="leading-snug text-rose-700">
                🚨 {o.caseId} の不良が顧客先で発覚(原因:{o.labels.join('、')})−{o.penalty.toFixed(0)}万円
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="工程ごとの実績" className="col-span-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-1">工程</th>
              <th>担当</th>
              <th className="text-right">処理 / 能力</th>
              <th className="text-right">試行の成功率</th>
              <th className="text-right">潜在不良</th>
              <th className="text-right">滞留</th>
              <th className="text-right">トークン代</th>
            </tr>
          </thead>
          <tbody>
            {report.stageStats.map((s) => {
              const def = STAGES.find((x) => x.id === s.stageId)!;
              return (
                <tr key={s.stageId} className="border-b border-slate-100">
                  <td className="py-1.5">
                    {s.stageId} {def.name}
                  </td>
                  <td>{assigneeLabel(s.assignee)}</td>
                  <td className="text-right tabular-nums">
                    {s.processed} / {s.capacity}
                  </td>
                  <td className="text-right tabular-nums">{s.attempts > 0 ? pct(s.attemptSuccesses / s.attempts) : '—'}</td>
                  <td className={cx('text-right tabular-nums', s.defectsMade > 0 && 'text-rose-600')}>{s.defectsMade}</td>
                  <td className={cx('text-right tabular-nums', s.backlogAfter > s.capacity && 'font-bold text-rose-600')}>{s.backlogAfter}</td>
                  <td className="text-right tabular-nums">{s.tokens.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {report.lineStopped && <p className="mt-2 text-sm text-rose-600">重大事故のため、今週はラインが止まりました。</p>}
      </Panel>

      <Panel title="案件ログ">
        <ul className="max-h-60 space-y-1 overflow-y-auto text-xs">
          {report.traces.map((t) => (
            <li key={t.caseId} className="leading-snug">
              <span className="font-bold">{t.caseId}</span>{' '}
              {t.shipped ? '出図' : t.reworkTo ? `工程${t.reworkTo}へ差し戻し` : t.toIndex === t.fromIndex ? `工程${t.fromIndex + 1}で滞留` : `工程${t.fromIndex + 1}→工程${t.toIndex + 1}`}
              {t.stamps.length > 0 && <span className="text-rose-600"> ・ {t.stamps.map((s) => `工程${s.stageId}:${s.label}`).join('、')}</span>}
            </li>
          ))}
          {report.logs.map((l, i) => (
            <li key={`l${i}`} className="text-slate-500">
              {l}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function PL({ label, v }: { label: string; v: number }) {
  if (v === 0 && !label.startsWith('売上')) return null;
  return (
    <tr className="border-b border-slate-100">
      <td className="py-1 text-slate-600">{label}</td>
      <td className={cx('text-right font-bold tabular-nums', v < 0 ? 'text-rose-600' : 'text-teal-700')}>{signedMan(v, 1)}</td>
    </tr>
  );
}
