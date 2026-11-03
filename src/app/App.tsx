import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { HashRouter } from 'react-router';
import { SHOW_PLACEHOLDER_MARKERS } from '../config';
import { t } from '../i18n/i18n';
import type { RouteMatch } from '../router/match';
import { notFoundRoute } from '../router/routes';
import { useI18n } from './i18n';
import { RouteView } from './RouteView';
import { Footer } from './shell/Footer';
import { Header } from './shell/Header';
import { SmoothScroll } from './SmoothScroll';

function documentTitle(match: RouteMatch): string {
  const siteName = t('meta.siteName');
  const key = match.route.title(match.context.params);
  return key ? `${t(key)}${t('meta.titleSeparator')}${siteName}` : siteName;
}

function Shell(): ReactNode {
  const { t: translate, lang } = useI18n();
  const main = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState<RouteMatch | null>(null);
  const onShown = useCallback((match: RouteMatch) => {
    setCurrent(match);
  }, []);

  useEffect(() => {
    if (current) document.title = documentTitle(current);
  }, [current, lang]);

  const immersive = current?.route.layout === 'immersive';
  return (
    <SmoothScroll enabled={!immersive}>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          // The skip link must not change the hash (that would be a route change).
          event.preventDefault();
          main.current?.setAttribute('tabindex', '-1');
          main.current?.focus();
        }}
      >
        {translate('a11y.skipToContent')}
      </a>
      <Header path={current?.context.path ?? '/'} notFound={current?.route === notFoundRoute} />
      <main className="site-main" id="main" ref={main}>
        <RouteView main={main} onShown={onShown} />
      </main>
      <Footer />
      {SHOW_PLACEHOLDER_MARKERS && (
        <p className="ar-draft-badge">{translate('status.arDraftBadge')}</p>
      )}
    </SmoothScroll>
  );
}

export function App(): ReactNode {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
