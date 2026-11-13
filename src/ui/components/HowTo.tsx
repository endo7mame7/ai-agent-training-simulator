import { useState } from 'react';
import { useGame } from '../../store/gameStore';
import { cx } from '../util';
import { Button, Modal } from './common';

const PAGES = [
  {
    title: '1. 設計ラインと担当',
    body: (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 text-center text-xs">
          {['要求', '構想', '詳細', '解析', '図面', 'レビュー'].map((n, i) => (
            <div key={n} className="flex items-center gap-2">
              <div className="w-20 rounded-lg border-2 border-slate-300 bg-white p-2">
                <div className="text-2xl">{i % 2 ? '🤖' : '👤'}</div>
                <div className="font-bold">{n}</div>
              </div>
              {i < 5 && <span className="text-slate-300">▶</span>}
            </div>
          ))}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>案件は工程1〜6を左から右へ流れ、工程6を通ると出図(売上)になります。</li>
          <li>各工程の担当は「人」か「エージェント(小・中・大モデル)」。人は時間が、エージェントはトークン代がかかります。</li>
          <li>赤く点滅している工程がボトルネック。処理能力が足りず、案件が滞っています。</li>
        </ul>
      </div>
    ),
  },
  {
    title: '2. カンコツとハーネス',
    body: (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4 text-center text-sm">
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-3">
            <div className="text-3xl">❓</div>カンコツ
            <div className="text-[11px] text-slate-500">ベテランの暗黙知</div>
          </div>
          <span className="text-2xl text-slate-300">➜</span>
          <div className="rounded-lg border-2 border-slate-300 p-3">
            <div className="text-3xl">🗣🔍📈</div>発掘
            <div className="text-[11px] text-slate-500">ヒアリング・ログ分析・失敗</div>
          </div>
          <span className="text-2xl text-slate-300">➜</span>
          <div className="rounded-lg border-2 border-teal-400 bg-teal-50 p-3">
            <div className="text-3xl">📘🔁🔌🗂️</div>落とし込み
            <div className="text-[11px] text-slate-500">ルール・チェックリスト・ツール・事例</div>
          </div>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>エージェントは、ハーネスに落とし込まれていないカンコツの数だけ失敗しやすくなります(見つけていなくても影響します)。</li>
          <li>ハーネス部品(手順書・ツール接続・検証ループ・承認ゲート・安全柵…)は開発費と期間がかかります。同時に開発できるのは2件まで。</li>
          <li>感覚型のカンコツはハーネスに落とせません。人に任せるか、人の承認ゲートで拾いましょう。</li>
        </ul>
      </div>
    ),
  },
  {
    title: '3. 1週間の流れと評価',
    body: (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 text-center text-sm">
          {[
            ['📝', '計画', '担当・コマ・開発を決める'],
            ['▶', '実行', '自動でシミュレーション'],
            ['📊', '振り返り', '損益と原因タグを読む'],
          ].map(([i, t, d], k) => (
            <div key={t} className="flex items-center gap-3">
              <div className="w-40 rounded-lg border-2 border-slate-300 p-3">
                <div className="text-3xl">{i}</div>
                <div className="font-bold">{t}</div>
                <div className="text-[11px] text-slate-500">{d}</div>
              </div>
              {k < 2 && <span className="text-2xl text-slate-300">➜</span>}
            </div>
          ))}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>これを24週くり返し、最終資金でランク(S/A/B/C)が決まります。資金が−100万円を下回ると中止です。</li>
          <li>不良が残ったまま出図すると、2週後に顧客先で発覚し、返金とペナルティ、評判の低下を招きます。</li>
          <li>ログ監視がないと失敗の原因は「原因不明」、評価ベンチがないと成功率の予測は「???」です。</li>
        </ul>
      </div>
    ),
  },
];

export function HowTo() {
  const { setHowTo } = useGame();
  const [page, setPage] = useState(0);
  const p = PAGES[page];
  return (
    <Modal onClose={() => setHowTo(false)} title={`遊び方 — ${p.title}`} width="w-[820px]">
      <div className="min-h-[260px]">{p.body}</div>
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-1.5">
          {PAGES.map((_, i) => (
            <button type="button" key={i} onClick={() => setPage(i)} className={cx('h-2.5 w-2.5 cursor-pointer rounded-full', i === page ? 'bg-teal-600' : 'bg-slate-300')} aria-label={`${i + 1}枚目`} />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
            前へ
          </Button>
          {page < PAGES.length - 1 ? (
            <Button variant="primary" onClick={() => setPage(page + 1)}>
              次へ
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setHowTo(false)}>
              はじめる
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
