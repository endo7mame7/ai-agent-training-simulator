/** バランス調整用の数値はすべてここに集約する(金額は万円) */
export const BALANCE = {
  totalWeeks: 24,
  initialCash: 300,
  initialReputation: 60,
  gameOverCash: -100,

  caseRevenue: 47,
  fixedCostPerWeek: 33,
  outflowPenalty: 20,
  accidentCost: 30,
  accidentChance: 0.03,

  hoursPerSlot: 8,
  slotsPerStaff: 5,
  reviewCasesPerSlot: 8,
  agentCapacityPerWeek: 20,
  maxConcurrentDev: 2,
  logAnalysisCost: 5,
  logAnalysisWeeks: 1,

  noToolFactor: 0.5,
  contextPenaltyBase: 0.92,
  minSuccess: 0.05,
  maxSuccess: 0.99,
  verifyDetect: 0.6,
  verifyMaxRetries: 2,
  finalReviewDetect: 0.9,
  tokenLoadFactor: 0.15,

  demandDivisor: 10,
  demandMax: 10,
  /** 受注残(未出図)の上限。これを超える分は受注を断る */
  backlogLimit: 12,
  dueWeeks: 4,
  latePenaltyPerWeek: 0.2,
  lateFloor: 0.4,
  outflowDelayWeeks: 2,

  repOnTime: 0.8,
  repLate: -1,
  repOutflow: -5,
  repRefuse: -0.5,

  autoDiscoverFails: 3,

  newGenBonus: 0.03,
  newGenPriceFactor: 0.7,
  bigClientRep: 70,
  bigClientBonus: 2,

  ranks: { S: 3000, A: 2000, B: 1100 },
} as const;
