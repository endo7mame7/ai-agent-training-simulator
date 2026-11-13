export type ModelTier = 'small' | 'medium' | 'large';
export type Difficulty = 'low' | 'mid' | 'high';
export type Encoding = 'rule' | 'checklist' | 'tool' | 'memory';
export type StagePart = 'manual' | 'toolLink' | 'verifyLoop' | 'approvalGate' | 'guardrail';
export type LinePart = 'caseMemory' | 'logMonitor' | 'evalBench';
export type StaffRank = 'veteran' | 'mid' | 'junior';
export type KnackKind = 'context' | 'criteria' | 'calc' | 'case' | 'sense';

export interface StageDef {
  id: number;
  name: string;
  desc: string;
  hours: number;
  difficulty: Difficulty;
  toolRequired: boolean;
  toolName?: string;
}

export interface KnackDef {
  id: string;
  stageId: number;
  text: string;
  kind: KnackKind;
  weight: number;
  encodings: Partial<Record<Encoding, number>>;
}

export type Assignee = { type: 'human' } | { type: 'agent'; tier: ModelTier };

export interface StageState {
  id: number;
  assignee: Assignee;
  parts: StagePart[];
  /** 人の繰り越し時間 */
  carryHours: number;
}

export interface KnackState {
  discovered: boolean;
  encoding?: Encoding;
  failCount: number;
}

export type SlotAssignment =
  | { kind: 'work'; stageId: number }
  | { kind: 'review'; stageId: number }
  | { kind: 'interview'; stageId: number }
  | { kind: 'idle' };

export interface StaffState {
  id: string;
  name: string;
  rank: StaffRank;
  slots: SlotAssignment[];
}

export type DevJob =
  | { id: string; kind: 'stagePart'; stageId: number; part: StagePart; weeksLeft: number; cost: number; startedWeek: number }
  | { id: string; kind: 'linePart'; part: LinePart; weeksLeft: number; cost: number; startedWeek: number }
  | { id: string; kind: 'encoding'; knackId: string; encoding: Encoding; weeksLeft: number; cost: number; startedWeek: number }
  | { id: string; kind: 'logAnalysis'; stageId: number; weeksLeft: number; cost: number; startedWeek: number };

export interface Defect {
  stageId: number;
  /** 内部タグ(カンコツID / 'tool' / 'context' / 'model' / 'human') */
  tag: string;
}

export interface CaseState {
  id: string;
  acceptedWeek: number;
  /** いま待っている工程のインデックス(0〜5) */
  stageIndex: number;
  defects: Defect[];
  /** 工程6で差し戻され、やり直し待ちの工程ID(昇順) */
  rework: number[];
}

export interface ShippedRecord {
  caseId: string;
  week: number;
  revenue: number;
  hasDefect: boolean;
  defectTags: string[];
}

export interface StageWeekStats {
  stageId: number;
  processed: number;
  attempts: number;
  attemptSuccesses: number;
  /** 前工程から引き継いだ潜在不良を含まない、この工程での不良発生数 */
  defectsMade: number;
  backlogAfter: number;
  capacity: number;
  tokens: number;
  assignee: Assignee;
}

export interface FailureRecord {
  stageId: number;
  /** 画面表示用のタグ */
  label: string;
  caught: 'verify' | 'gate' | 'none';
}

export interface CaseTrace {
  caseId: string;
  fromIndex: number;
  toIndex: number;
  shipped: boolean;
  newCase: boolean;
  reworkTo?: number;
  stamps: { stageId: number; label: string }[];
}

export interface WeekReport {
  week: number;
  revenue: number;
  refunds: number;
  salaries: number;
  fixedCost: number;
  tokens: number;
  devCost: number;
  accidentCost: number;
  profit: number;
  cashAfter: number;
  repBefore: number;
  repAfter: number;
  demand: number;
  accepted: number;
  refused: number;
  shipped: number;
  shippedOnTime: number;
  shippedLate: number;
  outflows: { caseId: string; labels: string[]; penalty: number }[];
  failures: FailureRecord[];
  reviewCatches: { stageId: number; label: string }[];
  stageStats: StageWeekStats[];
  events: string[];
  discoveries: string[];
  completedDev: string[];
  accidents: string[];
  lineStopped: boolean;
  traces: CaseTrace[];
  logs: string[];
}

export interface GameFlags {
  /** 第1週の役員の一声を受けたか */
  executiveTrial: boolean;
  trialPrevAssignee?: Assignee;
  modelGen: number;
  demandBonus: number;
  accidents: number;
  usedLarge: boolean;
  gameOver: boolean;
  finished: boolean;
}

export interface GameState {
  week: number;
  cash: number;
  reputation: number;
  seed: number;
  initialSeed: number;
  stages: StageState[];
  knacks: Record<string, KnackState>;
  staff: StaffState[];
  lineParts: LinePart[];
  devQueue: DevJob[];
  cases: CaseState[];
  shipped: ShippedRecord[];
  history: WeekReport[];
  flags: GameFlags;
  nextCaseNo: number;
  nextJobNo: number;
}
