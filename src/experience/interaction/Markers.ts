import type { PerspectiveCamera } from 'three';
import { Vector3 } from 'three';
import { onLangChange, translateDom, type TranslationKey } from '../../i18n/i18n';
import type { Disposable } from '../types';

export type MarkerKind = 'landmark' | 'district' | 'attraction' | 'hotspot';

export interface MarkerSpec {
  readonly kind: MarkerKind;
  readonly id: string;
  readonly labelKey: TranslationKey;
  readonly position: Vector3;
}

export interface MarkerCallbacks {
  readonly onSelect: (kind: MarkerKind, id: string) => void;
  readonly onHover: (kind: MarkerKind, id: string | null) => void;
}

/** Per kind: draw priority (higher wins overlaps) and the distance band (m) where it shows. */
const KIND_RULES: Readonly<
  Record<MarkerKind, { priority: number; near: number; far: number; fade?: number }>
> = {
  landmark: { priority: 3, near: 120, far: 11_000 },
  district: { priority: 2, near: 600, far: 9_000 },
  attraction: { priority: 1, near: 80, far: 4_500 },
  hotspot: { priority: 4, near: 0, far: 700, fade: 12 },
};
/** Distance (m) over which markers fade in/out at the ends of their band. */
const FADE_RANGE = 400;
/** Extra spacing (px) kept between marker boxes when decluttering. */
const DECLUTTER_PADDING = 6;
/** Markers shrink with distance down to this scale. */
const MIN_SCALE = 0.82;
const SCALE_DISTANCE = 12_000;

interface MarkerState {
  readonly spec: MarkerSpec;
  readonly element: HTMLButtonElement;
  width: number;
  height: number;
  x: number;
  y: number;
  opacity: number;
  scale: number;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/**
 * HTML markers anchored to 3D positions. Real buttons: keyboard focusable, screen-reader
 * labelled by their visible text. Positions are written with transforms only, and only when
 * they change.
 */
export class Markers implements Disposable {
  readonly element = document.createElement('div');
  private readonly markers: MarkerState[] = [];
  private readonly projected = new Vector3();
  private avoidElements: readonly Element[] = [];
  private avoidBoxes: Box[] = [];
  private avoidDirty = true;
  private visible = true;
  private visibilityTest: ((position: Vector3) => boolean) | null = null;
  private active: { kind: MarkerKind; id: string } | null = null;
  private readonly unsubscribeLang: () => void;
  private readonly resizeObserver = new ResizeObserver(() => {
    this.avoidDirty = true;
  });

  constructor(
    host: HTMLElement,
    specs: readonly MarkerSpec[],
    private readonly callbacks: MarkerCallbacks,
    label: TranslationKey,
  ) {
    this.element.className = 'map-markers';
    this.element.setAttribute('role', 'group');
    this.element.setAttribute('data-i18n-attr', `aria-label:${label}`);
    for (const spec of specs) this.markers.push(this.createMarker(spec));
    host.append(this.element);
    translateDom(this.element);
    this.measure();
    this.unsubscribeLang = onLangChange(() => {
      // Labels change width with the language.
      requestAnimationFrame(() => {
        this.measure();
      });
    });
  }

  private createMarker(spec: MarkerSpec): MarkerState {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `marker marker--${spec.kind}`;
    element.dataset.kind = spec.kind;
    element.dataset.id = spec.id;
    element.innerHTML =
      '<span class="marker__dot" aria-hidden="true"></span><span class="marker__label"></span>';
    element.querySelector('.marker__label')?.setAttribute('data-i18n', spec.labelKey);
    element.addEventListener('click', () => {
      this.callbacks.onSelect(spec.kind, spec.id);
    });
    const enter = (): void => {
      this.callbacks.onHover(spec.kind, spec.id);
    };
    const leave = (): void => {
      this.callbacks.onHover(spec.kind, null);
    };
    element.addEventListener('pointerenter', enter);
    element.addEventListener('pointerleave', leave);
    element.addEventListener('focus', enter);
    element.addEventListener('blur', leave);
    this.element.append(element);
    return { spec, element, width: 0, height: 0, x: NaN, y: NaN, opacity: -1, scale: -1 };
  }

  private measure(): void {
    for (const marker of this.markers) {
      marker.width = marker.element.offsetWidth;
      marker.height = marker.element.offsetHeight;
    }
  }

  /** UI regions markers must never sit under (side panel, toolbar). */
  setAvoidElements(elements: readonly Element[]): void {
    this.resizeObserver.disconnect();
    this.avoidElements = elements;
    elements.forEach((element) => {
      this.resizeObserver.observe(element);
    });
    this.avoidDirty = true;
  }

