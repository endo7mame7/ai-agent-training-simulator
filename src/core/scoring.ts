import { BALANCE } from '../data/balance';
import { KNACKS } from '../data/knacks';
import type { GameState } from './types';

export type Rank = 'S' | 'A' | 'B' | 'C';

export function rankFor(cash: number): Rank {
  if (cash >= BALANCE.ranks.S) return 'S';
  if (cash >= BALANCE.ranks.A) return 'A';
  if (cash >= BALANCE.ranks.B) return 'B';
  return 'C';
}

export interface Title {
  id: string;
  name: string;
  desc: string;
}

export function titlesFor(state: GameState): Title[] {
  const out: Title[] = [];
  if (state.flags.gameOver) return out;
  const rank = rankFor(state.cash);
  const aOrBetter = rank === 'S' || rank === 'A';
  if (aOrBetter && !state.flags.usedLarge) out.push({ id: 'giant', name: '小さな巨人', desc: '大モデルを一度も使わずにA以上' });
  if (aOrBetter && state.stages.some((s) => s.assignee.type === 'human'))
    out.push({ id: 'harmony', name: '人機一体', desc: '人が担当する工程を残してA以上' });
  if (state.flags.accidents === 0) out.push({ id: 'safe', name: '無事故', desc: '重大事故ゼロで完走' });
  if (KNACKS.every((k) => state.knacks[k.id].discovered)) out.push({ id: 'doctor', name: 'カンコツ博士', desc: '15個すべてを発見' });
  return out;
}
