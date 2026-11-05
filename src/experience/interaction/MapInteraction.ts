import {
  CubicBezierCurve3,
  MathUtils,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
  type PerspectiveCamera,
} from 'three';
import { ATTRACTION_IDS, ATTRACTIONS, type AttractionId } from '../../data/attractions';
import { DISTRICT_IDS, DISTRICTS, isDistrictId, type DistrictId } from '../../data/districts';
import type { CameraShot } from '../../data/geo';
import { isLandmarkId, LANDMARK_IDS, LANDMARKS } from '../../data/landmarks';
import { isStadiumViewId } from '../../data/stadium';
import { PLACE_IDS, PLACES, isPlaceId, type PlaceId } from '../../data/places';
import { PUBLIC_REALM } from '../config/publicRealm';
import { COAST, LIGHT, RENDER } from '../config/scene';
import { MAP_LIMITS, VIEWS } from '../config/views';
import type { Disposable, Focus, FocusKind } from '../types';
import { pointInPolygon, polygonBounds } from '../utils/polygon';
import type { World } from '../world/World';
import { CameraDirector } from './CameraDirector';
import type { Controls, ControlLimits, OrbitView } from './Controls';
import { Markers, type MarkerSpec } from './Markers';
import { StadiumNavigation } from './StadiumNavigation';

