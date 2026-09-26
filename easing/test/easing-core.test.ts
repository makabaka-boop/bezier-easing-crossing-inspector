import { describe, expect, it } from 'vitest';
import {
  cubic,
  cubicDerivative,
  derivativeRoots,
  EasingCurve,
  invertX,
  solveUnitSegment,
  validateSpec,
} from '../src/easing-core.js';

const ID = () => ({ x1: 1 / 3, y1: 1 / 3, x2: 2 / 3, y2: 2 / 3 });

/** Build a valid curve from [t, v] keyframes and explicit/per-segment controls. */
function makeCurve(
  kfs: Array<[number, number]>,
  controls?: Array<Partial<{ x1: number; y1: number; x2: number; y2: number }>>,
): EasingCurve {
  return new EasingCurve({
    keyframes: kfs.map(([t, v]) => ({ t, v })),
    controls: kfs.slice(0, -1).map((_, i) => ({ ...ID(), ...(controls?.[i] ?? {}) })),
  });
}

describe('validation', () => {
  it('rejects too few / too many keyframes', () => {
    expect(() => validateSpec({ keyframes: [{ t: 0, v: 0 }], controls: [] })).toThrow();
    const keyframes = Array.from({ length: 21 }, (_, i) => ({ t: i, v: 0 }));
    expect(() =>
      validateSpec({ keyframes, controls: keyframes.slice(0, -1).map(ID) }),
    ).toThrow();
  });

  it('rejects non-integer or non-strictly-increasing times', () => {
    expect(() => makeCurve([[0, 0], [1.5, 1]])).toThrow();
    expect(() => makeCurve([[0, 0], [0, 1]])).toThrow();
    expect(() => makeCurve([[1, 0], [0, 1]])).toThrow();
  });

  it('rejects out-of-range control points and mismatched control count', () => {
    expect(() => makeCurve([[0, 0], [1, 1]], [{ x1: 1.1 }])).toThrow();
    expect(() => makeCurve([[0, 0], [1, 1]], [{ x2: -0.01 }])).toThrow();
    expect(() => makeCurve([[0, 0], [1, 1]], [{ y1: 2.01 }])).toThrow();
    expect(() => makeCurve([[0, 0], [1, 1]], [{ y2: -2.01 }])).toThrow();
    expect(
      () =>
        new EasingCurve({
          keyframes: [{ t: 0, v: 0 }, { t: 1, v: 1 }],
          controls: [],
        }),
    ).toThrow();
  });

  it('accepts boundary control values', () => {
    expect(() => makeCurve([[0, 0], [1, 1]], [{ x1: 0, x2: 1, y1: -2, y2: 2 }])).not.toThrow();
  });
});

describe('bezier primitives', () => {
  it('identity controls make B(u)=u', () => {
    for (const u of [0, 0.123, 0.5, 0.987, 1]) {
      expect(cubic(1 / 3, 2 / 3, u)).toBeCloseTo(u, 12);
    }
  });

  it('inverts the monotone x(u)', () => {
    // ease-out-ish: starts flat x'(0)=0
    const cx1 = 0;
    const cx2 = 0.33;
    for (const x of [0, 0.01, 0.4, 0.99, 1]) {
      const u = invertX(cx1, cx2, x);
      expect(cubic(cx1, cx2, u)).toBeCloseTo(x, 10);
    }
    expect(invertX(0, 0, 0.125)).toBeCloseTo(0.5, 10); // x(u)=u^3
  });
});

describe('endpoints （端点）', () => {
  it('evaluate returns exact endpoint values', () => {
    const c = makeCurve([[0, 0], [3, 1], [7, -2]]);
    expect(c.evaluate(0)).toBe(0);
    expect(c.evaluate(7)).toBe(-2);
    // at an interior keyframe both adjacent segments must agree
    expect(c.evaluate(3)).toBe(1);
    // clamps outside the range
    expect(c.evaluate(-5)).toBe(0);
    expect(c.evaluate(42)).toBe(-2);
  });

  it('threshold at endpoint values yields the keyframe times exactly once', () => {
    const c = makeCurve([[2, 0], [5, 1], [8, 0]]);
    expect(c.solveThreshold(0).times).toEqual([2, 8]);
    expect(c.solveThreshold(1).times).toEqual([5]);
  });
});

