import { describe, expect, it } from 'vitest';
import { CurveStore } from '../src/curve-store.js';

function spec() {
  return {
    keyframes: [
      { t: 0, v: 0 },
      { t: 4, v: 1 },
      { t: 8, v: 0 },
    ],
    controls: [
      { x1: 1 / 3, y1: 1 / 3, x2: 2 / 3, y2: 2 / 3 },
      { x1: 1 / 3, y1: 1 / 3, x2: 2 / 3, y2: 2 / 3 },
    ],
  };
}

describe('CurveStore caching and invalidation', () => {
  it('memoizes threshold solutions within a revision', () => {
    const store = new CurveStore(spec());
    const a = store.solveThreshold(0.5);
    const b = store.solveThreshold(0.5);
    expect(b).toBe(a); // same object => served from cache
  });

  it('invalidates old inverse results immediately after an edit', () => {
    const store = new CurveStore(spec());
    const before = store.solveThreshold(0.5);
    expect(before.times).toEqual([2, 6]);
    const revBefore = store.currentRevision;

    store.updateControl(0, { x1: 0.2, y1: 2, x2: 0.8, y2: -1 });

    expect(store.currentRevision).toBe(revBefore + 1);
    const after = store.solveThreshold(0.5);
    expect(after).not.toBe(before); // stale object never re-served
    expect(after.times).not.toEqual(before.times);
    // new curve really overshoots: three crossings in the first segment
    expect(after.times.length).toBeGreaterThanOrEqual(3);
    for (const t of after.times) {
      expect(Math.abs(store.evaluate(t) - 0.5)).toBeLessThanOrEqual(1e-6);
    }
  });

  it('keyframe edits also invalidate and re-validate', () => {
    const store = new CurveStore(spec());
    store.solveThreshold(0.5);
    store.updateKeyframe(1, { t: 4, v: 2 });
    expect(store.solveThreshold(0.5).times.length).toBeGreaterThan(0);
    expect(() => store.updateKeyframe(1, { t: 4.5, v: 2 })).toThrow(); // non-integer
    expect(() => store.updateKeyframe(1, { t: 8, v: 2 })).toThrow(); // not increasing
  });

  it('insert/remove keep the spec valid and notify listeners', () => {
    const store = new CurveStore(spec());
    let notified = 0;
    store.subscribe(() => notified++);

    store.insertKeyframe({ t: 6, v: store.evaluate(6) });
    expect(store.spec.keyframes.map((k) => k.t)).toEqual([0, 4, 6, 8]);
    expect(store.spec.controls).toHaveLength(3);
    expect(notified).toBe(1);

    store.removeKeyframe(1);
    expect(store.spec.keyframes.map((k) => k.t)).toEqual([0, 6, 8]);
    expect(store.spec.controls).toHaveLength(2);
    expect(notified).toBe(2);
  });

  it('sample() uses the shared evaluation path', () => {
    const store = new CurveStore(spec());
    const samples = store.sample(8);
    expect(samples).toHaveLength(9);
    expect(samples[0]).toEqual({ t: 0, v: 0 });
    expect(samples[8]).toEqual({ t: 8, v: 0 });
    expect(samples[4].v).toBeCloseTo(store.evaluate(4), 12);
  });
});
