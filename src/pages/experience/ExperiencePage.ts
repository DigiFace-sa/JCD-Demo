/**
 * 3D Experience route (immersive layout). The WebGL bundle is lazy-loaded here so marketing
 * pages never pay for it. Mount returns immediately (loading state); the scene builds async.
 *
 * URL ↔ state: `/experience` is the spawn map, `/experience/:landmark` frames a landmark.
 * Landmark selections go through the URL (so Back works and deep links open the same view);
 * district and attraction selections stay in-page.
 */
import { gsap } from 'gsap';
import { icons } from '../../components/icons';
import { createLangToggle } from '../../components/LangToggle';
import { readRuntimeFlags, SHOW_PLACEHOLDER_MARKERS } from '../../config';
import { isPlaceId, PLACES } from '../../data/places';
import { isLandmarkId } from '../../data/landmarks';
import { isStadiumViewId } from '../../data/stadium';
import type { Experience, Focus, LightingMode } from '../../experience/Experience';
import { onLangChange, translateDom } from '../../i18n/i18n';
import type { PageContext, PageFactory } from '../../router/Page';
import { fragmentFromHtml, requireElement } from '../../utils/dom';
import { prefersReducedMotion } from '../../utils/motion';
import { SidePanel } from './ui/SidePanel';

type StageState = 'loading' | 'ready' | 'fallback';

/** The drag/zoom hint disappears after this long even without interaction (ms). */
const HINT_TIMEOUT = 9000;
/** Seconds of the dip to black when switching Day/Night (the fade back is longer). */
const LIGHTING_FADE = 0.32;

const landmarkFromContext = (context: PageContext): Focus | null =>
  isPlaceId(context.params.place)
    ? { kind: 'place', id: context.params.place }
    : context.params.landmark === 'stadium' && isStadiumViewId(context.params.hotspot)
      ? { kind: 'hotspot', id: context.params.hotspot }
      : isLandmarkId(context.params.landmark)
        ? { kind: 'landmark', id: context.params.landmark }
        : null;

