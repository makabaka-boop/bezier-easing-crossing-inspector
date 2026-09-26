import { describe, expect, it } from 'vitest';
import {
  bezierX,
  bezierY,
  bezierYDerivative,
  solveUForX,
  solveYRoots,
  yStationaryPoints,
  type BezierControls,
} from '../src/easing/bezier.js';

/** x1=x2=0.25 时 x(u)=u（Bernstein 权重和为 u-u³ 不成立，直接断言数值）。 */
const LINEAR_X: BezierControls = { x1: 0.25, y1: 0.1, x2: 0.75, y2: 0.9 };

/** y 控制点 (2,-1)：先上冲再回摆，阈值 0.5 被穿过三次。 */
const OVERSHOOT: BezierControls = { x1: 0.25, y1: 2, x2: 0.75, y2: -1 };

/** y 控制点 (0,2)：u=0.8 处取最大值 1.28，阈值 1.28 水平切触。 */
const TANGENT: BezierControls = { x1: 0.25, y1: 0, x2: 0.75, y2: 2 };

describe('bezier 端点值', () => {
  it('x/y 在 u=0,1 处恒为 0/1，与控制点无关', () => {
    for (const c of [LINEAR_X, OVERSHOOT, TANGENT]) {
      expect(bezierX(0, c)).toBe(0);
      expect(bezierX(1, c)).toBe(1);
      expect(bezierY(0, c)).toBe(0);
      expect(bezierY(1, c)).toBe(1);
    }
  });

  it('x1=x2=1/3、y1=y2 对应线性时 x(u)=y(u)=u', () => {
    const c: BezierControls = { x1: 1 / 3, y1: 1 / 3, x2: 2 / 3, y2: 2 / 3 };
    for (const u of [0, 0.1, 0.37, 0.63, 0.9, 1]) {
      expect(bezierX(u, c)).toBeCloseTo(u, 12);
      expect(bezierY(u, c)).toBeCloseTo(u, 12);
    }
  });
});

describe('solveUForX 单调反求', () => {
  it('端点夹取', () => {
    expect(solveUForX(0, TANGENT)).toBe(0);
    expect(solveUForX(1, TANGENT)).toBe(1);
    expect(solveUForX(-0.5, TANGENT)).toBe(0);
    expect(solveUForX(1.5, TANGENT)).toBe(1);
  });

  it('往返误差小于 1e-10', () => {
    for (const c of [LINEAR_X, OVERSHOOT, TANGENT]) {
      for (const x of [0.01, 0.2, 0.5, 0.8, 0.99]) {
        const u = solveUForX(x, c);
        expect(bezierX(u, c)).toBeCloseTo(x, 10);
      }
    }
  });

  it('x1=1,x2=0（端点导数为 0 的极端缓出/缓入）仍可反求', () => {
    const c: BezierControls = { x1: 1, y1: 0, x2: 0, y2: 1 };
    for (const x of [0.1, 0.5, 0.9]) {
      const u = solveUForX(x, c);
      expect(u).toBeGreaterThan(0);
      expect(u).toBeLessThan(1);
      expect(bezierX(u, c)).toBeCloseTo(x, 10);
    }
  });
});

