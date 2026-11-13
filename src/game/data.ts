import type { CardId, MissionDef, Tier, TroubleId } from './types';

export type Hue = 'blue' | 'violet' | 'amber' | 'green' | 'rose' | 'teal' | 'slate';

export interface CardDef {
  id: CardId;
  name: string;
  en: string;
  cost: number;
  scope: 'step' | 'common';
  desc: string;
  hue: Hue;
}

export const CARDS: Record<CardId, CardDef> = {
  tool: { id: 'tool', name: 'ツール', en: 'Tool', cost: 2, scope: 'step', desc: 'DBやメールなど外部システムを操作できるようにする', hue: 'blue' },
  validate: { id: 'validate', name: 'チェック', en: 'Validation', cost: 2, scope: 'step', desc: '出力を検証し、誤りを見つけて直す(75%)', hue: 'violet' },
  retry: { id: 'retry', name: 'リトライ', en: 'Retry', cost: 1, scope: 'step', desc: 'タイムアウトしても再実行する(90%)', hue: 'amber' },
  guard: { id: 'guard', name: 'ガード', en: 'Guardrail', cost: 1, scope: 'step', desc: '重複送信や危険な操作をブロックする', hue: 'green' },
  human: { id: 'human', name: '人の承認', en: 'Human-in-the-loop', cost: 1, scope: 'step', desc: '確信が持てないとき、あなたに判断を仰ぐ', hue: 'rose' },
  memory: { id: 'memory', name: 'メモリ', en: 'Memory', cost: 2, scope: 'common', desc: '過去のやりとりを参照する。推論ミスが半減', hue: 'teal' },
  log: { id: 'log', name: 'ログ', en: 'Logging', cost: 1, scope: 'common', desc: '失敗の原因を記録し、分析できるようにする', hue: 'slate' },
};

export const CARD_ORDER: CardId[] = ['tool', 'validate', 'retry', 'guard', 'human', 'memory', 'log'];

export interface TierDef {
  id: Tier;
  name: string;
  short: string;
  energy: number;
  /** 1回考えるごとのコイン */
  price: number;
  /** 考えるミスの起きやすさ */
  mult: number;
  desc: string;
}

export const TIERS: Record<Tier, TierDef> = {
  small: { id: 'small', name: 'ミニLLM', short: 'ミニ', energy: 0, price: 1, mult: 1.6, desc: '低コスト。単純な誤りがやや多い' },
  medium: { id: 'medium', name: 'ミドルLLM', short: 'ミドル', energy: 2, price: 3, mult: 1.0, desc: '性能とコストのバランス型' },
  large: { id: 'large', name: 'ビッグLLM', short: 'ビッグ', energy: 4, price: 8, mult: 0.55, desc: '高精度。ただし高コスト' },
};

export const TIER_ORDER: Tier[] = ['small', 'medium', 'large'];

export interface TroubleDef {
  id: TroubleId;
  name: string;
  /** LLMの賢さで起きやすさが変わるか */
  llm: boolean;
  fix: string;
}

export const TROUBLES: Record<TroubleId, TroubleDef> = {
  wrong: { id: 'wrong', name: '誤った回答', llm: true, fix: '「回答作成」にチェック、またはライン全体にメモリ' },
  nolookup: { id: 'nolookup', name: '顧客情報の未参照', llm: false, fix: '「顧客検索」にツール' },
  timeout: { id: 'timeout', name: 'タイムアウト', llm: false, fix: '該当工程にリトライ' },
  duplicate: { id: 'duplicate', name: '重複送信', llm: false, fix: '「メール送信」にガード(リトライと併用時は必須)' },
  missing: { id: 'missing', name: '情報不足', llm: false, fix: '「内容を理解」に人の承認' },
  misclass: { id: 'misclass', name: '分類ミス', llm: true, fix: 'チェック、またはメモリ' },
};

export const RULES = {
  validateFix: 0.75,
  retryFix: 0.9,
  retryDuplicate: 0.3,
  noToolLookup: 0.6,
  memoryFactor: { wrong: 0.5, misclass: 0.5, missing: 0.6 } as Partial<Record<TroubleId, number>>,
  askWhenBad: 0.85,
  askWhenOk: 0.08,
  missendPenalty: 20,
  starBonus: 50,
  testEmails: 5,
  approvalSeconds: 8,
  commonSlots: 2,
  stepSlots: 2,
};

