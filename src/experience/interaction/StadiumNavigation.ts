import { CatmullRomCurve3, MathUtils, Vector3, type PerspectiveCamera } from 'three';
import { STADIUM_HOTSPOTS, STADIUM_HOTSPOT_IDS, type StadiumViewId } from '../../data/stadium';
import { prefersReducedMotion } from '../../utils/motion';
import { MAP_LIMITS } from '../config/views';
import { COAST, LIGHT, RENDER } from '../config/scene';
import {
  STADIUM,
  STADIUM_ARRIVAL,
  STADIUM_LIMITS,
  STADIUM_POSITION,
  STADIUM_PORTAL,
  STADIUM_PASSAGE,
  stadiumFloor,
  stadiumPoint,
  stadiumAnchorVisible,
} from '../config/stadium';
import type { Disposable, Focus } from '../types';
import type { World } from '../world/World';
import type { CameraDirector, FlightPath } from './CameraDirector';
import type { ControlLimits, Controls, OrbitView } from './Controls';
import { Markers } from './Markers';

/** Passage moves stay within the architectural opening, with time to read the reveal. */
const PORTAL_DURATION = 3.8;
const HOTSPOT_DURATION = 1.6;
const PATH_SAMPLES = 32;
/** Wider interior lens gives a spatial reading of the terraces without changing the map lens. */
const INTERIOR_FOV = 64;
const LENS_DAMPING = 5;
/** Change lens while approaching the building, before the doorway fills the frame. */
const LENS_DISTANCE = { wide: 150, map: 300 } as const;
/** Unrestricted only during scripted flights; user controls always receive a safe envelope. */
const FLIGHT_LIMITS: ControlLimits = {
  ...MAP_LIMITS,
  minRadius: 1,
  minHeight: 0,
  minPolar: 0,
  maxPolar: Math.PI,
};

const vec = (p: { x: number; y: number; z: number }): Vector3 => new Vector3(p.x, p.y, p.z);
const local = (x: number, y: number, z = 0): Vector3 => vec(stadiumPoint(x, y, z));
const poseFor = (view: OrbitView): { position: Vector3; target: Vector3 } => ({
  target: vec(view.target),
  position: new Vector3(
    view.target.x + view.radius * Math.sin(view.polar) * Math.sin(view.azimuth),
    view.target.y + view.radius * Math.cos(view.polar),
    view.target.z + view.radius * Math.sin(view.polar) * Math.cos(view.azimuth),
  ),
});

/** Stadium session, including reversal at the current curve parameter and stale-request guards. */
export class StadiumNavigation implements Disposable {
  private readonly markers: Markers;
  private revision = 0;
  private entered = false;
  private zone: 'bowl' | 'concourse' | 'park' = 'bowl';
  private portal: FlightPath | null = null;
  private portalT = 0;
  private crossing = false;
  private panelInset = 0;
  private lensShift = 0;

  constructor(
    host: HTMLElement,
    private readonly camera: PerspectiveCamera,
    private readonly controls: Controls,
    private readonly director: CameraDirector,
    private readonly world: World,
    onSelect: (focus: Focus) => void,
  ) {
    this.markers = new Markers(
      host,
      STADIUM_HOTSPOT_IDS.map((id) => ({
        kind: 'hotspot',
        id,
        labelKey: STADIUM_HOTSPOTS[id].titleKey,
        position: vec(
          stadiumPoint(
            STADIUM_HOTSPOTS[id].anchor.x,
            STADIUM_HOTSPOTS[id].anchor.y,
            STADIUM_HOTSPOTS[id].anchor.z,
          ),
        ),
      })),
      {
        onSelect: (_kind, id) => {
          onSelect({ kind: 'hotspot', id });
        },
        onHover: () => undefined,
      },
      'stadium.markersLabel',
    );
    this.markers.setVisible(false);
    this.markers.setVisibilityTest((position) =>
      stadiumAnchorVisible(this.camera.position, position),
    );
  }

  get active(): boolean {
    return this.entered;
  }

