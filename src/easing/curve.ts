import {
  bezierX,
  bezierY,
  solveUForX,
  solveYRoots,
  type BezierControls,
} from './bezier.js';
import {
  cloneDocument,
  validateDocument,
  ValidationError,
  type CurveDocument,
  type Keyframe,
  type Segment,
} from './model.js';

export interface TimeInterval {
  start: number;
  end: number;
}

/** 阈值反查命中：离散穿越/切触时刻，加上“整段恒等”的时间区间。 */
export interface ThresholdHits {
  points: number[];
  intervals: TimeInterval[];
}

/**
 * 一次反查结果。结果绑定求值时的 revision；
 * 文档一旦被编辑（replaceDocument / edit），revision 推进，旧结果立刻 valid=false。
 */
export interface Lookup {
  readonly revision: number;
  readonly document: CurveDocument;
  /** 是否仍对应当前文档；编辑后旧结果立即变 false。 */
  readonly valid: boolean;
}

export interface CursorLookup extends Lookup {
  /** 游标时间（已夹取到曲线范围） */
  readonly time: number;
  /** 该时间的曲线值 */
  readonly value: number;
  /** 所在片段索引；游标夹在端点时取 0 / 最后一段 */
  readonly segmentIndex: number;
  /** 片段内贝塞尔参数 u */
  readonly u: number;
  /** 游标是否原本就在曲线范围之外（已被夹取） */
  readonly clamped: boolean;
}

export interface ThresholdLookup extends Lookup, ThresholdHits {
  readonly threshold: number;
}

/** 导出快照：与画布、游标共用同一份求值结果。 */
export interface CurveExport {
  revision: number;
  document: CurveDocument;
  samples: { time: number; value: number }[];
}

/** Compose 风格的 Easing：把 [0,1] 分数映射为插值分数。 */
export interface Easing {
  readonly name: string;
  transform(fraction: number): number;
}

/** 单个片段的 Compose Easing（等价于 CubicBezierEasing，但允许 y 超调）。 */
export class SegmentEasing implements Easing {
  constructor(
    readonly name: string,
    private readonly controls: BezierControls,
  ) {}

  transform(fraction: number): number {
    const u = solveUForX(fraction, this.controls);
    return bezierY(u, this.controls);
  }
}

