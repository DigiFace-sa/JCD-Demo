import type { ReactNode } from 'react';
import { LEGAL_NAV, MAIN_NAV, SOCIAL_LINKS, type NavItem } from '../../data/site';
import { useI18n } from '../i18n';
import { FlowReveal as Reveal } from '../../motion/FlowReveal';

function NavList({ items }: { items: readonly NavItem[] }): ReactNode {
  const { t } = useI18n();
  return (
    <ul>
      {items.map((item) => (
        <li key={item.path}>
          <a className="site-footer__link" href={`#${item.path}`}>
            {t(item.labelKey)}
          </a>
        </li>
      ))}
    </ul>
  );
}

function FooterContent(): ReactNode {
  const { t } = useI18n();
  return (
    <>
      <div className="container site-footer__grid">
        <div className="site-footer__brand" data-motion="rise">
          <img
            className="site-footer__logo"
            src="brand/official-logo-light.svg"
            alt=""
            width={104}
            height={56}
            loading="lazy"
          />
          <p className="site-footer__name">{t('meta.siteName')}</p>
          <p className="site-footer__tagline">{t('footer.tagline')}</p>
          <p className="site-footer__pif">{t('footer.pifCompany')}</p>
        </div>
        <nav className="site-footer__col" data-motion="rise" aria-label={t('a11y.footerNav')}>
          <h2 className="site-footer__heading">{t('footer.explore')}</h2>
          <NavList items={MAIN_NAV} />
        </nav>
        <nav className="site-footer__col" data-motion="rise" aria-label={t('a11y.legalNav')}>
          <h2 className="site-footer__heading">{t('footer.legal')}</h2>
          <NavList items={LEGAL_NAV} />
        </nav>
        <div className="site-footer__col" data-motion="rise">
          <h2 className="site-footer__heading">{t('footer.follow')}</h2>
          <ul>
            {SOCIAL_LINKS.filter((link) => link.href !== null).map((link) => (
              <li key={link.id}>
                <a
                  className="site-footer__link"
                  href={link.href ?? undefined}
                  rel="noopener"
                  target="_blank"
                >
                  {t(link.labelKey)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="container site-footer__bottom" data-motion="fade">
        <p className="site-footer__copyright">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </>
  );
}

/** Every marketing route closes with the same quiet, persistent reading entrances. */
export function Footer({ animate = false }: { animate?: boolean }): ReactNode {
  return (
    <footer className="site-footer">
      <div className="site-footer__pattern pattern-roshan" aria-hidden="true" />
      {animate ? (
        <Reveal as="div">
          <FooterContent />
        </Reveal>
      ) : (
        <FooterContent />
      )}
    </footer>
  );
}
