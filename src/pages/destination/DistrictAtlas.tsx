import { useId, type ReactNode } from 'react';
import { Copy } from '../../app/Copy';
import { useI18n } from '../../app/i18n';
import { DISTRICTS, DISTRICT_IDS, type DistrictId } from '../../data/districts';
import type { WorldPoint } from '../../data/geo';

/**
 * A deliberately schematic oblique projection of the shared district data. The coast reads
 * north-to-south from left to right; the diagram never mirrors when its labels change language.
 */
const ATLAS = {
  width: 1000,
  height: 620,
  left: 88,
  coast: 422,
  span: 840,
  depth: 292,
  minZ: -2300,
  spanZ: 5000,
  minX: -510,
  spanX: 1750,
  skew: 44,
  slope: 38,
  wall: 9,
  grid: 34,
  anchor: 16,
} as const;

interface Point {
  readonly x: number;
  readonly y: number;
}

function project(point: WorldPoint): Point {
  const along = (point.z - ATLAS.minZ) / ATLAS.spanZ;
  const inland = (point.x - ATLAS.minX) / ATLAS.spanX;
  return {
    x: ATLAS.left + along * ATLAS.span - inland * ATLAS.skew,
    y: ATLAS.coast - inland * ATLAS.depth + along * ATLAS.slope,
  };
}

function points(id: DistrictId): string {
  return DISTRICTS[id].polygon
    .map((point) => {
      const at = project(point);
      return `${at.x},${at.y}`;
    })
    .join(' ');
}

/** Area centroid keeps anchors inside both rectangular districts and the coastal peninsulas. */
function anchor(id: DistrictId): Point {
  const polygon = DISTRICTS[id].polygon;
  let area = 0;
  let x = 0;
  let z = 0;
  polygon.forEach((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    if (!b) return;
    const cross = a.x * b.z - b.x * a.z;
    area += cross;
    x += (a.x + b.x) * cross;
    z += (a.z + b.z) * cross;
  });
  return project({ x: x / (area * 3), z: z / (area * 3) });
}

/** Shared outlines and anchors are data, not an inventory of proposed buildings. */
const SHAPES = DISTRICT_IDS.map((id, index) => ({
  id,
  points: points(id),
  anchor: anchor(id),
  ordinal: String(index + 1).padStart(2, '0'),
}));

/**
 * Interactive cartographic companion to the official district concept renders. The original
 * polygons are retained, with no invented building blocks or implied surveyed boundaries.
 */
export function DistrictAtlas({
  selected,
  onSelect,
}: {
  selected: DistrictId;
  onSelect: (id: DistrictId) => void;
}): ReactNode {
  const { t, rtl } = useI18n();
  const unique = useId().replace(/:/g, '');
  const id = (name: string): string => `${unique}-atlas-${name}`;

  return (
    <figure className="destination-atlas">
      <svg
        className="destination-atlas__svg"
        viewBox={`0 0 ${ATLAS.width} ${ATLAS.height}`}
        role="group"
        aria-label={t('marketing.destination.mapLabel')}
        aria-describedby={id('note')}
      >
        <defs>
          <linearGradient id={id('land')} x1="0" y1="0" x2="0.3" y2="1">
            <stop className="destination-atlas__land-start" />
            <stop offset="1" className="destination-atlas__land-end" />
          </linearGradient>
          <linearGradient id={id('selected')} x1="0" y1="0" x2="0.4" y2="1">
            <stop className="destination-atlas__selected-start" />
            <stop offset="1" className="destination-atlas__selected-end" />
          </linearGradient>
          <pattern
            id={id('grid')}
            width={ATLAS.grid}
            height={ATLAS.grid}
            patternUnits="userSpaceOnUse"
          >
            <path d={`M${ATLAS.grid} 0H0V${ATLAS.grid}`} className="destination-atlas__grid" />
            <circle cx="0" cy="0" r="1" className="destination-atlas__grid-point" />
          </pattern>
          <pattern id={id('hatch')} width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M-2 2 2-2M0 8 8 0M6 10 10 6" className="destination-atlas__hatch" />
          </pattern>
        </defs>

        <g aria-hidden="true" className="destination-atlas__context">
          <rect
            x="0"
            y="0"
            width={ATLAS.width}
            height={ATLAS.height}
            fill={`url(#${id('grid')})`}
          />
          <path d="M20 491C174 477 198 539 343 510S551 471 696 508 866 534 981 491" />
          <path d="M12 518C161 503 200 565 346 537S559 499 694 534 865 562 992 520" />
          <path d="M0 546C148 530 204 591 349 564S566 527 694 562 866 590 1000 550" />
          <path d="M65 98 929 136M54 80 918 118" className="destination-atlas__inland-line" />
          <path d="M45 156V118h38M918 577h38v-38" className="destination-atlas__corner" />
        </g>

        {/* Keep DOM order stable so selecting a focused polygon never moves its tab position. */}
        {SHAPES.map((shape) => {
          const active = shape.id === selected;
          return (
            <g
              key={shape.id}
              className="destination-atlas__district"
              data-district={shape.id}
              data-active={String(active)}
              role="button"
              tabIndex={0}
              aria-label={t(DISTRICTS[shape.id].nameKey)}
              aria-pressed={active}
              onClick={() => {
                onSelect(shape.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(shape.id);
                }
              }}
            >
              <polygon
                points={shape.points}
                transform={`translate(0 ${ATLAS.wall})`}
                className="destination-atlas__wall"
              />
              <polygon
                points={shape.points}
                className="destination-atlas__surface"
                fill={`url(#${id(active ? 'selected' : 'land')})`}
              />
              <polygon
                points={shape.points}
                fill={`url(#${id('hatch')})`}
                className="destination-atlas__texture"
              />
              <polygon points={shape.points} className="destination-atlas__edge" />
              <g
                transform={`translate(${shape.anchor.x} ${shape.anchor.y})`}
                className="destination-atlas__anchor"
                aria-hidden="true"
              >
                <circle r={ATLAS.anchor + 7} className="destination-atlas__halo" />
                <circle r={ATLAS.anchor} className="destination-atlas__node" />
                <text
                  className="destination-atlas__number"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {shape.ordinal}
                </text>
                <text
                  className="destination-atlas__name"
                  textAnchor="middle"
                  y="42"
                  direction={rtl ? 'rtl' : 'ltr'}
                >
                  {t(DISTRICTS[shape.id].nameKey)}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <figcaption id={id('note')} className="destination-atlas__caption">
        <span className="destination-atlas__key" aria-hidden="true" />
        <div>
          <Copy k="marketing.destination.mapNote" />
        </div>
      </figcaption>
    </figure>
  );
}
