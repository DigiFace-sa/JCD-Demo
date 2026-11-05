import type { ReactNode } from 'react';
import { Copy } from '../../app/Copy';
import { useI18n } from '../../app/i18n';
import { isNewsId, NEWS } from '../../data/marketing';
import type { ViewProps } from '../../router/routes';
import { EditorialAction, EditorialHero, EditorialPage } from '../editorial/Editorial';
import { NewsCards } from './News';
import { FlowReveal } from '../../motion/FlowReveal';

export default function NewsStory({ context }: ViewProps): ReactNode {
  const { t } = useI18n();
  const id = context.params.story;
  if (!isNewsId(id)) return null;
  const story = NEWS[id];
  return (
    <EditorialPage routeKey={`news:${id}`}>
      <EditorialHero image={story.image} eyebrow={story.categoryKey} title={story.titleKey}>
        <time dateTime={story.date}>{t(story.dateKey)}</time>
      </EditorialHero>
      <FlowReveal as="article" className="journal-article container" key={id}>
        <EditorialAction href="#/news">{t('marketing.actions.backNews')}</EditorialAction>
        <Copy k={story.bodyKey} className="journal-article__text" motion="lines" />
        <a
          className="editorial-action"
          href={story.source}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('marketing.actions.source')}
        </a>
      </FlowReveal>
      <section className="editorial-section container">
        <h2 className="editorial-heading">{t('marketing.common.news')}</h2>
        <NewsCards exclude={id} />
      </section>
    </EditorialPage>
  );
}
