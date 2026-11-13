import { knackDef } from '../data/knacks';
import type { GameState } from './types';

/** 内部タグを画面表示用のラベルに変換する(ログ監視・発見状況に依存) */
export function tagLabel(state: GameState, tag: string): string {
  if (!state.lineParts.includes('logMonitor')) return '原因不明';
  switch (tag) {
    case 'tool':
      return '手段なし';
    case 'context':
      return 'コンテキスト過多';
    case 'model':
      return 'モデルの限界';
    case 'human':
      return '人的ミス';
    default: {
      if (!/^K\d\d$/.test(tag)) return tag;
      knackDef(tag);
      return state.knacks[tag]?.discovered ? `知識不足(${tag})` : '知識不足(未知のカンコツ)';
    }
  }
}
