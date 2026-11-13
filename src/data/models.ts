import type { Difficulty, ModelTier } from '../core/types';

export interface ModelDef {
  tier: ModelTier;
  name: string;
  base: Record<Difficulty, number>;
  contextCap: number;
  /** 万円 / 処理単位 */
  unitPrice: number;
}

export const MODELS: Record<ModelTier, ModelDef> = {
  small: { tier: 'small', name: '小モデル', base: { low: 0.9, mid: 0.8, high: 0.65 }, contextCap: 3, unitPrice: 0.02 },
  medium: { tier: 'medium', name: '中モデル', base: { low: 0.95, mid: 0.88, high: 0.78 }, contextCap: 5, unitPrice: 0.1 },
  large: { tier: 'large', name: '大モデル', base: { low: 0.98, mid: 0.94, high: 0.88 }, contextCap: 8, unitPrice: 0.5 },
};

export const TIER_ORDER: ModelTier[] = ['small', 'medium', 'large'];
export const TIER_SHORT: Record<ModelTier, string> = { small: '小', medium: '中', large: '大' };
