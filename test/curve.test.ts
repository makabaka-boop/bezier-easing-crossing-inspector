import { describe, expect, it, vi } from 'vitest';
import {
  bezierX,
  bezierY,
  type BezierControls,
} from '../src/easing/bezier.js';
import {
  CurveEvaluation,
  EasingService,
} from '../src/easing/curve.js';
import { ValidationError, type CurveDocument } from '../src/easing/model.js';

const LINEAR: BezierControls = { x1: 1 / 3, y1: 0, x2: 2 / 3, y2: 1 };
const OVERSHOOT: BezierControls = { x1: 0.25, y1: 2, x2: 0.75, y2: -1 };
const FLAT: BezierControls = { x1: 0.3, y1: 1.5, x2: 0.7, y2: -1.5 };

function doc(
  times: number[],
  values: number[],
  controls: BezierControls[],
): CurveDocument {
  return {
    keyframes: times.map((time, i) => ({ time, value: values[i] })),
    segments: controls.map((c, i) => ({ ...c, from: i, to: i + 1 })),
  };
}

describe('CurveEvaluation 端点与线性映射', () => {
  it('valueAt 在各关键帧上等于帧值，含非均匀帧间距', () => {
    // 帧间距 10 / 1 / 100，覆盖大小悬殊的间距
    const d = doc([0, 10, 11, 111], [0, 100, 50, -25], [LINEAR, LINEAR, LINEAR]);
    const ev = new CurveEvaluation(0, d);

    expect(ev.valueAt(0)).toBe(0);
    expect(ev.valueAt(10)).toBe(100);
    expect(ev.valueAt(11)).toBe(50);
    expect(ev.valueAt(111)).toBe(-25);

    // 线性片段：中点映射到两端数值的平均
    expect(ev.valueAt(5)).toBeCloseTo(50, 9);
    expect(ev.valueAt(10.5)).toBeCloseTo(75, 9);
    expect(ev.valueAt(61)).toBeCloseTo(12.5, 9);
  });

  it('游标超出范围时夹取到端点并标记 clamped', () => {
    const d = doc([10, 20], [5, 9], [LINEAR]);
    const ev = new CurveEvaluation(0, d);

    const before = ev.cursorAt(-100);
    expect(before.clamped).toBe(true);
    expect(before.time).toBe(10);
    expect(before.value).toBe(5);

    const after = ev.cursorAt(999);
    expect(after.clamped).toBe(true);
    expect(after.time).toBe(20);
    expect(after.value).toBe(9);

    const inside = ev.cursorAt(10);
    expect(inside.clamped).toBe(false);
  });

  it('locate 在内部分界帧上取右侧片段 u=0（与左段 u=1 等值）', () => {
    const d = doc([0, 10, 20], [0, 5, 10], [LINEAR, LINEAR]);
    const ev = new CurveEvaluation(0, d);
    const loc = ev.locate(10);
    expect(loc.index).toBe(1);
    expect(loc.u).toBe(0);
    expect(ev.valueAt(10)).toBe(5);
  });
});

