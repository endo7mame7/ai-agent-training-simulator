import type { Assignee, GameState } from '../core/types';
import { MODELS, TIER_SHORT } from '../data/models';

export const man = (v: number, digits = 0) => `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('ja-JP', { maximumFractionDigits: digits, minimumFractionDigits: digits })}万円`;
export const signedMan = (v: number, digits = 0) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toLocaleString('ja-JP', { maximumFractionDigits: digits, minimumFractionDigits: digits })}万円`;
export const pct = (v: number) => `${Math.round(v * 100)}%`;

export const assigneeLabel = (a: Assignee) => (a.type === 'human' ? '人' : MODELS[a.tier].name);
export const assigneeIcon = (a: Assignee) => (a.type === 'human' ? '👤' : '🤖');
export const assigneeBadge = (a: Assignee) => (a.type === 'human' ? '人' : TIER_SHORT[a.tier]);

export const hasBench = (s: GameState) => s.lineParts.includes('evalBench');
export const hasLog = (s: GameState) => s.lineParts.includes('logMonitor');

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');