/** A pointer press that moves less than this (px) and is this quick (ms) counts as a click. */
const CLICK_SLOP = 6;
const CLICK_MAX_MS = 450;
/** Framing for districts and attractions (landmarks carry their own shots in data). */
const DISTRICT_SHOT = { polarDeg: 56, azimuthDeg: -72, padding: 1.15, minRadius: 1400 } as const;
/** Aerial close-view arc: seconds, altitude clearance (m), travel-dependent lift and samples. */
const PUBLIC_FLIGHT = { duration: 3.8, clearance: 240, lift: 0.5, samples: 24 } as const;
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
  private readonly stadium: StadiumNavigation;
  private readonly flightListeners = new Set<(flying: boolean) => void>();
  private request = 0;
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
  /** Screen pixels covered by the side panel: positive = right edge, negative = left (RTL). */
  private panelInset = 0;
  private focusedPlace: PlaceId | null = null;

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
    this.stadium = new StadiumNavigation(host, camera, controls, this.director, world, (focus) => {
      this.emit(focus);
    });
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
      ...PLACE_IDS.map((id) => ({
        kind: 'place' as const,
        id,
        labelKey: PLACES[id].titleKey,
        position: at(PLACES[id].position.x, PLACES[id].position.z, 4),
      })),
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
    this.stadium.setAvoidElements(elements);
  }

  setPanelInset(pixels: number): void {
    const changed = this.panelInset !== pixels;
    const current = this.controls.getView();
    const before = this.offsetForPanel(current);
    this.panelInset = pixels;
    if (changed && this.focusedPlace && !this.director.flying) {
      const after = this.offsetForPanel(current);
      // Reframe only the covered screen area: retain the user's zoom, orbit and pan.
      this.controls.setView({
        ...current,
        target: {
          x: current.target.x + after.target.x - before.target.x,
          y: current.target.y,
          z: current.target.z + after.target.z - before.target.z,
        },
      });
    }
    this.stadium.setPanelInset(pixels);
    this.markers.invalidateAvoidAreas();
    this.stadium.invalidateAvoidAreas();
  }

  onFlightChange(listener: (flying: boolean) => void): () => void {
    this.flightListeners.add(listener);
    return () => this.flightListeners.delete(listener);
  }

  /** The spawn-map framing, shifted clear of the side panel. */
  get mapView(): OrbitView {
    return this.offsetForPanel(VIEWS.map);
  }

  get occludesWorld(): boolean {
    return this.stadium.occludesWorld;
  }

  get nearPlane(): number | null {
    return this.stadium.nearPlane;
  }

  /** Frame `focus` (or the whole map for null): highlight, then fly. */
  async focus(focus: Focus | null, immediate = false): Promise<void> {
    const request = ++this.request;
    const fromPlace = this.focusedPlace;
    this.focusedPlace = null;
    if (focus?.kind === 'place') {
      this.pointerHover = null;
      this.markerHover = null;
      this.externalHover = null;
      this.world.masterplan.setHovered(null);
      this.canvas.style.cursor = '';
    }
    // Preserve a close starting radius during the flight; restore map limits on arrival.
    this.controls.setLimits({ ...MAP_LIMITS, minRadius: PUBLIC_REALM.camera.minRadius });
    if (!this.stadium.active) this.restoreMapShadow();
    this.world.masterplan.setSelected(
      focus?.kind === 'district' && isDistrictId(focus.id) ? focus.id : null,
    );
    this.markers.setActive(focus);
    this.markers.setVisible(false);
    this.flightListeners.forEach((listener) => {
      listener(!immediate);
    });
    if (fromPlace && focus?.kind === 'hotspot' && !immediate) {
      await this.flyPublic(this.offsetForPanel(this.viewFor({ kind: 'landmark', id: 'stadium' })));
      if (request !== this.request) return;
    }
    if (focus?.kind === 'hotspot' && isStadiumViewId(focus.id)) {
      this.canvas.style.cursor = '';
      this.pointerHover = null;
      this.world.masterplan.setHovered(null);
      await this.stadium.focus(focus.id, immediate);
    } else {
      let view = this.offsetForPanel(this.viewFor(focus));
      if (focus?.kind === 'place' && isPlaceId(focus.id)) view = this.safePlaceView(focus.id, view);
      const isPlace = focus?.kind === 'place' && isPlaceId(focus.id);
      if (this.stadium.active) {
        const exit =
          isPlace && !immediate ? { ...view, radius: 600, polar: MathUtils.degToRad(18) } : view;
        await this.stadium.exit(exit, immediate);
        if (request !== this.request) return;
        if (isPlace && !immediate) await this.flyPublic(view);
      } else if (immediate) {
        this.director.cancel();
        this.controls.setView(view, true);
      } else if (isPlace || fromPlace) {
        await this.flyPublic(view);
      } else {
        await this.director.flyTo(view);
      }
    }
    if (request !== this.request) return;
    if (focus?.kind === 'place' && isPlaceId(focus.id)) {
      this.focusedPlace = focus.id;
      this.controls.setLimits(this.placeLimits(focus.id));
      const { position } = PLACES[focus.id];
      // The framing has arrived before this one-time static shadow bake.
      this.world.environment.usePublicShadow(
        new Vector3(position.x - 260, 0, position.z - 300),
        new Vector3(position.x + 260, 180, position.z + 300),
      );
    }
    if (focus?.kind !== 'place' && !this.stadium.active) this.controls.setLimits(MAP_LIMITS);
    this.markers.setVisible(!this.stadium.active);
    this.flightListeners.forEach((listener) => {
      listener(false);
    });
  }

  private viewFor(focus: Focus | null): OrbitView {
    if (!focus) return VIEWS.map;
    if (focus.kind === 'place' && isPlaceId(focus.id)) {
      const { position, shot } = PLACES[focus.id];
      return toView(
        { x: position.x, y: COAST.landHeight + 2, z: position.z },
        {
          ...shot,
          radius: shot.radius * (this.camera.aspect < 1 ? 1.2 : 1),
          polarDeg: this.camera.aspect < 1 && focus.id === 'central-square' ? 35 : shot.polarDeg,
        },
      );
    }
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

  /** A convex aerial arc avoids cutting through nearby roofs on close-view transitions. */
  private flyPublic(view: OrbitView): Promise<void> {
    const position = this.positionFor(view);
    const from = this.camera.position.clone();
    const travel = Math.hypot(position.x - from.x, position.z - from.z);
    const height = Math.max(
      from.y,
      position.y,
      PUBLIC_FLIGHT.clearance + travel * PUBLIC_FLIGHT.lift,
    );
    const curve = new CubicBezierCurve3(
      from,
      new Vector3(from.x, height, from.z),
      new Vector3(position.x, height, position.z),
      position,
    );
    const target = new Vector3(view.target.x, view.target.y, view.target.z);
    const current = this.controls.target.clone();
    const positions: Vector3[] = [],
      targets: Vector3[] = [];
    const samples = PUBLIC_FLIGHT.samples;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      positions.push(curve.getPoint(t));
      targets.push(current.clone().lerp(target, t));
    }
    return this.director.flyAlong({ positions, targets }, { duration: PUBLIC_FLIGHT.duration });
  }

  private positionFor(view: OrbitView): Vector3 {
    return new Vector3(
      view.target.x + view.radius * Math.sin(view.polar) * Math.sin(view.azimuth),
      view.target.y + view.radius * Math.cos(view.polar),
      view.target.z + view.radius * Math.sin(view.polar) * Math.cos(view.azimuth),
    );
  }

  private safePlaceView(id: PlaceId, view: OrbitView): OrbitView {
    const position = this.positionFor(view);
    this.placeLimits(id).constrainPosition?.(position);
    position.sub(new Vector3(view.target.x, view.target.y, view.target.z));
    const radius = position.length();
    return {
      ...view,
      radius,
      polar: Math.acos(position.y / radius),
      azimuth: Math.atan2(position.x, position.z),
    };
  }

  private restoreMapShadow(): void {
    const region = LIGHT.shadowRegion;
    this.world.environment.useShadowRegion(
      'map',
      new Vector3(region.minX, 0, region.minZ),
      new Vector3(region.maxX, region.maxHeight, region.maxZ),
    );
  }

  private placeLimits(id: keyof typeof PLACES): ControlLimits {
    const { position } = PLACES[id];
    const { camera } = PUBLIC_REALM;
    return {
      ...MAP_LIMITS,
      minRadius: camera.minRadius,
      maxRadius: camera.maxRadius,
      minHeight: camera.minHeight,
      minPolar: MathUtils.degToRad(35),
      maxPolar: MathUtils.degToRad(78),
      bounds: {
        minX: position.x - camera.targetTravel,
        maxX: position.x + camera.targetTravel,
        minZ: position.z - camera.targetTravel,
        maxZ: position.z + camera.targetTravel,
      },
      constrainPosition: (p) => {
        // Keep the eye within the reserved square: merely lifting it above a neighbouring
        // tower still lets that tower's roof occlude the line of sight to the square.
        const { central, beach } = PUBLIC_REALM;
        if (id === 'central-square') {
          const half = central.halfSize - camera.clearance;
          p.x = MathUtils.clamp(p.x, central.x - half, central.x + half);
          p.z = MathUtils.clamp(p.z, central.z - half, central.z + half);
        } else p.x = Math.min(p.x, beach.x + beach.reserveHalfWidth - camera.clearance);
        p.y = Math.max(p.y, camera.minHeight);
      },
    };
  }

  /** Shift the target sideways so the subject sits in the part of the screen the panel leaves free. */
  private offsetForPanel(view: OrbitView): OrbitView {
    if (this.panelInset === 0) return view;
    const width = this.canvas.clientWidth || 1;
    const halfFovX = Math.atan(
      Math.tan(MathUtils.degToRad(RENDER.fovDeg) / 2) * this.camera.aspect,
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

  update(width: number, height: number, delta: number): void {
    this.markers.update(this.camera, width, height);
    this.stadium.update(width, height, delta);
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
    if (
      !press ||
      this.director.flying ||
      !this.controls.enabled ||
      this.stadium.active ||
      this.focusedPlace
    )
      return;
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
      if (
        !pointer ||
        this.press ||
        this.director.flying ||
        this.stadium.active ||
        this.focusedPlace
      )
        return;
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
    this.request++;
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.director.dispose();
    this.stadium.dispose();
    this.markers.dispose();
    this.listeners.clear();
    this.flightListeners.clear();
  }
}
