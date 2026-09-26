/**
 * easing-editor.ts — <easing-editor> Lit component.
 *
 * Canvas editor for a multi-segment cubic-bezier easing curve:
 *  - drag keyframes (time snaps to integers, stays strictly increasing)
 *  - drag the two control handles of every segment (x in [0,1], y in [-2,2])
 *  - drag the cursor line; its value comes from the shared store evaluation
 *  - drag the threshold line; crossings/touches/intervals come from the store
 *  - double-click adds a keyframe on the curve, Alt+click removes one
 *  - export produces JSON sampled through the same store evaluation
 *
 * Every edit goes through CurveStore.update*, which bumps the revision and
 * invalidates cached inverse lookups, so the drawing, the cursor readout and
 * any exported data can never disagree.
 */

import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  CONTROL_Y_MAX,
  CONTROL_Y_MIN,
  MAX_KEYFRAMES,
  MIN_KEYFRAMES,
  ThresholdSolution,
} from './easing-core.js';
import { CurveStore } from './curve-store.js';

interface View {
  left: number;
  top: number;
  width: number;
  height: number;
  t0: number;
  t1: number;
  vMin: number;
  vMax: number;
}

type DragTarget =
  | { kind: 'key'; index: number }
  | { kind: 'cp'; segment: number; which: 1 | 2 }
  | { kind: 'cursor' }
  | { kind: 'threshold' };

const PAD = { left: 52, right: 20, top: 18, bottom: 30 };

function defaultSpec() {
  return {
    keyframes: [
      { t: 0, v: 0 },
      { t: 6, v: 1 },
      { t: 14, v: 0.2 },
    ],
    controls: [
      { x1: 0.25, y1: 1.6, x2: 0.6, y2: 1 },
      { x1: 0.4, y1: 0, x2: 0.7, y2: -0.8 },
    ],
  };
}

