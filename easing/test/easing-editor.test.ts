// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import '../src/easing-editor.js';

describe('<easing-editor> component', () => {
  it('is registered as a custom element', () => {
    expect(customElements.get('easing-editor')).toBeDefined();
  });

  it('renders the canvas and panels when connected', async () => {
    const el = document.createElement('easing-editor');
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('canvas')).toBeTruthy();
    expect(el.shadowRoot?.textContent).toContain('关键帧');
    expect(el.shadowRoot?.textContent).toContain('阈值');
    el.remove();
  });

  it('shows threshold crossings from the shared store evaluation', async () => {
    const el = document.createElement('easing-editor');
    document.body.appendChild(el);
    await el.updateComplete;
    // default spec: 0 ->(overshoot 1.6)-> 1 at t=6 ->(dip -0.8)-> 0.2 at t=14,
    // threshold 0.5 must produce at least one crossing time in the readout
    const text = el.shadowRoot?.textContent ?? '';
    expect(text).toMatch(/穿越时刻: \[\d/);
    el.remove();
  });
});
