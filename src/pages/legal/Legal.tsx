import type { ReactNode } from 'react';
import { Copy } from '../../app/Copy';
import { useI18n } from '../../app/i18n';
import { isLegalDoc, LEGAL_DOCS } from '../../data/site';
import type { ViewProps } from '../../router/routes';
import { EditorialAction, EditorialPage } from '../editorial/Editorial';

export default function Legal({ context }: ViewProps): ReactNode {
  const { t } = useI18n();
  const doc = context.params.doc;
  if (!isLegalDoc(doc)) return null;
  return (
    <EditorialPage routeKey={`legal:${doc}`}>
      <section className="policy-page container">
        <div className="policy-page__head">
          <p className="editorial-eye">{t('marketing.legal.eye')}</p>
          <h1 className="editorial-heading">{t(`legal.${doc}`)}</h1>
          <Copy k="marketing.legal.body" className="editorial-lead" />
        </div>
        <div className="policy-page__layout">
          <nav aria-label={t('a11y.legalNav')}>
            {LEGAL_DOCS.map((id) => (
              <a key={id} href={`#/legal/${id}`} aria-current={id === doc ? 'page' : undefined}>
                {t(`legal.${id}`)}
              </a>
            ))}
          </nav>
          <div className="policy-page__text">
            <Copy k={`marketing.legal.${doc}Body`} className="editorial-lead" />
            <EditorialAction href="#/">{t('marketing.actions.backHome')}</EditorialAction>
          </div>
        </div>
      </section>
    </EditorialPage>
  );
}