const createExperiencePage: PageFactory = (initialContext) => {
  let root: HTMLElement | null = null;
  let experience: Experience | null = null;
  let panel: SidePanel | null = null;
  let unmounted = false;
  let context = initialContext;
  let focused: Focus | null = null;
  const cleanups: (() => void)[] = [];
  // A function (not a direct read) so TypeScript doesn't narrow the flag across awaits.
  const isUnmounted = (): boolean => unmounted;

  const setState = (state: StageState): void => {
    if (root) root.dataset.state = state;
  };

  const applyFocus = (focus: Focus | null, immediate = false): void => {
    focused = focus;
    panel?.show(focus);
    const mapBack = root?.querySelector<HTMLElement>('.experience__map-back');
    if (mapBack) mapBack.hidden = focus?.kind !== 'hotspot' && focus?.kind !== 'place';
    if (root) root.dataset.focus = focus ? `${focus.kind}:${focus.id}` : 'map';
    void experience?.focus(focus, immediate);
  };

  /** Map/panel selection: landmarks via the URL, everything else directly. */
  const select = (focus: Focus): void => {
    if (focus.kind === 'place') window.location.hash = `#/experience/places/${focus.id}`;
    else if (focus.kind === 'hotspot') window.location.hash = `#/experience/stadium/${focus.id}`;
    else if (focus.kind === 'landmark') window.location.hash = `#/experience/${focus.id}`;
    else applyFocus(focus);
  };

  const back = (): void => {
    if (focused?.kind === 'place' && isPlaceId(focused.id)) {
      const district = PLACES[focused.id].district;
      window.location.hash = '#/experience';
      applyFocus({ kind: 'district', id: district });
    } else if (focused?.kind === 'landmark' || focused?.kind === 'hotspot')
      window.location.hash = '#/experience';
    else applyFocus(null);
  };

  const syncPanelInset = (): void => {
    if (!panel || !experience || !root) return;
    const rect = panel.element.getBoundingClientRect();
    const covered = panel.collapsed || window.innerWidth < 720 ? 0 : rect.width;
    experience.setPanelInset(document.documentElement.dir === 'rtl' ? -covered : covered);
  };

  const showHint = (): void => {
    const hint = root?.querySelector<HTMLElement>('.map-hint');
    if (!hint || !experience) return;
    hint.dataset.visible = 'true';
    const hide = (): void => {
      hint.dataset.visible = 'false';
      unsubscribe();
      window.clearTimeout(timer);
    };
    const unsubscribe = experience.onUserInput(hide);
    const timer = window.setTimeout(hide, HINT_TIMEOUT);
    cleanups.push(hide);
  };

  const boot = async (stage: HTMLElement): Promise<void> => {
    try {
      const module = await import('../../experience/Experience');
      if (isUnmounted()) return;
      if (!module.isWebGL2Available()) {
        setState('fallback');
        return;
      }
      const flags = readRuntimeFlags();
      const instance = new module.Experience(stage, {
        variant: 'full',
        debug: flags.debug,
        quality: flags.quality,
        lighting: flags.mode ?? 'day',
      });
      experience = instance;
      bindLighting(instance);
      await instance.ready();
      if (isUnmounted() || !root) return;

      panel = new SidePanel({
        onSelect: select,
        onHover: (focus) => {
          instance.hover(focus);
        },
        onBack: back,
        onCollapse: () => {
          requestAnimationFrame(syncPanelInset);
        },
      });
      root.append(panel.element);
      instance.setAvoidElements([
        panel.element,
        requireElement(root, '.experience__toolbar', HTMLElement),
      ]);
      cleanups.push(instance.onSelect(select));
      cleanups.push(
        instance.onFlightChange((flying) => {
          if (root) root.dataset.flying = String(flying);
          if (panel) panel.element.inert = flying;
          if (!flying && (focused?.kind === 'hotspot' || focused?.kind === 'place'))
            panel?.focusHeading();
        }),
      );
      const escape = (event: KeyboardEvent): void => {
        if (event.key === 'Escape' && focused) {
          event.preventDefault();
          back();
        }
      };
      window.addEventListener('keydown', escape);
      cleanups.push(() => {
        window.removeEventListener('keydown', escape);
      });
      cleanups.push(onLangChange(() => requestAnimationFrame(syncPanelInset)));
      window.addEventListener('resize', syncPanelInset);
      cleanups.push(() => {
        window.removeEventListener('resize', syncPanelInset);
      });
      syncPanelInset();

      instance.start();
      setState('ready');
      const deepLink = landmarkFromContext(context);
      if (deepLink) {
        applyFocus(deepLink, true);
      } else {
        await instance.intro();
        if (!isUnmounted()) showHint();
      }
    } catch (error) {
      console.error('[experience] failed to start', error);
      experience?.dispose();
      experience = null;
      if (!isUnmounted()) setState('fallback');
    }
  };

  /** Day/Night toggle: a short dip to black hides the one-frame rebake of sky and shadows. */
  const bindLighting = (instance: Experience): void => {
    const button = root?.querySelector<HTMLButtonElement>('.experience__lighting');
    const curtain = root?.querySelector<HTMLElement>('.experience__curtain');
    if (!button || !curtain || !root) return;
    const show = (mode: LightingMode): void => {
      const night = mode === 'night';
      if (root) root.dataset.lighting = mode;
      button.setAttribute('aria-pressed', String(night));
      // The button offers the other mode.
      button.setAttribute(
        'data-i18n-attr',
        `aria-label:pages.experience.${night ? 'switchToDay' : 'switchToNight'}`,
      );
      button
        .querySelector('.experience__lighting-label')
        ?.setAttribute('data-i18n', `pages.experience.${night ? 'day' : 'night'}`);
      translateDom(button);
    };
    show(instance.lighting);
    let switching = false;
    const toggle = async (): Promise<void> => {
      if (switching) return;
      switching = true;
      const next: LightingMode = instance.lighting === 'day' ? 'night' : 'day';
      const fade = prefersReducedMotion() ? 0 : LIGHTING_FADE;
      await gsap.to(curtain, { opacity: 1, duration: fade, ease: 'power2.in' }).then();
      if (isUnmounted()) return;
      instance.setLighting(next);
      show(next);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await gsap.to(curtain, { opacity: 0, duration: fade * 1.8, ease: 'power2.out' }).then();
      switching = false;
    };
    const onClick = (): void => {
      void toggle();
    };
    button.addEventListener('click', onClick);
    cleanups.push(() => {
      button.removeEventListener('click', onClick);
      gsap.killTweensOf(curtain);
    });
  };

  return {
    mount(outlet) {
      const fragment = fragmentFromHtml(`
        <section class="experience" data-state="loading">
          <h1 class="visually-hidden" data-i18n="pages.experience.heading"></h1>
          <div class="experience__stage" role="application" data-i18n-attr="aria-label:pages.experience.canvasLabel"></div>
          <div class="experience__toolbar">
            <a class="btn btn--ghost-on-dark" href="#/">
              <span class="icon-flip-back">${icons.arrow}</span><span data-i18n="nav.backToSite"></span>
            </a>
            <a class="btn btn--ghost-on-dark experience__map-back" href="#/experience" hidden>
              <span class="icon-flip-back">${icons.arrow}</span><span data-i18n="stadium.back"></span>
            </a>
            <span class="experience__tools">
              <button class="btn btn--ghost-on-dark experience__lighting" type="button" aria-pressed="false" data-i18n-attr="aria-label:pages.experience.switchToNight">
                <span class="experience__lighting-icon experience__lighting-icon--day">${icons.sun}</span>
                <span class="experience__lighting-icon experience__lighting-icon--night">${icons.moon}</span>
                <span class="experience__lighting-label" data-i18n="pages.experience.night"></span>
              </button>
              <span class="experience__lang"></span>
            </span>
          </div>
          ${SHOW_PLACEHOLDER_MARKERS ? '<p class="experience__illustrative" data-i18n="pages.experience.illustrative"></p>' : ''}
          <div class="experience__curtain" aria-hidden="true"></div>
          <p class="map-hint" data-visible="false" aria-hidden="true" data-i18n="map.hint"></p>
          <p class="experience__status" role="status" data-i18n="pages.experience.loading"></p>
          <div class="experience__fallback">
            <h2 class="heading-1" data-i18n="pages.experience.fallbackHeading"></h2>
            <p class="lead" data-i18n="pages.experience.fallbackBody"></p>
          </div>
        </section>
      `);
      requireElement(fragment, '.experience__lang', HTMLSpanElement).replaceWith(
        createLangToggle('on-dark'),
      );
      root = requireElement(fragment, '.experience', HTMLElement);
      const stage = requireElement(fragment, '.experience__stage', HTMLDivElement);
      outlet.append(fragment);
      void boot(stage);
    },
    update(next) {
      context = next;
      if (!experience || !panel) return; // applied when boot completes
      const landmark = landmarkFromContext(next);
      if (landmark) applyFocus(landmark);
      else if (
        focused?.kind === 'landmark' ||
        focused?.kind === 'hotspot' ||
        focused?.kind === 'place'
      )
        applyFocus(null);
    },
    unmount() {
      unmounted = true;
      cleanups.forEach((cleanup) => {
        cleanup();
      });
      panel?.dispose();
      experience?.dispose();
      panel = null;
      experience = null;
      root = null;
    },
  };
};

export default createExperiencePage;
