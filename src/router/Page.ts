export interface PageContext {
  readonly path: string;
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
}

/**
 * A routed page. The router calls `mount` once, then `unmount` before the next page mounts.
 * Pages must release everything they create (listeners, timers, GSAP tweens, GPU resources).
 */
export interface Page {
  mount(outlet: HTMLElement): void | Promise<void>;
  /**
   * Optional in-place navigation between routes sharing the same `pageId`
   * (e.g. `/experience/stadium` → `/experience/stadium/roof`) without remounting.
   */
  update?(context: PageContext): void;
  unmount(): void;
}

export type PageFactory = (context: PageContext) => Page;

export interface PageModule {
  readonly default: PageFactory;
}
