/**
 * Temporary content page used by routes until their real pages are built (Phase 2).
 * Exercises the shell end to end: routing, transitions, i18n, RTL, focus management.
 */
import { icons } from '../../components/icons';
import type { TranslationKey } from '../../i18n/i18n';
import type { PageContext, PageFactory } from '../../router/Page';
import { fragmentFromHtml } from '../../utils/dom';

export interface StubContent {
  readonly eyebrowKey?: TranslationKey;
  readonly headingKey: TranslationKey;
  readonly leadKey: TranslationKey;
  readonly showExploreCta?: boolean;
  /** Experience deep link for the CTA; defaults to the spawn map. */
  readonly explorePath?: string;
}

export function createStubPage(
  resolve: (params: PageContext['params']) => StubContent,
): PageFactory {
  return (context) => {
    const content = resolve(context.params);
    const eyebrow = content.eyebrowKey
      ? `<p class="eyebrow" data-i18n="${content.eyebrowKey}"></p>`
      : '';
    const cta = content.showExploreCta
      ? `<a class="btn btn--primary btn--large" href="#${content.explorePath ?? '/experience'}">
           <span data-i18n="nav.exploreIn3d"></span>${icons.arrow}
         </a>`
      : '';

    return {
      mount(outlet) {
        outlet.append(
          fragmentFromHtml(`
            <section class="stub">
              <div class="stub__pattern pattern-roshan" aria-hidden="true"></div>
              <div class="container stub__inner">
                ${eyebrow}
                <h1 class="display" data-i18n="${content.headingKey}"></h1>
                <p class="lead" data-i18n="${content.leadKey}"></p>
                ${cta}
                <p class="stub__note" data-i18n="status.inProgress"></p>
              </div>
            </section>
          `),
        );
      },
      unmount() {
        // Static markup only; the router clears the outlet.
      },
    };
  };
}
