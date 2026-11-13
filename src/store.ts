import { create } from 'zustand';
import { missionDef, RULES } from './game/data';
import { advance, createRun, emptyBuild, maxEnergy, pauseRun, preflight, resolveApproval, resumeRun, stopRun, summarize } from './game/engine';
import { applyRun, hireAgent, newSave, progressOf, type RewardResult } from './game/progress';
import { clearGame, loadGame, saveGame } from './game/storage';
import type { Build, RunMode, RunState, RunSummary, SaveData } from './game/types';

export type Tab = 'office' | 'dev' | 'missions' | 'analysis';

export interface ResultView {
  summary: RunSummary;
  reward: RewardResult;
}

interface Store {
  ready: boolean;
  save: SaveData;
  tab: Tab;
  /** 開発画面で編集中の案件 */
  missionId: string;
  build: Build;
  run: RunState | null;
  runOpen: boolean;
  speed: 1 | 2 | 4;
  result: ResultView | null;
  toast: string | null;

  init: () => Promise<void>;
  setTab: (t: Tab) => void;
  openMission: (id: string) => void;
  setBuild: (b: Build) => void;
  startRun: (mode: RunMode) => string | null;
  tick: () => void;
  approve: (d: 'approve' | 'reject') => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRunOpen: (o: boolean) => void;
  setSpeed: (s: 1 | 2 | 4) => void;
  closeResult: () => void;
  hire: (id: string) => void;
  welcome: () => void;
  showToast: (m: string | null) => void;
  resetAll: () => Promise<void>;
}

const persist = (s: SaveData, run: RunState | null) => void saveGame({ ...s, run: run && run.status !== 'done' && run.status !== 'stopped' ? run : undefined });

function buildFor(save: SaveData, id: string): Build {
  const mp = progressOf(save, id);
  if (mp.build) return structuredClone(mp.build);
  const last = Object.values(save.missions).flatMap((m) => (m.build ? [m.build] : []));
  return emptyBuild(missionDef(id), last[0]?.agentId ?? 'ai');
}

export const useGame = create<Store>((set, get) => ({
  ready: false,
  save: newSave(),
  tab: 'office',
  missionId: 'm1',
  build: emptyBuild(missionDef('m1')),
  run: null,
  runOpen: false,
  speed: 1,
  result: null,
  toast: null,

  init: async () => {
    const loaded = (await loadGame()) ?? newSave();
    const run = loaded.run ? { ...loaded.run, status: loaded.run.status === 'running' ? ('paused' as const) : loaded.run.status } : null;
    const { run: _drop, ...save } = loaded;
    void _drop;
    const missionId = run?.missionId ?? 'm1';
    set({ ready: true, save: save as SaveData, run, missionId, build: run ? structuredClone(run.build) : buildFor(save as SaveData, missionId) });
  },
  setTab: (tab) => set({ tab }),
  openMission: (id) => {
    const { save, run } = get();
    if (run && run.missionId !== id && (run.status === 'running' || run.status === 'paused' || run.status === 'awaiting')) {
      set({ toast: '実行中の案件があります。完了または停止してから切り替えてください' });
      return;
    }
    set({ missionId: id, build: buildFor(save, id), tab: 'dev' });
  },
  setBuild: (build) => {
    set({ build });
    const { save, missionId } = get();
    const mp = progressOf(save, missionId);
    const next = { ...save, missions: { ...save.missions, [missionId]: { ...mp, build } } };
    set({ save: next });
    persist(next, get().run);
  },
  startRun: (mode) => {
    const { build, missionId, save, run } = get();
    if (run && (run.status === 'running' || run.status === 'paused' || run.status === 'awaiting')) return '実行中の案件があります';
    const mission = missionDef(missionId);
    const agent = save.agents.find((a) => a.id === build.agentId) ?? save.agents[0];
    const check = preflight(mission, build, maxEnergy(mission, agent.id, agent.level));
    if (check.errors.length) return check.errors[0];
    const r = createRun(missionId, build, mode, Math.floor(Math.random() * 2 ** 31));
    set({ run: r, runOpen: true, result: null });
    persist(save, r);
    return null;
  },
  tick: () => {
    const { run, save } = get();
    if (!run || run.status !== 'running') return;
    const next = advance(run);
    set({ run: next });
    if (next.status === 'done') finish(next);
    else if (next.cur !== run.cur || next.status === 'awaiting') persist(save, next);
  },
  approve: (d) => {
    const { run, save } = get();
    if (!run) return;
    const next = resolveApproval(run, d);
    set({ run: next });
    if (next.status === 'done') finish(next);
    else persist(save, next);
  },
  pause: () => {
    const r = get().run;
    if (r) set({ run: pauseRun(r) });
  },
  resume: () => {
    const r = get().run;
    if (r) set({ run: resumeRun(r) });
  },
  stop: () => {
    const r = get().run;
    if (!r) return;
    const stopped = stopRun(r);
    set({ run: stopped });
    finish(stopped);
  },
  setRunOpen: (runOpen) => set({ runOpen }),
  setSpeed: (speed) => set({ speed }),
  closeResult: () => set({ result: null, runOpen: false, run: null }),
  hire: (id) => {
    const r = hireAgent(get().save, id);
    if (typeof r === 'string') return set({ toast: r });
    set({ save: r, toast: '新しいエージェントが加わりました' });
    persist(r, get().run);
  },
  welcome: () => {
    const save = { ...get().save, welcomed: true };
    set({ save });
    persist(save, get().run);
  },
  showToast: (toast) => set({ toast }),
  resetAll: async () => {
    await clearGame();
    const s = newSave();
    set({ save: s, run: null, runOpen: false, result: null, missionId: 'm1', build: emptyBuild(missionDef('m1')), tab: 'office' });
  },
}));

function finish(run: RunState) {
  const { save } = useGame.getState();
  const summary = summarize(run);
  const reward = applyRun(save, summary);
  useGame.setState({ save: reward.save, result: { summary, reward } });
  persist(reward.save, null);
}

export const APPROVAL_SECONDS = RULES.approvalSeconds;
