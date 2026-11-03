import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

/**
 * The motion language: how each kind of element enters and leaves. Every animated element is
 * tagged `data-motion="<kind>"`; scenes and reveals look the kinds up here, so the whole site
 * moves the same way. Times are in timeline units (see SceneStack: one scene ≈ 1 unit).
 */
export type MotionKind = 'heading' | 'lines' | 'fade' | 'image' | 'rise' | 'counter';

export const CHOREOGRAPHY = {
  /** Stagger between consecutive tagged elements in a scene. */
  cascade: 0.028,
  /** Upper bound on a scene's total cascade, so busy scenes (stats, lists) still finish on time. */
  maxCascade: 0.14,
  /** Staggers are a total `amount`, so long headings finish as quickly as short ones. */
  heading: { from: { yPercent: 108 }, charStagger: 0.12, wordStagger: 0.1, duration: 0.18 },
  lines: { from: { yPercent: 105, opacity: 0 }, stagger: 0.03, duration: 0.2 },
  rise: { from: { y: 48, opacity: 0 }, duration: 0.2 },
  /** Figures rise in while counting up from zero (approved figures only; format preserved). */
  counter: { from: { y: 32, opacity: 0 }, duration: 0.24 },
  fade: { from: { opacity: 0 }, duration: 0.2 },
  image: { from: { clipPath: 'inset(18% 14% 18% 14% round 2px)', scale: 1.22 }, duration: 0.3 },
  /** Outros: everything lifts away and thins out as the next scene takes over. */
  outro: { y: -64, opacity: 0, duration: 0.18 },
} as const;

export interface SplitResult {
  readonly targets: Element[];
  readonly split: SplitText | null;
}

/**
 * Prepare an element for its intro. Headings split into masked letters (English) or words
 * (Arabic: letter splits would break the joined script); multi-line copy splits into lines.
 * Returns the elements to animate. Splits are reverted by the owning GSAP context.
 */
export function prepare(element: HTMLElement, kind: MotionKind, rtl: boolean): SplitResult {
  if (kind === 'heading') {
    const split = SplitText.create(element, {
      type: rtl ? 'lines,words' : 'lines,words,chars',
      mask: 'lines',
      linesClass: 'reveal-line',
      aria: 'auto',
    });
    return { targets: rtl ? split.words : split.chars, split };
  }
  if (kind === 'lines') {
    const split = SplitText.create(element, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'reveal-line',
      aria: 'auto',
    });
    return { targets: split.lines, split };
  }
  return { targets: [element], split: null };
}

/** Add an element's intro to a timeline at `at`. */
export function addIntro(
  timeline: gsap.core.Timeline,
  element: HTMLElement,
  kind: MotionKind,
  rtl: boolean,
  at: number,
): void {
  const { targets } = prepare(element, kind, rtl);
  if (targets.length === 0) return;
  const ease = 'power3.out';
  switch (kind) {
    case 'heading': {
      const { from, duration, charStagger, wordStagger } = CHOREOGRAPHY.heading;
      timeline.fromTo(
        targets,
        from,
        { yPercent: 0, duration, ease, stagger: { amount: rtl ? wordStagger : charStagger } },
        at,
      );
      break;
    }
    case 'lines': {
      const { from, duration, stagger } = CHOREOGRAPHY.lines;
      timeline.fromTo(targets, from, { yPercent: 0, opacity: 1, duration, ease, stagger }, at);
      break;
    }
    case 'image': {
      const { from, duration } = CHOREOGRAPHY.image;
      const image = element.querySelector('img') ?? element;
      timeline.fromTo(
        element,
        { clipPath: from.clipPath },
        { clipPath: 'inset(0% 0% 0% 0% round 2px)', duration, ease },
        at,
      );
      timeline.fromTo(image, { scale: from.scale }, { scale: 1, duration, ease }, at);
      break;
    }
    case 'counter': {
      const { from, duration } = CHOREOGRAPHY.counter;
      timeline.fromTo(element, from, { y: 0, opacity: 1, duration, ease }, at);
      // Only true quantities count up; dates and composite facts simply rise in.
      const count = element.hasAttribute('data-count') ? countUp(element) : null;
      if (count)
        timeline.fromTo(
          count.state,
          { value: 0 },
          { value: count.target, duration, ease: 'power2.out', onUpdate: count.render },
          at,
        );
      break;
    }
    case 'rise':
    case 'fade': {
      const { from, duration } = CHOREOGRAPHY[kind];
      timeline.fromTo(element, from, { y: 0, opacity: 1, duration, ease }, at);
      break;
    }
  }
}

const NUMBER = /\d[\d,]*(?:\.\d+)?/;

/**
 * Animate the first number inside an element's text (e.g. "5.7 million m²", "2,400"),
 * keeping everything around it and its decimals and thousands separators.
 */
function countUp(
  element: HTMLElement,
): { state: { value: number }; target: number; render: () => void } | null {
  const original = element.textContent;
  const match = NUMBER.exec(original);
  if (!match) return null;
  const [raw] = match;
  const target = Number(raw.replace(/,/g, ''));
  const decimals = raw.split('.')[1]?.length ?? 0;
  const grouped = raw.includes(',');
  const state = { value: target };
  const before = original.slice(0, match.index);
  const after = original.slice(match.index + raw.length);
  return {
    state,
    target,
    render: () => {
      const value = grouped
        ? state.value.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : state.value.toFixed(decimals);
      element.textContent = `${before}${value}${after}`;
    },
  };
}

/** Add an element's outro to a timeline at `at`. */
export function addOutro(timeline: gsap.core.Timeline, element: HTMLElement, at: number): void {
  const { y, opacity, duration } = CHOREOGRAPHY.outro;
  timeline.to(element, { y, opacity, duration, ease: 'power2.in' }, at);
}

/** Delay between consecutive elements for a group of `count` elements. */
export function cascadeStep(count: number): number {
  return count > 1 ? Math.min(CHOREOGRAPHY.cascade, CHOREOGRAPHY.maxCascade / (count - 1)) : 0;
}

/** Tagged elements in document order, excluding ones inside a nested motion root. */
export function taggedElements(root: HTMLElement): { element: HTMLElement; kind: MotionKind }[] {
  return [...root.querySelectorAll<HTMLElement>('[data-motion]')].map((element) => ({
    element,
    kind: element.dataset.motion as MotionKind,
  }));
}
