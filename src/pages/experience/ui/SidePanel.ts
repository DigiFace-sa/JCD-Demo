import { gsap } from 'gsap';
import { icons } from '../../../components/icons';
import { ATTRACTION_IDS, ATTRACTIONS, type AttractionId } from '../../../data/attractions';
import { DISTRICT_IDS, DISTRICTS, isDistrictId } from '../../../data/districts';
import { isLandmarkId, LANDMARK_IDS, LANDMARKS } from '../../../data/landmarks';
import { PLACE_IDS, PLACES, isPlaceId } from '../../../data/places';
import { DESTINATION_STATS } from '../../../data/site';
import {
  STADIUM_HOTSPOTS,
  STADIUM_HOTSPOT_IDS,
  isStadiumHotspotId,
  isStadiumViewId,
} from '../../../data/stadium';
import type { Focus } from '../../../experience/types';
import { translateDom, type TranslationKey } from '../../../i18n/i18n';
import { fragmentFromHtml, requireElement } from '../../../utils/dom';
import { DURATION, EASE_OUT, motionDuration } from '../../../utils/motion';

export interface SidePanelCallbacks {
  readonly onSelect: (focus: Focus) => void;
  readonly onHover: (focus: Focus | null) => void;
  readonly onBack: () => void;
  readonly onCollapse: (collapsed: boolean) => void;
}

interface DetailContent {
  readonly kindKey: TranslationKey;
  readonly nameKey: TranslationKey;
  readonly summaryKey: TranslationKey;
  readonly factKeys: readonly TranslationKey[];
  readonly noteKey: TranslationKey | null;
  readonly color: string | null;
}

/** Slide distance (px) when switching between overview and detail. */
const SWITCH_OFFSET = 14;

function detailFor(focus: Focus): DetailContent | null {
  if (focus.kind === 'place' && isPlaceId(focus.id)) {
    const place = PLACES[focus.id];
    return {
      kindKey: 'places.kind',
      nameKey: place.titleKey,
      summaryKey: place.bodyKey,
      factKeys: [],
      noteKey: 'places.controls',
      color: DISTRICTS[place.district].color,
    };
  }
  if (focus.kind === 'hotspot' && isStadiumViewId(focus.id)) {
    const hotspot = isStadiumHotspotId(focus.id) ? STADIUM_HOTSPOTS[focus.id] : null;
    return {
      kindKey: 'stadium.kind',
      nameKey: hotspot?.titleKey ?? 'stadium.insideTitle',
      summaryKey: hotspot?.bodyKey ?? 'stadium.insideBody',
      factKeys: [],
      noteKey:
        focus.id === 'vip'
          ? 'stadium.vipControls'
          : focus.id === 'pitch'
            ? 'stadium.pitchControls'
            : null,
      color: null,
    };
  }
  if (focus.kind === 'landmark' && isLandmarkId(focus.id)) {
    const landmark = LANDMARKS[focus.id];
    return {
      kindKey: 'map.kindLandmark',
      nameKey: landmark.nameKey,
      summaryKey: landmark.summaryKey,
      factKeys: landmark.factKeys,
      noteKey: focus.id === 'stadium' ? null : 'map.previewNote',
      color: null,
    };
  }
  if (focus.kind === 'district' && isDistrictId(focus.id)) {
    const district = DISTRICTS[focus.id];
    return {
      kindKey: 'map.kindDistrict',
      nameKey: district.nameKey,
      summaryKey: district.summaryKey,
      factKeys: [],
      noteKey: null,
      color: district.color,
    };
  }
  const attraction = ATTRACTIONS[focus.id as AttractionId] as
    (typeof ATTRACTIONS)[AttractionId] | undefined;
  if (!attraction) return null;
  return {
    kindKey: 'map.kindAttraction',
    nameKey: attraction.nameKey,
    summaryKey: attraction.summaryKey,
    factKeys: [],
    noteKey: null,
    color: null,
  };
}

const listItem = (focus: Focus, labelKey: TranslationKey, swatch?: string): string => `
  <li>
    <button class="map-list__item" type="button" data-kind="${focus.kind}" data-id="${focus.id}">
      ${swatch ? `<span class="map-list__swatch" style="--swatch:${swatch}" aria-hidden="true"></span>` : ''}
      <span class="map-list__label" data-i18n="${labelKey}"></span>
      ${icons.arrow}
    </button>
  </li>`;

/** The map's side panel: overview (stats + lists) and a detail view for the focused item. */
export class SidePanel {
  readonly element: HTMLElement;
  private readonly overview: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private showing: Focus | null = null;

