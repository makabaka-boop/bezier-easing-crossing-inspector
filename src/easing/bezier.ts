/**
 * 标准三次贝塞尔数学：P0 = (0, 0)，P3 = (1, 1)。
 *
 * x(u) 是单调的（控制点 x ∈ [0,1] 时 Bernstein 系数非负 ⇒ x'(u) ≥ 0），
 * 可以用牛顿迭代 + 二分兜底由给定时间反求参数 u。
 *
 * y(u) 的控制点 y ∈ [-2, 2]，允许越过端点（回摆 / 超调）。
 * y'(u) 是二次函数，用它的两个极值点把 [0,1] 切成至多三段单调区间，
 * 每段至多穿越一次阈值 —— 因此一个片段最多三个交点，相切点单独识别。
 */

export const X_MIN = 0;
export const X_MAX = 1;
export const Y_MIN = -2;
export const Y_MAX = 2;

export interface BezierControls {
  /** 入端控制点 x，范围 [0, 1] */
  x1: number;
  /** 入端控制点 y，范围 [-2, 2] */
  y1: number;
  /** 出端控制点 x，范围 [0, 1] */
  x2: number;
  /** 出端控制点 y，范围 [-2, 2] */
  y2: number;
}

/** x(u) = 3(1-u)²u·x1 + 3(1-u)u²·x2 + u³ */
export function bezierX(u: number, c: BezierControls): number {
  const v = 1 - u;
  return 3 * v * v * u * c.x1 + 3 * v * u * u * c.x2 + u * u * u;
}

/** 归一化的 y(u)，端点为 0/1，控制点可达 [-2, 2]，故会超调 */
export function bezierY(u: number, c: BezierControls): number {
  const v = 1 - u;
  return 3 * v * v * u * c.y1 + 3 * v * u * u * c.y2 + u * u * u;
}

/** x'(u) = 3(1-u)²x1 + 6(1-u)u(x2-x1) + 3u²(1-x2) */
export function bezierXDerivative(u: number, c: BezierControls): number {
  const v = 1 - u;
  return (
    3 * v * v * c.x1 +
    6 * v * u * (c.x2 - c.x1) +
    3 * u * u * (1 - c.x2)
  );
}

/** y'(u) = 3(1-u)²y1 + 6(1-u)u(y2-y1) + 3u²(1-y2) */
export function bezierYDerivative(u: number, c: BezierControls): number {
  const v = 1 - u;
  return (
    3 * v * v * c.y1 +
    6 * v * u * (c.y2 - c.y1) +
    3 * u * u * (1 - c.y2)
  );
}

/**
 * 由单调的 x(u) 反求 u，使 bezierX(u) ≈ x。
 * x 会先夹取到 [0,1]，端点直接返回；否则先做带护栏的牛顿迭代，
 * 不收敛（例如 x' 在端点为 0 的“缓出”曲线）时退回二分。
 */
export function solveUForX(x: number, c: BezierControls): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // 牛顿迭代，步长被夹在当前区间内，防止越过边界后反复横跳。
  let lo = 0;
  let hi = 1;
  let u = x;
  for (let i = 0; i < 12; i++) {
    const xu = bezierX(u, c);
    const err = xu - x;
    if (Math.abs(err) < 1e-12) return u;
    const d = bezierXDerivative(u, c);
    if (d > 1e-12) {
      const next = u - err / d;
      if (next > lo && next < hi) {
        u = next;
        if (err > 0) hi = u;
        else lo = u;
        continue;
      }
    }
    break;
  }

  // 二分兜底：x 单调，必有唯一解。
  let lo2 = 0;
  let hi2 = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo2 + hi2) / 2;
    if (bezierX(mid, c) < x) lo2 = mid;
    else hi2 = mid;
  }
  return (lo2 + hi2) / 2;
}

