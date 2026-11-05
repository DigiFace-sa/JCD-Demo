import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, type ReactNode } from 'react';
import { useI18n } from '../app/i18n';
import { useMediaQuery } from '../app/useMediaQuery';
import { useReducedMotion } from '../app/useReducedMotion';
import { flowEntrances } from './flowMotion';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Shared, persistent reading entrances for marketing pages; phones use whole text blocks. */
export function FlowReveal({
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
  const mobile = useMediaQuery('(max-width: 60rem)');
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (!root.current || reduced) return;
      return flowEntrances(root.current, rtl, mobile);
    },
    { scope: root, dependencies: [lang, mobile, reduced], revertOnUpdate: true },
  );
  return (
    <Tag className={className} ref={root as React.RefObject<never>} aria-label={label} key={lang}>
      {children}
    </Tag>
  );
}
