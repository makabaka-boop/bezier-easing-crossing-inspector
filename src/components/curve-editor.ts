import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TemplateResult } from 'lit';
import type {
  CursorLookup,
  ThresholdLookup,
} from '../easing/curve.js';
import { EasingService } from '../easing/curve.js';
import {
  MAX_KEYFRAMES,
  MIN_KEYFRAMES,
  type Keyframe,
} from '../easing/model.js';

interface DragState {
  kind: 'keyframe' | 'handle';
  segment: number;
  point: 'p1' | 'p2';
  keyframe?: number;
}

const VB_W = 800;
const VB_H = 460;
const M = { top: 24, right: 28, bottom: 44, left: 56 };
const PLOT_W = VB_W - M.left - M.right;
const PLOT_H = VB_H - M.top - M.bottom;

/**
 * 离线贝塞尔曲线编辑器。
 *
 * 画布上的曲线、游标读数、阈值命中与导出数据全部取自 EasingService
 * 当前 revision 的同一份 CurveEvaluation；任意编辑（拖拽 / 表单）提交后
 * revision 推进，旧求值与旧反查结果立即失效，画面整体重绘。
 */
@customElement('curve-editor')
export class CurveEditor extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;
      color: #e6e6e6;
      background: #1e1f24;
      border: 1px solid #34363d;
      border-radius: 10px;
      padding: 14px;
    }
    svg {
      width: 100%;
      height: auto;
      display: block;
      background: #17181c;
      border-radius: 8px;
      touch-action: none;
      user-select: none;
    }
    .grid-line {
      stroke: #26282f;
      stroke-width: 1;
    }
    .axis-label {
      fill: #8b8f99;
      font-size: 11px;
    }
    .curve {
      fill: none;
      stroke: #6ee7ff;
      stroke-width: 2.4;
      stroke-linejoin: round;
    }
    .handle-line {
      stroke: #6b7280;
      stroke-width: 1;
      stroke-dasharray: 4 3;
    }
    .handle {
      fill: #f5b942;
      stroke: #17181c;
      stroke-width: 1.5;
      cursor: grab;
    }
    .handle:hover { fill: #ffd479; }
    .keyframe {
      fill: #ffffff;
      stroke: #111318;
      stroke-width: 2;
      cursor: grab;
    }
    .keyframe:hover { fill: #6ee7ff; }
    .threshold-line {
      stroke: #f472b6;
      stroke-width: 1.6;
      stroke-dasharray: 7 4;
      cursor: ns-resize;
    }
    .threshold-hit {
      fill: #f472b6;
      stroke: #17181c;
      stroke-width: 1.5;
    }
    .interval-band {
      fill: #f472b6;
      fill-opacity: 0.16;
    }
    .cursor-line {
      stroke: #4ade80;
      stroke-width: 1.6;
      cursor: ew-resize;
    }
    .cursor-dot {
      fill: #4ade80;
      stroke: #17181c;
      stroke-width: 1.5;
    }
    .panel {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px 18px;
      margin-top: 12px;
      font-size: 12.5px;
    }
    .card {
      background: #17181c;
      border: 1px solid #2c2e35;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .card h3 {
      margin: 0 0 6px;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #8b8f99;
    }
    .kv { display: flex; justify-content: space-between; gap: 8px; }
    .kv + .kv { margin-top: 3px; }
    .kv b { color: #6ee7ff; font-weight: 600; }
    input[type='number'] {
      width: 64px;
      background: #101114;
      border: 1px solid #34363d;
      border-radius: 5px;
      color: #e6e6e6;
      font: inherit;
      padding: 2px 6px;
    }
    button {
      background: #2b2e36;
      border: 1px solid #3a3d46;
      color: #e6e6e6;
      border-radius: 6px;
      padding: 4px 10px;
      font: inherit;
      cursor: pointer;
    }
    button:hover { background: #363a44; }
    .row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
    .seg-row {
      border-top: 1px dashed #2c2e35;
      padding-top: 6px;
      margin-top: 6px;
    }
    .error {
      color: #f87171;
      font-size: 12px;
      min-height: 16px;
      margin-top: 8px;
    }
  `;

  @property({ attribute: false })
  service!: EasingService;

  @state() private cursorTime = 0;
  @state() private threshold = 0;
  @state() private error = '';
  @state() private drag: DragState | null = null;
  /** 编辑回调自增此版本号，触发 Lit 重渲染（求值仍走同一份 evaluate()）。 */
  @state() private viewRevision = 0;

  private unsubscribe: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    const [t0, tn] = this.service.evaluate().duration;
    this.cursorTime = (t0 + tn) / 2;
    this.viewRevision = this.service.revision;
    this.unsubscribe = this.service.onChange(() => {
      this.viewRevision = this.service.revision;
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  /** 当前 revision 的唯一求值入口。读取 viewRevision 以建立 Lit 重渲染依赖。 */
  private get eval_() {
    void this.viewRevision;
    return this.service.evaluate();
  }

  private get doc() {
    return this.eval_.document;
  }

  // ---- 坐标变换：曲线空间 ↔ SVG 像素（viewBox 坐标） ----

  private get valueRange(): [number, number] {
    const vals = this.doc.keyframes.map((k) => k.value);
    // 控制柄的归一化 y（[-2,2]）映射到所在片段两端数值后纳入视野，
    // 与曲线本身使用同一数据坐标系。
    for (const s of this.doc.segments) {
      const from = this.doc.keyframes[s.from].value;
      const to = this.doc.keyframes[s.to].value;
      vals.push(from + (to - from) * s.y1, from + (to - from) * s.y2);
    }
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (Math.abs(hi - lo) < 1e-9) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.08;
    return [lo - pad, hi + pad];
  }

  /** 归一化控制柄 y 映射到所在片段的数据值。 */
  private handleValue(segment: number, cy: number): number {
    const s = this.doc.segments[segment];
    const from = this.doc.keyframes[s.from].value;
    const to = this.doc.keyframes[s.to].value;
    return from + (to - from) * cy;
  }

  private tx(time: number): number {
    const [t0, tn] = this.eval_.duration;
    return M.left + ((time - t0) / (tn - t0)) * PLOT_W;
  }

  private ty(value: number): number {
    const [lo, hi] = this.valueRange;
    return M.top + (1 - (value - lo) / (hi - lo)) * PLOT_H;
  }

  private inverseTx(x: number): number {
    const [t0, tn] = this.eval_.duration;
    return t0 + ((x - M.left) / PLOT_W) * (tn - t0);
  }

  private inverseTy(y: number): number {
    const [lo, hi] = this.valueRange;
    return lo + (1 - (y - M.top) / PLOT_H) * (hi - lo);
  }

  // ---- 指针交互 ----

  private svgPoint(e: PointerEvent): { x: number; y: number } {
    const svg = this.renderRoot.querySelector('svg')!;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * VB_W,
      y: ((e.clientY - rect.top) / rect.height) * VB_H,
    };
  }

  private onPointerMoveDoc = (e: PointerEvent) => {
    if (!this.drag) return;
    const p = this.svgPoint(e);
    this.error = '';
    try {
      if (this.drag.kind === 'keyframe') {
        const i = this.drag.keyframe!;
        const kfs = this.doc.keyframes;
        const [t0, tn] = this.eval_.duration;
        let t = Math.round(this.inverseTx(p.x));
        t = Math.max(t0, Math.min(tn, t));
        if (i > 0) t = Math.max(t, kfs[i - 1].time + 1);
        if (i < kfs.length - 1) t = Math.min(t, kfs[i + 1].time - 1);
        this.service.setKeyframe(i, { time: t, value: this.inverseTy(p.y) });
      } else {
        // 控制柄 x 在该片段的时间跨度内归一化到 [0,1]。
        const seg = this.doc.segments[this.drag.segment];
        const ax = this.tx(this.doc.keyframes[seg.from].time);
        const bx = this.tx(this.doc.keyframes[seg.to].time);
        const x = Math.max(0, Math.min(1, (p.x - ax) / (bx - ax)));
        // 指针在数据坐标系中的 y 反归一化到控制柄的 [-2,2]。
        const from = this.doc.keyframes[seg.from].value;
        const to = this.doc.keyframes[seg.to].value;
        const dataY = this.inverseTy(p.y);
        const cy = to === from
          ? Math.max(-2, Math.min(2, dataY))
          : Math.max(-2, Math.min(2, (dataY - from) / (to - from)));
        const patch = this.drag.point === 'p1'
          ? { x1: x, y1: cy }
          : { x2: x, y2: cy };
        this.service.setControl(this.drag.segment, patch);
      }
    } catch (err) {
      this.error = (err as Error).message;
    }
  };

  private endDrag = () => {
    this.drag = null;
    window.removeEventListener('pointermove', this.onPointerMoveDoc);
    window.removeEventListener('pointerup', this.endDrag);
  };

  private startDrag(state: DragState) {
    return (e: PointerEvent) => {
      e.preventDefault();
      this.drag = state;
      window.addEventListener('pointermove', this.onPointerMoveDoc);
      window.addEventListener('pointerup', this.endDrag);
    };
  }

  private onSvgPointerDown = (e: PointerEvent) => {
    const p = this.svgPoint(e);
    // 点击绘图区空白处：移动游标（命中具体元素时其处理器会 stopPropagation）
    if (p.x >= M.left && p.x <= M.left + PLOT_W
      && p.y >= M.top && p.y <= M.top + PLOT_H) {
      this.cursorTime = this.clampTime(this.inverseTx(p.x));
    }
  };

  private dragCursor = (e: PointerEvent) => {
    const p = this.svgPoint(e);
    this.cursorTime = this.clampTime(this.inverseTx(p.x));
  };

  private dragThreshold = (e: PointerEvent) => {
    const p = this.svgPoint(e);
    this.threshold = this.inverseTy(p.y);
  };

  private clampTime(t: number): number {
    const [t0, tn] = this.eval_.duration;
    return Math.max(t0, Math.min(tn, t));
  }

  // ---- 编辑操作 ----

  private updateKeyframe(i: number, field: keyof Keyframe, raw: string) {
    const v = Number(raw);
    if (!Number.isFinite(v)) return;
    this.error = '';
    try {
      this.service.setKeyframe(i, { [field]: field === 'time' ? Math.round(v) : v });
    } catch (err) {
      this.error = (err as Error).message;
    }
  }

  private addKeyframe() {
    const ev = this.eval_;
    if (ev.keyframes.length >= MAX_KEYFRAMES) {
      this.error = `最多 ${MAX_KEYFRAMES} 个关键帧`;
      return;
    }
    // 在最大间隙中间插入，时间取整。
    let gap = -1;
    let gapLen = -1;
    for (let i = 0; i < ev.segments.length; i++) {
      const len = ev.keyframes[i + 1].time - ev.keyframes[i].time;
      if (len > gapLen && len >= 2) {
        gapLen = len;
        gap = i;
      }
    }
    if (gap < 0) {
      this.error = '没有可插入整数时间的间隙';
      return;
    }
    const t0 = ev.keyframes[gap].time;
    const t1 = ev.keyframes[gap + 1].time;
    const time = t0 + Math.floor((t1 - t0) / 2);
    const value = ev.valueAt(time);
    this.error = '';
    try {
      this.service.insertKeyframe(
        gap + 1,
        { time, value },
        { x1: 1 / 3, y1: 0, x2: 2 / 3, y2: 1 },
      );
    } catch (err) {
      this.error = (err as Error).message;
    }
  }

  private removeKeyframe(i: number) {
    if (this.eval_.keyframes.length <= MIN_KEYFRAMES) return;
    this.error = '';
    try {
      this.service.removeKeyframe(i);
    } catch (err) {
      this.error = (err as Error).message;
    }
  }

  private exportJson() {
    const data = this.eval_.export();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curve-rev${data.revision}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.dispatchEvent(
      new CustomEvent('curve-export', { detail: data, bubbles: true }),
    );
  }

  // ---- 渲染 ----

  render(): TemplateResult {
    const ev = this.eval_;
    const [t0, tn] = ev.duration;
    const [vlo, vhi] = this.valueRange;
    const cursor: CursorLookup = ev.cursorAt(this.cursorTime);
    const hits: ThresholdLookup = ev.thresholdAt(this.threshold);

    const path = ev.samples
      .map((s, i) => `${i === 0 ? 'M' : 'L'}${this.tx(s.time).toFixed(2)},${this.ty(s.value).toFixed(2)}`)
      .join(' ');

    const xTicks = Array.from({ length: 6 }, (_, i) => {
      const t = t0 + ((tn - t0) * i) / 5;
      return { t, x: this.tx(t) };
    });
    const yTicks = Array.from({ length: 5 }, (_, i) => {
      const v = vlo + ((vhi - vlo) * i) / 4;
      return { v, y: this.ty(v) };
    });

    return html`
      <svg
        viewBox="0 0 ${VB_W} ${VB_H}"
        @pointerdown=${this.onSvgPointerDown}
      >
        <!-- 网格 -->
        ${xTicks.map(({ t, x }) => html`
          <line class="grid-line" x1=${x} y1=${M.top} x2=${x} y2=${M.top + PLOT_H} />
          <text class="axis-label" x=${x} y=${M.top + PLOT_H + 18} text-anchor="middle">${t.toFixed(0)}</text>
        `)}
        ${yTicks.map(({ v, y }) => html`
          <line class="grid-line" x1=${M.left} y1=${y} x2=${M.left + PLOT_W} y2=${y} />
          <text class="axis-label" x=${M.left - 8} y=${y + 4} text-anchor="end">${v.toFixed(2)}</text>
        `)}
        <rect
          x=${M.left} y=${M.top} width=${PLOT_W} height=${PLOT_H}
          fill="none" stroke="#34363d"
        />

        <!-- 阈值命中：恒值区间色带 -->
        ${hits.intervals.map((iv) => html`
          <rect class="interval-band"
            x=${this.tx(iv.start)} y=${M.top}
            width=${this.tx(iv.end) - this.tx(iv.start)} height=${PLOT_H} />
        `)}

        <!-- 曲线 -->
        <path class="curve" d=${path} />

        <!-- 控制柄 -->
        ${ev.segments.map((seg, i) => {
          const a = { x: this.tx(ev.keyframes[i].time), y: this.ty(ev.keyframes[i].value) };
          const b = { x: this.tx(ev.keyframes[i + 1].time), y: this.ty(ev.keyframes[i + 1].value) };
          // 控制柄画在与曲线相同的“时间-数值”坐标系中：
          // 水平方向在片段时间内按 x1/x2 线性定位。
          const p1x = a.x + (b.x - a.x) * seg.x1;
          const p2x = a.x + (b.x - a.x) * seg.x2;
          // 控制柄画在与曲线相同的“时间-数值”坐标系中：
          // 归一化 y 经两端数值映射后再投影。
          const p1y = this.ty(this.handleValue(i, seg.y1));
          const p2y = this.ty(this.handleValue(i, seg.y2));
          return html`
            <line class="handle-line" x1=${a.x} y1=${a.y} x2=${p1x} y2=${p1y} />
            <line class="handle-line" x1=${b.x} y1=${b.y} x2=${p2x} y2=${p2y} />
            <circle class="handle" r="6" cx=${p1x} cy=${p1y}
              @pointerdown=${this.startDrag({ kind: 'handle', segment: i, point: 'p1' })} />
            <circle class="handle" r="6" cx=${p2x} cy=${p2y}
              @pointerdown=${this.startDrag({ kind: 'handle', segment: i, point: 'p2' })} />
          `;
        })}

        <!-- 阈值线（可上下拖） -->
        <line class="threshold-line"
          x1=${M.left} y1=${this.ty(this.threshold)}
          x2=${M.left + PLOT_W} y2=${this.ty(this.threshold)}
          @pointerdown=${(e: PointerEvent) => {
            e.stopPropagation();
            const winMove = (ev2: PointerEvent) => this.dragThreshold(ev2);
            window.addEventListener('pointermove', winMove);
            window.addEventListener(
              'pointerup',
              () => window.removeEventListener('pointermove', winMove),
              { once: true },
            );
          }}
        />
        ${hits.points.map((t) => html`
          <circle class="threshold-hit" r="5"
            cx=${this.tx(t)} cy=${this.ty(this.threshold)} />
        `)}

        <!-- 游标（可左右拖） -->
        <line class="cursor-line"
          x1=${this.tx(cursor.time)} y1=${M.top}
          x2=${this.tx(cursor.time)} y2=${M.top + PLOT_H}
          @pointerdown=${(e: PointerEvent) => {
            e.stopPropagation();
            const winMove = (ev2: PointerEvent) => this.dragCursor(ev2);
            window.addEventListener('pointermove', winMove);
            window.addEventListener('pointerup', () => window.removeEventListener('pointermove', winMove), { once: true });
          }}
        />
        <circle class="cursor-dot" r="6"
          cx=${this.tx(cursor.time)} cy=${this.ty(cursor.value)}
          pointer-events="none" />

        <!-- 关键帧（最后画，便于点选） -->
        ${ev.keyframes.map((kf, i) => html`
          <circle class="keyframe" r="7"
            cx=${this.tx(kf.time)} cy=${this.ty(kf.value)}
            @pointerdown=${this.startDrag({ kind: 'keyframe', segment: 0, point: 'p1', keyframe: i })} />
        `)}
      </svg>

      ${this.renderPanel(ev, cursor, hits)}
      ${this.error ? html`<div class="error">${this.error}</div>` : nothing}
    `;
  }

  private renderPanel(
    ev: ReturnType<EasingService['evaluate']>,
    cursor: CursorLookup,
    hits: ThresholdLookup,
  ): TemplateResult {
    return html`
      <div class="panel">
        <div class="card">
          <h3>游标（同一求值）</h3>
          <div class="kv"><span>time</span><b>${cursor.time.toFixed(3)}</b></div>
          <div class="kv"><span>value</span><b>${cursor.value.toFixed(6)}</b></div>
          <div class="kv"><span>segment / u</span><b>${cursor.segmentIndex} · ${cursor.u.toFixed(5)}</b></div>
          <div class="kv"><span>revision</span><b>${ev.revision}${cursor.valid ? '' : '（已失效）'}</b></div>
        </div>

        <div class="card">
          <h3>阈值反查</h3>
          <div class="row">
            threshold
            <input type="number" step="0.1" .value=${this.threshold.toFixed(3)}
              @input=${(e: Event) => {
                const v = Number((e.target as HTMLInputElement).value);
                if (Number.isFinite(v)) this.threshold = v;
              }} />
          </div>
          <div class="kv"><span>穿越/切触点</span><b>${hits.points.length} 个</b></div>
          <div class="kv"><span>恒值区间</span><b>${hits.intervals.length} 段</b></div>
          <div class="kv"><span>时刻</span>
            <b style="font-size:11px;max-width:140px;text-align:right;">
              ${hits.points.map((t) => t.toFixed(4)).join(', ') || '—'}
            </b>
          </div>
          ${hits.intervals.map((iv) => html`
            <div class="kv"><span>区间</span><b>[${iv.start}, ${iv.end}]</b></div>
          `)}
        </div>

        <div class="card" style="grid-column: 1 / -1;">
          <h3>关键帧与控制点（2～${MAX_KEYFRAMES} 帧，时间严格递增整数）</h3>
          ${ev.keyframes.map((kf, i) => html`
            <div class="row">
              <span>帧 ${i}</span>
              t=<input type="number" step="1" .value=${String(kf.time)}
                @change=${(e: Event) => this.updateKeyframe(i, 'time', (e.target as HTMLInputElement).value)} />
              v=<input type="number" step="0.1" .value=${kf.value.toFixed(3)}
                @change=${(e: Event) => this.updateKeyframe(i, 'value', (e.target as HTMLInputElement).value)} />
              ${i >= 2 || ev.keyframes.length > MIN_KEYFRAMES
                ? html`<button @click=${() => this.removeKeyframe(i)}>删除</button>`
                : nothing}
            </div>
          `)}
          <div class="row">
            <button @click=${this.addKeyframe}>插入关键帧</button>
            <button @click=${this.exportJson}>导出 JSON</button>
            <span class="axis-label">橙色点为控制柄（x 0~1 / y -2~2，可拖）</span>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'curve-editor': CurveEditor;
  }
}