@customElement('easing-editor')
export class EasingEditor extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #d7dde8;
      background: #14171d;
      border-radius: 10px;
      padding: 16px;
    }
    .layout {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .canvas-wrap {
      flex: 1 1 520px;
      min-width: 320px;
    }
    canvas {
      width: 100%;
      height: 440px;
      display: block;
      background: #0d1015;
      border: 1px solid #2a3040;
      border-radius: 8px;
      cursor: crosshair;
      touch-action: none;
    }
    .panel {
      flex: 0 1 300px;
      min-width: 260px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 13px;
    }
    fieldset {
      border: 1px solid #2a3040;
      border-radius: 8px;
      padding: 8px 10px;
      margin: 0;
    }
    legend {
      padding: 0 6px;
      color: #8fa3c8;
    }
    label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 2px 8px 2px 0;
    }
    input[type='number'] {
      width: 64px;
      background: #0d1015;
      color: #d7dde8;
      border: 1px solid #2a3040;
      border-radius: 4px;
      padding: 2px 4px;
    }
    button {
      background: #22314f;
      color: #d7dde8;
      border: 1px solid #38507e;
      border-radius: 6px;
      padding: 4px 10px;
      cursor: pointer;
      margin-right: 6px;
    }
    button:hover {
      background: #2c4067;
    }
    .readout {
      font-family: ui-monospace, monospace;
      font-size: 12px;
      color: #9fd3a8;
      word-break: break-all;
      white-space: pre-wrap;
    }
    textarea {
      width: 100%;
      height: 120px;
      box-sizing: border-box;
      background: #0d1015;
      color: #9fd3a8;
      border: 1px solid #2a3040;
      border-radius: 6px;
      font-family: ui-monospace, monospace;
      font-size: 11px;
    }
    .hint {
      color: #6b7a95;
    }
    .kf-row,
    .cp-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 2px 0;
      flex-wrap: wrap;
    }
    .tag {
      color: #8fa3c8;
      min-width: 44px;
      display: inline-block;
    }
  `;

  @state() private store = new CurveStore(defaultSpec());
  @state() private cursorT = 3;
  @state() private threshold = 0.5;
  @state() private exportText = '';

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private drag: DragTarget | null = null;
  private view: View | null = null;
  private unsubscribe?: () => void;

  connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribe = this.store.subscribe(() => this.requestUpdate());
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
    super.disconnectedCallback();
  }

  firstUpdated(): void {
    this.canvas = this.renderRoot.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.draw()).observe(this.canvas);
    }
    this.draw();
  }

  updated(): void {
    this.draw();
  }

  // ---- coordinate transforms ------------------------------------------------

  private computeView(): View {
    const dpr = window.devicePixelRatio || 1;
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;
    if (this.canvas.width !== cssW * dpr || this.canvas.height !== cssH * dpr) {
      this.canvas.width = cssW * dpr;
      this.canvas.height = cssH * dpr;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const spec = this.store.spec;
    const t0 = spec.keyframes[0].t;
    const t1 = spec.keyframes[spec.keyframes.length - 1].t;
    // value range: keyframes, mapped control handles and the sampled curve
    let vMin = Infinity;
    let vMax = -Infinity;
    for (const kf of spec.keyframes) {
      vMin = Math.min(vMin, kf.v);
      vMax = Math.max(vMax, kf.v);
    }
    for (let i = 0; i < spec.controls.length; i++) {
      const a = spec.keyframes[i];
      const b = spec.keyframes[i + 1];
      const c = spec.controls[i];
      vMin = Math.min(vMin, a.v + c.y1 * (b.v - a.v), a.v + c.y2 * (b.v - a.v));
      vMax = Math.max(vMax, a.v + c.y1 * (b.v - a.v), a.v + c.y2 * (b.v - a.v));
    }
    for (const s of this.store.sample(200)) {
      vMin = Math.min(vMin, s.v);
      vMax = Math.max(vMax, s.v);
    }
    vMin = Math.min(vMin, this.threshold);
    vMax = Math.max(vMax, this.threshold);
    const pad = Math.max(0.2, (vMax - vMin) * 0.12);
    return {
      left: PAD.left,
      top: PAD.top,
      width: cssW - PAD.left - PAD.right,
      height: cssH - PAD.top - PAD.bottom,
      t0,
      t1,
      vMin: vMin - pad,
      vMax: vMax + pad,
    };
  }

  private xOf(t: number): number {
    const v = this.view!;
    return v.left + ((t - v.t0) / (v.t1 - v.t0)) * v.width;
  }

  private yOf(value: number): number {
    const v = this.view!;
    return v.top + v.height - ((value - v.vMin) / (v.vMax - v.vMin)) * v.height;
  }

  private timeAt(x: number): number {
    const v = this.view!;
    return v.t0 + ((x - v.left) / v.width) * (v.t1 - v.t0);
  }

  private valueAt(y: number): number {
    const v = this.view!;
    return v.vMin + ((v.top + v.height - y) / v.height) * (v.vMax - v.vMin);
  }

  // ---- drawing ---------------------------------------------------------------

  private draw(): void {
    if (!this.ctx) return;
    this.view = this.computeView();
    const v = this.view;
    const ctx = this.ctx;
    const spec = this.store.spec;
    ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);

    // grid: integer times + horizontal levels
    ctx.strokeStyle = '#1d2330';
    ctx.fillStyle = '#5b6b8c';
    ctx.font = '10px ui-monospace, monospace';
    ctx.lineWidth = 1;
    for (let t = v.t0; t <= v.t1; t++) {
      const x = this.xOf(t);
      ctx.beginPath();
      ctx.moveTo(x, v.top);
      ctx.lineTo(x, v.top + v.height);
      ctx.stroke();
      ctx.fillText(String(t), x - 3, v.top + v.height + 14);
    }
    const levels = 6;
    for (let i = 0; i <= levels; i++) {
      const val = v.vMin + ((v.vMax - v.vMin) * i) / levels;
      const y = this.yOf(val);
      ctx.beginPath();
      ctx.moveTo(v.left, y);
      ctx.lineTo(v.left + v.width, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(2), 6, y + 3);
    }

    // threshold solution (intervals first, under everything else)
    const sol: ThresholdSolution = this.store.solveThreshold(this.threshold);
    ctx.strokeStyle = '#e0a33e';
    ctx.lineWidth = 5;
    for (const [lo, hi] of sol.intervals) {
      ctx.beginPath();
      ctx.moveTo(this.xOf(lo), this.yOf(this.threshold));
      ctx.lineTo(this.xOf(hi), this.yOf(this.threshold));
      ctx.stroke();
    }

    // the curve itself — sampled per pixel through the shared evaluation path
    ctx.strokeStyle = '#5ec1ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px <= v.width; px++) {
      const t = this.timeAt(v.left + px);
      const y = this.yOf(this.store.evaluate(t));
      if (px === 0) ctx.moveTo(v.left, y);
      else ctx.lineTo(v.left + px, y);
    }
    ctx.stroke();

    // control handles
    ctx.lineWidth = 1;
    for (let i = 0; i < spec.controls.length; i++) {
      const a = spec.keyframes[i];
      const b = spec.keyframes[i + 1];
      const c = spec.controls[i];
      const dt = b.t - a.t;
      const dv = b.v - a.v;
      const pts: Array<[number, number]> = [
        [a.t + c.x1 * dt, a.v + c.y1 * dv],
        [a.t + c.x2 * dt, a.v + c.y2 * dv],
      ];
      const anchors: Array<[number, number]> = [
        [a.t, a.v],
        [b.t, b.v],
      ];
      for (let k = 0; k < 2; k++) {
        const [ct, cv] = pts[k];
        const [at, av] = anchors[k];
        ctx.strokeStyle = '#7a5fb0';
        ctx.beginPath();
        ctx.moveTo(this.xOf(at), this.yOf(av));
        ctx.lineTo(this.xOf(ct), this.yOf(cv));
        ctx.stroke();
        ctx.fillStyle = '#b08fe8';
        ctx.beginPath();
        ctx.arc(this.xOf(ct), this.yOf(cv), 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // keyframes
    for (const kf of spec.keyframes) {
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(this.xOf(kf.t), this.yOf(kf.v), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#14171d';
      ctx.stroke();
    }

    // threshold line + crossing markers
    const ty = this.yOf(this.threshold);
    ctx.strokeStyle = '#e0a33e';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(v.left, ty);
    ctx.lineTo(v.left + v.width, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e0a33e';
    for (const t of sol.times) {
      ctx.beginPath();
      ctx.arc(this.xOf(t), ty, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // cursor
    const cx = this.xOf(this.cursorT);
    const cv = this.store.evaluate(this.cursorT);
    ctx.strokeStyle = '#7ee787';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, v.top);
    ctx.lineTo(cx, v.top + v.height);
    ctx.stroke();
    ctx.fillStyle = '#7ee787';
    ctx.beginPath();
    ctx.arc(cx, this.yOf(cv), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`t=${this.cursorT.toFixed(3)}  v=${cv.toFixed(4)}`, Math.min(cx + 8, v.left + v.width - 130), v.top + 12);
  }

  // ---- interaction ------------------------------------------------------------

  private canvasPos(e: PointerEvent | MouseEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  private hitTest(x: number, y: number): DragTarget | null {
    const spec = this.store.spec;
    for (let i = 0; i < spec.keyframes.length; i++) {
      const kf = spec.keyframes[i];
      if (Math.hypot(x - this.xOf(kf.t), y - this.yOf(kf.v)) <= 9) {
        return { kind: 'key', index: i };
      }
    }
    for (let i = 0; i < spec.controls.length; i++) {
      const a = spec.keyframes[i];
      const b = spec.keyframes[i + 1];
      const c = spec.controls[i];
      const dt = b.t - a.t;
      const dv = b.v - a.v;
      const handles: Array<[number, number, 1 | 2]> = [
        [a.t + c.x1 * dt, a.v + c.y1 * dv, 1],
        [a.t + c.x2 * dt, a.v + c.y2 * dv, 2],
      ];
      for (const [ct, cv, which] of handles) {
        if (Math.hypot(x - this.xOf(ct), y - this.yOf(cv)) <= 8) {
          return { kind: 'cp', segment: i, which };
        }
      }
    }
    if (Math.abs(x - this.xOf(this.cursorT)) <= 6) return { kind: 'cursor' };
    if (Math.abs(y - this.yOf(this.threshold)) <= 6) return { kind: 'threshold' };
    return null;
  }

  private onPointerDown(e: PointerEvent): void {
    const [x, y] = this.canvasPos(e);
    const hit = this.hitTest(x, y);
    if (hit?.kind === 'key' && e.altKey) {
      if (this.store.spec.keyframes.length > MIN_KEYFRAMES) {
        this.store.removeKeyframe(hit.index);
      }
      return;
    }
    this.drag = hit ?? { kind: 'cursor' };
    if (this.drag.kind === 'cursor') this.cursorT = this.clampTime(this.timeAt(x));
    this.canvas.setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.drag) return;
    const [x, y] = this.canvasPos(e);
    const spec = this.store.spec;
    const drag = this.drag;
    if (drag.kind === 'key') {
      const prev = spec.keyframes[drag.index - 1];
      const next = spec.keyframes[drag.index + 1];
      const lo = prev ? prev.t + 1 : -Infinity;
      const hi = next ? next.t - 1 : Infinity;
      const t = Math.min(hi, Math.max(lo, Math.round(this.timeAt(x))));
      this.store.updateKeyframe(drag.index, { t, v: this.valueAt(y) });
    } else if (drag.kind === 'cp') {
      const i = drag.segment;
      const a = spec.keyframes[i];
      const b = spec.keyframes[i + 1];
      const dt = b.t - a.t;
      const dv = b.v - a.v;
      const cx = Math.min(1, Math.max(0, (this.timeAt(x) - a.t) / dt));
      const cy =
        dv === 0
          ? 0
          : Math.min(CONTROL_Y_MAX, Math.max(CONTROL_Y_MIN, (this.valueAt(y) - a.v) / dv));
      const c = { ...spec.controls[i] };
      if (drag.which === 1) {
        c.x1 = cx;
        c.y1 = cy;
      } else {
        c.x2 = cx;
        c.y2 = cy;
      }
      this.store.updateControl(i, c);
    } else if (drag.kind === 'cursor') {
      this.cursorT = this.clampTime(this.timeAt(x));
    } else {
      this.threshold = this.valueAt(y);
    }
  }

  private onPointerUp(): void {
    this.drag = null;
  }

  private onDoubleClick(e: MouseEvent): void {
    const [x, y] = this.canvasPos(e);
    if (this.hitTest(x, y)) return;
    const spec = this.store.spec;
    if (spec.keyframes.length >= MAX_KEYFRAMES) return;
    const t = Math.round(this.timeAt(x));
    if (t <= spec.keyframes[0].t || t >= spec.keyframes[spec.keyframes.length - 1].t) return;
    if (spec.keyframes.some((k) => k.t === t)) return;
    // put the new keyframe on the curve so the shape is preserved
    this.store.insertKeyframe({ t, v: this.store.evaluate(t) });
  }

  private clampTime(t: number): number {
    const spec = this.store.spec;
    return Math.min(
      spec.keyframes[spec.keyframes.length - 1].t,
      Math.max(spec.keyframes[0].t, t),
    );
  }

  // ---- panel events -------------------------------------------------------------

  private setKeyframeT(index: number, e: Event): void {
    const t = Number((e.target as HTMLInputElement).value);
    if (!Number.isInteger(t)) return;
    const spec = this.store.spec;
    const prev = spec.keyframes[index - 1];
    const next = spec.keyframes[index + 1];
    if ((prev && t <= prev.t) || (next && t >= next.t)) return;
    this.store.updateKeyframe(index, { t, v: spec.keyframes[index].v });
  }

  private setKeyframeV(index: number, e: Event): void {
    const v = Number((e.target as HTMLInputElement).value);
    if (!Number.isFinite(v)) return;
    this.store.updateKeyframe(index, { t: this.store.spec.keyframes[index].t, v });
  }

  private setControl(segment: number, field: 'x1' | 'y1' | 'x2' | 'y2', e: Event): void {
    const value = Number((e.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    const c = { ...this.store.spec.controls[segment], [field]: value };
    try {
      this.store.updateControl(segment, c);
    } catch {
      /* out-of-range input rejected by validation; keep the old value */
    }
  }

  private addKeyframe(): void {
    const spec = this.store.spec;
    if (spec.keyframes.length >= MAX_KEYFRAMES) return;
    // largest gap
    let best = 0;
    let gap = -1;
    for (let i = 0; i < spec.keyframes.length - 1; i++) {
      const g = spec.keyframes[i + 1].t - spec.keyframes[i].t;
      if (g > gap) {
        gap = g;
        best = i;
      }
    }
    if (gap < 2) return;
    const t = spec.keyframes[best].t + Math.floor(gap / 2);
    this.store.insertKeyframe({ t, v: this.store.evaluate(t) });
  }

  private reset(): void {
    this.store.update(defaultSpec());
    this.cursorT = 3;
    this.threshold = 0.5;
    this.exportText = '';
  }

  private doExport(): void {
    const sol = this.store.solveThreshold(this.threshold);
    const payload = {
      revision: this.store.currentRevision,
      spec: this.store.spec,
      cursor: { t: this.cursorT, v: this.store.evaluate(this.cursorT) },
      threshold: {
        value: this.threshold,
        times: sol.times,
        intervals: sol.intervals,
      },
      samples: this.store.sample(200),
    };
    this.exportText = JSON.stringify(payload, null, 1);
  }

  private download(): void {
    if (!this.exportText) this.doExport();
    const blob = new Blob([this.exportText], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'easing-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---- rendering ----------------------------------------------------------------

  render() {
    const spec = this.store.spec;
    const sol = this.store.solveThreshold(this.threshold);
    const cursorV = this.store.evaluate(this.cursorT);
    const fmt = (n: number) => Number(n.toFixed(6)).toString();
    return html`
      <div class="layout">
        <div class="canvas-wrap">
          <canvas
            @pointerdown=${this.onPointerDown}
            @pointermove=${this.onPointerMove}
            @pointerup=${this.onPointerUp}
            @pointerleave=${this.onPointerUp}
            @dblclick=${this.onDoubleClick}
          ></canvas>
          <div class="hint" style="color:#6b7a95;font-size:12px;margin-top:6px">
            拖动关键帧 / 控制柄 / 绿线游标 / 橙色阈值线；双击空白处在曲线上添加关键帧；Alt+点击关键帧删除。
          </div>
        </div>
        <div class="panel">
          <fieldset>
            <legend>游标 / 阈值</legend>
            <label>t
              <input type="number" step="0.1" .value=${String(this.cursorT)}
                @change=${(e: Event) => {
                  this.cursorT = this.clampTime(Number((e.target as HTMLInputElement).value));
                }} />
            </label>
            <span class="readout">v=${cursorV.toFixed(6)}</span><br />
            <label>阈值
              <input type="number" step="0.05" .value=${String(this.threshold)}
                @change=${(e: Event) => {
                  this.threshold = Number((e.target as HTMLInputElement).value);
                }} />
            </label>
            <div class="readout">
              穿越时刻: [${sol.times.map(fmt).join(', ')}]
              ${sol.intervals.length
                ? html`<br />恒等区间: ${sol.intervals.map(([a, b]) => `[${fmt(a)}, ${fmt(b)}]`).join(', ')}`
                : ''}
            </div>
          </fieldset>
          <fieldset>
            <legend>关键帧 (${spec.keyframes.length}/${MAX_KEYFRAMES})</legend>
            ${spec.keyframes.map(
              (kf, i) => html`
                <div class="kf-row">
                  <span class="tag">#${i}</span>
                  <label>t
                    <input type="number" step="1" .value=${String(kf.t)}
                      @change=${(e: Event) => this.setKeyframeT(i, e)} />
                  </label>
                  <label>v
                    <input type="number" step="0.01" .value=${String(kf.v)}
                      @change=${(e: Event) => this.setKeyframeV(i, e)} />
                  </label>
                </div>
              `,
            )}
            <button @click=${this.addKeyframe}>添加关键帧</button>
            <button @click=${this.reset}>重置</button>
          </fieldset>
          <fieldset>
            <legend>控制点 (x∈[0,1], y∈[${CONTROL_Y_MIN},${CONTROL_Y_MAX}])</legend>
            ${spec.controls.map(
              (c, i) => html`
                <div class="cp-row">
                  <span class="tag">段 ${i}</span>
                  ${(['x1', 'y1', 'x2', 'y2'] as const).map(
                    (f) => html`
                      <label>${f}
                        <input type="number" step="0.01" .value=${c[f].toFixed(3)}
                          @change=${(e: Event) => this.setControl(i, f, e)} />
                      </label>
                    `,
                  )}
                </div>
              `,
            )}
          </fieldset>
          <fieldset>
            <legend>导出 (与画布/游标同一求值结果, rev ${this.store.currentRevision})</legend>
            <button @click=${this.doExport}>生成 JSON</button>
            <button @click=${this.download}>下载</button>
            <textarea readonly .value=${this.exportText}></textarea>
          </fieldset>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'easing-editor': EasingEditor;
  }
}
