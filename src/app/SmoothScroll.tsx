import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useReducedMotion } from './useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

/** Inertia of the smooth scroll: higher = snappier. Tuned for a calm, weighted glide. */
const SCROLL = { lerp: 0.085, wheelMultiplier: 0.9 } as const;

// The running scroller is an external system; components subscribe to it.
let current: Lenis | null = null;
const listeners = new Set<() => void>();
const publish = (lenis: Lenis | null): void => {
  current = lenis;
  // Review builds expose the scroller so automated QA can position the page exactly.
  if (import.meta.env.VITE_ALLOW_DEBUG !== 'false')
    (window as { __lenis?: Lenis | null }).__lenis = lenis;
  listeners.forEach((listener) => {
    listener();
  });
};
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The active smooth scroller, or null (reduced motion, immersive routes). */
export function useLenis(): Lenis | null {
  return useSyncExternalStore(subscribe, () => current);
}

/** Scroll the window to the top, through Lenis when it is running. */
export function scrollToTop(lenis: Lenis | null): void {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger and Lenis share one frame
 * clock (no drift between scroll position and scrubbed timelines). Native scrollbar, keyboard
 * and find-in-page keep working. Off under reduced motion and on immersive routes, where the
 * 3D Experience owns input.
 */
export function SmoothScroll({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}): ReactNode {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!enabled || reduced) return;
    const instance = new Lenis({ autoRaf: false, anchors: false, ...SCROLL });
    instance.on('scroll', () => {
      ScrollTrigger.update();
    });
    const tick = (time: number): void => {
      instance.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    // Lenis already smooths frame gaps; GSAP's lag smoothing would double-correct.
    gsap.ticker.lagSmoothing(0);
    publish(instance);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      instance.destroy();
      publish(null);
    };
  }, [enabled, reduced]);

  return children;
}
