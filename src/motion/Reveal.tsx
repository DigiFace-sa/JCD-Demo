import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, type ReactNode } from 'react';
import { useI18n } from '../app/i18n';
import { useReducedMotion } from '../app/useReducedMotion';
import { addIntro, cascadeStep, CHOREOGRAPHY, taggedElements } from './choreography';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Where an element's intro plays, and the band over which it scrubs out at the top. */
const REVEAL = {
  start: 'top 82%',
  // Outro keys off the element's bottom, so tall pictures stay until they have mostly passed.
  outroStart: 'bottom 32%',
  outroEnd: 'bottom 4%',
  timeScale: 0.32,
} as const;

/**
 * Normal-flow section motion (outside a SceneStack). Each `data-motion` child plays its intro as
 * it enters (reversing if scrolled back above it), then scrubs its outro as it leaves the top
 * of the viewport. Reduced motion: content is simply shown.
 */
export function Reveal({
  as: Tag = 'section',
  className,
  children,
  label,
}: {
  as?: 'section' | 'div' | 'article';
  className?: string;
  label?: string;
  children: ReactNode;
}): ReactNode {
  const { lang, rtl } = useI18n();
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element || reduced) return;
      const elements = taggedElements(element);
      const step = cascadeStep(elements.length);
      elements.forEach(({ element: child, kind }, order) => {
        const intro = gsap.timeline({ paused: true });
        addIntro(intro, child, kind, rtl, order * step);
        intro.timeScale(REVEAL.timeScale);
        ScrollTrigger.create({
          trigger: child,
          start: REVEAL.start,
          onEnter: () => intro.play(),
          onLeaveBack: () => intro.reverse(),
        });
        gsap.to(child, {
          y: CHOREOGRAPHY.outro.y,
          opacity: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: child,
            start: REVEAL.outroStart,
            end: REVEAL.outroEnd,
            scrub: true,
          },
        });
      });
    },
    { scope: root, dependencies: [lang, reduced], revertOnUpdate: true },
  );

  return (
    <Tag className={className} ref={root as React.RefObject<never>} aria-label={label} key={lang}>
      {children}
    </Tag>
  );
}