describe('阈值反查：超调 / 切触 / 恒值区间', () => {
  it('一个片段内三个交点，时间误差 ≤ 1e-6，且升序去重', () => {
    // 片段长度 1000：时间误差约等于 u 误差（二分 80 次）
    const d = doc([0, 1000], [0, 10], [OVERSHOOT]);
    const ev = new CurveEvaluation(0, d);
    const hits = ev.thresholdAt(5);

    expect(hits.intervals).toEqual([]);
    expect(hits.points).toHaveLength(3);
    const [t1, t2, t3] = hits.points;
    expect(t1).toBeGreaterThan(0);
    expect(t2).toBeGreaterThan(t1 + 1e-6);
    expect(t3).toBeGreaterThan(t2 + 1e-6);

    // 直接复核：返回时间反求出的曲线值都等于阈值
    for (const t of hits.points) {
      expect(Math.abs(ev.valueAt(t) - 5)).toBeLessThanOrEqual(1e-6);
      const { u } = ev.locate(t);
      expect(10 * bezierY(u, OVERSHOOT)).toBeCloseTo(5, 5);
    }
  });

  it('非均匀帧间距：时间 = t0 + (t1-t0)·u', () => {
    const d = doc([7, 42], [0, 1], [OVERSHOOT]); // 长度 35
    const ev = new CurveEvaluation(0, d);
    const hits = ev.thresholdAt(0.5);
    expect(hits.points).toHaveLength(3);
    // 与单位片段 [0,1] 的 u 根对比换算：时间 = 7 + 35·x(u)
    for (const t of hits.points) {
      const { u } = ev.locate(t);
      expect(t).toBeCloseTo(7 + 35 * bezierX(u, OVERSHOOT), 8);
      expect(bezierY(u, OVERSHOOT)).toBeCloseTo(0.5, 7);
    }
  });

  it('整段恒等于阈值时返回时间区间，而不是无限多个点', () => {
    const d = doc([0, 10, 20], [3, 3, 8], [FLAT, LINEAR]);
    const ev = new CurveEvaluation(0, d);
    const hits = ev.thresholdAt(3);

    expect(hits.points).toEqual([]);
    expect(hits.intervals).toEqual([{ start: 0, end: 10 }]);
  });

  it('恒值片段的控制点回摆不影响“恒等”判定', () => {
    const d = doc([5, 15], [4, 4], [FLAT]);
    const ev = new CurveEvaluation(0, d);
    const hits = ev.thresholdAt(4);
    expect(hits.intervals).toEqual([{ start: 5, end: 15 }]);
    expect(hits.points).toEqual([]);
    expect(ev.thresholdAt(4.1).points).toEqual([]);
    expect(ev.thresholdAt(4.1).intervals).toEqual([]);
  });

  it('相邻恒值片段合并为一个区间；区间端点不重复出现在点列表', () => {
    const d = doc(
      [0, 10, 20, 30],
      [2, 2, 2, 0],
      [FLAT, FLAT, LINEAR],
    );
    const ev = new CurveEvaluation(0, d);
    const hits = ev.thresholdAt(2);
    expect(hits.intervals).toEqual([{ start: 0, end: 20 }]);
    expect(hits.points).toEqual([]);
  });

  it('跨片段同一阈值结果整体排序、接缝处去重', () => {
    // 两段线性：0→10、10→0；阈值 5 各穿过一次（t=5 与 t=15）
    const d = doc([0, 10, 20], [0, 10, 0], [LINEAR, LINEAR]);
    const ev = new CurveEvaluation(0, d);
    const hits = ev.thresholdAt(5);
    expect(hits.points).toEqual([5, 15]);
  });

  it('阈值等于端点值：只在端点命中一次', () => {
    const d = doc([0, 10], [0, 1], [OVERSHOOT]);
    const ev = new CurveEvaluation(0, d);
    expect(ev.thresholdAt(0).points).toEqual([0]);
    expect(ev.thresholdAt(1).points).toEqual([10]);
  });

  it('切点（水平切触）也被报告，且不会因跨段重复', () => {
    // y1=0,y2=2 在 u=0.8 切于归一化 1.28；映射到 v0=0,v1=10 ⇒ 阈值 12.8
    const tangent: BezierControls = { x1: 0.25, y1: 0, x2: 0.75, y2: 2 };
    const d = doc([0, 100], [0, 10], [tangent]);
    const ev = new CurveEvaluation(0, d);
    const hits = ev.thresholdAt(12.8);
    expect(hits.points).toHaveLength(1);
    // 切点时间为 100·x(0.8)，不是 80
    expect(hits.points[0]).toBeCloseTo(100 * bezierX(0.8, tangent), 5);
  });
});

