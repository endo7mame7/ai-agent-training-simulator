import { BALANCE } from '../data/balance';
import { INITIAL_DISCOVERED, KNACKS } from '../data/knacks';
import { INITIAL_STAFF } from '../data/staff';
import { STAGES } from '../data/stages';
import type { GameState } from './types';

export function createInitialState(seed: number): GameState {
  const knacks: GameState['knacks'] = {};
  for (const k of KNACKS) knacks[k.id] = { discovered: INITIAL_DISCOVERED.includes(k.id), failCount: 0 };
  return {
    week: 1,
    cash: BALANCE.initialCash,
    reputation: BALANCE.initialReputation,
    seed: seed >>> 0,
    initialSeed: seed >>> 0,
    stages: STAGES.map((s) => ({ id: s.id, assignee: { type: 'human' }, parts: [], carryHours: 0 })),
    knacks,
    staff: INITIAL_STAFF.map((s) => ({ ...s, slots: s.slots.map((x) => ({ ...x })) })),
    lineParts: [],
    devQueue: [],
    cases: [],
    shipped: [],
    history: [],
    flags: {
      executiveTrial: false,
      modelGen: 1,
      demandBonus: 0,
      accidents: 0,
      usedLarge: false,
      gameOver: false,
      finished: false,
    },
    nextCaseNo: 1,
    nextJobNo: 1,
  };
}

export const clone = <T>(v: T): T => structuredClone(v);
