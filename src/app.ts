import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { EasingService } from './easing/curve.js';
import type { CurveDocument } from './easing/model.js';
import './components/curve-editor.js';

/** 默认曲线：4 帧、间距不均；含恒值段与超调回摆段。 */
const DEFAULT_DOC: CurveDocument = {
  keyframes: [
    { time: 0, value: 0 },
    { time: 10, value: 8 },
    { time: 12, value: 8 },
    { time: 60, value: 0 },
  ],
  segments: [
    // 先冲高再回落（y 越过端点 1）
    { from: 0, to: 1, x1: 0.25, y1: 2, x2: 0.75, y2: 0.2 },
    // 恒值段：两端数值相等，阈值 8 返回时间区间
    { from: 1, to: 2, x1: 0.3, y1: 1.4, x2: 0.7, y2: -1.4 },
    // 回摆：一个片段内阈值 4 被穿过三次
    { from: 2, to: 3, x1: 0.25, y1: 2, x2: 0.75, y2: -1 },
  ],
};

@customElement('curve-app')
export class CurveApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 920px;
      margin: 0 auto;
      padding: 24px 16px 48px;
    }
    h1 {
      font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
      font-size: 18px;
      color: #6ee7ff;
      margin: 0 0 4px;
    }
    p {
      font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
      font-size: 12.5px;
      color: #8b8f99;
      margin: 0 0 14px;
    }
  `;

  private service = new EasingService(DEFAULT_DOC);

  render() {
    return html`
      <h1>Cubic Bézier Easing Editor</h1>
      <p>
        标准三次贝塞尔：单调 x(u) 反求时间，y 控制柄可越过端点；
        阈值按 y′ 极值分段求全部穿越 / 切触，恒值片段返回时间区间。
      </p>
      <curve-editor .service=${this.service}></curve-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'curve-app': CurveApp;
  }
}
