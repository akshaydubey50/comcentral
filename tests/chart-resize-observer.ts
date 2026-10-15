import { vi } from 'vitest';

/** JSDOM has no layout engine; give responsive charts a stable measured container. */
class ChartResizeObserver implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    const contentRect = { width: 600, height: 320 } as DOMRectReadOnly;
    this.callback([{ target, contentRect } as ResizeObserverEntry], this);
  }
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ChartResizeObserver);
