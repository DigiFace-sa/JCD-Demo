/**
 * Hash router (`#/path?query`). Hash routing is deliberate: the pitch build must run
 * from any static server with no rewrite rules.
 *
 * Navigations are serialised: if the hash changes mid-transition, the router finishes
 * the current transition and then renders the latest hash, so rapid clicks can never
 * leave two pages mounted or a page half-faded.
 */
import { gsap } from 'gsap';
import { onLangChange, t, translateDom } from '../i18n/i18n';
import { DURATION, EASE_IN, EASE_OUT, motionDuration } from '../utils/motion';
import type { Page, PageContext } from './Page';
import { type Layout, type RouteDef, notFoundRoute, routes } from './routes';

/** Vertical offset (px) for the incoming page's entrance. */
const PAGE_ENTER_OFFSET = 12;

export interface RouteChange {
  readonly path: string;
  readonly pageId: string;
  readonly layout: Layout;
}

type RouteListener = (change: RouteChange) => void;

interface Match {
  readonly route: RouteDef;
  readonly context: PageContext;
}

interface Mounted {
  readonly route: RouteDef;
  readonly page: Page;
  context: PageContext;
}

function parseHash(hash: string): { path: string; query: URLSearchParams } {
  const raw = hash.replace(/^#/, '');
  const queryIndex = raw.indexOf('?');
  const pathPart = queryIndex === -1 ? raw : raw.slice(0, queryIndex);
  const queryPart = queryIndex === -1 ? '' : raw.slice(queryIndex + 1);
  const trimmed = pathPart.replace(/\/+$/, '');
  return {
    path: trimmed.startsWith('/') ? trimmed : `/${trimmed}`,
    query: new URLSearchParams(queryPart),
  };
}

function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (const [index, patternPart] of patternParts.entries()) {
    const pathPart = pathParts[index] ?? '';
    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }
  return params;
}

export class Router {
  private mounted: Mounted | null = null;
  private rendering = false;
  private renderAgain = false;
  private readonly listeners = new Set<RouteListener>();

  constructor(private readonly outlet: HTMLElement) {}

  start(): void {
    if (!window.location.hash) window.history.replaceState(null, '', '#/');
    window.addEventListener('hashchange', () => {
      void this.handleHashChange();
    });
    onLangChange(() => {
      this.updateTitle();
    });
    void this.handleHashChange();
  }

  /** Programmatic navigation, e.g. `router.navigate('/experience/stadium')`. */
  navigate(path: string): void {
    window.location.hash = `#${path}`;
  }

  onChange(listener: RouteListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async handleHashChange(): Promise<void> {
    if (this.rendering) {
      this.renderAgain = true;
      return;
    }
    this.rendering = true;
    this.renderAgain = false;
    try {
      do {
        await this.render(this.resolve(window.location.hash));
      } while (this.takePendingRender());
    } finally {
      this.rendering = false;
    }
  }

  /** True (once) if the hash changed while the previous render was in progress. */
  private takePendingRender(): boolean {
    const pending = this.renderAgain;
    this.renderAgain = false;
    return pending;
  }

  private resolve(hash: string): Match {
    const { path, query } = parseHash(hash);
    for (const route of routes) {
      const params = matchPattern(route.pattern, path);
      if (params && (!route.validate || route.validate(params))) {
        return { route, context: { path, params, query } };
      }
    }
    return { route: notFoundRoute, context: { path, params: {}, query } };
  }

  private async render({ route, context }: Match): Promise<void> {
    const previous = this.mounted;

    // Same page, different params: let the page navigate in place.
    if (previous && previous.route.pageId === route.pageId && previous.page.update) {
      previous.page.update(context);
      this.mounted = { route, page: previous.page, context };
      this.afterNavigate();
      return;
    }

    const [module] = await Promise.all([
      route.load().catch(() => notFoundRoute.load()),
      previous ? this.fadeOut() : Promise.resolve(),
    ]);

    previous?.page.unmount();
    this.outlet.replaceChildren();
    document.body.dataset.layout = route.layout;

    const page = module.default(context);
    await page.mount(this.outlet);
    translateDom(this.outlet);
    this.mounted = { route, page, context };

    window.scrollTo(0, 0);
    if (previous) this.focusOutlet();
    this.afterNavigate();
    await this.fadeIn();
  }

  private afterNavigate(): void {
    this.updateTitle();
    if (!this.mounted) return;
    const { route, context } = this.mounted;
    const change: RouteChange = { path: context.path, pageId: route.pageId, layout: route.layout };
    this.listeners.forEach((listener) => {
      listener(change);
    });
  }

  private updateTitle(): void {
    if (!this.mounted) return;
    const siteName = t('meta.siteName');
    const key = this.mounted.route.title(this.mounted.context.params);
    document.title = key ? `${t(key)}${t('meta.titleSeparator')}${siteName}` : siteName;
  }

  /** Move focus to the new page's heading (or the outlet) so screen readers announce it. */
  private focusOutlet(): void {
    const target = this.outlet.querySelector<HTMLElement>('h1') ?? this.outlet;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  private fadeOut(): Promise<void> {
    return new Promise((resolve) => {
      gsap.to(this.outlet, {
        opacity: 0,
        duration: motionDuration(DURATION.base * 0.75),
        ease: EASE_IN,
        onComplete: resolve,
      });
    });
  }

  private fadeIn(): Promise<void> {
    return new Promise((resolve) => {
      gsap.fromTo(
        this.outlet,
        { opacity: 0, y: PAGE_ENTER_OFFSET },
        {
          opacity: 1,
          y: 0,
          duration: motionDuration(DURATION.slow),
          ease: EASE_OUT,
          clearProps: 'transform',
          onComplete: resolve,
        },
      );
    });
  }
}
