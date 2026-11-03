import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Children, cloneElement, isValidElement, useRef, type ReactElement, type ReactNode } from 'react';
import { useI18n } from '../app/i18n';
import { useReducedMotion } from '../app/useReducedMotion';
import { OfficialPicture } from '../app/OfficialPicture';
import type { MarketingImage } from '../data/marketing';
import { addIntro, addOutro, CHOREOGRAPHY, taggedElements } from './choreography';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** How a scene arrives over the one before it. */
export type SceneTransition = 'dissolve' | 'zoom' | 'wipe';

/** Timeline layout, in scene units (one scene = 1). Scroll distance per unit is `STACK.unitVh`. */
const STACK = {
  /** Viewport heights of scroll per scene. */
  unitVh: 130,
  /** Length of the crossing between two scenes. */
  transition: 0.38,
  /** Intros start just after a scene becomes the main subject. */
  introDelay: 0.04,
  /** Outros finish just before the next transition begins. */
  outroLead: 0.12,
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
  dissolve: { outScale: 0.9, outShade: 0.72, inScale: 1.3 },
  zoom: { outScale: 2.6, inScale: 1.35 },
} as const;

export interface SceneProps {
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
      style={
        {
          '--focus-x': `${focus.x * 100}%`,
          '--focus-y': `${focus.y * 100}%`,
        } as React.CSSProperties
      }
    >
      <div className="scene__media">
        <OfficialPicture id={props.image} alt="" sizes="100vw" priority={props.priority ?? false} />
      </div>
      <div className="scene__shade" aria-hidden="true" />
      <div className="scene__dim" aria-hidden="true" />
      <div className="scene__content container">{props.children}</div>
    </section>
  );
}

/**
 * A pinned film strip of full-screen scenes. One master timeline is scrubbed by scroll: each
 * scene pushes in slowly, its copy and pictures enter, hold, and leave, then the next scene
 * arrives through a transition (dissolve-through, zoom-through or scan-line wipe). Everything
 * reverses exactly on scroll up. Under reduced motion the scenes are simply stacked in flow.
 */
export function SceneStack({ label, children }: { label: string; children: ReactNode }): ReactNode {
  const { lang, rtl } = useI18n();
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const scenes = Children.toArray(children).filter(
    (child): child is ReactElement<SceneProps> => isValidElement(child) && child.type === Scene,
  );

  useGSAP(
    () => {
      const stack = root.current;
      if (!stack || reduced) return;
      const sections = [
        ...stack.querySelectorAll<HTMLElement>(':scope > .scene-stack__frame > .scene'),
      ];
      const scanLine = stack.querySelector<HTMLElement>('.scene-stack__scan');
      const horizon = stack.querySelector<HTMLElement>('.scene-stack__horizon');
      const count = sections.length;
      const master = gsap.timeline({ defaults: { ease: 'none' } });
      const firstIntro = gsap.timeline({ paused: true, delay: 0.25 });

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
          // Scan-line wipe in reading direction.
          master.fromTo(
            scene,
            { clipPath: rtl ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: span, ease: 'power2.inOut' },
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
          master.fromTo(
            scene,
            { clipPath: 'inset(50% 0% 50% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: span, ease: 'power3.inOut' },
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
        const arrive = index === 0 ? 0 : index - STACK.transition;
        const leave = last ? count : index + 1 - STACK.transition;
        const kind = scene.dataset.transition;

        // Camera: a slow push while the scene is the subject. Arrival/departure tweens own the
        // image scale outside this span, so the segments never overlap.
        if (image) {
          const pushStart = index === 0 ? 0 : index;
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

        if (index > 0) arriveOver(sections[index - 1], scene, image, kind, arrive, index);
        if (dim) master.set(dim, { opacity: 0 }, arrive);

        // Copy and pictures: intro, hold, outro.
        const introAt = index === 0 ? 0 : index - STACK.transition * 0.3 + STACK.introDelay;
        taggedElements(scene).forEach(({ element, kind: motion }, order) => {
          if (index === 0) addIntro(firstIntro, element, motion, rtl, order * CHOREOGRAPHY.cascade);
          else addIntro(master, element, motion, rtl, introAt + order * CHOREOGRAPHY.cascade);
          if (!last)
            addOutro(
              master,
              element,
              leave -
                STACK.outroLead -
                CHOREOGRAPHY.outro.duration +
                order * CHOREOGRAPHY.cascade * 0.5,
            );
        });
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
          const image = sections[index]?.querySelector('img');
          if (image) void image.decode().catch(() => undefined);
        }
      };
      let lastActive = -1;
      const setActive = (progress: number): void => {
        const active = Math.min(count - 1, Math.floor(progress * count + STACK.transition * 0.5));
        if (active === lastActive) return;
        lastActive = active;
        sections.forEach((scene, index) => {
          scene.inert = index !== active;
        });
        decodeAhead(active);
      };
      setActive(0);
      ScrollTrigger.create({
        trigger: stack,
        start: 'top top',
        end: `+=${count * STACK.unitVh}%`,
        pin: stack.querySelector('.scene-stack__frame'),
        scrub: STACK.scrub,
        animation: master,
        onUpdate: (self) => {
          setActive(self.progress);
        },
        // The header reads the stage: transparent and light while scenes fill the screen.
        onToggle: (self) => {
          if (self.isActive) document.body.dataset.stage = 'cinema';
          else delete document.body.dataset.stage;
        },
      });
      firstIntro.timeScale(STACK.firstIntroTimeScale).play();
      return () => {
        delete document.body.dataset.stage;
      };
    },
    { scope: root, dependencies: [lang, reduced, scenes.length], revertOnUpdate: true },
  );

  return (
    <div
      className="scene-stack"
      ref={root}
      aria-label={label}
      role="region"
      data-motion={reduced ? 'reduced' : 'full'}
    >
      {/* Remount on language change: split text is rebuilt from fresh React-rendered copy. */}
      <div className="scene-stack__frame" key={lang}>
        {scenes.map((scene, index) => (index === 0 ? cloneElement(scene, { priority: true }) : scene))}
        <span className="scene-stack__horizon" aria-hidden="true" />
        <span className="scene-stack__scan" aria-hidden="true" />
      </div>
    </div>
  );
}