describe('horizontal tangency （水平切触）', () => {
  // cy1 = cy2 = 4/3: y(u) = 4u(1-u) + u^3, unique interior extremum at
  // u = 2/3 with y = 32/27 ≈ 1.185185 — a horizontal tangent touch.
  const tangentY = 32 / 27;
  const c = () => makeCurve([[0, 0], [3, 1]], [{ y1: 4 / 3, y2: 4 / 3 }]);

  it('reports the touch point exactly once at the analytic time', () => {
    const sol = c().solveThreshold(tangentY);
    expect(sol.times).toHaveLength(1);
    // identity x controls => x(u)=u => t = 0 + (2/3)*3 = 2
    expect(sol.times[0]).toBeCloseTo(2, 6);
    // the reported time really is a value match
    expect(c().evaluate(sol.times[0])).toBeCloseTo(tangentY, 6);
  });

  it('threshold just above the extremum has zero crossings, just below has two', () => {
    expect(c().solveThreshold(tangentY + 1e-4).times).toHaveLength(0);
    const below = c().solveThreshold(tangentY - 1e-4);
    expect(below.times).toHaveLength(2);
    expect(below.times[0]).toBeLessThan(2);
    expect(below.times[1]).toBeGreaterThan(2);
    for (const t of below.times) {
      expect(Math.abs(c().evaluate(t) - (tangentY - 1e-4))).toBeLessThanOrEqual(1e-6);
    }
  });

  it('derivative roots include the analytic extremum', () => {
    const roots = derivativeRoots(4 / 3, 4 / 3);
    expect(roots).toHaveLength(1);
    expect(roots[0]).toBeCloseTo(2 / 3, 10);
    expect(Math.abs(cubicDerivative(4 / 3, 4 / 3, roots[0]))).toBeLessThan(1e-12);
  });
});

describe('overshoot triple intersection （超调三交点）', () => {
  // cy1 = 2, cy2 = -1: y rises past 0.5, dips below 0.5, rises to 1.
  // extrema at u = (5 ± sqrt(5))/10, values ≈ 0.7236 / 0.2764.
  const c = () => makeCurve([[0, 0], [10, 1]], [{ y1: 2, y2: -1 }]);

  it('finds three distinct sorted crossings in a single segment', () => {
    const sol = c().solveThreshold(0.5);
    expect(sol.times).toHaveLength(3);
    const [t1, t2, t3] = sol.times;
    expect(t1).toBeLessThan(t2);
    expect(t2).toBeLessThan(t3);
    for (const t of sol.times) {
      expect(Math.abs(c().evaluate(t) - 0.5)).toBeLessThanOrEqual(1e-6);
    }
    // analytic positions in u
    const uLo = (5 - Math.sqrt(5)) / 10;
    const uHi = (5 + Math.sqrt(5)) / 10;
    expect(t1).toBeGreaterThan(0);
    expect(t1).toBeLessThan(10 * uLo);
    expect(t2).toBeGreaterThan(10 * uLo);
    expect(t2).toBeLessThan(10 * uHi);
    expect(t3).toBeGreaterThan(10 * uHi);
    expect(t3).toBeLessThan(10);
  });

  it('three roots lie inside the required time error', () => {
    for (const u of solveUnitSegment(2, -1, 0.5)) {
      expect(Math.abs(cubic(2, -1, u) - 0.5)).toBeLessThan(1e-9);
    }
  });

  it('overshoot values are reachable outside [0,1]', () => {
    const c = makeCurve([[0, 0], [1, 1]], [{ y1: 2, y2: 2 }]);
    // y(0.5) = 3*0.25*0.5*2 + 3*0.5*0.25*2 + 0.125 = 0.875 > ... check curve peak
    let max = -Infinity;
    for (let i = 0; i <= 1000; i++) max = Math.max(max, c.evaluate(i / 1000));
    expect(max).toBeGreaterThan(1);
  });
});

