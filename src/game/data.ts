import type { CardId, MissionDef, Tier, TroubleId } from './types';

export interface CardDef {
  id: CardId;
  name: string;
  en: string;
  emoji: string;
  cost: number;
  scope: 'step' | 'common';
  desc: string;
  color: string;
}

export const CARDS: Record<CardId, CardDef> = {
  tool: { id: 'tool', name: 'ツール', en: 'Tool', emoji: '🔧', cost: 2, scope: 'step', desc: 'DBやメールを操作できるようになる', color: 'bg-sky-100 border-sky-300' },
  validate: { id: 'validate', name: 'チェック', en: 'Validation', emoji: '🔍', cost: 2, scope: 'step', desc: 'できた答えを見直して、まちがいを直す(75%)', color: 'bg-violet-100 border-violet-300' },
  retry: { id: 'retry', name: 'リトライ', en: 'Retry', emoji: '🔁', cost: 1, scope: 'step', desc: 'タイムアウトしても、もう一回やる(90%)', color: 'bg-amber-100 border-amber-300' },
  guard: { id: 'guard', name: 'ガード', en: 'Guardrail', emoji: '🛡️', cost: 1, scope: 'step', desc: '重複送信や危ない操作をブロックする', color: 'bg-emerald-100 border-emerald-300' },
  human: { id: 'human', name: '人の承認', en: 'Human-in-the-loop', emoji: '🙋', cost: 1, scope: 'step', desc: '自信がないとき、あなたに確認をお願いする', color: 'bg-pink-100 border-pink-300' },
  memory: { id: 'memory', name: 'メモリ', en: 'Memory', emoji: '🧠', cost: 2, scope: 'common', desc: '過去のやりとりを覚えておく。考えるミスが半分に', color: 'bg-rose-100 border-rose-300' },
  log: { id: 'log', name: 'ログ', en: 'Logging', emoji: '📊', cost: 1, scope: 'common', desc: '失敗の原因が分かるようになる', color: 'bg-teal-100 border-teal-300' },
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
  small: { id: 'small', name: 'ミニLLM', short: 'ミニ', energy: 0, price: 1, mult: 1.6, desc: '安い!でもちょっとうっかり' },
  medium: { id: 'medium', name: 'ミドルLLM', short: 'ミドル', energy: 2, price: 3, mult: 1.0, desc: 'ふつうに賢い' },
  large: { id: 'large', name: 'ビッグLLM', short: 'ビッグ', energy: 4, price: 8, mult: 0.55, desc: 'とても賢い。でもお高い' },
};

export const TIER_ORDER: Tier[] = ['small', 'medium', 'large'];

export interface TroubleDef {
  id: TroubleId;
  name: string;
  emoji: string;
  /** LLMの賢さで起きやすさが変わるか */
  llm: boolean;
  fix: string;
}

export const TROUBLES: Record<TroubleId, TroubleDef> = {
  wrong: { id: 'wrong', name: 'まちがった回答', emoji: '😵', llm: true, fix: '🔍チェックを「回答作成」に置くか、🧠メモリを使ってみよう' },
  nolookup: { id: 'nolookup', name: '顧客情報を見ずに回答', emoji: '🙈', llm: false, fix: '🔧ツールを「顧客検索」に置こう' },
  timeout: { id: 'timeout', name: 'タイムアウト', emoji: '⏰', llm: false, fix: '🔁リトライを置いてみよう' },
  duplicate: { id: 'duplicate', name: '重複送信', emoji: '📨', llm: false, fix: '🛡️ガードを「送信」に置こう(リトライと一緒だと特に)' },
  missing: { id: 'missing', name: '情報が足りない', emoji: '❓', llm: false, fix: '🙋人の承認で、あなたが確認しよう' },
  misclass: { id: 'misclass', name: '分類ミス', emoji: '🏷️', llm: true, fix: '🔍チェックや🧠メモリが効くよ' },
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
  inbox: (t = {}): MissionDef['steps'][number] => ({ id: 'inbox', name: 'メール受信', emoji: '📥', llm: false, troubles: t }),
  read: (t = {}): MissionDef['steps'][number] => ({ id: 'read', name: '内容を理解', emoji: '🧩', llm: true, troubles: t }),
  lookup: (t = {}): MissionDef['steps'][number] => ({ id: 'lookup', name: '顧客検索', emoji: '🔎', llm: true, needsTool: true, troubles: t }),
  draft: (t = {}): MissionDef['steps'][number] => ({ id: 'draft', name: '回答作成', emoji: '✍️', llm: true, troubles: t }),
  send: (t = {}): MissionDef['steps'][number] => ({ id: 'send', name: 'メール送信', emoji: '📤', llm: false, sends: true, troubles: t }),
};