  /** Call when an avoided element moves without resizing (e.g. after a slide transition). */
  invalidateAvoidAreas(): void {
    this.avoidDirty = true;
  }

  /** Hide all markers (e.g. during camera flights). */
  setVisible(visible: boolean): void {
    this.visible = visible;
    this.element.classList.toggle('map-markers--hidden', !visible);
    this.element.inert = !visible;
    for (const marker of this.markers)
      marker.element.tabIndex = visible && marker.opacity >= 0.05 ? 0 : -1;
  }

  setActive(active: { kind: MarkerKind; id: string } | null): void {
    this.active = active;
    for (const marker of this.markers) {
      const isActive = active?.kind === marker.spec.kind && active.id === marker.spec.id;
      marker.element.classList.toggle('marker--active', isActive);
      marker.element.setAttribute('aria-pressed', String(isActive));
    }
  }

  /** Optional inexpensive, domain-specific occlusion (stadium walls, terraces and tunnel). */
  setVisibilityTest(test: (position: Vector3) => boolean): void {
    this.visibilityTest = test;
  }

  update(camera: PerspectiveCamera, width: number, height: number): void {
    if (!this.visible) return;
    if (this.avoidDirty) {
      const host = this.element.getBoundingClientRect();
      this.avoidBoxes = this.avoidElements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left - host.left,
          top: rect.top - host.top,
          right: rect.right - host.left,
          bottom: rect.bottom - host.top,
        };
      });
      this.avoidDirty = false;
    }

    const placed: Box[] = [];
    const ordered = [...this.markers].sort(
      (a, b) => KIND_RULES[b.spec.kind].priority - KIND_RULES[a.spec.kind].priority,
    );
    for (const marker of ordered) {
      const rules = KIND_RULES[marker.spec.kind];
      const distance = camera.position.distanceTo(marker.spec.position);
      this.projected.copy(marker.spec.position).project(camera);
      const onScreen =
        this.projected.z < 1 &&
        Math.abs(this.projected.x) < 1.1 &&
        Math.abs(this.projected.y) < 1.1 &&
        (this.visibilityTest?.(marker.spec.position) ?? true);

      let opacity = 0;
      let x = marker.x;
      let y = marker.y;
      const scale = Math.max(MIN_SCALE, 1 - distance / SCALE_DISTANCE);
      if (onScreen) {
        x = ((this.projected.x + 1) / 2) * width;
        y = ((1 - this.projected.y) / 2) * height;
        const fadeIn = Math.min(1, (distance - rules.near) / (rules.fade ?? FADE_RANGE));
        const fadeOut = Math.min(1, (rules.far - distance) / (rules.fade ?? FADE_RANGE));
        opacity = Math.max(0, Math.min(fadeIn, fadeOut));
        const isActive =
          this.active?.kind === marker.spec.kind && this.active.id === marker.spec.id;
        if (opacity > 0) {
          const halfWidth = (marker.width * scale) / 2 + DECLUTTER_PADDING;
          const box: Box = {
            left: x - halfWidth,
            right: x + halfWidth,
            top: y - marker.height * scale - DECLUTTER_PADDING,
            bottom: y + DECLUTTER_PADDING,
          };
          const blocked =
            this.avoidBoxes.some((avoid) => overlaps(box, avoid)) ||
            (!isActive && placed.some((other) => overlaps(box, other)));
          if (blocked) opacity = 0;
          else placed.push(box);
        }
      }
      this.write(marker, x, y, opacity, scale);
    }
  }

  private write(marker: MarkerState, x: number, y: number, opacity: number, scale: number): void {
    const rounded = (value: number): number => Math.round(value * 2) / 2;
    const rx = rounded(x);
    const ry = rounded(y);
    const ro = Math.round(opacity * 100) / 100;
    const rs = Math.round(scale * 100) / 100;
    if (rx !== marker.x || ry !== marker.y || rs !== marker.scale) {
      marker.element.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -100%) scale(${rs})`;
      marker.x = rx;
      marker.y = ry;
      marker.scale = rs;
    }
    if (ro !== marker.opacity) {
      marker.element.style.opacity = String(ro);
      // Invisible markers must not catch clicks or keyboard focus.
      const hidden = ro < 0.05;
      marker.element.style.pointerEvents = hidden ? 'none' : '';
      marker.element.tabIndex = hidden ? -1 : 0;
      marker.opacity = ro;
    }
  }

  dispose(): void {
    this.unsubscribeLang();
    this.resizeObserver.disconnect();
    this.element.remove();
  }
}