describe('different frame spacings （不同帧间距）', () => {
  it('handles uneven integer gaps (0,1,10) with identity interpolation', () => {
    const c = makeCurve([[0, 0], [1, 2], [10, 4]]);
    expect(c.evaluate(0.5)).toBeCloseTo(1, 9);
    expect(c.evaluate(5.5)).toBeCloseTo(3, 9);
    const sol = c.solveThreshold(3);
    expect(sol.times).toHaveLength(1);
    expect(sol.times[0]).toBeCloseTo(5.5, 6);
  });

  it('round-trips through non-trivial x(u) across a wide segment', () => {
    const c = makeCurve([[0, 0], [100, 10]], [
      { x1: 0, x2: 0.2, y1: 1.5, y2: -1.2 },
    ]);
    for (const u of [0.05, 0.3, 0.5, 0.8, 0.97]) {
      const t = cubic(0, 0.2, u) * 100;
      const vExpected = cubic(1.5, -1.2, u) * 10;
      expect(c.evaluate(t)).toBeCloseTo(vExpected, 6);
    }
  });

  it('non-monotone x-free time mapping preserves crossing order with dt=1', () => {
    const c = makeCurve([[0, 0], [1, 1], [2, -1], [3, 1]]);
    const sol = c.solveThreshold(0);
    // endpoints at value 0 plus one crossing inside each of segments 2 and 3
    expect(sol.times[0]).toBe(0);
    expect(sol.times.length).toBeGreaterThanOrEqual(3);
    expect(sol.times[sol.times.length - 1]).toBeCloseTo(2.5, 6);
  });
});

describe('constant segment => interval, not points', () => {
  it('returns the time range when a whole segment equals the threshold', () => {
    const c = makeCurve([[0, 1], [5, 1], [10, 2]]);
    const sol = c.solveThreshold(1);
    expect(sol.intervals).toEqual([[0, 5]]);
    // the crossing at t=5 from the second segment is absorbed into the interval
    expect(sol.times).toEqual([]);
  });

  it('merges adjacent constant segments and keeps separate crossings', () => {
    const c = makeCurve([[0, 3], [2, 3], [4, 3], [8, 0]]);
    const sol = c.solveThreshold(3);
    expect(sol.intervals).toEqual([[0, 4]]);
    expect(sol.times).toEqual([]);
    const other = c.solveThreshold(1.5);
    expect(other.intervals).toEqual([]);
    expect(other.times).toHaveLength(1);
    expect(c.evaluate(other.times[0])).toBeCloseTo(1.5, 6);
  });

  it('a constant segment with a different threshold yields nothing', () => {
    const c = makeCurve([[0, 5], [4, 5]]);
    expect(c.solveThreshold(5).intervals).toEqual([[0, 4]]);
    expect(c.solveThreshold(5).times).toEqual([]);
    expect(c.solveThreshold(6).times).toEqual([]);
  });
});

describe('dedup, ordering and accuracy', () => {
  it('shared keyframe threshold crossing is reported once, not twice', () => {
    const c = makeCurve([[0, 0], [5, 1], [10, 0]]);
    const sol = c.solveThreshold(1);
    expect(sol.times).toEqual([5]);
  });

  it('all reported times are sorted and within 1e-6 of an actual crossing', () => {
    const c = makeCurve([[0, 0], [4, 2], [9, -3], [12, 5]], [
      { y1: 2, y2: -1.5 },
      { y1: -2, y2: 2 },
      { y1: 1.8, y2: -0.4 },
    ]);
    for (const threshold of [-2.5, 0, 0.37, 1.4, 4.2]) {
      const { times } = c.solveThreshold(threshold);
      const sorted = [...times].sort((a, b) => a - b);
      expect(times).toEqual(sorted);
      for (const t of times) {
        expect(Math.abs(c.evaluate(t) - threshold)).toBeLessThanOrEqual(1e-6);
      }
    }
  });
});