const S = {
  inbox: (t = {}): MissionDef['steps'][number] => ({ id: 'inbox', name: 'メール受信', llm: false, troubles: t }),
  read: (t = {}): MissionDef['steps'][number] => ({ id: 'read', name: '内容を理解', llm: true, troubles: t }),
  lookup: (t = {}): MissionDef['steps'][number] => ({ id: 'lookup', name: '顧客検索', llm: true, needsTool: true, troubles: t }),
  draft: (t = {}): MissionDef['steps'][number] => ({ id: 'draft', name: '回答作成', llm: true, troubles: t }),
  send: (t = {}): MissionDef['steps'][number] => ({ id: 'send', name: 'メール送信', llm: false, sends: true, troubles: t }),
};

export const MISSIONS: MissionDef[] = [
  {
    id: 'm1', no: 1, title: '最初の自動返信', client: 'ベーカリー KOMUGI', icon: 'croissant',
    request: '店舗へのお問い合わせメールに、AIで返信できるようにしたいと考えています。',
    hint: 'ミニLLMは単純な誤りが出やすい。出力を検証する仕組みがあれば十分に戦えます。',
    steps: [S.inbox(), S.draft({ wrong: 0.25 }), S.send()],
    emails: 12, energy: 3, budget: 20, reward: 120, goals: { accuracy: 0.8, auto: 0.8 }, newCards: ['validate'], mentor: true,
  },
  {
    id: 'm2', no: 2, title: '顧客情報をふまえた回答', client: '雑貨店 KOTORI', icon: 'bird',
    request: '常連のお客さまには、購入履歴をふまえた返信をしたいんです。',
    hint: '「顧客検索」は、ツールがなければDBを参照できません。',
    steps: [S.inbox(), S.lookup(), S.draft({ wrong: 0.2 }), S.send()],
    emails: 15, energy: 5, budget: 40, reward: 180, goals: { accuracy: 0.85, auto: 0.85 }, newCards: ['tool'], mentor: true,
  },
  {
    id: 'm3', no: 3, title: '不安定なAPI', client: 'SORAIRO トラベル', icon: 'plane',
    request: '基幹システムがときどき応答しなくなります。それでも全件に返信したい。',
    hint: 'リトライは有効。ただし送信工程で再実行すると、二重送信のリスクがあります。',
    steps: [S.inbox({ timeout: 0.15 }), S.lookup({ timeout: 0.1 }), S.draft({ wrong: 0.15 }), S.send({ timeout: 0.2 })],
    emails: 20, energy: 9, budget: 70, reward: 260, goals: { accuracy: 0.85, auto: 0.85 }, newCards: ['retry', 'guard'], mentor: true,
  },
  {
    id: 'm4', no: 4, title: '情報が欠けた問い合わせ', client: 'PIKA 電機', icon: 'plug',
    request: '注文番号のないメールが多く、AIが推測で回答してしまわないか心配です。',
    hint: '情報不足はAIだけでは解決できません。人の承認で、あなたが判断を引き受けましょう。',
    steps: [S.inbox(), S.read({ missing: 0.25, misclass: 0.08 }), S.lookup(), S.draft({ wrong: 0.12 }), S.send()],
    emails: 16, energy: 8, budget: 80, reward: 300, goals: { accuracy: 0.85, auto: 0.6 }, newCards: ['human'], mentor: true,
  },
  {
    id: 'm5', no: 5, title: '原因不明の品質低下', client: 'MAMORU 保険', icon: 'umbrella',
    request: '複数の不具合が起きているようですが、何が原因なのか分かりません。',
    hint: 'ここから先輩のフォローはありません。ログがなければ、失敗の原因は見えません。',
    steps: [S.inbox({ timeout: 0.1 }), S.read({ misclass: 0.12, missing: 0.1 }), S.lookup({ timeout: 0.1 }), S.draft({ wrong: 0.2 }), S.send({ timeout: 0.1, duplicate: 0.05 })],
    emails: 20, energy: 12, budget: 110, reward: 380, goals: { accuracy: 0.85, auto: 0.7 }, newCards: ['memory', 'log'], mentor: false,
  },
  {
    id: 'm6', no: 6, title: '1日100件の本番運用', client: 'MARUTTO マート', icon: 'cart',
    request: '1日100件のお問い合わせを、正答率93%・誤送信ゼロで処理してください。',
    hint: 'これまでのカードを総動員。段取りポイントの配分が鍵です。',
    steps: [S.inbox({ timeout: 0.08 }), S.read({ misclass: 0.1, missing: 0.06 }), S.lookup({ timeout: 0.08 }), S.draft({ wrong: 0.2 }), S.send({ timeout: 0.1, duplicate: 0.04 })],
    emails: 100, energy: 15, budget: 500, reward: 1200, goals: { accuracy: 0.93, auto: 0.75 }, newCards: [], mentor: false,
  },
];

