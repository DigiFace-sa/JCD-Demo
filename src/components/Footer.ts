import { LEGAL_NAV, MAIN_NAV, SOCIAL_LINKS, type NavItem } from '../data/site';
import { onLangChange, t } from '../i18n/i18n';
import { fragmentFromHtml, requireElement } from '../utils/dom';

const navList = (items: readonly NavItem[]): string =>
  items
    .map(
      (item) =>
        `<li><a class="site-footer__link" href="#${item.path}" data-i18n="${item.labelKey}"></a></li>`,
    )
    .join('');

const socialList = (): string =>
  SOCIAL_LINKS.map((link) =>
    link.href
      ? `<li><a class="site-footer__link" href="${link.href}" rel="noopener" target="_blank" data-i18n="${link.labelKey}"></a></li>`
      : `<li><span class="site-footer__link site-footer__link--inert" data-i18n="${link.labelKey}"></span></li>`,
  ).join('');

export function createFooter(): HTMLElement {
  const fragment = fragmentFromHtml(`
    <footer class="site-footer">
      <div class="site-footer__pattern pattern-roshan" aria-hidden="true"></div>
      <div class="container site-footer__grid">
        <div class="site-footer__brand">
          <p class="site-footer__name" data-i18n="meta.siteName"></p>
          <p class="site-footer__tagline" data-i18n="footer.tagline"></p>
          <p class="site-footer__pif" data-i18n="footer.pifCompany"></p>
        </div>
        <nav class="site-footer__col" data-i18n-attr="aria-label:a11y.footerNav">
          <h2 class="site-footer__heading" data-i18n="footer.explore"></h2>
          <ul>${navList(MAIN_NAV)}</ul>
        </nav>
        <nav class="site-footer__col" data-i18n-attr="aria-label:a11y.legalNav">
          <h2 class="site-footer__heading" data-i18n="footer.legal"></h2>
          <ul>${navList(LEGAL_NAV)}</ul>
        </nav>
        <div class="site-footer__col">
          <h2 class="site-footer__heading" data-i18n="footer.follow"></h2>
          <ul>${socialList()}</ul>
        </div>
      </div>
      <div class="container site-footer__bottom">
        <p class="site-footer__copyright"></p>
      </div>
    </footer>
  `);

  const footer = requireElement(fragment, '.site-footer', HTMLElement);
  const copyright = requireElement(footer, '.site-footer__copyright', HTMLParagraphElement);
  const renderCopyright = (): void => {
    copyright.textContent = t('footer.copyright', { year: new Date().getFullYear() });
  };
  renderCopyright();
  onLangChange(renderCopyright);
  return footer;
}
