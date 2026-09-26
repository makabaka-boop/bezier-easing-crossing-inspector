import type { BezierControls } from './bezier.js';

/** 一个关键帧：整数时间 + 数值。时间在整条曲线中严格递增。 */
export interface Keyframe {
  time: number;
  value: number;
}

/**
 * 片段 = 相邻两个关键帧 + 该片段的两个控制点。
 * 控制点与 Compose CubicBezierEasing 一致，x ∈ [0,1]，y ∈ [-2,2]。
 */
export interface Segment extends BezierControls {
  /** 起点关键帧索引 */
  from: number;
  /** 终点关键帧索引（from + 1） */
  to: number;
}

/** 一份可序列化的曲线文档。 */
export interface CurveDocument {
  keyframes: Keyframe[];
  /** 长度 = keyframes.length - 1，第 i 段连接第 i 与第 i+1 帧。 */
  segments: Segment[];
}

export const MIN_KEYFRAMES = 2;
export const MAX_KEYFRAMES = 20;

export class ValidationError extends Error {}

/** 校验关键帧（2～20 个、时间为严格递增整数）与控制点范围。 */
export function validateDocument(doc: CurveDocument): void {
  const kfs = doc.keyframes;
  if (!Number.isInteger(kfs.length) || kfs.length < MIN_KEYFRAMES || kfs.length > MAX_KEYFRAMES) {
    throw new ValidationError(
      `关键帧数量必须在 ${MIN_KEYFRAMES}～${MAX_KEYFRAMES} 之间，当前 ${kfs.length} 个`,
    );
  }
  if (doc.segments.length !== kfs.length - 1) {
    throw new ValidationError('片段数量必须等于关键帧数量减 1');
  }
  for (let i = 0; i < kfs.length; i++) {
    const kf = kfs[i];
    if (!Number.isInteger(kf.time)) {
      throw new ValidationError(`关键帧 ${i} 的时间必须是整数`);
    }
    if (!Number.isFinite(kf.value)) {
      throw new ValidationError(`关键帧 ${i} 的数值非法`);
    }
    if (i > 0 && kf.time <= kfs[i - 1].time) {
      throw new ValidationError(`关键帧 ${i} 的时间必须严格递增`);
    }
  }
  for (let i = 0; i < doc.segments.length; i++) {
    const s = doc.segments[i];
    if (s.from !== i || s.to !== i + 1) {
      throw new ValidationError(`片段 ${i} 的端点索引不正确`);
    }
    for (const [name, v, min, max] of [
      ['x1', s.x1, 0, 1],
      ['x2', s.x2, 0, 1],
      ['y1', s.y1, -2, 2],
      ['y2', s.y2, -2, 2],
    ] as const) {
      if (!Number.isFinite(v) || v < min || v > max) {
        throw new ValidationError(`片段 ${i} 的控制点 ${name}=${v} 超出范围 [${min}, ${max}]`);
      }
    }
  }
}

/** 深拷贝，供编辑时保持“不可变替换”语义。 */
export function cloneDocument(doc: CurveDocument): CurveDocument {
  return {
    keyframes: doc.keyframes.map((k) => ({ ...k })),
    segments: doc.segments.map((s) => ({ ...s })),
  };
}
