import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useI18n } from '../app/i18n';
import { useLenis } from '../app/SmoothScroll';
import { onBeforeLangChange } from '../i18n/i18n';
import { useReducedMotion } from '../app/useReducedMotion';
import { useMediaQuery } from '../app/useMediaQuery';
import { Icon } from '../app/shell/Icon';
import { OfficialPicture } from '../app/OfficialPicture';
import type { MarketingImage } from '../data/marketing';
import { addIntro, addOutro, cascadeStep, CHOREOGRAPHY, taggedElements } from './choreography';
import { flowEntrances } from './flowMotion';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** How a scene arrives over the one before it. */
export type SceneTransition = 'dissolve' | 'zoom' | 'wipe';

/** Timeline layout, in scene units (one scene = 1). Scroll distance per unit is `STACK.unitVh`. */
const STACK = {
  /**
   * Viewport heights of scroll per scene. Within one scene unit the beats are:
   * arrive [-transition, 0] → intro (done by ~0.25) → hold → outro [~0.5, ~0.68] → next arrival.
   */
  unitVh: 140,
  /** Length of the crossing between two scenes. */
  transition: 0.3,
  /** Intros start slightly before the crossing completes, as the new scene takes over. */
  introDelay: -0.05,
  /** Gap between the end of the outros and the start of the next crossing. */
  outroLead: 0.02,
  /** Slow camera push on every render, across its whole time on screen. */
  push: { from: 1.04, to: 1.14 },
  /** Depth layers (`data-depth`) travel this many percent of the viewport per unit depth. */
  parallax: 18,
  /** Scrub smoothing (s) on top of Lenis: adds weight without lag. */
  scrub: 0.6,
  /** Real-time speed of the first scene's intro, which plays on load (not on scroll). */
  firstIntroTimeScale: 0.32,
  /** How many upcoming scenes' renders are decoded ahead of time. */
  decodeAhead: 2,
  /** Narrow screens keep all copy in normal flow instead of fitting it inside a pin. */
  narrow: '(max-width: 60rem)',
  /** Destination within each scene's reading hold when a chapter button is used. */
  readingPoint: 0.35,
  navigationDuration: 0.8,
  film: { intro: 0.25, outro: 0.1 },
  /** `sliver`: starting height of the horizon opening (a fraction; never 0, it is inverted). */
  dissolve: { outScale: 0.9, outShade: 0.72, inScale: 1.3, sliver: 0.004 },
  zoom: { outScale: 2.6, inScale: 1.35 },
} as const;

/** Native touch scrolling: restrained image travel, permanent copy, no full-screen pin. */
const MOBILE = { imageScale: 1.08, imageTravel: 3, readingLine: '48%', gap: 8 } as const;

export interface SceneProps {
  /** Scroll units for this chapter; galleries get more reading time than a single picture. */
  readonly duration?: number;
  /** Official render used as the scene's full-screen picture. */
  readonly image: MarketingImage;
  /** How this scene arrives (ignored on the first scene). */
  readonly transition?: SceneTransition;
  /**
   * Point of the render the camera flies into when the *next* scene uses `zoom`
   * (fractions of width/height), e.g. where the stadium sits in the masterplan.
   */
  readonly focus?: { readonly x: number; readonly y: number };
  /** Horizontal alignment of the copy. */
  readonly align?: 'start' | 'center' | 'end';
  readonly label: string;
  /** Load at high priority (set by SceneStack on the opening scene). */
  readonly priority?: boolean;
  /** Chapter name shown in the stack's meter while this scene is active. */
  readonly chapter?: string;
  /** Layout of the copy block (styled in motion.css / page CSS). */
  readonly variant?: string;
  readonly children?: ReactNode;
}

/** Declares one scene; rendered and choreographed by its parent `SceneStack`. */
export function Scene(props: SceneProps): ReactNode {
  const focus = props.focus ?? { x: 0.5, y: 0.5 };
  return (
    <section
      className="scene"
      aria-label={props.label}
      data-transition={props.transition ?? 'dissolve'}
      data-align={props.align ?? 'start'}
      data-chapter={props.chapter}
      data-variant={props.variant}
      data-scroll-units={props.duration ?? 1}
      style={
        {
          '--focus-x': `${focus.x * 100}%`,
          '--focus-y': `${focus.y * 100}%`,
        } as React.CSSProperties
      }
    >
      {/* The frame counter-moves against the section during reveals (see arriveOver). */}
      <div className="scene__frame">
        <div className="scene__media">
          <OfficialPicture
            id={props.image}
            alt=""
            sizes="100vw"
            priority={props.priority ?? false}
          />
        </div>
        <div className="scene__shade" aria-hidden="true" />
        <div className="scene__dim" aria-hidden="true" />
        <div className="scene__content container">{props.children}</div>
      </div>
    </section>
  );
}

