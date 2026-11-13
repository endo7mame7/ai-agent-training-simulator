import type { StageDef } from '../core/types';

export const STAGES: StageDef[] = [
  { id: 1, name: '要求の読み解き', desc: '顧客の要求を設計条件に直す', hours: 4, difficulty: 'mid', toolRequired: false },
  { id: 2, name: '構想設計', desc: '方式とレイアウトを決める', hours: 6, difficulty: 'high', toolRequired: false },
  { id: 3, name: '詳細設計', desc: '3Dモデルを作る', hours: 10, difficulty: 'mid', toolRequired: true, toolName: 'CAD' },
  { id: 4, name: '解析チェック', desc: '強度と騒音を計算で確かめる', hours: 8, difficulty: 'high', toolRequired: true, toolName: '解析ソフト' },
  { id: 5, name: '図面・部品表', desc: '図面と部品表を作る', hours: 8, difficulty: 'low', toolRequired: true, toolName: 'CAD、部品DB' },
  { id: 6, name: '設計レビュー', desc: '全体を点検して出図する', hours: 4, difficulty: 'mid', toolRequired: false },
];

export const stageDef = (id: number): StageDef => {
  const s = STAGES.find((x) => x.id === id);
  if (!s) throw new Error(`unknown stage ${id}`);
  return s;
};

export const DIFFICULTY_LABEL = { low: '低', mid: '中', high: '高' } as const;
