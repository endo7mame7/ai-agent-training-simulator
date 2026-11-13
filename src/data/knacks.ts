import type { Encoding, KnackDef, KnackKind } from '../core/types';

export const KNACKS: KnackDef[] = [
  { id: 'K01', stageId: 1, text: 'A社の言う「静音」は40dB以下を指す', kind: 'context', weight: 0.15, encodings: { rule: 0.7, memory: 0.9 } },
  { id: 'K02', stageId: 1, text: '使用温度の記載がなければ必ず問い合わせる', kind: 'criteria', weight: 0.15, encodings: { rule: 0.7, checklist: 0.9 } },
  { id: 'K03', stageId: 1, text: '必要トルクは起動時のピークで見る', kind: 'calc', weight: 0.1, encodings: { rule: 0.7, tool: 1.0 } },
  { id: 'K04', stageId: 2, text: '減速比が1段で5を超えたら2段に分ける', kind: 'criteria', weight: 0.15, encodings: { rule: 0.7, checklist: 0.9 } },
  { id: 'K05', stageId: 2, text: '流用元にする過去案件の目利き', kind: 'case', weight: 0.2, encodings: { memory: 0.85 } },
  { id: 'K06', stageId: 2, text: 'レイアウトの「収まりの良さ」の感覚', kind: 'sense', weight: 0.2, encodings: {} },
  { id: 'K07', stageId: 3, text: '樹脂ギヤの歯幅は相手より1mm広くする', kind: 'criteria', weight: 0.1, encodings: { rule: 0.7, checklist: 0.9, tool: 1.0 } },
  { id: 'K08', stageId: 3, text: '組立工具が入るすき間を確保する', kind: 'criteria', weight: 0.15, encodings: { checklist: 0.9, tool: 1.0 } },
  { id: 'K09', stageId: 4, text: 'かみ合いの周波数とケースの共振が近いと異音になる', kind: 'calc', weight: 0.2, encodings: { checklist: 0.8, tool: 1.0 } },
  { id: 'K10', stageId: 4, text: '解析の固定条件は実際の取り付け方に合わせる', kind: 'case', weight: 0.2, encodings: { rule: 0.6, memory: 0.85 } },
  { id: 'K11', stageId: 4, text: '結果の「怪しさ」に気づく勘', kind: 'sense', weight: 0.15, encodings: {} },
  { id: 'K12', stageId: 5, text: 'この加工先は公差±0.02以下で単価が跳ね上がる', kind: 'context', weight: 0.1, encodings: { rule: 0.7, memory: 0.9 } },
  { id: 'K13', stageId: 5, text: '在庫のある標準部品を優先して選ぶ', kind: 'calc', weight: 0.1, encodings: { tool: 1.0 } },
  { id: 'K14', stageId: 6, text: '過去の不具合リストと照合する', kind: 'case', weight: 0.15, encodings: { checklist: 0.8, memory: 0.9 } },
  { id: 'K15', stageId: 6, text: '顧客が必ず聞く質問に先回りして答えを用意する', kind: 'context', weight: 0.1, encodings: { rule: 0.7, memory: 0.85 } },
];

export const INITIAL_DISCOVERED = ['K02', 'K04', 'K07', 'K13'];

export const knackDef = (id: string): KnackDef => {
  const k = KNACKS.find((x) => x.id === id);
  if (!k) throw new Error(`unknown knack ${id}`);
  return k;
};

export const KNACK_KIND_LABEL: Record<KnackKind, string> = {
  context: '顧客文脈',
  criteria: '判定基準',
  calc: '計算',
  case: '事例',
  sense: '感覚',
};

export interface EncodingDef {
  id: Encoding;
  name: string;
  short: string;
  /** 前提となる部品 */
  requires: { scope: 'stage'; part: 'manual' | 'verifyLoop' | 'toolLink' } | { scope: 'line'; part: 'caseMemory' };
  cost: number;
  weeks: number;
  load: number;
}

export const ENCODINGS: Record<Encoding, EncodingDef> = {
  rule: { id: 'rule', name: 'ルール化', short: 'ルール', requires: { scope: 'stage', part: 'manual' }, cost: 5, weeks: 1, load: 1 },
  checklist: { id: 'checklist', name: 'チェックリスト化', short: 'チェックリスト', requires: { scope: 'stage', part: 'verifyLoop' }, cost: 8, weeks: 1, load: 0 },
  tool: { id: 'tool', name: 'ツール化', short: 'ツール', requires: { scope: 'stage', part: 'toolLink' }, cost: 25, weeks: 2, load: 0 },
  memory: { id: 'memory', name: '事例メモリ化', short: '事例メモリ', requires: { scope: 'line', part: 'caseMemory' }, cost: 10, weeks: 1, load: 2 },
};
