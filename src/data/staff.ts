import type { Difficulty, SlotAssignment, StaffRank } from '../core/types';

export interface RankDef {
  rank: StaffRank;
  label: string;
  salary: number;
  success: Record<Difficulty, number>;
  reviewDetect: number;
}

export const RANKS: Record<StaffRank, RankDef> = {
  veteran: { rank: 'veteran', label: 'ベテラン', salary: 25, success: { low: 0.99, mid: 0.98, high: 0.97 }, reviewDetect: 0.9 },
  mid: { rank: 'mid', label: '中堅', salary: 18, success: { low: 0.98, mid: 0.95, high: 0.9 }, reviewDetect: 0.75 },
  junior: { rank: 'junior', label: '若手', salary: 12, success: { low: 0.96, mid: 0.9, high: 0.8 }, reviewDetect: 0.5 },
};

const w = (stageId: number): SlotAssignment => ({ kind: 'work', stageId });

/** 開始時の配置(合計20コマ。各工程ちょうど週4件) */
export const INITIAL_STAFF: { id: string; name: string; rank: StaffRank; slots: SlotAssignment[] }[] = [
  { id: 'vet', name: '大森(ベテラン)', rank: 'veteran', slots: [w(2), w(2), w(4), w(4), w(6)] },
  { id: 'midA', name: '中村A(中堅)', rank: 'mid', slots: [w(1), w(1), w(2), w(4), w(4)] },
  { id: 'midB', name: '中島B(中堅)', rank: 'mid', slots: [w(3), w(3), w(3), w(5), w(6)] },
  { id: 'jun', name: '若林(若手)', rank: 'junior', slots: [w(3), w(3), w(5), w(5), w(5)] },
];
