import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Copy } from '../../app/Copy';
import { useI18n } from '../../app/i18n';
import { useReducedMotion } from '../../app/useReducedMotion';
import { DISTRICTS, DISTRICT_IDS, type DistrictId } from '../../data/districts';
import { PROJECTOR_DISTRICTS, PROJECTOR_MAP } from '../../data/projectorMap';

/** A small lift and one projected card: no camera controls or continuously running renderer. */
const PROJECTION = {
  lift: 22,
  headroom: 36,
  duration: 0.65,
  cardRise: 28,
  mobile: '(max-width: 70rem)',
} as const;

export function ProjectorMap({
  selected,
  onSelect,
  replay = 0,
  children,
}: {
  selected: DistrictId;
  onSelect: (id: DistrictId) => void;
  replay?: number;
  children: ReactNode;
}): ReactNode {
  const { t, lang } = useI18n();
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const beam = useRef<SVGPathElement>(null);
  const beamEdge = useRef<SVGPathElement>(null);
  const current = useRef(selected);
  const unique = useId().replace(/:/g, '');
  const clip = (id: DistrictId): string => `${unique}-${id}`;

  useEffect(() => {
    current.current = selected;
  }, [selected]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const redraw = (): void => {
      if (!card.current || !beam.current || !beamEdge.current) return;
      if (window.matchMedia(PROJECTION.mobile).matches) return;
      const pin = element.querySelector(`[data-piece="${current.current}"] circle`);
      if (!pin) return;
      const stage = element.getBoundingClientRect();
      const anchor = pin.getBoundingClientRect();
      const panel = card.current.getBoundingClientRect();
      // Read the rendered pin so the beam follows the moving piece throughout its lift.
      const x = anchor.left - stage.left + anchor.width / 2;
      const y = anchor.top - stage.top + anchor.height / 2;
      const left = panel.left - stage.left;
      const top = panel.top - stage.top;
      const edgeY = y < top + panel.height / 2 ? top : top + panel.height;
      const from = left + panel.width * 0.18;
      const to = left + panel.width * 0.82;
      beam.current.setAttribute('d', `M${x} ${y}L${from} ${edgeY}L${to} ${edgeY}Z`);
      beamEdge.current.setAttribute('d', `M${from} ${edgeY}L${x} ${y}L${to} ${edgeY}`);
    };
    const observer = new ResizeObserver(redraw);
    observer.observe(element);
    if (card.current) observer.observe(card.current);
    // Selection changes do not resize the map; a local event updates the beam's anchor.
    element.addEventListener('projectionchange', redraw);
    redraw();
    return () => {
      observer.disconnect();
      element.removeEventListener('projectionchange', redraw);
    };
  }, []);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;
      current.current = selected;
      const piece = element.querySelector(`[data-piece="${selected}"]`);
      const rays = element.querySelector('.destination-projector__rays');
      if (reduced) {
        gsap.set(piece, { y: -PROJECTION.lift });
        gsap.set(card.current, { opacity: 1, y: 0, scale: 1 });
        gsap.set(rays, { opacity: 1 });
      } else {
        gsap.fromTo(
          piece,
          { y: 0 },
          { y: -PROJECTION.lift, duration: PROJECTION.duration, ease: 'power3.inOut' },
        );
        gsap.fromTo(
          card.current,
          { opacity: 0, y: PROJECTION.cardRise, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: PROJECTION.duration,
            ease: 'power3.out',
            onUpdate: () => {
              element.dispatchEvent(new Event('projectionchange'));
            },
          },
        );
        gsap.fromTo(
          rays,
          { opacity: 0 },
          { opacity: 1, duration: PROJECTION.duration, delay: 0.12, ease: 'power2.out' },
        );
      }
      const frame = requestAnimationFrame(() => {
        element.dispatchEvent(new Event('projectionchange'));
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    },
    { scope: root, dependencies: [selected, replay, lang, reduced], revertOnUpdate: true },
  );

  return (
    <figure className="destination-projector" ref={root} data-selected={selected}>
      <div className="destination-projector__scene">
        <svg
          className="destination-projector__map"
          viewBox={`0 -${PROJECTION.headroom} ${PROJECTOR_MAP.width} ${PROJECTOR_MAP.height + PROJECTION.headroom}`}
          role="group"
          aria-label={t('marketing.destination.mapLabel')}
        >
          <defs>
            {DISTRICT_IDS.map((id) => (
              <clipPath id={clip(id)} key={id}>
                <path d={PROJECTOR_DISTRICTS[id].path} />
              </clipPath>
            ))}
          </defs>
          <image
            href={PROJECTOR_MAP.background}
            width={PROJECTOR_MAP.width}
            height={PROJECTOR_MAP.height}
            aria-hidden="true"
          />
          <image
            href={PROJECTOR_MAP.masterplan}
            width={PROJECTOR_MAP.width}
            height={PROJECTOR_MAP.height}
            opacity="0.35"
            aria-hidden="true"
          />
          {DISTRICT_IDS.map((id, index) => {
            const district = PROJECTOR_DISTRICTS[id];
            const active = id === selected;
            return (
              <g
                key={id}
                className="destination-projector__district"
                data-district={id}
                data-active={String(active)}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={t(DISTRICTS[id].nameKey)}
                onClick={() => {
                  onSelect(id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(id);
                  }
                }}
              >
                <path
                  d={district.path}
                  className="destination-projector__recess"
                  aria-hidden="true"
                />
                <g data-piece={id} className="destination-projector__piece">
                  <image
                    href={PROJECTOR_MAP.masterplan}
                    width={PROJECTOR_MAP.width}
                    height={PROJECTOR_MAP.height}
                    clipPath={`url(#${clip(id)})`}
                    aria-hidden="true"
                  />
                  <path d={district.path} className="destination-projector__outline" />
                  <g
                    transform={`translate(${district.anchor.x} ${district.anchor.y})`}
                    className="destination-projector__pin"
                    aria-hidden="true"
                  >
                    <circle r="19" />
                    <text textAnchor="middle" dominantBaseline="central">
                      {String(index + 1).padStart(2, '0')}
                    </text>
                  </g>
                </g>
              </g>
            );
          })}
        </svg>
        <svg className="destination-projector__rays" aria-hidden="true">
          <defs>
            <linearGradient id={`${unique}-beam`} x1="0" y1="1" x2="1" y2="0">
              <stop stopColor="#83d6d7" stopOpacity="0.02" />
              <stop offset="1" stopColor="#83d6d7" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path ref={beam} fill={`url(#${unique}-beam)`} />
          <path ref={beamEdge} fill="none" stroke="#9edbd5" strokeOpacity="0.25" strokeWidth="1" />
        </svg>
        <div className="destination-projector__card" ref={card}>
          {children}
        </div>
      </div>
      <figcaption className="destination-projector__caption">
        <Copy k="marketing.destination.mapNote" />
      </figcaption>
    </figure>
  );
}