/**
 * 求 y'(u) = 0 在 (0, 1) 内的全部根（至多两个），结果升序。
 * y' 是二次 Bernstein 多项式：
 *   y'/3 = y1·(1-u)² + 2(y2-y1)·(1-u)u + (1-y2)·u²
 * 展开为 A u² + B u + C：
 *   A = 1 + 3(y1 - y2)，B = 2y2 - 4y1，C = y1
 */
export function yStationaryPoints(c: BezierControls): number[] {
  const A = 1 + 3 * c.y1 - 3 * c.y2;
  const B = 2 * c.y2 - 4 * c.y1;
  const C = c.y1;

  const roots: number[] = [];
  if (Math.abs(A) < 1e-15) {
    if (Math.abs(B) >= 1e-15) {
      const u = -C / B;
      if (u > 0 && u < 1) roots.push(u);
    }
    return roots;
  }

  const disc = B * B - 4 * A * C;
  if (disc < 0) return roots;
  const sq = Math.sqrt(Math.max(0, disc));
  // 稳定求根，避免同号相减。
  const q = -0.5 * (B + Math.sign(B || 1) * sq);
  const candidates = [q / A, C / q];
  for (const u of candidates) {
    if (u > 1e-12 && u < 1 - 1e-12) roots.push(u);
  }
  roots.sort((a, b) => a - b);
  // 重根时两个公式给出同一个点。
  const unique: number[] = [];
  for (const u of roots) {
    if (unique.length === 0 || Math.abs(u - unique[unique.length - 1]) > 1e-10) {
      unique.push(u);
    }
  }
  return unique;
}

/**
 * 在单调的 [lo, hi] 上二分求解 y(u) = target；两端必须夹住根。
 * 单调方向不固定（驻点切分后各段可升可降），故按端点符号夹逼，
 * 不能用固定的 “y(mid) < target” 方向。
 */
function bisectY(
  lo: number,
  hi: number,
  target: number,
  c: BezierControls,
): number {
  let a = lo;
  let b = hi;
  const signA = Math.sign(bezierY(a, c) - target);
  for (let i = 0; i < 80; i++) {
    const mid = (a + b) / 2;
    if (mid === a || mid === b) break;
    if (Math.sign(bezierY(mid, c) - target) === signA) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}

/**
 * 求一个片段内归一化 y(u) 穿过 / 切触 target 的所有参数 u。
 *
 * 用 y' 的极值点切分区间：每个子区间内 y 单调，端点异号则二分求根；
 * 极值点自身若落在阈值上（水平切触，y'=0 且不穿越），作为相切点加入。
 * 子区间端点为 0/1 时同样处理，覆盖阈值恰好等于端点值的情况。
 */
export function solveYRoots(target: number, c: BezierControls): number[] {
  const EPS = 1e-9;
  const splits = [0, ...yStationaryPoints(c), 1];
  const roots: number[] = [];

  // 先检查各子区间端点（含驻点），识别切触。
  for (const u of splits) {
    if (Math.abs(bezierY(u, c) - target) <= EPS) {
      roots.push(u);
    }
  }

  // 再对每段单调区间做夹住检测。
  for (let i = 0; i < splits.length - 1; i++) {
    const lo = splits[i];
    const hi = splits[i + 1];
    const ylo = bezierY(lo, c);
    const yhi = bezierY(hi, c);
    const loOn = Math.abs(ylo - target) <= EPS;
    const hiOn = Math.abs(yhi - target) <= EPS;

    if (loOn || hiOn) continue; // 根在端点，已记录
    if ((ylo - target) * (yhi - target) < 0) {
      roots.push(bisectY(lo, hi, target, c));
    }
  }

  roots.sort((a, b) => a - b);

  // 解析驻点与二分根可能指向同一点，按参数精度去重。
  const merged: number[] = [];
  for (const u of roots) {
    if (merged.length === 0 || Math.abs(u - merged[merged.length - 1]) > 1e-8) {
      merged.push(u);
    }
  }
  return merged;
}