const SAMPLES_PER_SEGMENT = 48;
/** 时间相等判定（合并恒值区间 / 跨片段去重）。 */
const TIME_EPS = 1e-8;
/** 恒值片段与阈值的数值容差（按端点值缩放）。 */
function valueEps(a: number, b: number): number {
  return 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

/** 某次 revision 下的不可变求值结果；画布、游标、导出都从这里取数。 */
export class CurveEvaluation {
  readonly samples: { time: number; value: number }[];
  /** 由 EasingService 在编辑后置为 true：绑定它的旧反查结果随即失效。 */
  invalid = false;

  constructor(
    readonly revision: number,
    readonly document: CurveDocument,
  ) {
    this.samples = this.#buildSamples();
  }

  get keyframes(): Keyframe[] {
    return this.document.keyframes;
  }

  get segments(): Segment[] {
    return this.document.segments;
  }

  get duration(): [number, number] {
    return [
      this.keyframes[0].time,
      this.keyframes[this.keyframes.length - 1].time,
    ];
  }

  /** 片段内：u → 值（归一化 y 再映射到两端数值）。 */
  valueOnSegment(u: number, seg: Segment): number {
    const y = bezierY(u, seg);
    const from = this.keyframes[seg.from].value;
    const to = this.keyframes[seg.to].value;
    return from + (to - from) * y;
  }

  /** 时间 → 值。时间超出曲线范围时夹取到端点。 */
  valueAt(time: number): number {
    const { index, u } = this.locate(time);
    return this.valueOnSegment(u, this.segments[index]);
  }

  /**
   * 定位时间所在片段。
   * 返回片段索引与片段内参数 u（先按时间线性换算 x，再反求单调的 x(u)）。
   */
  locate(time: number): { index: number; u: number; clamped: boolean } {
    const times = this.keyframes.map((k) => k.time);
    const [t0, tn] = this.duration;

    let clamped = false;
    if (time <= t0) {
      clamped = time < t0;
      return { index: 0, u: 0, clamped };
    }
    if (time >= tn) {
      clamped = time > tn;
      return { index: this.segments.length - 1, u: 1, clamped };
    }

    // 二分：找满足 times[i] <= time < times[i+1] 的片段。
    let lo = 0;
    let hi = times.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= time) lo = mid;
      else hi = mid;
    }
    const seg = this.segments[lo];
    const duration = times[lo + 1] - times[lo];
    const x = (time - times[lo]) / duration;
    return { index: seg.from, u: solveUForX(x, seg), clamped: false };
  }

  /** 游标反查：给定时间，求曲线值。 */
  cursorAt(time: number): CursorLookup {
    const { index, u, clamped } = this.locate(time);
    const eval_ = this;
    return {
      revision: this.revision,
      document: this.document,
      time: this.#timeOf(index, u),
      value: this.valueOnSegment(u, this.segments[index]),
      segmentIndex: index,
      u,
      clamped,
      get valid() {
        return !eval_.invalid;
      },
    };
  }

  /**
   * 阈值反查：求所有穿越 / 相切时刻。
   *
   * - 普通片段：阈值映射回归一化 y，按 y' 极值点分段求根（每段单调），
   *   一段最多三个交点；水平切触（驻点恰好落在阈值上）也作为命中。
   * - 两端数值相等的片段整段恒等于阈值时，返回时间区间而非无限点。
   * - 跨片段结果统一去重、排序，相邻恒值区间合并。
   */
  thresholdAt(threshold: number): ThresholdLookup {
    const points: number[] = [];
    const intervals: TimeInterval[] = [];

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const t0 = this.keyframes[seg.from].time;
      const t1 = this.keyframes[seg.to].time;
      const v0 = this.keyframes[seg.from].value;
      const v1 = this.keyframes[seg.to].value;

      if (v0 === v1) {
        // 整段恒值（与控制点无关）。
        if (Math.abs(v0 - threshold) <= valueEps(v0, threshold)) {
          intervals.push({ start: t0, end: t1 });
        }
        continue;
      }

      const target = (threshold - v0) / (v1 - v0);
      for (const u of solveYRoots(target, seg)) {
        points.push(this.#timeOf(i, u));
      }
    }

    const mergedIntervals = this.#mergeIntervals(intervals);
    const mergedPoints = this.#mergePoints(points, mergedIntervals);
    const eval_ = this;

    return {
      revision: this.revision,
      document: this.document,
      threshold,
      points: mergedPoints,
      intervals: mergedIntervals,
      get valid() {
        return !eval_.invalid;
      },
    };
  }

  /** 取片段的 Compose 风格 Easing。 */
  easing(segmentIndex: number): Easing {
    const seg = this.segments[segmentIndex];
    return new SegmentEasing(
      `segment-${segmentIndex}@${this.revision}`,
      seg,
    );
  }

  /** 全部片段的 Easing（Compose easing 服务对外提供页面）。 */
  easings(): Easing[] {
    return this.segments.map((_, i) => this.easing(i));
  }

  export(): CurveExport {
    return {
      revision: this.revision,
      document: this.document,
      samples: this.samples,
    };
  }

  #timeOf(segmentIndex: number, u: number): number {
    const t0 = this.keyframes[segmentIndex].time;
    const t1 = this.keyframes[segmentIndex + 1].time;
    // 贝塞尔参数 u 不是时间分数：时间分数是单调的 x(u)。
    return t0 + (t1 - t0) * bezierX(u, this.segments[segmentIndex]);
  }

  #buildSamples(): { time: number; value: number }[] {
    const out: { time: number; value: number }[] = [];
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const steps = SAMPLES_PER_SEGMENT;
      for (let s = 0; s <= steps; s++) {
        if (i > 0 && s === 0) continue; // 跳过片段接缝处的重复点
        const u = s / steps;
        out.push({ time: this.#timeOf(i, u), value: this.valueOnSegment(u, seg) });
      }
    }
    return out;
  }

  #mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
    if (intervals.length === 0) return [];
    const sorted = [...intervals].sort((a, b) => a.start - b.start);
    const merged: TimeInterval[] = [{ ...sorted[0] }];
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      if (sorted[i].start <= last.end + TIME_EPS) {
        last.end = Math.max(last.end, sorted[i].end);
      } else {
        merged.push({ ...sorted[i] });
      }
    }
    return merged;
  }

  #mergePoints(points: number[], intervals: TimeInterval[]): number[] {
    const sorted = [...points].sort((a, b) => a - b);
    const unique: number[] = [];
    for (const t of sorted) {
      // 已落在恒值区间内（含端点）的点不再重复返回。
      const covered = intervals.some(
        (iv) => t >= iv.start - TIME_EPS && t <= iv.end + TIME_EPS,
      );
      if (covered) continue;
      if (unique.length === 0 || Math.abs(t - unique[unique.length - 1]) > TIME_EPS) {
        unique.push(t);
      }
    }
    return unique;
  }
}