  constructor(private readonly callbacks: SidePanelCallbacks) {
    const stats = DESTINATION_STATS.map(
      (stat) =>
        `<div class="map-stats__item"><dt data-i18n="${stat.labelKey}"></dt><dd data-i18n="${stat.valueKey}"></dd></div>`,
    ).join('');
    const landmarks = LANDMARK_IDS.map((id) =>
      listItem({ kind: 'landmark', id }, LANDMARKS[id].nameKey),
    ).join('');
    const districts = DISTRICT_IDS.map((id) =>
      listItem({ kind: 'district', id }, DISTRICTS[id].nameKey, DISTRICTS[id].color),
    ).join('');
    const attractions = ATTRACTION_IDS.map((id) =>
      listItem({ kind: 'attraction', id }, ATTRACTIONS[id].nameKey),
    ).join('');

    const fragment = fragmentFromHtml(`
      <aside class="map-panel" data-collapsed="false" data-i18n-attr="aria-label:meta.siteName">
        <button class="map-panel__toggle" type="button" aria-expanded="true" aria-controls="map-panel-body" data-i18n-attr="aria-label:map.hidePanel">
          <span class="icon-flip-back">${icons.arrow}</span>
        </button>
        <div class="map-panel__body" id="map-panel-body">
          <section class="map-panel__view map-panel__overview">
            <p class="eyebrow" data-i18n="pages.home.eyebrow"></p>
            <h2 class="map-panel__title" data-i18n="meta.siteName"></h2>
            <p class="map-panel__lead" data-i18n="map.location"></p>
            <h3 class="map-panel__heading" data-i18n="map.glance"></h3>
            <dl class="map-stats">${stats}</dl>
            <h3 class="map-panel__heading" data-i18n="map.landmarksHeading"></h3>
            <ul class="map-list">${landmarks}</ul>
            <h3 class="map-panel__heading" data-i18n="map.districtsHeading"></h3>
            <ul class="map-list">${districts}</ul>
            <h3 class="map-panel__heading" data-i18n="places.heading"></h3>
            <ul class="map-list">${PLACE_IDS.map((id) => listItem({ kind: 'place', id }, PLACES[id].titleKey)).join('')}</ul>
            <h3 class="map-panel__heading" data-i18n="map.attractionsHeading"></h3>
            <ul class="map-list">${attractions}</ul>
          </section>
          <section class="map-panel__view map-panel__detail" hidden>
            <button class="map-panel__back" type="button">
              <span class="icon-flip-back">${icons.arrow}</span><span data-i18n="map.back"></span>
            </button>
            <p class="eyebrow map-panel__kind"></p>
            <h2 class="map-panel__title map-panel__detail-title" tabindex="-1"></h2>
            <p class="map-panel__lead map-panel__summary"></p>
            <ul class="map-panel__facts"></ul>
            <p class="map-panel__note"></p>
            <a class="btn btn--primary map-panel__enter" href="#/experience/stadium/inside" data-i18n="stadium.enter" hidden></a>
            <a class="btn btn--primary map-panel__closer" data-i18n="places.closer" hidden></a>
            <div class="map-panel__hotspots" hidden>
              <h3 class="map-panel__heading" data-i18n="stadium.explore"></h3>
              <ul class="map-list">${STADIUM_HOTSPOT_IDS.map((id) => listItem({ kind: 'hotspot', id }, STADIUM_HOTSPOTS[id].titleKey)).join('')}</ul>
            </div>
          </section>
        </div>
      </aside>
    `);
    this.element = requireElement(fragment, '.map-panel', HTMLElement);
    this.overview = requireElement(this.element, '.map-panel__overview', HTMLElement);
    this.detail = requireElement(this.element, '.map-panel__detail', HTMLElement);
    this.toggle = requireElement(this.element, '.map-panel__toggle', HTMLButtonElement);

    this.element.addEventListener('click', this.onClick);
    this.element.addEventListener('pointerover', this.onPointerOver);
    this.element.addEventListener('pointerleave', this.onPointerLeave);
    this.element.addEventListener('focusin', this.onPointerOver);
    this.element.addEventListener('keydown', this.onKeyDown);
    translateDom(this.element);
  }

  get collapsed(): boolean {
    return this.element.dataset.collapsed === 'true';
  }

