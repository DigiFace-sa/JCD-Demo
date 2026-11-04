import { LANDMARKS, isLandmarkId } from '../../data/landmarks';
import { LANDMARK_IMAGES, NEWS, isNewsId, SECTORS } from '../../data/marketing';
import type { PageContext } from '../../router/Page';
import {
  copy,
  investBand,
  landmarkCards,
  link,
  newsCards,
  pageHero,
  photo,
  recognition,
  sectionHeading,
} from './templates';
import { interestFormTemplate } from './InterestForm';

export function contentTemplate(context: PageContext): string {
  if (context.path === '/landmarks')
    return `${pageHero('opera-house', 'nav.landmarks', 'marketing.landmarks.title', 'marketing.landmarks.lead')}<section class="section container">${landmarkCards()}</section>${investBand()}`;
  if (isLandmarkId(context.params.id)) return landmarkTemplate(context.params.id);
  if (context.path === '/invest') return investTemplate();
  if (context.path === '/news')
    return `${pageHero('waterfront', 'marketing.common.news', 'marketing.news.title', 'marketing.news.lead')}<section class="section container">${newsCards()}</section>${investBand()}`;
  if (isNewsId(context.params.story)) {
    const item = NEWS[context.params.story];
    return `${pageHero(item.image, item.categoryKey, item.titleKey, item.dateKey)}<article class="article-body section container">${link('marketing.actions.backNews', '/news')}<div class="article-body__text">${copy(item.bodyKey, 'p', 'section-lead')}<a class="text-link" href="${item.source}" target="_blank" rel="noopener noreferrer"><span data-i18n="marketing.actions.source"></span></a></div></article>${investBand()}`;
  }
  const doc = context.params.doc;
  const legal = doc === 'terms' ? 'terms' : doc === 'cookies' ? 'cookies' : 'privacy';
  return `<section class="legal-page section container">${copy('marketing.legal.eye', 'p', 'eyebrow')}${copy(`legal.${legal}`, 'h1', 'editorial-title')}${copy('marketing.legal.body', 'p', 'section-lead')}${copy(`marketing.legal.${legal}Body`, 'p', 'section-lead')}${link('marketing.actions.backHome', '/')}</section>`;
}

function landmarkTemplate(id: keyof typeof LANDMARKS): string {
  const landmark = LANDMARKS[id];
  const destination = id === 'stadium' ? '/experience/stadium/inside' : `/experience/${id}`;
  const ctaKey = id === 'stadium' ? 'marketing.actions.enterStadium' : 'marketing.actions.in3d';
  return `${pageHero(LANDMARK_IMAGES[id], 'marketing.common.landmark', landmark.nameKey, `marketing.landmarks.${id}.purpose`, link(ctaKey, destination, 'btn btn--sand'))}
    <section class="section container landmark-story"><div data-reveal>${link('marketing.actions.backLandmarks', '/landmarks')}${copy('marketing.landmarks.storyEye', 'p', 'eyebrow')}${copy(`marketing.landmarks.${id}.title`, 'h2', 'editorial-title')}</div><div data-reveal>${copy(`marketing.landmarks.${id}.body`, 'p', 'section-lead')}${copy(`marketing.landmarks.${id}.detail`, 'p', 'muted')}<dl class="landmark-facts"><div>${copy('marketing.landmarks.districtLabel', 'dt')}${copy(`marketing.landmarks.${id}.district`, 'dd')}</div><div>${copy('marketing.landmarks.purposeLabel', 'dt')}${copy(`marketing.landmarks.${id}.purpose`, 'dd')}</div>${landmark.factKeys.map((key) => `<div>${copy('marketing.landmarks.facts', 'dt')}${copy(key, 'dd')}</div>`).join('')}</dl></div></section>
    <section class="landmark-experience">${photo(LANDMARK_IMAGES[id])}<div class="landmark-experience__shade"></div><div class="container" data-reveal>${copy('marketing.common.threeD', 'p', 'eyebrow')}${copy('marketing.landmarks.experienceTitle', 'h2', 'editorial-title')}${copy('marketing.landmarks.experienceBody', 'p', 'section-lead')}${link(ctaKey, destination, 'btn btn--sand btn--large')}</div></section>
    <section class="section container">${copy('marketing.landmarks.related', 'h2', 'editorial-title section-title')}${landmarkCards(id)}</section>`;
}

function investTemplate(): string {
  return `${pageHero('marina', 'nav.invest', 'marketing.invest.title', 'marketing.invest.lead', `<button class="btn btn--sand" type="button" data-scroll-to="register-interest"><span data-i18n="marketing.actions.register"></span></button>`)}
    <section class="section container">${sectionHeading('marketing.invest.sectorsEye', 'marketing.invest.sectorsTitle')}<div class="sector-list">${SECTORS.map((id, i) => `<article data-reveal><span class="ordinal" data-ordinal="${i + 1}"></span>${copy(`marketing.invest.sectors.${id}`, 'h3')}${copy(`marketing.invest.sectorBody.${id}`, 'p', 'muted')}<button class="sector-list__select" type="button" data-sector="${id}" data-i18n-attr="aria-label:marketing.invest.sectors.${id}"><span aria-hidden="true">↗</span></button></article>`).join('')}</div></section>
    <section class="section section--paper"><div class="container">${sectionHeading('marketing.invest.whyEye', 'marketing.invest.whyTitle')}<div class="why-grid">${(['location', 'landmarks', 'scale', 'sustain'] as const).map((id) => `<article data-reveal>${copy(`marketing.invest.${id}Title`, 'h3')}${copy(`marketing.invest.${id}Body`, 'p', 'muted')}</article>`).join('')}</div></div></section>
    ${recognition()}<section class="section form-section" id="register-interest"><div class="container form-section__grid"><div data-reveal>${copy('marketing.form.eye', 'p', 'eyebrow')}${copy('marketing.form.title', 'h2', 'editorial-title')}${copy('marketing.form.intro', 'p', 'section-lead')}${photo('waterfront', 'form-section__image')}</div>${interestFormTemplate()}</div></section>`;
}
