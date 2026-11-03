/**
 * 3D Experience route (immersive layout). Phase 1: persistent chrome only.
 * The WebGL Experience is lazy-loaded here from Phase 3 onward.
 *
 * Deep links (`/experience/:landmark/:hotspot`) navigate in place through `update()`,
 * so moving between landmarks/hotspots never remounts the scene.
 */
import { icons } from '../../components/icons';
import { createLangToggle } from '../../components/LangToggle';
import type { PageContext, PageFactory } from '../../router/Page';
import { fragmentFromHtml, requireElement } from '../../utils/dom';

const createExperiencePage: PageFactory = (initialContext) => {
  let target: HTMLElement | null = null;

  const renderTarget = (context: PageContext): void => {
    if (target) target.textContent = context.path;
  };

  return {
    mount(outlet) {
      const fragment = fragmentFromHtml(`
        <section class="experience">
          <div class="experience__toolbar">
            <a class="btn btn--ghost-on-dark" href="#/">
              <span class="icon-flip-back">${icons.arrow}</span><span data-i18n="nav.backToSite"></span>
            </a>
            <span class="experience__lang"></span>
          </div>
          <div class="experience__placeholder">
            <h1 class="display" data-i18n="pages.experience.heading"></h1>
            <p class="lead" data-i18n="pages.experience.lead"></p>
            <p class="experience__target">
              <span data-i18n="pages.experience.target"></span>:
              <code class="experience__target-path" dir="ltr"></code>
            </p>
          </div>
        </section>
      `);
      requireElement(fragment, '.experience__lang', HTMLSpanElement).replaceWith(
        createLangToggle('on-dark'),
      );
      target = requireElement(fragment, '.experience__target-path', HTMLElement);
      renderTarget(initialContext);
      outlet.append(fragment);
    },
    update(context) {
      renderTarget(context);
    },
    unmount() {
      target = null;
    },
  };
};

export default createExperiencePage;
