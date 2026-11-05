import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { addIntro, cascadeStep, taggedElements } from './choreography';

/** Short entrances leave enough time for reading during a quick touch scroll. */
const FLOW = { start: 'top 92%', mobileSpeed: 0.5, desktopSpeed: 0.36 } as const;

/**
 * Flow content enters once and stays visible. Keep scroll-driven image depth separate from
 * text entrances: reversing a scroll must never fade a fact or an action out of the reading area.
 * The optional opening timeline lets Home wait for its brand curtain before revealing its hero.
 * Call inside a GSAP context; return the cleanup to restore counter text on preference changes.
 */
export function flowEntrances(
  root: HTMLElement,
  rtl: boolean,
  mobile: boolean,
  opening?: gsap.core.Timeline,
): () => void {
  const elements = taggedElements(root);
  const step = cascadeStep(elements.length);
  const counters: { element: HTMLElement; text: string }[] = [];
  const listeners: (() => void)[] = [];
  elements.forEach(({ element, kind }, order) => {
    if (kind === 'counter') counters.push({ element, text: element.textContent });
    // Whole text blocks on phones avoid character splitting and preserve Arabic shaping.
    const motion = mobile && (kind === 'heading' || kind === 'lines') ? 'rise' : kind;
    if (opening) {
      addIntro(opening, element, motion, rtl, order * step);
      return;
    }
    const intro = gsap.timeline({ paused: true });
    addIntro(intro, element, motion, rtl, Math.min(order * step, step));
    intro.timeScale(mobile ? FLOW.mobileSpeed : FLOW.desktopSpeed);
    const showReached = (trigger: ScrollTrigger): void => {
      if (trigger.start <= trigger.scroll()) intro.progress(1).pause();
    };
    const trigger = ScrollTrigger.create({
      trigger: element,
      start: FLOW.start,
      onEnter: () => {
        intro.play();
      },
      onRefresh: showReached,
    });
    showReached(trigger);
    // Keyboard focus must expose links immediately, even when a fling skipped their intro.
    const showFocused = (): void => {
      intro.progress(1).pause();
    };
    element.addEventListener('focusin', showFocused);
    listeners.push(() => {
      element.removeEventListener('focusin', showFocused);
    });
  });
  return () => {
    listeners.forEach((remove) => {
      remove();
    });
    counters.forEach(({ element, text }) => {
      element.textContent = text;
    });
  };
}
