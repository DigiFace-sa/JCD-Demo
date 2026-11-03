import { icons } from '../../components/icons';
import { LANDMARKS, LANDMARK_IDS, type LandmarkId } from '../../data/landmarks';
import {
  LANDMARK_IMAGES,
  MARKETING_IMAGES,
  NEWS,
  NEWS_IDS,
  SUSTAINABILITY_ITEMS,
  type MarketingImage,
} from '../../data/marketing';
import type { TranslationKey } from '../../i18n/i18n';

export const copy = (key: TranslationKey, tag = 'p', className = ''): string =>
  `<${tag} class="${className}" data-i18n="${key}" data-copy></${tag}>`;

export const photo = (id: MarketingImage, className = '', eager = false): string => {
  const size = MARKETING_IMAGES[id];
  return `<img class="${className}" src="images/jcdc/${id}.webp" width="${size.width}" height="${size.height}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" ${eager ? 'fetchpriority="high"' : ''} data-i18n-attr="alt:marketing.common.imageAlt.${id}" />`;
};

export const link = (key: TranslationKey, path: string, className = 'text-link'): string =>
  `<a class="${className}" href="#${path}"><span data-i18n="${key}"></span><span class="link-arrow">${icons.arrow}</span></a>`;

export const sectionHeading = (eye: TranslationKey, title: TranslationKey, action = ''): string => `
  <div class="section-heading" data-reveal>
    <div>${copy(eye, 'p', 'eyebrow')}${copy(title, 'h2', 'editorial-title')}</div>${action}
  </div>`;

export const pageHero = (
  image: MarketingImage,
  eye: TranslationKey,
  title: TranslationKey,
  lead: TranslationKey,
  action = '',
): string => `
  <section class="page-hero">
    ${photo(image, 'page-hero__image', true)}<div class="page-hero__shade"></div>
    <div class="container page-hero__content">${copy(eye, 'p', 'eyebrow')}${copy(title, 'h1', 'editorial-title page-hero__title')}${copy(lead, 'p', 'page-hero__lead')}${action}</div>
    ${copy('marketing.common.officialRender', 'p', 'image-credit')}
  </section>`;

export const recognition = (): string => `
  <section class="recognition container" data-reveal>
    <div>${copy('marketing.common.recognition', 'h2', 'recognition__title')}${copy('marketing.common.recognitionLead', 'p', 'muted')}</div>
    <ul class="recognition__list">${(['leed', 'efqm', 'kaqa'] as const).map((id) => `<li><span class="recognition__seal" aria-hidden="true">${icons.star}</span>${copy(`marketing.common.${id}`, 'span')}</li>`).join('')}</ul>
  </section>`;

export const landmarkCards = (exclude?: LandmarkId): string => `
  <div class="landmark-grid">${LANDMARK_IDS.filter((id) => id !== exclude)
    .map(
      (id) => `
    <article class="landmark-card" data-reveal>
      <a class="landmark-card__image" href="#/landmarks/${id}" data-i18n-attr="aria-label:${LANDMARKS[id].nameKey}">${photo(LANDMARK_IMAGES[id])}<span class="image-arrow" aria-hidden="true">${icons.arrow}</span></a>
      <div class="landmark-card__body">${copy(LANDMARKS[id].nameKey, 'h3')}${copy(`marketing.landmarks.${id}.purpose`, 'p', 'muted')}
      <div class="landmark-card__links">${link('marketing.actions.viewProject', `/landmarks/${id}`)}${link('marketing.actions.in3d', `/experience/${id}`, 'small-link')}</div></div>
    </article>`,
    )
    .join('')}
  </div>`;

export const sustainability = (): string => `
  <div class="sustainability-grid">${SUSTAINABILITY_ITEMS.map((id) => `<article data-reveal><span class="line-icon" aria-hidden="true">${icons[id === 'coral' ? 'waves' : id === 'realm' ? 'leaf' : id === 'shade' ? 'sun' : 'connections']}</span>${copy(`marketing.sustainability.${id}.title`, 'h3')}${copy(`marketing.sustainability.${id}.body`, 'p', 'muted')}</article>`).join('')}</div>`;

export const investBand = (): string => `
  <section class="invest-band">${photo('marina', 'invest-band__image')}<div class="invest-band__shade"></div><div class="container invest-band__inner" data-reveal><div>${copy('marketing.home.investEye', 'p', 'eyebrow')}${copy('marketing.home.investTitle', 'h2', 'editorial-title')}${copy('marketing.home.investBody', 'p', 'section-lead')}</div>${link('marketing.actions.register', '/invest', 'btn btn--sand btn--large')}</div></section>`;

export const newsCards = (): string =>
  `<div class="news-grid">${NEWS_IDS.map((id) => {
    const item = NEWS[id];
    return `<article class="news-card" data-reveal><a class="news-card__image" href="#/news/${id}" data-i18n-attr="aria-label:${item.titleKey}">${photo(item.image)}</a><div class="news-card__meta">${copy(item.categoryKey, 'span')}<time datetime="${item.date}" data-i18n="${item.dateKey}"></time></div><h3><a href="#/news/${id}" data-i18n="${item.titleKey}"></a></h3>${link('marketing.actions.readStory', `/news/${id}`)}</article>`;
  }).join('')}</div>`;
