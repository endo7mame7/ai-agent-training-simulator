/** シード付き乱数(mulberry32)。状態を持ち出せるので純粋関数から使える */
export interface Rng {
  next(): number;
  /** 次に使うシード */
  state(): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state() {
      return a;
    },
  };
}

/** 重みに比例して1つを選ぶ */
export function pickWeighted<T>(rng: Rng, items: { item: T; weight: number }[]): T {
  const total = items.reduce((s, x) => s + Math.max(0, x.weight), 0);
  if (items.length === 0) throw new Error('pickWeighted: empty');
  if (total <= 0) return items[items.length - 1].item;
  let r = rng.next() * total;
  for (const x of items) {
    r -= Math.max(0, x.weight);
    if (r < 0) return x.item;
  }
  return items[items.length - 1].item;
}
