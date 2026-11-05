import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MAIN_NAV } from '../../data/site';
import { useI18n } from '../i18n';
import { Icon } from './Icon';
import { LangToggle } from './LangToggle';

/** Scroll distance (px) after which the header gains its solid background. */
const SCROLLED_THRESHOLD = 8;

function isActive(itemPath: string, currentPath: string): boolean {
  return itemPath === '/'
    ? currentPath === '/'
    : currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

export function Header({ path, notFound }: { path: string; notFound: boolean }): ReactNode {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);
  const progress = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = (): void => {
      setScrolled(window.scrollY > SCROLLED_THRESHOLD);
      const travel = document.documentElement.scrollHeight - window.innerHeight;
      progress.current?.style.setProperty(
        '--reading-progress',
        String(travel > 0 ? Math.min(1, Math.max(0, window.scrollY / travel)) : 0),
      );
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [path]);

  // Navigating closes the menu. Adjusting state during render is React's pattern for this.
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setOpen(false);
  }

  useEffect(() => {
    if (open) firstLink.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <header
      className="site-header"
      data-scrolled={String(scrolled)}
      data-menu-open={String(open)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <div className="site-header__inner container">
        <a className="site-header__brand" href="#/" aria-label={t('a11y.homeLink')}>
          <img
            className="site-header__logo site-header__logo--dark"
            src="brand/official-logo-dark.png"
            alt=""
            width={132}
            height={72}
          />
          <img
            className="site-header__logo site-header__logo--light"
            src="brand/official-logo-light.svg"
            alt=""
            width={104}
            height={56}
          />
        </a>
        <nav className="site-nav" id="site-nav" aria-label={t('a11y.mainNav')}>
          <ul className="site-nav__list">
            {MAIN_NAV.map((item, index) => (
              <li key={item.path} style={{ '--nav-order': index } as React.CSSProperties}>
                <a
                  ref={index === 0 ? firstLink : undefined}
                  className={`site-nav__link${item.path === '/experience' ? ' site-nav__link--experience' : ''}`}
                  href={`#${item.path}`}
                  aria-current={!notFound && isActive(item.path, path) ? 'page' : undefined}
                >
                  {t(item.labelKey)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="site-header__actions">
          <LangToggle />
          <a className="btn btn--primary site-header__cta" href="#/experience">
            <span>{t('nav.exploreIn3d')}</span>
            <Icon name="arrow" />
          </a>
          <button
            ref={menuButton}
            className="icon-button site-header__menu"
            type="button"
            aria-expanded={open}
            aria-controls="site-nav"
            aria-label={t(open ? 'a11y.closeMenu' : 'a11y.openMenu')}
            onClick={() => {
              setOpen((value) => !value);
            }}
          >
            <span className="site-header__menu-open">
              <Icon name="menu" />
            </span>
            <span className="site-header__menu-close">
              <Icon name="close" />
            </span>
          </button>
        </div>
      </div>
      <span className="site-header__progress" ref={progress} aria-hidden="true" />
    </header>
  );
}
