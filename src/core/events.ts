import { BALANCE } from '../data/balance';
import { ACCIDENT_TEXTS, eventForWeek } from '../data/events';
import { stageDef } from '../data/stages';
import type { Rng } from './rng';
import type { GameState } from './types';

/** 重大事故の条件:エージェント担当、ツール接続あり、安全柵なし */
export function accidentRiskStages(state: GameState): number[] {
  return state.stages
    .filter((s) => s.assignee.type === 'agent' && s.parts.includes('toolLink') && !s.parts.includes('guardrail'))
    .map((s) => s.id);
}

export interface EventOutcome {
  messages: string[];
  accidents: string[];
}

/** 週の頭のイベント判定。state を直接更新する(simulateWeek 内のクローンに対して呼ぶ) */
export function applyWeekEvents(state: GameState, rng: Rng): EventOutcome {
  const messages: string[] = [];
  const ev = eventForWeek(state.week);
  if (ev) {
    if (ev.id === 'newGen') {
      state.flags.modelGen = 2;
      messages.push(`【${ev.title}】基礎成功率 +${BALANCE.newGenBonus}、単価 −${Math.round((1 - BALANCE.newGenPriceFactor) * 100)}%`);
    } else if (ev.id === 'bigClient') {
      if (state.reputation >= BALANCE.bigClientRep) {
        state.flags.demandBonus = BALANCE.bigClientBonus;
        messages.push(`【${ev.title}】評判${state.reputation.toFixed(1)}で受注獲得!以降の需要 +${BALANCE.bigClientBonus}件`);
      } else {
        messages.push(`【${ev.title}】評判${state.reputation.toFixed(1)}では信用が足りず、見送られた`);
      }
    } else if (ev.id === 'veteranAway') {
      messages.push(`【${ev.title}】ベテランのコマは今週0`);
    } else if (ev.id === 'executive') {
      if (state.flags.executiveTrial) messages.push('【役員の一声】工程4で大モデルを無料で試した');
    } else {
      messages.push(`【${ev.title}】${ev.text}`);
    }
  }
  const accidents: string[] = [];
  for (const id of accidentRiskStages(state)) {
    if (rng.next() < BALANCE.accidentChance) {
      const text = ACCIDENT_TEXTS[Math.floor(rng.next() * ACCIDENT_TEXTS.length)];
      accidents.push(`工程${id}「${stageDef(id).name}」で重大事故:${text}。ラインが1週間停止`);
    }
  }
  return { messages, accidents };
}
