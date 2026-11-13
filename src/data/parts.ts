import type { LinePart, StagePart } from '../core/types';

export interface PartDef<T extends string> {
  id: T;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  weeks: number;
}

export const STAGE_PARTS: Record<StagePart, PartDef<StagePart>> = {
  manual: { id: 'manual', name: '手順書', icon: '📘', desc: '作業指示を整える。ルール化の受け皿。コンテキスト負荷 +1', cost: 10, weeks: 1 },
  toolLink: { id: 'toolLink', name: 'ツール接続', icon: '🔌', desc: 'CADや解析ソフトを操作できるようにする。ツール化の受け皿', cost: 40, weeks: 2 },
  verifyLoop: { id: 'verifyLoop', name: '検証ループ', icon: '🔁', desc: '自己チェックでミスの60%を検出し、再実行する(最大2回)。チェックリスト化の受け皿', cost: 20, weeks: 1 },
  approvalGate: { id: 'approvalGate', name: '承認ゲート', icon: '✅', desc: '人が結果を確認し、ミスを見つけたら再実行させる。レビュー担当のコマが必要', cost: 0, weeks: 0 },
  guardrail: { id: 'guardrail', name: '安全柵', icon: '🛡️', desc: '操作権限を絞り、重大事故を防ぐ', cost: 15, weeks: 1 },
};

export const STAGE_PART_ORDER: StagePart[] = ['manual', 'toolLink', 'verifyLoop', 'approvalGate', 'guardrail'];

export const LINE_PARTS: Record<LinePart, PartDef<LinePart>> = {
  caseMemory: { id: 'caseMemory', name: '事例メモリ基盤', icon: '🗂️', desc: '過去案件を参照できるようにする。事例メモリ化の受け皿', cost: 50, weeks: 3 },
  logMonitor: { id: 'logMonitor', name: 'ログ監視', icon: '📈', desc: '不良の原因タグが見えるようになる。未設置だと「原因不明」としか表示されない', cost: 15, weeks: 1 },
  evalBench: { id: 'evalBench', name: '評価ベンチ', icon: '🧪', desc: '配備前に成功率の予測値が見える。未設置だと予測は「???」表示', cost: 40, weeks: 2 },
};

export const LINE_PART_ORDER: LinePart[] = ['logMonitor', 'evalBench', 'caseMemory'];
