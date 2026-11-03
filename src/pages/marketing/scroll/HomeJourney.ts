import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HOME_CHAPTERS } from '../../../data/homeJourney';
import { onLangChange, isRtl, t } from '../../../i18n/i18n';
import { requireElement } from '../../../utils/dom';
import { EASE_OUT, EASE_IN_OUT, prefersReducedMotion } from '../../../utils/motion';
import type { HomeSculptures } from './HomeSculptures';

/** Timings and viewport-relative travel belong to the scroll story, never the destination data. */
const STORY = {
  intro: 2.1,
  /** Logo hold, then logo exit and panel wipe start together so the orbit is never left empty. */
  introExit: 1.3,
  introWipe: 0.85,
  sculptureDelay: 2400,
  reveal: 0.75,
  scrub: 0.65,
  revealOffset: 52,
  focus: 0.5,
  blendStart: 0.72,
  mobileOpacity: 0.4,
  mobileWidth: 768,
  headerClearance: 128,
  desktopWidth: 1120,
  blueStrength: 0.7,
  goldStrength: 0.35,
} as const;
const clamp = (n: number): number => Math.max(0, Math.min(1, n));
const mix = (a: number, b: number, p: number): number => a + (b - a) * p;

function canRender(): boolean {
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** One native-scroll story: shared light, a continuous sculpture stage, and reversible camera-like cuts. */
export function bindHomeJourney(root: HTMLElement): () => void {
  const journey = requireElement(root, '.home-journey', HTMLDivElement);
  const host = requireElement(journey, '.home-sculptures', HTMLDivElement);
  const intro = requireElement(journey, '.journey-intro', HTMLDivElement);
  const label = requireElement(journey, '.journey-progress__label', HTMLSpanElement);
  const line = requireElement(journey, '.journey-progress__line > span', HTMLSpanElement);
  const atmosphere = requireElement(journey, '.journey-atmosphere', HTMLDivElement);
  const chapters = HOME_CHAPTERS.map((chapter) =>
    requireElement(journey, `[data-scroll-chapter="${chapter.id}"]`, HTMLElement),
  );
  const links = [...journey.querySelectorAll<HTMLButtonElement>('[data-chapter-link]')];
  const media = gsap.matchMedia();
  let sculptures: HomeSculptures | null = null;
  let disposed = false;
  let frame = 0;
  let active = -1;
  let introPlayed = false;
  let ready = false;
  let layout: { top: number; height: number }[] = [];
  const isDisposed = (): boolean => disposed;
  document.body.dataset.homeJourney = 'true';

  gsap.set(host, { xPercent: -50, yPercent: -50 });
  const placeX = gsap.quickSetter(host, 'x', 'px') as (value: number) => void;
  const placeY = gsap.quickSetter(host, 'y', 'px') as (value: number) => void;
  const opacity = gsap.quickSetter(host, 'opacity') as (value: number) => void;
  const blue = requireElement(atmosphere, '.journey-atmosphere__blue', HTMLDivElement);
  const gold = requireElement(atmosphere, '.journey-atmosphere__gold', HTMLDivElement);
  const horizon = requireElement(atmosphere, '.journey-atmosphere__horizon', HTMLDivElement);
  const placeHorizon = gsap.quickSetter(horizon, 'y', 'px') as (value: number) => void;
  const measure = (): void => {
    layout = chapters.map((chapter) => ({
      top: chapter.getBoundingClientRect().top + window.scrollY,
      height: chapter.offsetHeight,
    }));
  };
  const update = (): void => {
    frame = 0;
    if (disposed || !layout.length) return;
    const focus = window.scrollY + window.innerHeight * STORY.focus;
    let index = 0;
    for (const [i, item] of layout.entries()) if (focus >= item.top) index = i;
    const current = HOME_CHAPTERS[index] ?? HOME_CHAPTERS[0];
    const next = HOME_CHAPTERS[index + 1] ?? current;
    const bounds = layout[index];
    if (!bounds) return;
    const progress = clamp((focus - bounds.top) / bounds.height);
    const reduced = prefersReducedMotion();
    const blend = reduced ? 0 : clamp((progress - STORY.blendStart) / (1 - STORY.blendStart));
    const x = mix(current.x, next.x, blend);
    const y = mix(current.y, next.y, blend);
    const rtl = isRtl();
    placeX(((rtl ? 1 - x : x) - 0.5) * innerWidth);
    placeY((y - 0.5) * innerHeight);
    const alpha =
      mix(current.opacity, next.opacity, blend) *
      (innerWidth < STORY.mobileWidth ? STORY.mobileOpacity : 1);
    opacity(alpha);
    blue.style.opacity = String(mix(current.blue, next.blue, blend) * STORY.blueStrength);
    gold.style.opacity = String(mix(current.gold, next.gold, blend) * STORY.goldStrength);
    placeHorizon(reduced ? 0 : (progress - 0.5) * innerHeight * 0.2);
    const pageProgress = clamp(
      window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight),
    );
    line.style.transform = `scale${innerWidth >= STORY.desktopWidth ? 'Y' : 'X'}(${pageProgress})`;
    journey.style.setProperty('--journey-progress', String(pageProgress));
    if (index !== active) {
      active = index;
      label.setAttribute('data-i18n', current.label);
      label.textContent = t(current.label);
      for (const link of links) {
        if (link.dataset.chapterLink === current.id) link.setAttribute('aria-current', 'step');
        else link.removeAttribute('aria-current');
      }
      journey.dataset.chapter = current.id;
    }
    const fullScene = chapters[4]?.getBoundingClientRect();
    // The full masterplan owns the GPU while it is on screen; decorative geometry yields to it.
    const fullSceneVisible =
      !!fullScene &&
      fullScene.top < innerHeight - STORY.headerClearance &&
      fullScene.bottom > STORY.headerClearance;
    const visible = alpha > 0.01 && !fullSceneVisible && !document.hidden;
    if (ready && sculptures) {
      sculptures.setState({
        chapter: mix(current.sculpture, next.sculpture, blend),
        progress: reduced ? 0.5 : progress,
        visible,
        rtl,
        reduced,
      });
      if (visible) sculptures.render();
    }
    host.style.visibility = fullSceneVisible ? 'hidden' : 'visible';
  };
  const schedule = (): void => {
    if (!frame && !disposed) frame = requestAnimationFrame(update);
  };
  const refresh = (): void => {
    measure();
    schedule();
  };
  const boot = async (): Promise<void> => {
    if (!canRender()) {
      host.dataset.state = 'fallback';
      return;
    }
    try {
      const { HomeSculptures: Sculptures } = await import('./HomeSculptures');
      if (isDisposed()) return;
      const instance = new Sculptures(host);
      sculptures = instance;
      await instance.ready();
      if (isDisposed()) return;
      ready = true;
      host.dataset.state = 'ready';
      schedule();
    } catch (error) {
      sculptures?.dispose();
      sculptures = null;
      host.dataset.state = 'fallback';
      if (!isDisposed()) console.error('[home] Sculpture preview unavailable', error);
    }
  };

  media.add(
    { desktop: '(min-width: 70rem)', reduced: '(prefers-reduced-motion: reduce)', all: 'all' },
    (context) => {
      const desktop = context.conditions?.desktop === true;
      const reduced = context.conditions?.reduced === true;
      journey.dataset.motion = reduced ? 'reduced' : 'full';
      const cleanups: (() => void)[] = [];
      let titleEntrance: gsap.core.Tween | null = null;
      if (!reduced) {
        if (!introPlayed && scrollY < innerHeight) {
          intro.hidden = false;
          const entrance = gsap.timeline({
            onComplete: () => {
              intro.hidden = true;
            },
          });
          entrance.fromTo(
            '.journey-intro__orbit',
            { scale: 0.6, rotate: -35, opacity: 0 },
            { scale: 1.25, rotate: 12, opacity: 0.85, duration: STORY.intro, ease: EASE_IN_OUT },
            0,
          );
          entrance.fromTo(
            intro.querySelector('img'),
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.5, ease: EASE_OUT },
            0,
          );
          entrance.to(
            intro.querySelector('img'),
            { opacity: 0, y: -40, duration: STORY.introWipe * 0.7, ease: EASE_IN_OUT },
            STORY.introExit,
          );
          entrance.fromTo(
            intro,
            { clipPath: 'inset(0% 0% 0% 0%)' },
            { clipPath: 'inset(0% 0% 100% 0%)', duration: STORY.introWipe, ease: EASE_IN_OUT },
            STORY.introExit,
          );
          const finish = (): void => {
            entrance.progress(1);
            titleEntrance?.progress(1);
          };
          for (const event of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) {
            window.addEventListener(event, finish, { once: true, passive: true });
            cleanups.push(() => {
              window.removeEventListener(event, finish);
            });
          }
          introPlayed = true;
        } else intro.hidden = true;
        const hero = requireElement(journey, '.home-hero', HTMLElement);
        const heroTrack = requireElement(journey, '.journey-hero-track', HTMLDivElement);
        titleEntrance = gsap.fromTo(
          hero.querySelectorAll('.home-hero__title > span'),
          { y: 44, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.4, delay: introPlayed ? 0.8 : 0, ease: EASE_OUT },
        );
        const opening = gsap.timeline({
          scrollTrigger: {
            trigger: heroTrack,
            start: 'top top',
            end: 'bottom top',
            scrub: STORY.scrub,
          },
        });
        opening.to(
          hero.querySelector('.home-hero__image'),
          { scale: 1.16, yPercent: 14, ease: 'none' },
          0,
        );
        opening.to(
          hero.querySelector('.home-hero__copy'),
          { yPercent: -32, opacity: 0, ease: 'none' },
          0.12,
        );
        opening.to(
          hero.querySelector('.home-hero__bottom'),
          { y: -30, opacity: 0, ease: 'none' },
          0,
        );
        if (desktop)
          ScrollTrigger.create({
            trigger: heroTrack,
            start: 'top top',
            end: 'bottom bottom',
            pin: hero,
            pinSpacing: false,
            onUpdate: schedule,
          });
        for (const element of journey.querySelectorAll<HTMLElement>('[data-reveal]')) {
          gsap.fromTo(
            element,
            { opacity: 0, y: STORY.revealOffset, rotateX: 4 },
            {
              opacity: 1,
              y: 0,
              rotateX: 0,
              duration: STORY.reveal,
              ease: EASE_OUT,
              scrollTrigger: { trigger: element, start: 'top 93%', once: true },
            },
          );
        }
        for (const image of journey.querySelectorAll<HTMLImageElement>(
          '.overview-grid__photo > img,.sustainability-section__image > img',
        )) {
          gsap.fromTo(
            image,
            { scale: 1.16, yPercent: 4 },
            {
              scale: 1.1,
              yPercent: -4,
              ease: 'none',
              scrollTrigger: {
                trigger: image.parentElement,
                start: 'top bottom',
                end: 'bottom top',
                scrub: STORY.scrub,
              },
            },
          );
        }
        if (desktop) {
          const stage = requireElement(journey, '.home-landmarks__stage', HTMLDivElement);
          const track = requireElement(stage, '.landmark-grid', HTMLDivElement);
          const distance = (): number =>
            Math.max(0, track.scrollWidth - (track.parentElement?.clientWidth ?? innerWidth));
          const gallery = gsap.to(track, {
            x: () => distance() * (isRtl() ? 1 : -1),
            ease: 'none',
            scrollTrigger: {
              trigger: stage,
              start: 'top top',
              end: () => `+=${distance()}`,
              pin: true,
              scrub: STORY.scrub,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: schedule,
            },
          });
          const focusCard = (event: FocusEvent): void => {
            if (!(event.target instanceof Element)) return;
            const card = event.target.closest('.landmark-card');
            const cards = [...track.querySelectorAll('.landmark-card')];
            const index = card ? cards.indexOf(card) : -1;
            const trigger = gallery.scrollTrigger;
            if (index < 0 || !trigger) return;
            window.scrollTo({
              top:
                trigger.start +
                (index / Math.max(1, cards.length - 1)) * (trigger.end - trigger.start),
              behavior: 'instant',
            });
          };
          track.addEventListener('focusin', focusCard);
          cleanups.push(() => {
            track.removeEventListener('focusin', focusCard);
          });
        }
      } else intro.hidden = true;
      refresh();
      return () => {
        cleanups.forEach((cleanup) => {
          cleanup();
        });
      };
    },
    journey,
  );
  const unlistenLang = onLangChange(() => {
    active = -1;
    ScrollTrigger.refresh();
    refresh();
  });
  window.addEventListener('scroll', schedule, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  ScrollTrigger.addEventListener('refresh', refresh);
  void document.fonts.ready.then(() => {
    if (!disposed) {
      ScrollTrigger.refresh();
      refresh();
    }
  });
  refresh();
  // Let the opening finish before environment generation can occupy the main thread.
  const bootTimer = window.setTimeout(() => {
    void boot();
  }, STORY.sculptureDelay);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.clearTimeout(bootTimer);
    window.removeEventListener('scroll', schedule);
    document.removeEventListener('visibilitychange', schedule);
    ScrollTrigger.removeEventListener('refresh', refresh);
    unlistenLang();
    media.revert();
    sculptures?.dispose();
    sculptures = null;
    delete document.body.dataset.homeJourney;
  };
}
