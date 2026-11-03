/**
 * Motion constants for GSAP. Keep in sync with the motion tokens in styles/tokens.css.
 * Easing is deliberately calm: no back/elastic/bounce curves anywhere.
 */
export const EASE_OUT = 'power3.out';
export const EASE_IN = 'power2.in';
export const EASE_IN_OUT = 'power2.inOut';

export const DURATION = {
  fast: 0.2,
  base: 0.4,
  slow: 0.7,
} as const;

/** Near-instant duration used in place of animations under reduced motion. */
export const REDUCED_DURATION = 0.01;

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

export function prefersReducedMotion(): boolean {
  return reducedMotionQuery.matches;
}

/** Returns `seconds`, or a near-zero duration when the user prefers reduced motion. */
export function motionDuration(seconds: number): number {
  return prefersReducedMotion() ? REDUCED_DURATION : seconds;
}
