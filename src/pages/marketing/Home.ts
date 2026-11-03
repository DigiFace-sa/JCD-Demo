import { icons } from '../../components/icons';
import { DISTRICTS, DISTRICT_IDS } from '../../data/districts';
import { DESTINATION_STATS } from '../../data/site';
import { HOME_CHAPTERS } from '../../data/homeJourney';
import {
  copy,
  investBand,
  landmarkCards,
  link,
  newsCards,
  photo,
  recognition,
  sectionHeading,
  sustainability,
} from './templates';

/** Home combines a cinematic official render with the original, explorable 3D destination. */
export function homeTemplate(): string {
  const stats = DESTINATION_STATS.filter((_, i) => [0, 1, 2, 5].includes(i));
  return `
    <div class="home-journey">
    <div class="journey-atmosphere" aria-hidden="true"><div class="journey-atmosphere__blue"></div><div class="journey-atmosphere__gold"></div><div class="journey-atmosphere__horizon"></div><div class="journey-atmosphere__pattern pattern-roshan"></div></div>
    <div class="home-sculptures" aria-hidden="true"><div class="home-sculptures__fallback"><span></span><span></span><span></span></div></div>
    <div class="journey-intro" aria-hidden="true"><div class="journey-intro__orbit"></div><div class="journey-intro__line"></div><img src="brand/official-logo-light.svg" alt="" width="104" height="56" /></div>
    <nav class="journey-progress" data-i18n-attr="aria-label:marketing.scroll.navigation"><span class="journey-progress__line" aria-hidden="true"><span></span></span><div class="journey-progress__steps">${HOME_CHAPTERS.map((chapter) => `<button type="button" data-scroll-to="home-${chapter.id}" data-chapter-link="${chapter.id}" data-i18n-attr="aria-label:${chapter.label}"><span></span></button>`).join('')}</div><span class="journey-progress__label" data-i18n="marketing.scroll.chapters.intro"></span></nav>
    <div class="journey-hero-track" id="home-hero" data-scroll-chapter="hero"><section class="home-hero">
      ${photo('masterplan', 'home-hero__image', true)}<div class="home-hero__shade"></div>
      <div class="container home-hero__inner">
        <div class="home-hero__copy">${copy('marketing.home.eyebrow', 'p', 'eyebrow')}
          <h1 class="home-hero__title"><span data-i18n="marketing.home.line1"></span><span data-i18n="marketing.home.line2"></span></h1>
          ${copy('marketing.home.lead', 'p', 'home-hero__lead')}${link('marketing.actions.discover', '/destination', 'hero-link')}
        </div>
        <div class="home-hero__bottom">
          <button class="scroll-cue" type="button" data-scroll-to="home-overview">${icons.down}<span data-i18n="marketing.actions.scroll"></span></button>
          ${copy('marketing.common.location', 'p', 'home-hero__location')}
          <a class="experience-invite" href="#/experience"><span class="experience-invite__orb" data-i18n="marketing.common.threeD"></span><span><span data-i18n="marketing.actions.in3d"></span><small data-i18n="marketing.common.destination"></small></span>${icons.arrow}</a>
        </div>
      </div>${copy('marketing.common.officialRender', 'p', 'image-credit')}
    </section></div>

    <section class="home-overview section container" id="home-overview" data-scroll-chapter="overview">
      <div class="overview-grid">
        <div class="overview-grid__copy" data-reveal>${copy('marketing.home.overviewEye', 'p', 'eyebrow')}${copy('marketing.home.overviewTitle', 'h2', 'editorial-title')}${copy('marketing.home.overviewBody', 'p', 'section-lead')}${link('marketing.actions.map', '/destination')}</div>
        <figure class="overview-grid__photo" data-reveal>${photo('waterfront')}${copy('marketing.common.officialRender', 'figcaption')}</figure>
        <div class="overview-grid__note" data-reveal><span class="overview-grid__motif pattern-roshan" aria-hidden="true"></span>${copy('marketing.home.overviewNote', 'p')}</div>
      </div>
      <dl class="destination-stats" data-reveal>${stats.map((s) => `<div><dd><span data-counter="${s.valueKey}" aria-hidden="true"></span><span class="visually-hidden" data-i18n="${s.valueKey}"></span></dd><dt data-i18n="${s.labelKey}"></dt></div>`).join('')}</dl>
    </section>

    <section class="home-landmarks" id="home-landmarks" data-scroll-chapter="landmarks"><div class="home-landmarks__stage section"><div class="container">${sectionHeading('marketing.home.landmarksEye', 'marketing.home.landmarksTitle', link('marketing.actions.viewLandmarks', '/landmarks'))}${landmarkCards()}</div></div></section>

    <section class="district-teaser section" id="home-districts" data-scroll-chapter="districts"><div class="container district-teaser__grid">
      <div data-reveal>${copy('marketing.home.districtsEye', 'p', 'eyebrow')}${copy('marketing.home.districtsTitle', 'h2', 'editorial-title')}${copy('marketing.home.districtsBody', 'p', 'section-lead')}${link('marketing.actions.map', '/destination', 'text-link text-link--light')}</div>
      <nav class="district-teaser__list" data-i18n-attr="aria-label:marketing.destination.mapLabel">${DISTRICT_IDS.map((id, i) => `<a href="#/destination?district=${id}" data-reveal><span class="ordinal" data-ordinal="${i + 1}"></span><span data-i18n="${DISTRICTS[id].nameKey}"></span>${icons.arrow}</a>`).join('')}</nav>
    </div></section>

    <section class="experience-feature" id="home-experience" data-scroll-chapter="experience" data-live-scene>
      ${photo('marina', 'experience-feature__fallback')}
      <div class="experience-feature__canvas" aria-hidden="true"></div><div class="experience-feature__shade"></div>
      <div class="container experience-feature__content" data-reveal>${copy('marketing.home.experienceEye', 'p', 'eyebrow')}${copy('marketing.home.experienceTitle', 'h2', 'editorial-title')}${copy('marketing.home.experienceBody', 'p', 'section-lead')}${link('marketing.actions.in3d', '/experience', 'btn btn--sand btn--large')}${copy('marketing.common.conceptNote', 'p', 'experience-feature__note')}</div>
    </section>

    <section class="section container sustainability-section" id="home-sustainability" data-scroll-chapter="sustainability">
      <div class="sustainability-section__head" data-reveal><div>${copy('marketing.home.sustainEye', 'p', 'eyebrow')}${copy('marketing.home.sustainTitle', 'h2', 'editorial-title')}${copy('marketing.home.sustainBody', 'p', 'section-lead')}</div><figure class="sustainability-section__image">${photo('park')}<figcaption><strong data-i18n="marketing.home.publicRealmValue"></strong><span data-i18n="marketing.home.publicRealm"></span></figcaption></figure></div>${sustainability()}
    </section>
    <div class="home-opportunity" id="home-invest" data-scroll-chapter="invest">${recognition()}${investBand()}</div>
    <section class="section container home-news" id="home-news" data-scroll-chapter="news">${sectionHeading('marketing.common.news', 'marketing.home.newsTitle', link('marketing.actions.viewAll', '/news'))}${newsCards()}</section>
    </div>
  `;
}