export const MISSIONS: MissionDef[] = [
  {
    id: 'm1', no: 1, title: 'はじめてのお返事', client: 'パン屋 こむぎ堂', clientEmoji: '🥐',
    request: 'お店へのお問い合わせメールに、AIでお返事してほしいの!',
    hint: 'ミニLLMはときどきまちがえる。🔍チェックで見直しさせよう',
    steps: [S.inbox(), S.draft({ wrong: 0.25 }), S.send()],
    emails: 12, energy: 3, budget: 20, reward: 120, goals: { accuracy: 0.8, auto: 0.8 }, newCards: ['validate'], mentor: true,
  },
  {
    id: 'm2', no: 2, title: 'お客さまを調べてから', client: '雑貨店 ことり舎', clientEmoji: '🐤',
    request: '常連さんには、注文履歴をふまえてお返事したいんです',
    hint: '「顧客検索」は🔧ツールがないとDBを見られないよ',
    steps: [S.inbox(), S.lookup(), S.draft({ wrong: 0.2 }), S.send()],
    emails: 15, energy: 5, budget: 40, reward: 180, goals: { accuracy: 0.85, auto: 0.85 }, newCards: ['tool'], mentor: true,
  },
  {
    id: 'm3', no: 3, title: 'APIがよく止まる日', client: '旅行会社 そらいろツアー', clientEmoji: '✈️',
    request: 'うちのシステム、ときどき固まるんです…。それでも全部お返事したい!',
    hint: '🔁リトライは便利。でも送信でリトライすると、二重に送っちゃうかも?',
    steps: [S.inbox({ timeout: 0.15 }), S.lookup({ timeout: 0.1 }), S.draft({ wrong: 0.15 }), S.send({ timeout: 0.2 })],
    emails: 20, energy: 9, budget: 70, reward: 260, goals: { accuracy: 0.85, auto: 0.85 }, newCards: ['retry', 'guard'], mentor: true,
  },
  {
    id: 'm4', no: 4, title: '情報が足りないメール', client: '家電メーカー ぴかでん', clientEmoji: '🔌',
    request: '注文番号が書いてないメールが多くて…AIが勝手に推測しないか心配です',
    hint: '情報が足りないメールはAIには直せない。🙋人の承認であなたが判断しよう',
    steps: [S.inbox(), S.read({ missing: 0.25, misclass: 0.08 }), S.lookup(), S.draft({ wrong: 0.12 }), S.send()],
    emails: 16, energy: 8, budget: 80, reward: 300, goals: { accuracy: 0.85, auto: 0.6 }, newCards: ['human'], mentor: true,
  },
  {
    id: 'm5', no: 5, title: '原因不明のトラブル', client: '保険代理店 まもる堂', clientEmoji: '☂️',
    request: 'いろんなミスが起きてるみたい。でも何が原因かわからなくて…',
    hint: '先輩は出張中!📊ログを置くと、失敗の原因が見えるようになるよ',
    steps: [S.inbox({ timeout: 0.1 }), S.read({ misclass: 0.12, missing: 0.1 }), S.lookup({ timeout: 0.1 }), S.draft({ wrong: 0.2 }), S.send({ timeout: 0.1, duplicate: 0.05 })],
    emails: 20, energy: 12, budget: 110, reward: 380, goals: { accuracy: 0.85, auto: 0.7 }, newCards: ['memory', 'log'], mentor: false,
  },
  {
    id: 'm6', no: 6, title: '100件チャレンジ', client: '通販サイト まるっとマート', clientEmoji: '🛒',
    request: '毎日100件のお問い合わせ!正答率93%、誤送信ゼロでお願いします!',
    hint: 'これまでのカードを総動員。⚡ポイントの使い方がカギ',
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
  { id: 'ai', name: 'アイ', color: '#ffb3c7', accent: '#ff6f96', perk: 'がんばりや', perkDesc: '特技なし。レベルが上がりやすい(経験値1.2倍)', hireCost: 0 },
  { id: 'bell', name: 'ベル', color: '#a8e6cf', accent: '#34b384', perk: '段取り上手', perkDesc: '⚡段取りポイント +1', hireCost: 300 },
  { id: 'koro', name: 'コロ', color: '#ffe08a', accent: '#f0a500', perk: '節約家', perkDesc: '運用コスト −25%', hireCost: 700 },
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
  { from: '山田さま', subject: '営業時間について', body: '日曜日は何時まで開いていますか?', good: '日曜日は18時まで営業しております。お待ちしております!' },
  { from: '佐藤さま', subject: '返品したいです', body: '先週買った商品を返品できますか?', good: 'ご購入から30日以内でしたら返品を承ります。お手数ですが…' },
  { from: '鈴木さま', subject: '配送はいつ?', body: '注文した品はいつ届きますか?注文番号 A-1024 です', good: 'ご注文 A-1024 は明日お届け予定です。' },
  { from: '高橋さま', subject: 'ポイントの使い方', body: 'たまったポイントはどう使えますか?', good: 'お会計のときに1ポイント=1円でご利用いただけます。' },
  { from: '田中さま', subject: '予約の変更', body: '来週の予約を1日ずらせますか?', good: '承知しました。ご予約を翌日に変更いたしました。' },
  { from: '伊藤さま', subject: '支払い方法', body: 'クレジットカードは使えますか?', good: 'はい、主要なクレジットカードをご利用いただけます。' },
  { from: '渡辺さま', subject: '在庫について', body: '青色のマグカップはまだありますか?', good: '青色のマグカップは在庫がございます!' },
  { from: '中村さま', subject: '領収書がほしい', body: '先月の注文の領収書を発行できますか?', good: 'マイページから領収書をダウンロードいただけます。' },
];

/** トラブルが起きたときの回答案(ダメな例) */
export const BAD_DRAFTS: Record<TroubleId, (t: EmailTemplate) => { draft: string; note: string }> = {
  wrong: () => ({ draft: 'はい、ご購入から365日いつでも全額返金いたします!', note: '社内ルールと合ってる…?' }),
  misclass: (t) => ({ draft: `【クレーム対応】このたびは大変申し訳ございません。${t.from}のお怒りはごもっともで…`, note: 'ふつうの質問を「クレーム」と分類しています' }),
  nolookup: () => ({ draft: '(お名前不明)さま、ご注文の件は確認できませんでしたが、たぶん大丈夫です!', note: '顧客情報を見ていません' }),
  missing: () => ({ draft: 'ご注文番号 ?????? の商品は、おそらく明日届くと思われます。', note: '注文番号が書かれていないのに推測しています' }),
  timeout: () => ({ draft: '(送信がタイムアウトしました。もう一度送りますか?)', note: '同じメールがもう送られているかも' }),
  duplicate: (t) => ({ draft: `${t.good}(※同じメールをもう一度送信します)`, note: 'すでに送ったメールと同じ内容です' }),
};
