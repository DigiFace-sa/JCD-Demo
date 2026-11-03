import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useRef, type ReactNode } from 'react';
import { useI18n } from '../../app/i18n';

gsap.registerPlugin(useGSAP);

/** Opening sequence timings (s). Total ≈ 2.7 s; any input skips to the end. */
const OPENING = { logoIn: 0.7, hold: 0.35, line: 0.6, split: 1.05 } as const;

/**
 * Brand opening: the official mark resolves on ink, a gold horizon line draws across it, and the
 * screen parts along that line to reveal the first scene. Plays once per session (see Home).
 */
export function Opening({ onDone }: { onDone: () => void }): ReactNode {
  const { t } = useI18n();
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const timeline = gsap.timeline({ onComplete: onDone });
      timeline
        .fromTo(
          '.opening__logo',
          { opacity: 0, scale: 0.92, filter: 'blur(6px)' },
          {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            duration: OPENING.logoIn,
            ease: 'power3.out',
          },
        )
        .fromTo(
          '.opening__line',
          { scaleX: 0 },
          { scaleX: 1, duration: OPENING.line, ease: 'power3.inOut' },
          `+=${OPENING.hold}`,
        )
        .to(
          '.opening__logo',
          { opacity: 0, y: -16, duration: OPENING.line * 0.6, ease: 'power2.in' },
          '<0.15',
        )
        .to('.opening__half--top', {
          yPercent: -100,
          duration: OPENING.split,
          ease: 'power4.inOut',
        })
        .to(
          '.opening__half--bottom',
          { yPercent: 100, duration: OPENING.split, ease: 'power4.inOut' },
          '<',
        )
        .to('.opening__line', { opacity: 0, duration: OPENING.split * 0.5 }, '<0.2');
      const skip = (): void => {
        timeline.progress(1);
      };
      const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
      for (const event of events)
        window.addEventListener(event, skip, { once: true, passive: true });
      return () => {
        for (const event of events) window.removeEventListener(event, skip);
      };
    },
    { scope: root },
  );

  return (
    <div className="opening" ref={root} aria-hidden="true">
      <div className="opening__half opening__half--top" />
      <div className="opening__half opening__half--bottom" />
      <span className="opening__line" />
      <img
        className="opening__logo"
        src="brand/official-logo-light.svg"
        alt=""
        width={104}
        height={56}
      />
      <span className="visually-hidden">{t('meta.siteName')}</span>
    </div>
  );
}
