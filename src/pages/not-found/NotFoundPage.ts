import { icons } from '../../components/icons';
import type { PageFactory } from '../../router/Page';
import { fragmentFromHtml } from '../../utils/dom';

const createNotFoundPage: PageFactory = () => ({
  mount(outlet) {
    outlet.append(
      fragmentFromHtml(`
        <section class="stub">
          <div class="container stub__inner">
            <p class="eyebrow">404</p>
            <h1 class="display" data-i18n="pages.notFound.heading"></h1>
            <p class="lead" data-i18n="pages.notFound.lead"></p>
            <a class="btn btn--secondary" href="#/">
              <span data-i18n="pages.notFound.cta"></span>${icons.arrow}
            </a>
          </div>
        </section>
      `),
    );
  },
  unmount() {
    // Static markup only; the router clears the outlet.
  },
});

export default createNotFoundPage;
