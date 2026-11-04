import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router';
import { translateDom } from '../i18n/i18n';
import { resolveRoute, type RouteMatch } from '../router/match';
import type { Page, PageContext, PageModule } from '../router/Page';
import type { RouteDef, ViewProps } from '../router/routes';
import { DURATION, EASE_IN, EASE_OUT, motionDuration } from '../utils/motion';
import { scrollToTop, useLenis } from './SmoothScroll';

/** Vertical travel (px) of the page-level fade between routes. */
const PAGE_OFFSET = 14;

type Loaded =
  | { readonly kind: 'legacy'; readonly module: PageModule }
  | { readonly kind: 'view'; readonly View: LazyExoticComponent<ComponentType<ViewProps>> };

/** One loader per route, so a route's chunk is fetched once and reused on every visit. */
const loaders = new Map<RouteDef, Promise<Loaded>>();
function load(route: RouteDef): Promise<Loaded> {
  let promise = loaders.get(route);
  if (!promise) {
    const { view, load: legacy } = route;
    if (view) {
      const chunk = view();
      const View = lazy(() => chunk);
      promise = chunk.then(() => ({ kind: 'view', View }) as const);
    } else if (legacy) {
      promise = legacy().then((module) => ({ kind: 'legacy', module }) as const);
    } else {
      promise = Promise.reject(new Error(`Route ${route.pattern} has no page`));
    }
    loaders.set(route, promise);
  }
  return promise;
}

/**
 * Hosts a legacy imperative page inside React. Mounted once per page id; later contexts on the
 * same page id go to `Page.update` (deep links inside the 3D Experience, marketing re-renders),
 * exactly as the previous router did.
 */
function LegacyPage({ module, context }: { module: PageModule; context: PageContext }): ReactNode {
  const host = useRef<HTMLDivElement>(null);
  const page = useRef<Page | null>(null);
  const first = useRef(context);

  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const instance = module.default(first.current);
    page.current = instance;
    let alive = true;
    void Promise.resolve(instance.mount(element)).then(() => {
      if (alive) translateDom(element);
    });
    return () => {
      alive = false;
      instance.unmount();
      element.replaceChildren();
      page.current = null;
    };
  }, [module]);

  useEffect(() => {
    if (context === first.current) return;
    page.current?.update?.(context);
  }, [context]);

  return <div className="route-host" ref={host} />;
}

interface Shown {
  readonly match: RouteMatch;
  readonly loaded: Loaded;
}

export interface RouteViewProps {
  readonly main: React.RefObject<HTMLElement | null>;
  readonly onShown: (match: RouteMatch) => void;
}

/**
 * Renders the route for the current hash with a calm crossfade. Navigations are effectively
 * serialised: a newer location cancels a pending one, so rapid clicks always land on the last
 * request with exactly one page mounted.
 */
export function RouteView({ main, onShown }: RouteViewProps): ReactNode {
  const location = useLocation();
  const lenis = useLenis();
  const match = useMemo(() => resolveRoute(location.pathname, location.search), [location]);
  const [shown, setShown] = useState<Shown | null>(null);
  const firstPaint = useRef(true);

  useEffect(() => {
    let cancelled = false;
    const outlet = main.current;
    const samePage = shown?.match.route.pageId === match.route.pageId;
    const run = async (): Promise<void> => {
      const leaving =
        shown && !samePage && outlet
          ? gsap
              .to(outlet, {
                opacity: 0,
                y: -PAGE_OFFSET,
                duration: motionDuration(DURATION.base),
                ease: EASE_IN,
              })
              .then()
          : Promise.resolve();
      const [loaded] = await Promise.all([load(match.route), leaving]);
      if (cancelled) return;
      // Imperative pages create ScrollTriggers in their child layout effect. Reset before
      // mounting them, so their one-shot reveals are not initialised at the departing scroll.
      if (!samePage) scrollToTop(lenis);
      // A cancelled navigation may have faded the outlet before we landed back on this page.
      if (samePage && outlet)
        gsap.to(outlet, {
          opacity: 1,
          y: 0,
          duration: motionDuration(DURATION.base),
          ease: EASE_OUT,
        });
      setShown({ match, loaded });
    };
    run().catch((error: unknown) => {
      console.error('[router] failed to load route', error);
    });
    return () => {
      cancelled = true;
    };
    // `shown` is read only to choose the transition; reacting to it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, main]);

  // After a different page commits: reset scroll, announce, fade in.
  const shownPage = shown ? shown.match.route.pageId : '';
  useLayoutEffect(() => {
    if (!shown) return;
    const outlet = main.current;
    onShown(shown.match);
    if (!outlet) return;
    scrollToTop(lenis);
    document.body.dataset.layout = shown.match.route.layout;
    if (!firstPaint.current) {
      const heading = outlet.querySelector<HTMLElement>('h1') ?? outlet;
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    gsap.fromTo(
      outlet,
      { opacity: 0, y: firstPaint.current ? 0 : PAGE_OFFSET },
      {
        opacity: 1,
        y: 0,
        duration: motionDuration(DURATION.slow),
        ease: EASE_OUT,
        clearProps: 'transform',
      },
    );
    firstPaint.current = false;
    ScrollTrigger.refresh();
    // Runs per page, not per in-place update (deep links inside the same page).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownPage, shown?.loaded]);

  // In-place updates (same page id) still re-announce the title.
  useEffect(() => {
    if (shown) onShown(shown.match);
  }, [shown, onShown]);

  if (!shown) return null;
  const { loaded, match: current } = shown;
  if (loaded.kind === 'legacy')
    return (
      <LegacyPage key={current.route.pageId} module={loaded.module} context={current.context} />
    );
  const { View } = loaded;
  return (
    <Suspense fallback={null}>
      <View key={current.route.pageId} context={current.context} />
    </Suspense>
  );
}
