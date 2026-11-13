export type CardId = 'tool' | 'validate' | 'retry' | 'guard' | 'human' | 'memory' | 'log';
export type TroubleId = 'wrong' | 'nolookup' | 'timeout' | 'duplicate' | 'missing' | 'misclass';
export type Tier = 'small' | 'medium' | 'large';
export type Outcome = 'ok' | 'okHuman' | 'wrong' | 'missend' | 'dropped';
export type RunMode = 'test' | 'real';

export interface StepDef {
  id: string;
  name: string;
  /** LLM が考える工程(トークン代がかかる) */
  llm: boolean;
  /** ツールがないとうまくできない工程 */
  needsTool?: boolean;
  /** 外部に送る工程(リトライで重複送信が起きうる) */
  sends?: boolean;
  troubles: Partial<Record<TroubleId, number>>;
}

export interface MissionDef {
  id: string;
  no: number;
  title: string;
  client: string;
  /** 依頼主のアイコン */
  icon: 'croissant' | 'bird' | 'plane' | 'plug' | 'umbrella' | 'cart';
  request: string;
  hint: string;
  steps: StepDef[];
  emails: number;
  energy: number;
  /** 運用コストの予算(コイン) */
  budget: number;
  reward: number;
  goals: { accuracy: number; auto: number };
  /** このミッションで新しく使えるようになるカード */
  newCards: CardId[];
  /** 先輩が原因を教えてくれる(ログなしでも原因が見える) */
  mentor: boolean;
}

export interface Build {
  tier: Tier;
  /** stepId → カード(1工程2枚まで) */
  slots: Record<string, (CardId | null)[]>;
  /** ライン全体のスロット */
  common: (CardId | null)[];
  agentId: string;
}

export interface LogEntry {
  n: number;
  email: number;
  step: number;
  kind: 'ok' | 'trouble' | 'fixed' | 'retry' | 'blocked' | 'ask' | 'human' | 'drop' | 'missend' | 'done';
  trouble?: TroubleId;
  outcome?: Outcome;
}

export interface Approval {
  email: number;
  step: number;
  bad: boolean;
  trouble?: TroubleId;
  template: number;
}

export interface EmailState {
  index: number;
  template: number;
  errors: TroubleId[];
  human: boolean;
  dropped: boolean;
  missend: boolean;
}

export type RunStatus = 'running' | 'paused' | 'awaiting' | 'done' | 'stopped';

export interface RunState {
  missionId: string;
  mode: RunMode;
  build: Build;
  seed: number;
  rng: number;
  total: number;
  /** いま処理中のメール */
  cur: number;
  stepIdx: number;
  email: EmailState;
  status: RunStatus;
  pending?: Approval;
  log: LogEntry[];
  logCount: number;
  cost: number;
  outcomes: Record<Outcome, number>;
  causes: Partial<Record<TroubleId, number>>;
  asks: number;
}

export interface RunSummary {
  at: number;
  missionId: string;
  mode: RunMode;
  total: number;
  outcomes: Record<Outcome, number>;
  accuracy: number;
  auto: number;
  cost: number;
  stars: number;
  causes: Partial<Record<TroubleId, number>>;
  causesVisible: boolean;
  build: Build;
  earned: number;
}

export interface AgentState {
  id: string;
  level: number;
  exp: number;
}

export interface MissionProgress {
  stars: number;
  cleared: boolean;
  runs: RunSummary[];
  build?: Build;
}

export interface SaveData {
  v: 1;
  coins: number;
  missions: Record<string, MissionProgress>;
  agents: AgentState[];
  welcomed: boolean;
  /** 実行中の案件(再起動しても続きから) */
  run?: RunState;
}
