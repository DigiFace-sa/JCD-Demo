import { MathUtils, Plane, Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three';
import { ATTRACTION_IDS, ATTRACTIONS, type AttractionId } from '../../data/attractions';
import { DISTRICT_IDS, DISTRICTS, isDistrictId, type DistrictId } from '../../data/districts';
import type { CameraShot } from '../../data/geo';
import { isLandmarkId, LANDMARK_IDS, LANDMARKS } from '../../data/landmarks';
import { COAST } from '../config/scene';
import { VIEWS } from '../config/views';
import type { Disposable, Focus, FocusKind } from '../types';
import { pointInPolygon, polygonBounds } from '../utils/polygon';
import type { World } from '../world/World';
import { CameraDirector } from './CameraDirector';
import type { Controls, OrbitView } from './Controls';
import { Markers, type MarkerSpec } from './Markers';

/** A pointer press that moves less than this (px) and is this quick (ms) counts as a click. */
const CLICK_SLOP = 6;
const CLICK_MAX_MS = 450;
/** Framing for districts and attractions (landmarks carry their own shots in data). */
const DISTRICT_SHOT = { polarDeg: 56, azimuthDeg: -72, padding: 1.15, minRadius: 1400 } as const;
const ATTRACTION_SHOT: CameraShot = { radius: 480, polarDeg: 68, azimuthDeg: -62 };

type SelectListener = (focus: Focus) => void;

const toView = (target: { x: number; y: number; z: number }, shot: CameraShot): OrbitView => ({
  target,
  radius: shot.radius,
  polar: MathUtils.degToRad(shot.polarDeg),
  azimuth: MathUtils.degToRad(shot.azimuthDeg),
});

/**
 * Spawn-map behaviour: markers, pointer picking (landmarks, then districts on the ground),
 * district hover, and camera framing for whatever is in focus.
 */
export class MapInteraction implements Disposable {
  readonly director: CameraDirector;
  private readonly markers: Markers;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly groundPlane = new Plane(new Vector3(0, 1, 0), -COAST.landHeight);
  private readonly groundHit = new Vector3();
  private readonly listeners = new Set<SelectListener>();
  private press: { x: number; y: number; time: number } | null = null;
  private hoverQueued = false;
  private lastPointer: PointerEvent | null = null;
  private markerHover: DistrictId | null = null;
  private pointerHover: DistrictId | null = null;
  private externalHover: DistrictId | null = null;
  private current: Focus | null = null;
  /** Screen pixels covered by the side panel: positive = right edge, negative = left (RTL). */
  private panelInset = 0;

  constructor(
    host: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: PerspectiveCamera,
    private readonly controls: Controls,
    private readonly world: World,
  ) {
    this.director = new CameraDirector(controls);
    this.markers = new Markers(
      host,
      this.markerSpecs(),
      {
        onSelect: (kind, id) => {
          this.emit({ kind, id });
        },
        onHover: (kind, id) => {
          this.markerHover =
            kind === 'district' && isDistrictId(id ?? undefined) ? (id as DistrictId) : null;
          this.applyHover();
        },
      },
      'map.markersLabel',
    );
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
  }

  private markerSpecs(): MarkerSpec[] {
    const at = (x: number, z: number, height: number): Vector3 =>
      new Vector3(x, COAST.landHeight + height, z);
    return [
      ...LANDMARK_IDS.map((id) => {
        const { position, markerHeight, nameKey } = LANDMARKS[id];
        return {
          kind: 'landmark' as const,
          id,
          labelKey: nameKey,
          position: at(position.x, position.z, markerHeight),
        };
      }),
      ...DISTRICT_IDS.map((id) => {
        const { label, nameKey } = DISTRICTS[id];
        return {
          kind: 'district' as const,
          id,
          labelKey: nameKey,
          position: at(label.x, label.z, 4),
        };
      }),
      ...ATTRACTION_IDS.map((id) => {
        const { position, markerHeight, nameKey } = ATTRACTIONS[id];
        return {
          kind: 'attraction' as const,
          id,
          labelKey: nameKey,
          position: at(position.x, position.z, markerHeight),
        };
      }),
    ];
  }

  onSelect(listener: SelectListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(focus: Focus): void {
    this.listeners.forEach((listener) => {
      listener(focus);
    });
  }

  setAvoidElements(elements: readonly Element[]): void {
    this.markers.setAvoidElements(elements);
  }

  setPanelInset(pixels: number): void {
    this.panelInset = pixels;
    this.markers.invalidateAvoidAreas();
  }

  /** The spawn-map framing, shifted clear of the side panel. */
  get mapView(): OrbitView {
    return this.offsetForPanel(VIEWS.map);
  }

  /** Frame `focus` (or the whole map for null): highlight, then fly. */
  async focus(focus: Focus | null, immediate = false): Promise<void> {
    this.current = focus;
    this.world.masterplan.setSelected(
      focus?.kind === 'district' && isDistrictId(focus.id) ? focus.id : null,
    );
    this.markers.setActive(focus);
    const view = this.offsetForPanel(this.viewFor(focus));
    if (immediate) {
      this.director.cancel();
      this.controls.setView(view, true);
      return;
    }
    this.markers.setVisible(false);
    await this.director.flyTo(view);
    // A newer focus may have started while this flight ran; only the latest restores markers.
    if (this.current === focus) this.markers.setVisible(true);
  }

  private viewFor(focus: Focus | null): OrbitView {
    if (!focus) return VIEWS.map;
    if (focus.kind === 'landmark' && isLandmarkId(focus.id)) {
      const { position, shot, markerHeight } = LANDMARKS[focus.id];
      return toView(
        { x: position.x, y: COAST.landHeight + markerHeight * 0.3, z: position.z },
        shot,
      );
    }
    if (focus.kind === 'district' && isDistrictId(focus.id)) {
      const bounds = polygonBounds(DISTRICTS[focus.id].polygon);
      const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
      const center = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: 0,
        z: (bounds.minZ + bounds.maxZ) / 2,
      };
      return toView(center, {
        radius: Math.max(DISTRICT_SHOT.minRadius, span * DISTRICT_SHOT.padding),
        polarDeg: DISTRICT_SHOT.polarDeg,
        azimuthDeg: DISTRICT_SHOT.azimuthDeg,
      });
    }
    const attraction = ATTRACTIONS[focus.id as AttractionId];
    return toView(
      { x: attraction.position.x, y: COAST.landHeight, z: attraction.position.z },
      ATTRACTION_SHOT,
    );
  }

  /** Shift the target sideways so the subject sits in the part of the screen the panel leaves free. */
  private offsetForPanel(view: OrbitView): OrbitView {
    if (this.panelInset === 0) return view;
    const width = this.canvas.clientWidth || 1;
    const halfFovX = Math.atan(
      Math.tan(MathUtils.degToRad(this.camera.fov) / 2) * this.camera.aspect,
    );
    const visibleWidth = 2 * view.radius * Math.sin(view.polar) * Math.tan(halfFovX);
    const shift = (this.panelInset / 2 / width) * visibleWidth;
    // Camera-right on the ground for this azimuth.
    const rightX = Math.cos(view.azimuth);
    const rightZ = -Math.sin(view.azimuth);
    return {
      ...view,
      target: {
        x: view.target.x + rightX * shift,
        y: view.target.y,
        z: view.target.z + rightZ * shift,
      },
    };
  }

  update(width: number, height: number): void {
    this.markers.update(this.camera, width, height);
  }

  /** Hover driven from outside the canvas (e.g. the side panel's district list). */
  setExternalHover(focus: Focus | null): void {
    this.externalHover = focus?.kind === 'district' && isDistrictId(focus.id) ? focus.id : null;
    this.applyHover();
  }

  private applyHover(): void {
    this.world.masterplan.setHovered(this.externalHover ?? this.markerHover ?? this.pointerHover);
  }

  private pick(event: PointerEvent): { kind: FocusKind; id: string } | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const landmark = this.world.landmarks.pick(this.raycaster);
    if (landmark) return { kind: 'landmark', id: landmark };
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, this.groundHit)) return null;
    const district = DISTRICT_IDS.find((id) =>
      pointInPolygon(this.groundHit.x, this.groundHit.z, DISTRICTS[id].polygon),
    );
    return district ? { kind: 'district', id: district } : null;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.press = { x: event.clientX, y: event.clientY, time: performance.now() };
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const press = this.press;
    this.press = null;
    if (!press || this.director.flying || !this.controls.enabled) return;
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (moved > CLICK_SLOP || performance.now() - press.time > CLICK_MAX_MS) return;
    const hit = this.pick(event);
    if (hit) this.emit(hit);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    this.lastPointer = event;
    if (this.hoverQueued) return;
    this.hoverQueued = true;
    requestAnimationFrame(() => {
      this.hoverQueued = false;
      const pointer = this.lastPointer;
      if (!pointer || this.press || this.director.flying) return;
      const hit = this.pick(pointer);
      this.canvas.style.cursor = hit ? 'pointer' : '';
      this.pointerHover = hit?.kind === 'district' && isDistrictId(hit.id) ? hit.id : null;
      this.applyHover();
    });
  };

  private readonly onPointerLeave = (): void => {
    this.lastPointer = null;
    this.pointerHover = null;
    this.canvas.style.cursor = '';
    this.applyHover();
  };

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.director.dispose();
    this.markers.dispose();
    this.listeners.clear();
  }
}
