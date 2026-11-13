/** シード付き乱数(mulberry32)。状態を持ち出せるので純粋関数から使える */
export interface Rng {
  next(): number;
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
    state: () => a,
  };
}
