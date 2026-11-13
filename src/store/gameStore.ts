import { create } from 'zustand';
import type { ActionResult } from '../core/actions';
import { createInitialState } from '../core/init';
import { simulateWeek } from '../core/simulateWeek';
import type { GameState, WeekReport } from '../core/types';

const SAVE_KEY = 'harness-works-save-v1';

export type Screen = 'title' | 'main' | 'staff' | 'knacks' | 'report' | 'result';

interface SaveData {
  version: 1;
  state: GameState;
}

function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    return data.version === 1 ? data.state : null;
  } catch {
    return null;
  }
}

function writeSave(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, state } satisfies SaveData));
  } catch {
    /* 保存できなくても遊べる */
  }
}

interface Store {
  game: GameState | null;
  /** 計画フェーズ開始時点の状態(やり直し用) */
  turnStart: GameState | null;
  screen: Screen;
  selectedStage: number | null;
  /** 実行演出中のレポート */
  playing: WeekReport | null;
  viewReportWeek: number | null;
  message: string | null;
  hasSave: boolean;
  howToOpen: boolean;

  newGame: (seed?: number) => void;
  continueGame: () => void;
  apply: (fn: (s: GameState) => ActionResult) => boolean;
  resetPlan: () => void;
  executeWeek: () => void;
  finishPlayback: () => void;
  setScreen: (s: Screen) => void;
  selectStage: (id: number | null) => void;
  openReport: (week: number) => void;
  setMessage: (m: string | null) => void;
  setHowTo: (open: boolean) => void;
  toTitle: () => void;
}

export const useGame = create<Store>((set, get) => ({
  game: null,
  turnStart: null,
  screen: 'title',
  selectedStage: null,
  playing: null,
  viewReportWeek: null,
  message: null,
  hasSave: loadSave() !== null,
  howToOpen: false,

  newGame: (seed) => {
    const s = createInitialState(seed ?? Math.floor(Math.random() * 2 ** 31));
    writeSave(s);
    set({ game: s, turnStart: s, screen: 'main', selectedStage: null, hasSave: true, message: null });
  },
  continueGame: () => {
    const s = loadSave();
    if (!s) return;
    const done = s.flags.finished || s.flags.gameOver;
    set({ game: s, turnStart: s, screen: done ? 'result' : 'main', selectedStage: null, message: null });
  },
  apply: (fn) => {
    const g = get().game;
    if (!g) return false;
    const r = fn(g);
    if (r.ok) {
      set({ game: r.state, message: null });
      return true;
    }
    set({ message: r.reason });
    return false;
  },
  resetPlan: () => set({ game: get().turnStart, message: '計画を今週のはじめに戻しました' }),
  executeWeek: () => {
    const g = get().game;
    if (!g || g.flags.finished || g.flags.gameOver) return;
    const { state, report } = simulateWeek(g);
    writeSave(state);
    set({ game: state, turnStart: state, playing: report, selectedStage: null, message: null });
  },
  finishPlayback: () => {
    const { playing, game } = get();
    if (!playing || !game) return;
    set({ playing: null, screen: 'report', viewReportWeek: playing.week });
  },
  setScreen: (screen) => set({ screen, selectedStage: null }),
  selectStage: (id) => set({ selectedStage: id }),
  openReport: (week) => set({ screen: 'report', viewReportWeek: week }),
  setMessage: (message) => set({ message }),
  setHowTo: (howToOpen) => set({ howToOpen }),
  toTitle: () => set({ screen: 'title', hasSave: loadSave() !== null, selectedStage: null }),
}));