  /** Classify the actual pose as well as the last arrival, so mid-passage cancellations stay safe. */
  private get inPassage(): boolean {
    const x = this.camera.position.x - STADIUM_POSITION.x;
    const y = this.camera.position.y - STADIUM_POSITION.y;
    const z = this.camera.position.z - STADIUM_POSITION.z;
    return (
      x >= STADIUM.tunnel.innerX &&
      x <= STADIUM.tunnel.outerX &&
      Math.abs(z) <= STADIUM.tunnel.halfWidth &&
      y >= STADIUM.tunnel.floor &&
      y <= STADIUM.tunnel.ceiling
    );
  }

  /** The opaque bowl encloses these views; distant world and water passes cannot contribute. */
  get occludesWorld(): boolean {
    if (!this.entered || this.zone === 'park') return false;
    const radius = (p: Vector3): number =>
      Math.hypot((p.x - STADIUM_POSITION.x) / STADIUM.rx, (p.z - STADIUM_POSITION.z) / STADIUM.rz);
    return (
      radius(this.camera.position) < 0.65 &&
      radius(this.controls.target) < 0.85 &&
      this.camera.position.y < COAST.landHeight + 36
    );
  }

  setAvoidElements(elements: readonly Element[]): void {
    this.markers.setAvoidElements(elements);
  }
  invalidateAvoidAreas(): void {
    this.markers.invalidateAvoidAreas();
  }
  setPanelInset(pixels: number): void {
    this.panelInset = pixels;
  }
  update(width: number, height: number, delta: number): void {
    const blend = prefersReducedMotion() ? 1 : 1 - Math.exp(-LENS_DAMPING * delta);
    const distance = Math.hypot(
      this.camera.position.x - STADIUM_POSITION.x,
      this.camera.position.y - STADIUM_POSITION.y,
      this.camera.position.z - STADIUM_POSITION.z,
    );
    const fov = this.entered
      ? MathUtils.lerp(
          INTERIOR_FOV,
          RENDER.fovDeg,
          MathUtils.smoothstep(distance, LENS_DISTANCE.wide, LENS_DISTANCE.map),
        )
      : RENDER.fovDeg;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = MathUtils.lerp(this.camera.fov, fov, blend);
      this.camera.updateProjectionMatrix();
    }
    const shift =
      this.entered && this.zone !== 'park' && !this.director.flying ? this.panelInset / 2 : 0;
    this.lensShift = MathUtils.lerp(this.lensShift, shift, blend);
    if (Math.abs(this.lensShift) > 0.1)
      this.camera.setViewOffset(width, height, this.lensShift, 0, width, height);
    else if (this.camera.view?.enabled) this.camera.clearViewOffset();
    this.markers.update(this.camera, width, height);
  }

  private shadow(inside: boolean): void {
    if (inside) {
      this.world.environment.useShadowRegion('stadium', local(-150, 0, -170), local(150, 55, 170));
    } else {
      const region = LIGHT.shadowRegion;
      this.world.environment.useShadowRegion(
        'map',
        new Vector3(region.minX, 0, region.minZ),
        new Vector3(region.maxX, region.maxHeight, region.maxZ),
      );
    }
  }

  private viewpoint(id: StadiumViewId): OrbitView {
    if (id === 'inside') return STADIUM_ARRIVAL;
    const { target, shot } = STADIUM_HOTSPOTS[id];
    return {
      target: stadiumPoint(target.x, target.y, target.z),
      radius: shot.radius,
      polar: MathUtils.degToRad(shot.polarDeg),
      azimuth: MathUtils.degToRad(shot.azimuthDeg),
    };
  }

  private limits(id: StadiumViewId): ControlLimits {
    if (id === 'sports-park') return MAP_LIMITS;
    const view = this.viewpoint(id);
    if (id === 'concourse')
      return {
        ...STADIUM_LIMITS,
        minRadius: 12,
        maxRadius: 20,
        minPolar: MathUtils.degToRad(89),
        maxPolar: MathUtils.degToRad(91),
        minAzimuth: MathUtils.degToRad(86),
        maxAzimuth: MathUtils.degToRad(94),
        minHeight: COAST.landHeight + 15.5,
        bounds: {
          minX: view.target.x - 1,
          maxX: view.target.x + 1,
          minZ: view.target.z - 0.5,
          maxZ: view.target.z + 0.5,
        },
      };
    return {
      ...STADIUM_LIMITS,
      // A stand-focused orbit stays on the pitch side of its target. Central views can turn freely.
      ...(id === 'inside' || id === 'pitch'
        ? {}
        : {
            minAzimuth: view.azimuth - MathUtils.degToRad(45),
            maxAzimuth: view.azimuth + MathUtils.degToRad(45),
          }),
      minPolar: MathUtils.degToRad(28),
      maxPolar: MathUtils.degToRad(120),
      minRadius: id === 'inside' ? 22 : 32,
      maxRadius: id === 'inside' ? 70 : 78,
      bounds: {
        minX: view.target.x - 5,
        maxX: view.target.x + 5,
        minZ: view.target.z - 7,
        maxZ: view.target.z + 7,
      },
      constrainPosition: (position) => {
        // Keep the camera below the canopy and within the opening, even while orbiting a stand.
        const x = position.x - STADIUM_POSITION.x;
        const z = position.z - STADIUM_POSITION.z;
        const radius = Math.hypot(x / STADIUM.rx, z / STADIUM.rz);
        const max = 0.62;
        if (radius > max) {
          position.x = STADIUM_POSITION.x + (x * max) / radius;
          position.z = STADIUM_POSITION.z + (z * max) / radius;
        }
        position.y = MathUtils.clamp(
          position.y,
          stadiumFloor(position.x, position.z),
          COAST.landHeight + 35,
        );
      },
    };
  }

  /** East entrance route, from the actual camera pose to the first safe view in the bowl. */
  private entrance(): FlightPath {
    const arrival = poseFor(STADIUM_ARRIVAL);
    return {
      positions: [
        this.camera.position.clone(),
        ...STADIUM_PORTAL.map((waypoint) => vec(waypoint.position)),
        arrival.position,
      ],
      targets: [
        this.controls.target.clone(),
        ...STADIUM_PORTAL.map((waypoint) => vec(waypoint.target)),
        arrival.target.clone(),
      ],
    };
  }

  /** Sample the same curve in either direction, starting exactly where a cancellation left it. */
  private slicePortal(end: number): FlightPath {
    const path = this.portal;
    if (!path) throw new Error('Stadium portal path is not initialised');
    const positions = new CatmullRomCurve3([...path.positions], false, 'centripetal');
    const targets = new CatmullRomCurve3([...path.targets], false, 'centripetal');
    const from = this.portalT;
    const result = {
      positions: Array.from({ length: PATH_SAMPLES + 1 }, (_, i) =>
        positions.getPoint(MathUtils.lerp(from, end, i / PATH_SAMPLES)),
      ),
      targets: Array.from({ length: PATH_SAMPLES + 1 }, (_, i) =>
        targets.getPoint(MathUtils.lerp(from, end, i / PATH_SAMPLES)),
      ),
    };
    // The last leg may already be settling into a map view when a reversal arrives.
    result.positions[0] = this.camera.position.clone();
    result.targets[0] = this.controls.target.clone();
    return result;
  }

  private async cross(end: number): Promise<void> {
    const from = this.portalT;
    const path = this.slicePortal(end);
    this.crossing = true;
    await this.director.flyAlong(
      path,
      { duration: Math.max(0.6, Math.abs(end - from) * PORTAL_DURATION) },
      (t) => {
        this.portalT = MathUtils.lerp(from, end, t);
      },
    );
  }

  async focus(id: StadiumViewId, immediate = false): Promise<void> {
    const request = ++this.revision;
    this.director.cancel();
    this.markers.setVisible(false);
    const first = !this.entered;
    if (first) {
      this.entered = true;
      this.world.landmarks.models.get('stadium')?.setDetailPinned?.(true);
      this.shadow(true);
    }
    this.controls.setLimits(FLIGHT_LIMITS);
    if (!immediate) {
      let arrived = false;
      if (first || this.zone === 'park') {
        this.zone = 'bowl';
        this.portal = this.entrance();
        this.portalT = 0;
        await this.cross(1);
        arrived = true;
      } else if (this.crossing) {
        await this.cross(1);
        arrived = true;
      } else if (this.inPassage && id !== 'concourse' && id !== 'sports-park') {
        const arrival = poseFor(STADIUM_ARRIVAL);
        await this.director.flyAlong(
          {
            positions: [
              this.camera.position.clone(),
              vec(STADIUM_PASSAGE.mouth),
              vec(STADIUM_PASSAGE.reveal),
              arrival.position,
            ],
            targets: [
              this.controls.target.clone(),
              vec(STADIUM_PASSAGE.lookIntoBowl),
              arrival.target,
              arrival.target.clone(),
            ],
          },
          { duration: HOTSPOT_DURATION },
        );
        arrived = true;
      }
      if (request !== this.revision) return;
      this.crossing = false;
      if (id === 'sports-park') {
        await this.leaveBowl(this.viewpoint(id));
      } else if (id === 'concourse') {
        const end = poseFor(this.viewpoint(id));
        const passage = this.inPassage
          ? []
          : [vec(STADIUM_PASSAGE.reveal), vec(STADIUM_PASSAGE.mouth)];
        await this.director.flyAlong(
          {
            positions: [this.camera.position.clone(), ...passage, end.position],
            targets: this.inPassage
              ? [this.controls.target.clone(), end.target]
              : [
                  this.controls.target.clone(),
                  vec(STADIUM_PASSAGE.mouth),
                  end.target.clone(),
                  end.target,
                ],
          },
          { duration: HOTSPOT_DURATION },
        );
      } else if (id !== 'inside' || !arrived) {
        await this.director.flyTo(this.viewpoint(id), { duration: HOTSPOT_DURATION });
      }
      if (request !== this.revision) return;
    }
    this.controls.setLimits(this.limits(id));
    this.controls.setView(this.viewpoint(id), true);
    this.zone = id === 'sports-park' ? 'park' : id === 'concourse' ? 'concourse' : 'bowl';
    if (immediate) {
      this.camera.fov = this.zone === 'park' ? RENDER.fovDeg : INTERIOR_FOV;
      this.camera.updateProjectionMatrix();
    }
    this.crossing = false;
    this.markers.setActive({ kind: 'hotspot', id });
    this.markers.setVisible(true);
  }

  private async leaveBowl(destination: OrbitView): Promise<void> {
    const end = poseFor(destination);
    const arrival = poseFor(STADIUM_ARRIVAL);
    const inTunnel = this.inPassage;
    const route = [...STADIUM_PORTAL].reverse().filter((_, i) => !inTunnel || i >= 3);
    const positions = inTunnel
      ? [
          this.camera.position.clone(),
          ...route.map((waypoint) => vec(waypoint.position)),
          end.position,
        ]
      : [
          this.camera.position.clone(),
          arrival.position,
          ...route.map((waypoint) => vec(waypoint.position)),
          end.position,
        ];
    const targets = [
      this.controls.target.clone(),
      ...(inTunnel ? [] : [arrival.target]),
      ...route.map((waypoint) => vec(waypoint.target)),
      end.target,
    ];
    this.portal = { positions: [...positions].reverse(), targets: [...targets].reverse() };
    this.portalT = 1;
    await this.cross(0);
  }

  async exit(destination: OrbitView, immediate = false): Promise<void> {
    const request = ++this.revision;
    this.director.cancel();
    this.markers.setVisible(false);
    this.controls.setLimits(FLIGHT_LIMITS);
    if (!immediate) {
      if (this.crossing) {
        await this.cross(0);
        if (request !== this.revision) return;
        await this.director.flyTo(destination, { duration: 1 });
      } else if (this.zone === 'park') {
        await this.director.flyTo(destination);
      } else {
        await this.leaveBowl(destination);
      }
      if (request !== this.revision) return;
    }
    this.crossing = false;
    this.entered = false;
    this.world.landmarks.models.get('stadium')?.setDetailPinned?.(false);
    this.portal = null;
    this.controls.setLimits(MAP_LIMITS);
    this.controls.setView(destination, true);
    if (immediate) {
      this.camera.fov = RENDER.fovDeg;
      this.lensShift = 0;
      this.camera.clearViewOffset();
      this.camera.updateProjectionMatrix();
    }
    this.shadow(false);
  }

  dispose(): void {
    this.revision++;
    this.markers.dispose();
  }
}