  /** Show the overview (null) or a detail view. Moves focus to the new heading when asked. */
  show(focus: Focus | null, moveFocus = false): void {
    if (focus?.kind === this.showing?.kind && focus?.id === this.showing?.id) return;
    this.showing = focus;
    const closePlace = PLACE_IDS.find(
      (id) =>
        PLACES[id].district ===
        (focus?.kind === 'district'
          ? focus.id
          : focus?.kind === 'attraction' && focus.id === 'public-beach'
            ? 'beach'
            : null),
    );
    const closer = requireElement(this.detail, '.map-panel__closer', HTMLAnchorElement);
    closer.hidden = !closePlace;
    if (closePlace) closer.href = `#/experience/places/${closePlace}`;
    const enter = requireElement(this.detail, '.map-panel__enter', HTMLAnchorElement);
    const vip = focus?.kind === 'hotspot' && focus.id === 'vip';
    enter.hidden = !(vip || (focus?.kind === 'landmark' && focus.id === 'stadium'));
    enter.href = vip ? '#/experience/stadium/pitch' : '#/experience/stadium/inside';
    enter.setAttribute('data-i18n', vip ? 'stadium.viewPitch' : 'stadium.enter');
    requireElement(this.detail, '.map-panel__hotspots', HTMLDivElement).hidden =
      focus?.kind !== 'hotspot';
    requireElement(this.detail, '.map-panel__back span[data-i18n]', HTMLSpanElement).setAttribute(
      'data-i18n',
      focus?.kind === 'hotspot'
        ? 'stadium.back'
        : focus?.kind === 'place'
          ? 'places.backDistrict'
          : 'map.back',
    );
    const content = focus ? detailFor(focus) : null;
    if (content) this.fillDetail(content);
    for (const item of this.detail.querySelectorAll<HTMLButtonElement>('.map-list__item')) {
      item.setAttribute(
        'aria-pressed',
        String(focus?.kind === 'hotspot' && item.dataset.id === focus.id),
      );
    }
    const incoming = content ? this.detail : this.overview;
    const outgoing = content ? this.overview : this.detail;
    if (this.collapsed && content) this.setCollapsed(false);

    gsap.killTweensOf([incoming, outgoing]);
    outgoing.hidden = true;
    incoming.hidden = false;
    const direction = document.documentElement.dir === 'rtl' ? -1 : 1;
    gsap.fromTo(
      incoming,
      { opacity: 0, x: SWITCH_OFFSET * direction * (content ? 1 : -1) },
      {
        opacity: 1,
        x: 0,
        duration: motionDuration(DURATION.base),
        ease: EASE_OUT,
        clearProps: 'transform',
      },
    );
    if (moveFocus) {
      const heading = content
        ? this.detail.querySelector<HTMLElement>('.map-panel__detail-title')
        : this.overview.querySelector<HTMLElement>('.map-panel__title');
      heading?.focus({ preventScroll: true });
    }
    requireElement(this.element, '.map-panel__body', HTMLElement).scrollTop = 0;
  }

  private fillDetail(content: DetailContent): void {
    requireElement(this.detail, '.map-panel__kind', HTMLElement).setAttribute(
      'data-i18n',
      content.kindKey,
    );
    requireElement(this.detail, '.map-panel__detail-title', HTMLElement).setAttribute(
      'data-i18n',
      content.nameKey,
    );
    requireElement(this.detail, '.map-panel__summary', HTMLElement).setAttribute(
      'data-i18n',
      content.summaryKey,
    );
    const facts = requireElement(this.detail, '.map-panel__facts', HTMLUListElement);
    facts.innerHTML = content.factKeys.map((key) => `<li data-i18n="${key}"></li>`).join('');
    const note = requireElement(this.detail, '.map-panel__note', HTMLElement);
    if (content.noteKey) note.setAttribute('data-i18n', content.noteKey);
    else {
      note.removeAttribute('data-i18n');
      note.textContent = '';
    }
    this.detail.style.setProperty('--accent', content.color ?? 'var(--jcdc-secondary)');
    translateDom(this.detail);
  }

  setCollapsed(collapsed: boolean): void {
    this.element.dataset.collapsed = String(collapsed);
    this.toggle.setAttribute('aria-expanded', String(!collapsed));
    this.toggle.setAttribute(
      'data-i18n-attr',
      `aria-label:map.${collapsed ? 'showPanel' : 'hidePanel'}`,
    );
    translateDom(this.toggle);
    this.callbacks.onCollapse(collapsed);
  }

  focusHeading(): void {
    if (this.showing && !this.collapsed)
      this.detail
        .querySelector<HTMLElement>('.map-panel__detail-title')
        ?.focus({ preventScroll: true });
  }

  private focusFromTarget(target: EventTarget | null): Focus | null {
    const item = target instanceof Element ? target.closest<HTMLElement>('.map-list__item') : null;
    const kind = item?.dataset.kind;
    const id = item?.dataset.id;
    if (
      !id ||
      (kind !== 'landmark' &&
        kind !== 'district' &&
        kind !== 'attraction' &&
        kind !== 'hotspot' &&
        kind !== 'place')
    )
      return null;
    return { kind, id };
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('.map-panel__toggle')) {
      this.setCollapsed(!this.collapsed);
      return;
    }
    if (target?.closest('.map-panel__back')) {
      this.callbacks.onBack();
      return;
    }
    const focus = this.focusFromTarget(event.target);
    if (focus) this.callbacks.onSelect(focus);
  };

  private readonly onPointerOver = (event: Event): void => {
    this.callbacks.onHover(this.focusFromTarget(event.target));
  };

  private readonly onPointerLeave = (): void => {
    this.callbacks.onHover(null);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.showing) {
      event.preventDefault();
      event.stopPropagation();
      this.callbacks.onBack();
    }
  };

  dispose(): void {
    gsap.killTweensOf([this.overview, this.detail]);
    this.element.remove();
  }
}
