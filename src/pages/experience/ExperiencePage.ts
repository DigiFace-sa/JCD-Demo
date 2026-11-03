/**
 * 3D Experience route (immersive layout). The WebGL bundle is lazy-loaded here so marketing
 * pages never pay for it. Mount returns immediately (loading state); the scene builds async.
 *
 * URL ↔ state: `/experience` is the spawn map, `/experience/:landmark` frames a landmark.
 * Landmark selections go through the URL (so Back works and deep links open the same view);
 * district and attraction selections stay in-page.
 */
import { icons } from '../../components/icons';
import { createLangToggle } from '../../components/LangToggle';
import { readRuntimeFlags } from '../../config';
import { isLandmarkId } from '../../data/landmarks';
import { isStadiumViewId } from '../../data/stadium';
import type { Experience, Focus } from '../../experience/Experience';
import { onLangChange } from '../../i18n/i18n';
import type { PageContext, PageFactory } from '../../router/Page';
import { fragmentFromHtml, requireElement } from '../../utils/dom';
import { SidePanel } from './ui/SidePanel';

type StageState = 'loading' | 'ready' | 'fallback';

/** The drag/zoom hint disappears after this long even without interaction (ms). */
const HINT_TIMEOUT = 9000;

const landmarkFromContext = (context: PageContext): Focus | null =>
  context.params.landmark === 'stadium' && isStadiumViewId(context.params.hotspot)
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
    if (mapBack) mapBack.hidden = focus?.kind !== 'hotspot';
    if (root) root.dataset.focus = focus ? `${focus.kind}:${focus.id}` : 'map';
    void experience?.focus(focus, immediate);
  };

  /** Map/panel selection: landmarks via the URL, everything else directly. */
  const select = (focus: Focus): void => {
    if (focus.kind === 'hotspot') window.location.hash = `#/experience/stadium/${focus.id}`;
    else if (focus.kind === 'landmark') window.location.hash = `#/experience/${focus.id}`;
    else applyFocus(focus);
  };

  const back = (): void => {
    if (focused?.kind === 'landmark' || focused?.kind === 'hotspot')
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
      });
      experience = instance;
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
          if (!flying && focused?.kind === 'hotspot') panel?.focusHeading();
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
            <span class="experience__lang"></span>
          </div>
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
      else if (focused?.kind === 'landmark' || focused?.kind === 'hotspot') applyFocus(null);
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
