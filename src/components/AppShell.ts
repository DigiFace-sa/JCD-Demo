import { SHOW_PLACEHOLDER_MARKERS } from '../config';
import { translateDom } from '../i18n/i18n';
import { Router } from '../router/Router';
import { fragmentFromHtml, requireElement } from '../utils/dom';
import { createFooter } from './Footer';
import { createHeader } from './Header';

/**
 * Persistent chrome around routed pages: skip link, header, <main> outlet, footer.
 * Header and footer are hidden by CSS on `immersive` routes (the 3D Experience).
 */
export function mountAppShell(root: HTMLElement): Router {
  const fragment = fragmentFromHtml(`
    <a class="skip-link" href="#main" data-i18n="a11y.skipToContent"></a>
    <main class="site-main" id="main"></main>
  `);
  const skipLink = requireElement(fragment, '.skip-link', HTMLAnchorElement);
  const outlet = requireElement(fragment, '.site-main', HTMLElement);

  // The skip link must not change the hash (that would trigger a route change).
  skipLink.addEventListener('click', (event) => {
    event.preventDefault();
    outlet.setAttribute('tabindex', '-1');
    outlet.focus();
  });

  const router = new Router(outlet);
  root.replaceChildren(skipLink, createHeader(router), outlet, createFooter());

  if (SHOW_PLACEHOLDER_MARKERS) {
    // Review builds only: flags that every Arabic string is an unreviewed draft.
    const badge = document.createElement('p');
    badge.className = 'ar-draft-badge';
    badge.setAttribute('data-i18n', 'status.arDraftBadge');
    root.append(badge);
  }

  translateDom(root);
  return router;
}
