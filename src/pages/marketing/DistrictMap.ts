import { DISTRICTS, DISTRICT_IDS, isDistrictId, type DistrictId } from '../../data/districts';
import { translateDom } from '../../i18n/i18n';
import { distanceToEdges, pointInPolygon, polygonBounds } from '../../experience/utils/polygon';
import { LANDMARKS } from '../../data/landmarks';
import { requireElement } from '../../utils/dom';
import { copy, link } from './templates';

/** The diagram uses the same illustrative xz polygons as the 3D scene, projected onto the coast. */
const PROJECT = {
  minZ: -2300,
  spanZ: 5000,
  minX: -510,
  spanX: 1750,
  width: 820,
  depth: 350,
  x: 80,
  y: 510,
} as const;
const project = (x: number, z: number): { x: number; y: number } => ({
  x: PROJECT.x + ((z - PROJECT.minZ) / PROJECT.spanZ) * PROJECT.width,
  y: PROJECT.y - ((x - PROJECT.minX) / PROJECT.spanX) * PROJECT.depth,
});

/** Illustrative block spacing gives the shared polygons depth; it is not a building inventory. */
const BLOCK = { stepX: 240, stepZ: 260, setback: 110, halfX: 55, halfZ: 60, lift: 6 } as const;
function districtBlocks(id: DistrictId): string {
  const district = DISTRICTS[id];
  const bounds = polygonBounds(district.polygon);
  const tiles: string[] = [];
  for (let x = bounds.minX + BLOCK.stepX / 2; x < bounds.maxX; x += BLOCK.stepX)
    for (let z = bounds.minZ + BLOCK.stepZ / 2; z < bounds.maxZ; z += BLOCK.stepZ) {
      if (
        !pointInPolygon(x, z, district.polygon) ||
        distanceToEdges(x, z, district.polygon) < BLOCK.setback
      )
        continue;
      if (
        id === 'sports-park' &&
        Math.hypot(x - LANDMARKS.stadium.position.x, z - LANDMARKS.stadium.position.z) < 440
      )
        continue;
      const a = project(x - BLOCK.halfX, z - BLOCK.halfZ);
      const b = project(x + BLOCK.halfX, z + BLOCK.halfZ);
      const width = b.x - a.x;
      const depth = a.y - b.y;
      tiles.push(
        `<path class="diagram-block-side" d="M${a.x} ${b.y}h${width}v${depth}h-${width}Z"/><rect class="diagram-block-roof" x="${a.x}" y="${b.y - BLOCK.lift}" width="${width}" height="${depth}" rx="1"/>`,
      );
    }
  return tiles.join('');
}

function diagramLandmarks(): string {
  const stadium = project(LANDMARKS.stadium.position.x, LANDMARKS.stadium.position.z);
  const opera = project(LANDMARKS['opera-house'].position.x, LANDMARKS['opera-house'].position.z);
  const ocean = project(LANDMARKS.oceanarium.position.x, LANDMARKS.oceanarium.position.z);
  const museum = project(LANDMARKS.museum.position.x, LANDMARKS.museum.position.z);
  return `<g class="diagram-landmarks" aria-hidden="true"><g transform="translate(${stadium.x} ${stadium.y})"><ellipse rx="48" ry="31" class="diagram-garden"/><ellipse rx="33" ry="20"/><ellipse rx="21" ry="10" class="diagram-opening"/></g><g transform="translate(${opera.x} ${opera.y})"><path d="M-22 9 0-17 8 9Zm13 3L17-12 24 12Z"/></g><g transform="translate(${ocean.x} ${ocean.y})"><ellipse cx="-10" rx="16" ry="12"/><ellipse cx="11" cy="3" rx="13" ry="10"/></g><g transform="translate(${museum.x} ${museum.y})"><path d="M-20 10V-6l10-6V-6l10-6V-6l10-6V10Z"/><path d="M17 10V-22h5V10Z"/></g></g>`;
}

export function districtMapTemplate(): string {
  return `<div class="district-explorer" data-reveal>
    <div class="district-explorer__map"><svg viewBox="0 0 1000 650" role="group" data-i18n-attr="aria-label:marketing.destination.mapLabel">
      <defs><pattern id="sea-lines" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M0 14h28" stroke="currentColor" opacity=".05"/></pattern><filter id="district-shadow" x="-20%" y="-20%" width="150%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="9" flood-opacity=".08"/></filter></defs>
      <rect width="1000" height="650" fill="url(#sea-lines)"/>
      <g class="district-explorer__land" filter="url(#district-shadow)">${DISTRICT_IDS.map((id) => {
        const district = DISTRICTS[id];
        const at = project(district.label.x, district.label.z);
        const points = district.polygon
          .map((p) => {
            const v = project(p.x, p.z);
            return `${v.x},${v.y}`;
          })
          .join(' ');
        return `<g class="district-shape" data-district="${id}" role="button" tabindex="0" aria-pressed="false" data-i18n-attr="aria-label:${district.nameKey}"><polygon class="diagram-base" points="${points}" transform="translate(0 9)"/><polygon class="diagram-surface" points="${points}"/>${districtBlocks(id)}<text x="${at.x}" y="${at.y}" text-anchor="middle" dominant-baseline="middle" data-i18n="${district.nameKey}"></text></g>`;
      }).join('')}${diagramLandmarks()}</g>
      <path class="district-explorer__shore" d="M80 448H900"/>
    </svg>${copy('marketing.destination.mapNote', 'p', 'district-explorer__caption')}</div>
    <div class="district-explorer__content">${copy('marketing.destination.mapLead', 'p', 'muted')}<div class="district-tabs" role="group" data-i18n-attr="aria-label:marketing.destination.mapLabel">${DISTRICT_IDS.map((id) => `<button type="button" data-district="${id}" aria-pressed="false" data-i18n="${DISTRICTS[id].nameKey}"></button>`).join('')}</div><div class="district-detail" aria-live="polite">${copy(DISTRICTS.central.nameKey, 'h3')}${copy(DISTRICTS.central.summaryKey, 'p', 'muted')}</div>${link('marketing.actions.in3d', '/experience')}</div>
  </div>`;
}

export function bindDistrictMap(
  root: HTMLElement,
  initial: string | null,
  enhance: () => void,
): () => void {
  const explorer = requireElement(root, '.district-explorer', HTMLDivElement);
  const detail = requireElement(explorer, '.district-detail', HTMLDivElement);
  const choose = (id: DistrictId): void => {
    for (const element of explorer.querySelectorAll<HTMLElement | SVGElement>('[data-district]'))
      element.setAttribute('aria-pressed', String(element.dataset.district === id));
    requireElement(detail, 'h3', HTMLHeadingElement).setAttribute(
      'data-i18n',
      DISTRICTS[id].nameKey,
    );
    requireElement(detail, 'p', HTMLParagraphElement).setAttribute(
      'data-i18n',
      DISTRICTS[id].summaryKey,
    );
    translateDom(detail);
    enhance();
  };
  const select = (event: Event): void => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement | SVGElement>('[data-district]')
        : null;
    const id = target?.dataset.district;
    if (isDistrictId(id)) choose(id);
  };
  const key = (event: KeyboardEvent): void => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof SVGElement) {
      event.preventDefault();
      select(event);
    }
  };
  explorer.addEventListener('click', select);
  explorer.addEventListener('focusin', select);
  explorer.addEventListener('keydown', key);
  choose(isDistrictId(initial ?? undefined) ? (initial as DistrictId) : 'central');
  return () => {
    explorer.removeEventListener('click', select);
    explorer.removeEventListener('focusin', select);
    explorer.removeEventListener('keydown', key);
  };
}
