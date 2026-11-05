import type { ReactNode } from 'react';
import { Copy } from '../../app/Copy';
import { useI18n } from '../../app/i18n';
import { isLegalDoc, LEGAL_DOCS } from '../../data/site';
import type { ViewProps } from '../../router/routes';
import { FlowReveal } from '../../motion/FlowReveal';
import { EditorialAction, EditorialPage } from '../editorial/Editorial';

export default function Legal({ context }: ViewProps): ReactNode {
  const { t } = useI18n();
  const doc = context.params.doc;
  if (!isLegalDoc(doc)) return null;
  return (
    <EditorialPage routeKey={`legal:${doc}`}>
      <section className="policy-page container">
        <FlowReveal as="div" className="policy-page__head" key={`${doc}-head`}>
          <p className="editorial-eye" data-motion="rise">
            {t('marketing.legal.eye')}
          </p>
          <h1 className="editorial-heading" data-motion="heading">
            {t(`legal.${doc}`)}
          </h1>
          <Copy k="marketing.legal.body" className="editorial-lead" motion="lines" />
        </FlowReveal>
        <div className="policy-page__layout">
          <nav aria-label={t('a11y.legalNav')}>
            {LEGAL_DOCS.map((id) => (
              <a key={id} href={`#/legal/${id}`} aria-current={id === doc ? 'page' : undefined}>
                {t(`legal.${id}`)}
              </a>
            ))}
          </nav>
          <FlowReveal as="div" className="policy-page__text" key={`${doc}-text`}>
            <Copy k={`marketing.legal.${doc}Body`} className="editorial-lead" motion="lines" />
            <EditorialAction href="#/">{t('marketing.actions.backHome')}</EditorialAction>
          </FlowReveal>
        </div>
      </section>
    </EditorialPage>
  );
}
