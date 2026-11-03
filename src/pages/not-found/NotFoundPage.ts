import { icons } from '../../components/icons';
import type { PageFactory } from '../../router/Page';
import { fragmentFromHtml } from '../../utils/dom';

const createNotFoundPage: PageFactory = () => ({
  mount(outlet) {
    document.body.dataset.hero = 'false';
    outlet.append(
      fragmentFromHtml(`
        <section class="marketing-page legal-page section container">
            <p class="eyebrow" data-i18n="pages.notFound.code"></p>
            <h1 class="display" data-i18n="pages.notFound.heading"></h1>
            <p class="lead" data-i18n="pages.notFound.lead"></p>
            <a class="btn btn--secondary" href="#/">
              <span data-i18n="pages.notFound.cta"></span>${icons.arrow}
            </a>
        </section>
      `),
    );
  },
  unmount() {
    delete document.body.dataset.hero;
  },
});

export default createNotFoundPage;
