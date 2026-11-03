/**
 * 3D Experience route (immersive layout). The WebGL bundle is lazy-loaded here so marketing
 * pages never pay for it. Mount returns immediately (loading state); the scene builds async.
 *
 * Deep links (`/experience/:landmark/:hotspot`) navigate in place through `update()`,
 * so moving between landmarks/hotspots never remounts the scene (wired up in Phases 4–5).
 */
import { icons } from '../../components/icons';
import { createLangToggle } from '../../components/LangToggle';
import { readRuntimeFlags } from '../../config';
import type { Experience } from '../../experience/Experience';
import type { PageFactory } from '../../router/Page';
import { fragmentFromHtml, requireElement } from '../../utils/dom';

type StageState = 'loading' | 'ready' | 'fallback';

const createExperiencePage: PageFactory = () => {
  let root: HTMLElement | null = null;
  let experience: Experience | null = null;
  let unmounted = false;
  // A function (not a direct read) so TypeScript doesn't narrow the flag across awaits.
  const isUnmounted = (): boolean => unmounted;

  const setState = (state: StageState): void => {
    if (root) root.dataset.state = state;
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
      if (isUnmounted()) return;
      instance.start();
      setState('ready');
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
            <span class="experience__lang"></span>
          </div>
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
    update() {
      // Phase 4–5: route landmark/hotspot deep links to the CameraDirector.
    },
    unmount() {
      unmounted = true;
      experience?.dispose();
      experience = null;
      root = null;
    },
  };
};

export default createExperiencePage;