export const missionDef = (id: string): MissionDef => {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) throw new Error(`unknown mission ${id}`);
  return m;
};

/** そのミッションで使えるカード(それまでに登場したもの) */
export function cardsFor(mission: MissionDef): CardId[] {
  const set = new Set<CardId>();
  for (const m of MISSIONS) {
    if (m.no > mission.no) break;
    m.newCards.forEach((c) => set.add(c));
  }
  return CARD_ORDER.filter((c) => set.has(c));
}

export interface AgentDef {
  id: string;
  name: string;
  color: string;
  accent: string;
  perk: string;
  perkDesc: string;
  hireCost: number;
}

export const AGENTS: AgentDef[] = [
  { id: 'ai', name: 'AI-01', color: '#c9c2f5', accent: '#6b5fd3', perk: '成長型', perkDesc: '経験値 1.2倍', hireCost: 0 },
  { id: 'bell', name: 'BELL', color: '#bfe3d3', accent: '#3c8f6e', perk: '段取り上手', perkDesc: '段取りポイント +1', hireCost: 300 },
  { id: 'koro', name: 'KORO', color: '#f6dfae', accent: '#b9852b', perk: '倹約家', perkDesc: '運用コスト −25%', hireCost: 700 },
];

export const agentDef = (id: string) => AGENTS.find((a) => a.id === id) ?? AGENTS[0];

/** レベルごとの必要経験値(累計) */
export const LEVEL_EXP = [0, 60, 160, 320, 560];
export const MAX_LEVEL = LEVEL_EXP.length;

/** メールの文面(承認ミニゲーム用) */
export interface EmailTemplate {
  from: string;
  subject: string;
  body: string;
  good: string;
}

export const EMAILS: EmailTemplate[] = [
  { from: '山田さま', subject: '営業時間について', body: '日曜日は何時まで開いていますか?', good: '日曜日は18時まで営業しております。' },
  { from: '佐藤さま', subject: '返品したいです', body: '先週買った商品を返品できますか?', good: 'ご購入から30日以内でしたら返品を承ります。お手数ですが…' },
  { from: '鈴木さま', subject: '配送はいつ?', body: '注文した品はいつ届きますか?注文番号 A-1024 です', good: 'ご注文 A-1024 は明日お届け予定です。' },
  { from: '高橋さま', subject: 'ポイントの使い方', body: 'たまったポイントはどう使えますか?', good: 'お会計のときに1ポイント=1円でご利用いただけます。' },
  { from: '田中さま', subject: '予約の変更', body: '来週の予約を1日ずらせますか?', good: '承知しました。ご予約を翌日に変更いたしました。' },
  { from: '伊藤さま', subject: '支払い方法', body: 'クレジットカードは使えますか?', good: 'はい、主要なクレジットカードをご利用いただけます。' },
  { from: '渡辺さま', subject: '在庫について', body: '青色のマグカップはまだありますか?', good: '青色のマグカップは在庫がございます。' },
  { from: '中村さま', subject: '領収書がほしい', body: '先月の注文の領収書を発行できますか?', good: 'マイページから領収書をダウンロードいただけます。' },
];

/** トラブルが起きたときの回答案(ダメな例) */
export const BAD_DRAFTS: Record<TroubleId, (t: EmailTemplate) => { draft: string; note: string }> = {
  wrong: () => ({ draft: 'はい、ご購入から365日いつでも全額返金いたします!', note: '社内ルールとの整合性は?' }),
  misclass: (t) => ({ draft: `【クレーム対応】このたびは大変申し訳ございません。${t.from}のお怒りはごもっともで…`, note: 'ふつうの質問を「クレーム」と分類しています' }),
  nolookup: () => ({ draft: '(お名前不明)さま、ご注文の件は確認できませんでしたが、たぶん大丈夫です!', note: '顧客情報を見ていません' }),
  missing: () => ({ draft: 'ご注文番号 ?????? の商品は、おそらく明日届くと思われます。', note: '注文番号が書かれていないのに推測しています' }),
  timeout: () => ({ draft: '(送信がタイムアウトしました。もう一度送りますか?)', note: '同じメールがもう送られているかも' }),
  duplicate: (t) => ({ draft: `${t.good}(※同じメールをもう一度送信します)`, note: 'すでに送ったメールと同じ内容です' }),
};