describe('EasingService：编辑失效与统一求值', () => {
  it('初始 revision 为 0，编辑后推进并触发监听', () => {
    const svc = new EasingService(doc([0, 10], [0, 1], [LINEAR]));
    const listener = vi.fn();
    svc.onChange(listener);

    expect(svc.revision).toBe(0);
    svc.setControl(0, { y1: 1 });
    expect(svc.revision).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(svc.document.segments[0].y1).toBe(1);
  });

  it('编辑后旧游标 / 旧阈值反查立即失效，新结果有效', () => {
    const svc = new EasingService(doc([0, 10], [0, 1], [OVERSHOOT]));
    const oldCursor = svc.evaluate().cursorAt(5);
    const oldHits = svc.evaluate().thresholdAt(0.5);
    expect(oldCursor.valid).toBe(true);
    expect(oldHits.valid).toBe(true);
    expect(svc.isLookupCurrent(oldCursor)).toBe(true);

    svc.setControl(0, { y1: 0.5 });

    expect(oldCursor.valid).toBe(false);
    expect(oldHits.valid).toBe(false);
    expect(svc.isLookupCurrent(oldCursor)).toBe(false);

    const fresh = svc.evaluate().cursorAt(5);
    expect(fresh.valid).toBe(true);
    expect(svc.isLookupCurrent(fresh)).toBe(true);
  });

  it('曲线、游标、导出共用同一份求值结果', () => {
    const svc = new EasingService(doc([0, 10, 20], [0, 10, 5], [OVERSHOOT, LINEAR]));
    const ev = svc.evaluate();
    const exported = ev.export();

    expect(exported.revision).toBe(ev.revision);
    expect(exported.samples).toBe(ev.samples);
    // 采样点与逐点求值一致
    for (const s of exported.samples.slice(0, 20)) {
      expect(ev.valueAt(s.time)).toBeCloseTo(s.value, 10);
    }

    const cursor = ev.cursorAt(7);
    const sample = exported.samples.find((s) => s.time === 7);
    // 7 是 48 步采样的网格点之一（10 * k/48，k=33.6 非整数 —— 用游标直接复核）
    void sample;
    expect(cursor.value).toBe(ev.valueAt(7));
  });

  it('非法编辑（时间不再递增、控制点越界）整体回滚', () => {
    const svc = new EasingService(doc([0, 10], [0, 1], [LINEAR]));
    expect(() => svc.setKeyframe(1, { time: 0 })).toThrow(ValidationError);
    expect(svc.revision).toBe(0);
    expect(svc.document.keyframes[1].time).toBe(10);

    expect(() => svc.setControl(0, { y1: 3 })).toThrow(ValidationError);
    expect(svc.revision).toBe(0);
  });

  it('插入 / 删除关键帧后片段重新索引，求值正常', () => {
    const svc = new EasingService(doc([0, 10], [0, 1], [LINEAR]));
    svc.insertKeyframe(1, { time: 5, value: 2 }, { x1: 0.4, y1: 0.2, x2: 0.6, y2: 0.8 });
    expect(svc.document.keyframes).toHaveLength(3);
    expect(svc.document.segments.map((s) => [s.from, s.to])).toEqual([[0, 1], [1, 2]]);
    expect(svc.evaluate().valueAt(5)).toBe(2);

    svc.removeKeyframe(1);
    expect(svc.document.keyframes).toHaveLength(2);
    expect(svc.evaluate().valueAt(5)).toBeCloseTo(0.5, 9);

    // 不允许删到只剩 1 帧
    expect(() => svc.removeKeyframe(0)).toThrow(ValidationError);
  });

  it('Compose 风格 Easing：transform(0/1)=端点，中间按贝塞尔映射', () => {
    const ev = new CurveEvaluation(0, doc([0, 10], [0, 1], [OVERSHOOT]));
    const easing = ev.easing(0);
    expect(easing.transform(0)).toBe(0);
    expect(easing.transform(1)).toBe(1);
    // 阈值 0.5 对应三个参数，取 transform 的直接复核
    const { u } = ev.locate(3);
    expect(easing.transform(0.3)).toBeCloseTo(bezierY(u, OVERSHOOT), 9);
  });
});