describe('y 驻点与水平切触', () => {
  it('y1=0,y2=2 的最大值在 u=0.8，y=1.28', () => {
    const stats = yStationaryPoints(TANGENT);
    expect(stats).toHaveLength(1);
    expect(stats[0]).toBeCloseTo(0.8, 10);
    expect(bezierY(stats[0], TANGENT)).toBeCloseTo(1.28, 10);
    expect(Math.abs(bezierYDerivative(stats[0], TANGENT))).toBeLessThan(1e-9);
  });

  it('阈值恰为极值：仅一个相切点，不产生重复根', () => {
    const roots = solveYRoots(1.28, TANGENT);
    expect(roots).toHaveLength(1);
    expect(roots[0]).toBeCloseTo(0.8, 8);
  });

  it('阈值略低于极值：穿越两次（上行 + 回落）', () => {
    const roots = solveYRoots(1.27, TANGENT);
    expect(roots).toHaveLength(2);
    expect(roots[0]).toBeLessThan(0.8);
    expect(roots[1]).toBeGreaterThan(0.8);
    for (const u of roots) expect(bezierY(u, TANGENT)).toBeCloseTo(1.27, 7);
  });

  it('阈值略高于极值：无交点', () => {
    expect(solveYRoots(1.29, TANGENT)).toHaveLength(0);
  });

  it('y1=y2=0 时 y(u)=(1-3u+3u²)·u 单调，阈值 0 只在 u=0', () => {
    const c: BezierControls = { x1: 0.4, y1: 0, x2: 0.6, y2: 0 };
    const roots = solveYRoots(0, c);
    expect(roots).toEqual([0]);
  });

  it('y1=y2=1 时 y(u)=1-(1-u)³ 单调，阈值 1 只在 u=1', () => {
    const c: BezierControls = { x1: 0.4, y1: 1, x2: 0.6, y2: 1 };
    const roots = solveYRoots(1, c);
    expect(roots).toEqual([1]);
  });

  it('y1=1,y2=0：u=0.5 处水平且穿越阈值 0.5（y′ 变号、根只返回一次）', () => {
    // 此组控制柄使 y(u)-1/2 = 4(u-1/2)³：
    // u=0.5 处 y=0.5、y′=0，但两侧异号，是“水平且穿越”而非相切。
    const c: BezierControls = { x1: 0.5, y1: 1, x2: 0.5, y2: 0 };
    expect(bezierY(0.5, c)).toBeCloseTo(0.5, 12);
    expect(bezierYDerivative(0.5, c)).toBeCloseTo(0, 9);
    expect(bezierY(0.5 - 1e-4, c)).toBeLessThan(0.5);
    expect(bezierY(0.5 + 1e-4, c)).toBeGreaterThan(0.5);
    const roots = solveYRoots(0.5, c);
    expect(roots).toEqual([0.5]);
  });
});

describe('超调三交点', () => {
  it('y 控制点 (2,-1)、阈值 0.5 在一个片段内穿过三次', () => {
    const stats = yStationaryPoints(OVERSHOOT);
    expect(stats).toHaveLength(2);
    const roots = solveYRoots(0.5, OVERSHOOT);
    expect(roots).toHaveLength(3);
    // 升序、去重
    for (let i = 1; i < roots.length; i++) {
      expect(roots[i]).toBeGreaterThan(roots[i - 1]);
    }
    // 三次穿越分布在两个驻点两侧
    expect(roots[0]).toBeLessThan(stats[0]);
    expect(roots[1]).toBeGreaterThan(stats[0]);
    expect(roots[1]).toBeLessThan(stats[1]);
    expect(roots[2]).toBeGreaterThan(stats[1]);
    // 对称曲线：u 与 1-u
    expect(roots[0] + roots[2]).toBeCloseTo(1, 8);
    expect(roots[1]).toBeCloseTo(0.5, 8);
    for (const u of roots) expect(bezierY(u, OVERSHOOT)).toBeCloseTo(0.5, 7);
  });

  it('阈值超出 y 的可达范围则无解；超调曲线存在 y>1 的峰值', () => {
    // 真正越过端点：(0,2) 控制柄把峰值推到 y=1.28 > 1
    expect(bezierY(yStationaryPoints(TANGENT)[0], TANGENT)).toBeCloseTo(1.28, 9);
    expect(solveYRoots(1.29, TANGENT)).toHaveLength(0);
    // OVERSHOOT 的 y 在 [0.276, 0.724] 之间回摆，阈值 0 或 1 都不可达
    expect(solveYRoots(0, OVERSHOOT)).toEqual([0]);
    expect(solveYRoots(1, OVERSHOOT)).toEqual([1]);
    expect(solveYRoots(2, OVERSHOOT)).toHaveLength(0);
  });
});
