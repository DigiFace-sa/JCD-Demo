import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

/**
 * The motion language: how each kind of element enters and leaves. Every animated element is
 * tagged `data-motion="<kind>"`; scenes and reveals look the kinds up here, so the whole site
 * moves the same way. Times are in timeline units (see SceneStack: one scene ≈ 1 unit).
 */
export type MotionKind = 'heading' | 'lines' | 'fade' | 'image' | 'rise';

export const CHOREOGRAPHY = {
  /** Stagger between consecutive tagged elements in a scene. */
  cascade: 0.045,
  heading: { from: { yPercent: 108 }, charStagger: 0.012, wordStagger: 0.04, duration: 0.32 },
  lines: { from: { yPercent: 105, opacity: 0 }, stagger: 0.035, duration: 0.3 },
  rise: { from: { y: 48, opacity: 0 }, duration: 0.3 },
  fade: { from: { opacity: 0 }, duration: 0.3 },
  image: { from: { clipPath: 'inset(18% 14% 18% 14% round 2px)', scale: 1.22 }, duration: 0.42 },
  /** Outros: everything lifts away and thins out as the next scene takes over. */
  outro: { y: -64, opacity: 0, duration: 0.28 },
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
        { yPercent: 0, duration, ease, stagger: rtl ? wordStagger : charStagger },
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
    case 'rise':
    case 'fade': {
      const { from, duration } = CHOREOGRAPHY[kind];
      timeline.fromTo(element, from, { y: 0, opacity: 1, duration, ease }, at);
      break;
    }
  }
}

/** Add an element's outro to a timeline at `at`. */
export function addOutro(timeline: gsap.core.Timeline, element: HTMLElement, at: number): void {
  const { y, opacity, duration } = CHOREOGRAPHY.outro;
  timeline.to(element, { y, opacity, duration, ease: 'power2.in' }, at);
}

/** Tagged elements in document order, excluding ones inside a nested motion root. */
export function taggedElements(root: HTMLElement): { element: HTMLElement; kind: MotionKind }[] {
  return [...root.querySelectorAll<HTMLElement>('[data-motion]')].map((element) => ({
    element,
    kind: element.dataset.motion as MotionKind,
  }));
}
