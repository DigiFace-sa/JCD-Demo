import type { ReactNode } from 'react';
import { OfficialPicture } from '../../app/OfficialPicture';
import { useI18n } from '../../app/i18n';
import { NEWS, NEWS_IDS, type NewsId } from '../../data/marketing';
import { Copy } from '../../app/Copy';
import { FlowReveal as Reveal } from '../../motion/FlowReveal';
import { EditorialAction, EditorialHero, EditorialPage } from '../editorial/Editorial';

export function NewsCards({ exclude }: { exclude?: NewsId }): ReactNode {
  const { t } = useI18n();
  return (
    <Reveal as="div" className="journal-grid" key={exclude ?? 'all'}>
      {NEWS_IDS.filter((id) => id !== exclude).map((id) => {
        const item = NEWS[id];
        return (
          <article className="journal-card" key={id} data-motion="rise">
            <a className="journal-card__image" href={`#/news/${id}`} aria-label={t(item.titleKey)}>
              <OfficialPicture
                id={item.image}
                alt={t(`marketing.common.imageAlt.${item.image}`)}
                sizes="(min-width: 60rem) 45vw, 100vw"
              />
            </a>
            <div className="journal-card__meta">
              <span>{t(item.categoryKey)}</span>
              <time dateTime={item.date}>{t(item.dateKey)}</time>
            </div>
            <h3>
              <a href={`#/news/${id}`}>{t(item.titleKey)}</a>
            </h3>
            <EditorialAction href={`#/news/${id}`}>
              {t('marketing.actions.readStory')}
            </EditorialAction>
          </article>
        );
      })}
    </Reveal>
  );
}

export default function News(): ReactNode {
  return (
    <EditorialPage>
      <EditorialHero
        image="waterfront"
        eyebrow="marketing.common.news"
        title="marketing.news.title"
        lead="marketing.news.lead"
      />
      <section className="editorial-section container">
        <Reveal as="div" className="editorial-section__head">
          <Copy k="marketing.common.news" className="editorial-eye" motion="rise" />
          <Copy
            k="marketing.home.newsTitle"
            as="h2"
            className="editorial-heading"
            motion="heading"
          />
        </Reveal>
        <NewsCards />
      </section>
    </EditorialPage>
  );
}