export type RevisionListener = (
  revision: number,
  document: CurveDocument,
) => void;

/**
 * Easing 服务（Compose 风格）：持有当前曲线文档，对外提供求值与 Easing。
 *
 * 任何编辑都会替换文档、推进 revision 并使上一份 CurveEvaluation
 * 以及所有旧反查结果立即失效。
 */
export class EasingService {
  #document: CurveDocument;
  #revision = 0;
  #evaluation: CurveEvaluation | null = null;
  #listeners = new Set<RevisionListener>();

  constructor(initial: CurveDocument) {
    validateDocument(initial);
    this.#document = initial;
  }

  get revision(): number {
    return this.#revision;
  }

  get document(): CurveDocument {
    return this.#document;
  }

  /** 当前 revision 的求值结果（惰性缓存，编辑后重建）。 */
  evaluate(): CurveEvaluation {
    if (!this.#evaluation || this.#evaluation.revision !== this.#revision) {
      this.#evaluation = new CurveEvaluation(this.#revision, this.#document);
    }
    return this.#evaluation;
  }

  /** 整体替换文档（导入 / 外部编辑）。 */
  replaceDocument(doc: CurveDocument): void {
    validateDocument(doc);
    this.#document = doc;
    this.#bump();
  }

  /**
   * 在草稿上原地修改并提交：mutator 抛错则本次编辑整体放弃。
   * 返回提交后的文档（与 service 内部为同一引用，请勿再外部修改）。
   */
  edit(mutator: (draft: CurveDocument) => void): CurveDocument {
    const draft = cloneDocument(this.#document);
    mutator(draft);
    validateDocument(draft);
    this.#document = draft;
    this.#bump();
    return this.#document;
  }

  /** 便捷编辑：更新某个控制点。 */
  setControl(segmentIndex: number, patch: Partial<BezierControls>): void {
    this.edit((d) => {
      Object.assign(d.segments[segmentIndex], patch);
    });
  }

  /** 便捷编辑：更新关键帧时间/数值（时间需保持严格递增整数）。 */
  setKeyframe(index: number, patch: Partial<Keyframe>): void {
    this.edit((d) => {
      Object.assign(d.keyframes[index], patch);
    });
  }

  /** 便捷编辑：在 keyframes[index] 之前插入一帧及其左侧片段。 */
  insertKeyframe(index: number, keyframe: Keyframe, controls: BezierControls): void {
    this.edit((d) => {
      d.keyframes.splice(index, 0, { ...keyframe });
      d.segments.splice(
        index - 1 < 0 ? 0 : index - 1,
        0,
        { ...controls, from: 0, to: 0 },
      );
      this.#reindex(d);
    });
  }

  /** 便捷编辑：删除一帧（至少保留 2 帧）。 */
  removeKeyframe(index: number): void {
    this.edit((d) => {
      if (d.keyframes.length <= 2) {
        throw new ValidationError('至少保留 2 个关键帧');
      }
      d.keyframes.splice(index, 1);
      d.segments.splice(Math.max(0, index - 1), 1);
      this.#reindex(d);
    });
  }

  /** 检查一份旧反查结果是否仍与当前文档一致。 */
  isLookupCurrent(lookup: Lookup): boolean {
    return lookup.valid && lookup.revision === this.#revision;
  }

  onChange(listener: RevisionListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #reindex(doc: CurveDocument): void {
    doc.segments.forEach((s, i) => {
      s.from = i;
      s.to = i + 1;
    });
  }

  #bump(): void {
    if (this.#evaluation) this.#evaluation.invalid = true;
    this.#revision += 1;
    this.#evaluation = null;
    for (const l of this.#listeners) l(this.#revision, this.#document);
  }
}
