import { MAIN_NAV } from '../data/site';
import { translateDom } from '../i18n/i18n';
import type { Router } from '../router/Router';
import { notFoundRoute } from '../router/routes';
import { fragmentFromHtml, requireElement } from '../utils/dom';
import { icons } from './icons';
import { createLangToggle } from './LangToggle';

/** Scroll distance (px) after which the header gains its solid background. */
const SCROLLED_THRESHOLD = 8;

function isActive(itemPath: string, currentPath: string): boolean {
  return itemPath === '/'
    ? currentPath === '/'
    : currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

export function createHeader(router: Router): HTMLElement {
  const navItems = MAIN_NAV.map(
    (item) =>
      `<li><a class="site-nav__link" href="#${item.path}" data-path="${item.path}" data-i18n="${item.labelKey}"></a></li>`,
  ).join('');

  const fragment = fragmentFromHtml(`
    <header class="site-header" data-scrolled="false" data-menu-open="false">
      <div class="site-header__inner container">
        <a class="site-header__brand" href="#/" data-i18n-attr="aria-label:a11y.homeLink">
          <img class="site-header__logo site-header__logo--dark" src="brand/official-logo-dark.png" alt="" width="132" height="72" />
          <img class="site-header__logo site-header__logo--light" src="brand/official-logo-light.svg" alt="" width="104" height="56" />
        </a>
        <nav class="site-nav" id="site-nav" data-i18n-attr="aria-label:a11y.mainNav">
          <ul class="site-nav__list">${navItems}</ul>
        </nav>
        <div class="site-header__actions">
          <span class="site-header__lang"></span>
          <a class="btn btn--primary site-header__cta" href="#/experience">
            <span data-i18n="nav.exploreIn3d"></span>${icons.arrow}
          </a>
          <button class="icon-button site-header__menu" type="button" aria-expanded="false" aria-controls="site-nav" data-i18n-attr="aria-label:a11y.openMenu">
            <span class="site-header__menu-open">${icons.menu}</span>
            <span class="site-header__menu-close">${icons.close}</span>
          </button>
        </div>
      </div>
    </header>
  `);

  const header = requireElement(fragment, '.site-header', HTMLElement);
  const menuButton = requireElement(header, '.site-header__menu', HTMLButtonElement);
  requireElement(header, '.site-header__lang', HTMLSpanElement).replaceWith(createLangToggle());

  const setMenuOpen = (open: boolean): void => {
    header.dataset.menuOpen = String(open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('data-i18n-attr', `aria-label:a11y.${open ? 'closeMenu' : 'openMenu'}`);
    translateDom(menuButton);
    if (open)
      header.querySelector<HTMLAnchorElement>('.site-nav__link')?.focus({ preventScroll: true });
  };

  menuButton.addEventListener('click', () => {
    setMenuOpen(header.dataset.menuOpen !== 'true');
  });
  header.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.dataset.menuOpen === 'true') {
      setMenuOpen(false);
      menuButton.focus();
    }
  });

  const updateScrolled = (): void => {
    header.dataset.scrolled = String(window.scrollY > SCROLLED_THRESHOLD);
  };
  window.addEventListener('scroll', updateScrolled, { passive: true });

  router.onChange(({ path, pageId }) => {
    setMenuOpen(false);
    updateScrolled();
    header.querySelectorAll<HTMLAnchorElement>('.site-nav__link').forEach((link) => {
      if (pageId !== notFoundRoute.pageId && isActive(link.dataset.path ?? '', path))
        link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  });

  return header;
}