/**
 * A pinned film strip of full-screen scenes. One master timeline is scrubbed by scroll: each
 * scene pushes in slowly, its copy and pictures enter, hold, and leave, then the next scene
 * arrives through a transition (dissolve-through, zoom-through or scan-line wipe). Everything
 * reverses exactly on scroll up. Under reduced motion the scenes are simply stacked in flow.
 */
export function SceneStack({
  label,
  ready = true,
  children,
}: {
  label: string;
  /** The first scene's copy plays its intro once this is true (e.g. after an opening sequence). */
  ready?: boolean;
  children: ReactNode;
}): ReactNode {
  const { lang, rtl, t } = useI18n();
  const reduced = useReducedMotion();
  const narrow = useMediaQuery(STACK.narrow);
  const flow = reduced || narrow;
  const root = useRef<HTMLDivElement>(null);
  const firstIntroRef = useRef<gsap.core.Timeline | null>(null);
  // Latest `ready` for timeline rebuilds (language changes) that happen after the opening.
  const readyRef = useRef(ready);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  const navigateRef = useRef<((direction: number) => void) | null>(null);
  const previousButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);
  // A language switch rebuilds the pin, which briefly collapses the page; remember where the
  // reader was (captured before React re-renders) and return there once rebuilt.
  const savedScroll = useRef<number | null>(null);
  useEffect(
    () =>
      onBeforeLangChange(() => {
        savedScroll.current = window.scrollY;
      }),
    [],
  );
  useEffect(() => {
    const y = savedScroll.current;
    if (y === null) return;
    let cancelled = false;
    let frame = 0;
    // A first Arabic visit can load its font after the new flow layout was measured. Restore
    // again once shaping and SplitText have settled, rather than relying on scroll anchoring.
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          const scroller = lenisRef.current;
          if (scroller) {
            scroller.resize();
            scroller.scrollTo(y, { immediate: true, force: true });
          } else window.scrollTo(0, y);
          savedScroll.current = null;
          ScrollTrigger.update();
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [lang]);
  const scenes = Children.toArray(children).filter(
    (child): child is ReactElement<SceneProps> => isValidElement(child) && child.type === Scene,
  );
  const durations = scenes.map((scene) => Math.max(1, scene.props.duration ?? 1));
  const starts = durations.map((_, index) =>
    durations.slice(0, index).reduce((sum, duration) => sum + duration, 0),
  );
  const totalUnits = durations.reduce((sum, duration) => sum + duration, 0);

  useGSAP(
    () => {
      const stack = root.current;
      if (!stack) return;
      const sections = [
        ...stack.querySelectorAll<HTMLElement>(
          ':scope > .scene-stack__frame > .scene-stack__scenes > .scene',
        ),
      ];
      const detach: (() => void)[] = [];
      const frames = sections.flatMap((section) => {
        const frame = section.querySelector<HTMLElement>('.scene__frame');
        return frame ? [frame] : [];
      });
      const restoreScenes = (): void => {
        sections.forEach((section) => {
          section.inert = false;
        });
        // Horizon reveals write through quickSetter while tweening a plain object. Clear those
        // transforms explicitly: they are not owned by the timeline's normal DOM reversion.
        gsap.set(
          [
            ...sections,
            ...frames,
            ...stack.querySelectorAll('.scene__media, .scene__media img, [data-depth]'),
          ],
          { clearProps: 'transform,opacity,visibility' },
        );
      };
      const updateStage = (): void => {
        const bounds = stack.getBoundingClientRect();
        if (bounds.top <= 0 && bounds.bottom > 0) document.body.dataset.stage = 'cinema';
        else delete document.body.dataset.stage;
      };
      const trackStage = (): void => {
        // The pin ends one viewport before the stack leaves the screen. Track the complete
        // element separately so the header regains its solid background over News and Footer.
        ScrollTrigger.create({
          trigger: stack,
          start: 'top top',
          end: 'bottom top',
          onUpdate: updateStage,
          onToggle: updateStage,
          onRefresh: updateStage,
        });
      };
      const restoreScroll = (): void => {
        if (savedScroll.current === null) return;
        const y = savedScroll.current;
        ScrollTrigger.refresh();
        const scroller = lenisRef.current;
        if (scroller) {
          scroller.resize();
          scroller.scrollTo(y, { immediate: true, force: true });
        } else window.scrollTo(0, y);
        ScrollTrigger.update();
      };
      updateStage();
      if (flow) {
        restoreScenes();
        trackStage();
        const cleanups: (() => void)[] = [];
        const intro = gsap.timeline({ paused: true });
        firstIntroRef.current = intro;
        let active = 0;
        const setChapter = (index: number): void => {
          active = index;
          stack.dataset.chapter = String(index);
          const scene = sections[index];
          const chapter = stack.querySelector('.scene-stack__chapter');
          const count = stack.querySelector('.scene-stack__count');
          const bar = stack.querySelector('.scene-stack__bar > span');
          if (chapter) chapter.textContent = scene?.dataset.chapter ?? '';
          if (count)
            count.textContent = t('marketing.cinema.position', {
              current: String(index + 1).padStart(2, '0'),
              total: String(sections.length).padStart(2, '0'),
            });
          if (bar) gsap.set(bar, { scaleX: (index + 1) / sections.length });
          if (previousButton.current) previousButton.current.disabled = index === 0;
          if (nextButton.current) nextButton.current.disabled = index === sections.length - 1;
        };
        setChapter(0);
        sections.forEach((scene, index) => {
          if (!reduced) {
            cleanups.push(flowEntrances(scene, rtl, true, index === 0 ? intro : undefined));
            const media = scene.querySelector('.scene__media');
            if (media)
              gsap.fromTo(
                media,
                { scale: MOBILE.imageScale, yPercent: -MOBILE.imageTravel },
                {
                  yPercent: MOBILE.imageTravel,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: scene,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true,
                  },
                },
              );
          }
          ScrollTrigger.create({
            trigger: scene,
            start: `top ${MOBILE.readingLine}`,
            end: `bottom ${MOBILE.readingLine}`,
            onToggle: (trigger) => {
              if (trigger.isActive) setChapter(index);
            },
            onRefresh: (trigger) => {
              if (trigger.isActive) setChapter(index);
            },
          });
        });
        navigateRef.current = (direction) => {
          const index = Math.max(0, Math.min(sections.length - 1, active + direction));
          const scene = sections[index];
          if (!scene) return;
          const headerHeight =
            document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
          const controlsHeight =
            stack.querySelector('.scene-stack__controls')?.getBoundingClientRect().height ?? 0;
          const y =
            window.scrollY +
            scene.getBoundingClientRect().top -
            headerHeight -
            controlsHeight -
            MOBILE.gap;
          const scroller = lenisRef.current;
          if (scroller && !reduced)
            scroller.scrollTo(y, { duration: STACK.navigationDuration, force: true });
          else window.scrollTo({ top: y, behavior: reduced ? 'instant' : 'smooth' });
          if (status.current) status.current.textContent = scene.getAttribute('aria-label') ?? '';
        };
        intro.timeScale(STACK.firstIntroTimeScale);
        if (readyRef.current) intro.play();
        restoreScroll();
        return () => {
          firstIntroRef.current = null;
          navigateRef.current = null;
          cleanups.forEach((cleanup) => {
            cleanup();
          });
          delete stack.dataset.chapter;
          restoreScenes();
          delete document.body.dataset.stage;
        };
      }
      const scanLine = stack.querySelector<HTMLElement>('.scene-stack__scan');
      const horizon = stack.querySelector<HTMLElement>('.scene-stack__horizon');
      const count = sections.length;
      const master = gsap.timeline({ defaults: { ease: 'none' } });
      const firstIntro = gsap.timeline({ paused: true, delay: 0.25 });
      firstIntroRef.current = firstIntro;
      const meterChapter = stack.querySelector<HTMLElement>('.scene-stack__chapter');
      const meterCount = stack.querySelector<HTMLElement>('.scene-stack__count');
      const meterBar = stack.querySelector<HTMLElement>('.scene-stack__bar > span');
      const setBar = meterBar
        ? (gsap.quickSetter(meterBar, 'scaleX') as (value: number) => void)
        : null;
      const pad = (value: number): string => String(value).padStart(2, '0');

      /** The crossing from `previous` to `scene` over [arrive, at]. */
      const arriveOver = (
        previous: HTMLElement | undefined,
        scene: HTMLElement,
        image: HTMLElement | null,
        kind: string | undefined,
        arrive: number,
        at: number,
      ): void => {
        if (!previous) return;
        const span = at - arrive;
        const previousImage = previous.querySelector<HTMLElement>('.scene__media img');
        const previousMedia = previous.querySelector<HTMLElement>('.scene__media');
        const previousDim = previous.querySelector<HTMLElement>('.scene__dim');
        const frame = scene.querySelector<HTMLElement>('.scene__frame');
        master.set(scene, { autoAlpha: 1 }, arrive);
        if (kind === 'zoom') {
          // Zoom-through: fly into the focus point of the old render, land on the new one.
          if (previousImage)
            master.fromTo(
              previousImage,
              { scale: STACK.push.to },
              { scale: STACK.zoom.outScale, duration: span, ease: 'power2.in' },
              arrive,
            );
          master.fromTo(
            scene,
            { opacity: 0 },
            { opacity: 1, duration: span * 0.55, ease: 'power1.inOut' },
            arrive + span * 0.45,
          );
          if (image)
            master.fromTo(
              image,
              { scale: STACK.zoom.inScale },
              {
                scale: STACK.push.from,
                duration: span * 0.6,
                ease: 'power2.out',
                immediateRender: false,
              },
              arrive + span * 0.4,
            );
        } else if (kind === 'wipe') {
          // Scan-line wipe in reading direction. Transform-only (composited): the section slides
          // in while its frame slides the opposite way, so the picture stays put and only the
          // revealing edge travels.
          const from = rtl ? 100 : -100;
          master.fromTo(
            scene,
            { xPercent: from },
            { xPercent: 0, duration: span, ease: 'power2.inOut' },
            arrive,
          );
          if (frame)
            master.fromTo(
              frame,
              { xPercent: -from },
              { xPercent: 0, duration: span, ease: 'power2.inOut' },
              arrive,
            );
          if (scanLine) {
            master.set(scanLine, { autoAlpha: 1 }, arrive);
            master.fromTo(
              scanLine,
              { x: () => (rtl ? window.innerWidth : 0) },
              { x: () => (rtl ? 0 : window.innerWidth), duration: span, ease: 'power2.inOut' },
              arrive,
            );
            master.set(scanLine, { autoAlpha: 0 }, at);
          }
          if (previousDim)
            master.to(previousDim, { opacity: STACK.dissolve.outShade, duration: span }, arrive);
        } else {
          // Dissolve-through: the old scene sinks back; the new one opens from the horizon.
          if (previousMedia)
            master.to(
              previousMedia,
              { scale: STACK.dissolve.outScale, duration: span, ease: 'power2.inOut' },
              arrive,
            );
          if (previousDim)
            master.to(previousDim, { opacity: STACK.dissolve.outShade, duration: span }, arrive);
          // Opens from the horizon line: the section scales up from a sliver while the frame
          // counter-scales, so the picture never distorts. Transform-only, unlike clip-path,
          // which would repaint the whole full-screen layer every frame.
          const opening = { value: STACK.dissolve.sliver };
          const setScene = gsap.quickSetter(scene, 'scaleY') as (value: number) => void;
          const setFrame = frame
            ? (gsap.quickSetter(frame, 'scaleY') as (value: number) => void)
            : null;
          master.fromTo(
            opening,
            { value: STACK.dissolve.sliver },
            {
              value: 1,
              duration: span,
              ease: 'power3.inOut',
              onUpdate: () => {
                setScene(opening.value);
                setFrame?.(1 / opening.value);
              },
            },
            arrive,
          );
          if (horizon) {
            master.set(horizon, { autoAlpha: 1 }, arrive);
            master.fromTo(
              horizon,
              { scaleX: 0 },
              { scaleX: 1, duration: span * 0.35, ease: 'power2.out' },
              arrive,
            );
            master.to(horizon, { autoAlpha: 0, duration: span * 0.3 }, arrive + span * 0.55);
          }
          if (image)
            master.fromTo(
              image,
              { scale: STACK.dissolve.inScale },
              {
                scale: STACK.push.from,
                duration: span,
                ease: 'power2.out',
                immediateRender: false,
              },
              arrive,
            );
        }
        master.set(previous, { autoAlpha: 0 }, at);
      };

      sections.forEach((scene, index) => {
        const image = scene.querySelector<HTMLElement>('.scene__media img');
        const dim = scene.querySelector<HTMLElement>('.scene__dim');
        const last = index === count - 1;
        // Scene i becomes the subject at time i; it arrives over [i - transition, i] and
        // starts leaving at `leave`, when the next scene's arrival begins.
        const at = starts[index] ?? 0;
        const length = durations[index] ?? 1;
        const arrive = index === 0 ? 0 : at - STACK.transition;
        const leave = last ? totalUnits : at + length - STACK.transition;
        const kind = scene.dataset.transition;

        // Camera: a slow push while the scene is the subject. Arrival/departure tweens own the
        // image scale outside this span, so the segments never overlap.
        if (image) {
          const pushStart = at;
          master.fromTo(
            image,
            { scale: STACK.push.from },
            { scale: STACK.push.to, duration: leave - pushStart },
            pushStart,
          );
        }

        // Depth layers drift at different rates.
        for (const layer of scene.querySelectorAll<HTMLElement>('[data-depth]')) {
          const depth = Number(layer.dataset.depth);
          master.fromTo(
            layer,
            { yPercent: STACK.parallax * depth },
            { yPercent: -STACK.parallax * depth, duration: leave - arrive },
            arrive,
          );
        }

        if (index > 0) arriveOver(sections[index - 1], scene, image, kind, arrive, at);
        if (dim) master.set(dim, { opacity: 0 }, arrive);

        // Copy and pictures: intro, hold, outro.
        const introAt = index === 0 ? 0 : at + STACK.introDelay;
        const sceneElements = taggedElements(scene);
        const step = cascadeStep(sceneElements.length);
        sceneElements.forEach(({ element, kind: motion }, order) => {
          if (index === 0) addIntro(firstIntro, element, motion, rtl, order * step);
          else addIntro(master, element, motion, rtl, introAt + order * step);
          if (!last)
            addOutro(
              master,
              element,
              leave - STACK.outroLead - CHOREOGRAPHY.outro.duration + order * step * 0.5,
            );
        });
        const film = scene.querySelector<HTMLElement>('[data-filmstrip]');
        if (film) {
          const distance = (): number =>
            Math.max(0, film.scrollWidth - (film.parentElement?.clientWidth ?? 0));
          const filmStart = at + STACK.film.intro;
          const filmEnd = leave - STACK.film.outro;
          master.fromTo(
            film,
            { x: 0 },
            { x: () => distance() * (rtl ? 1 : -1), duration: filmEnd - filmStart },
            filmStart,
          );
          const focusItem = (event: FocusEvent): void => {
            if (!(event.target instanceof Element) || !event.target.matches(':focus-visible'))
              return;
            const item = event.target.closest('[data-film-item]');
            const items = [...film.querySelectorAll('[data-film-item]')];
            const selected = item ? items.indexOf(item) : -1;
            const scrollTrigger = master.scrollTrigger;
            if (selected < 0 || !scrollTrigger) return;
            const time =
              filmStart + (selected / Math.max(1, items.length - 1)) * (filmEnd - filmStart);
            const y =
              scrollTrigger.start + (time / totalUnits) * (scrollTrigger.end - scrollTrigger.start);
            const scroller = lenisRef.current;
            if (scroller) scroller.scrollTo(y, { immediate: true, force: true });
            else window.scrollTo(0, y);
            // Focus must reveal its card immediately rather than waiting for scrub smoothing.
            scrollTrigger.getTween().progress(1);
            master.time(time);
          };
          film.addEventListener('focusin', focusItem);
          detach.push(() => {
            film.removeEventListener('focusin', focusItem);
          });
        }
      });

      // Every scene but the first starts hidden; keyboard focus only reaches the active one.
      gsap.set(sections.slice(1), { autoAlpha: 0 });
      // Decode the renders just ahead of the active scene, so no transition waits on a
      // first-time decode, without holding every full-screen bitmap in memory at once.
      const decoded = new Set<number>();
      const decodeAhead = (active: number): void => {
        for (let index = active; index <= active + STACK.decodeAhead && index < count; index++) {
          if (decoded.has(index)) continue;
          decoded.add(index);
          for (const image of sections[index]?.querySelectorAll('img') ?? []) {
            // Inline district and sustainability pictures need the same head start as the
            // backdrop; lazy images outside the clipped strip otherwise decode during its cut.
            image.loading = 'eager';
            void image.decode().catch(() => undefined);
          }
        }
      };
      let lastActive = -1;
      const setActive = (): void => {
        // Interaction follows the frame actually displayed, including scrub smoothing.
        let active = 0;
        starts.forEach((start, index) => {
          if (master.time() >= start) active = index;
        });
        setBar?.(master.progress());
        if (active === lastActive) return;
        lastActive = active;
        sections.forEach((scene, index) => {
          scene.inert = index !== active;
        });
        decodeAhead(active);
        if (meterChapter) meterChapter.textContent = sections[active]?.dataset.chapter ?? '';
        const position = t('marketing.cinema.position', {
          current: pad(active + 1),
          total: pad(count),
        });
        if (meterCount) meterCount.textContent = position;
        if (previousButton.current) previousButton.current.disabled = active === 0;
        if (nextButton.current) nextButton.current.disabled = active === count - 1;
        if (status.current)
          status.current.textContent = t('marketing.cinema.status', {
            position,
            title: sections[active]?.getAttribute('aria-label') ?? '',
          });
      };
      master.eventCallback('onUpdate', setActive);
      setActive();
      const trigger = ScrollTrigger.create({
        trigger: stack,
        start: 'top top',
        end: `+=${totalUnits * STACK.unitVh}%`,
        pin: stack.querySelector('.scene-stack__frame'),
        scrub: STACK.scrub,
        animation: master,
        // The header reads the stage: transparent and light while scenes fill the screen.
        onUpdate: updateStage,
        onToggle: updateStage,
      });
      trackStage();
      navigateRef.current = (direction) => {
        const target = Math.max(0, Math.min(count - 1, lastActive + direction));
        const progress = ((starts[target] ?? 0) + STACK.readingPoint) / totalUnits;
        const y = trigger.start + progress * (trigger.end - trigger.start);
        const scroller = lenisRef.current;
        if (scroller) scroller.scrollTo(y, { duration: STACK.navigationDuration, force: true });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      };
      restoreScroll();
      firstIntro.timeScale(STACK.firstIntroTimeScale);
      if (readyRef.current) firstIntro.play();
      return () => {
        firstIntroRef.current = null;
        navigateRef.current = null;
        detach.forEach((remove) => {
          remove();
        });
        restoreScenes();
        delete document.body.dataset.stage;
      };
    },
    { scope: root, dependencies: [lang, reduced, narrow, scenes.length], revertOnUpdate: true },
  );

  useEffect(() => {
    readyRef.current = ready;
    if (ready) firstIntroRef.current?.play();
  }, [ready]);

  return (
    <div
      className="scene-stack"
      ref={root}
      aria-label={label}
      role="region"
      data-motion={reduced ? 'reduced' : narrow ? 'flow' : 'full'}
      data-scroll-vh={STACK.unitVh}
    >
      {/* The pinned frame is never keyed or replaced: GSAP re-parents it into a pin spacer, and
          React must not try to remove it from its original parent. */}
      <div className="scene-stack__frame">
        <div className="scene-stack__controls">
          <div className="scene-stack__meter" aria-hidden="true">
            <span className="scene-stack__chapter" />
            <span className="scene-stack__bar">
              <span />
            </span>
            <span className="scene-stack__count" />
          </div>
          <nav className="scene-stack__navigation" aria-label={t('marketing.cinema.navigation')}>
            <button
              ref={previousButton}
              className="scene-stack__previous"
              type="button"
              aria-label={t('marketing.cinema.previous')}
              onClick={() => {
                navigateRef.current?.(-1);
              }}
            >
              <Icon name="arrow" />
            </button>
            <button
              ref={nextButton}
              type="button"
              aria-label={t('marketing.cinema.next')}
              onClick={() => {
                navigateRef.current?.(1);
              }}
            >
              <Icon name="arrow" />
            </button>
          </nav>
        </div>
        {/* Remount on language change: split text is rebuilt from fresh React-rendered copy. */}
        <div className="scene-stack__scenes" key={lang}>
          {scenes.map((scene, index) =>
            index === 0 ? cloneElement(scene, { priority: true }) : scene,
          )}
        </div>
        <span className="scene-stack__horizon" aria-hidden="true" />
        <span className="scene-stack__scan" aria-hidden="true" />
        <p
          className="visually-hidden"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          ref={status}
        />
        <p className="scene-stack__credit">{t('marketing.common.officialRender')}</p>
      </div>
    </div>
  );
}
