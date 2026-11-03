import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from 'three';
import { ATTRACTIONS } from '../../../data/attractions';
import { LAYERS } from '../../config/layers';
import { MASTERPLAN } from '../../config/masterplan';
import { COAST } from '../../config/scene';
import type { Disposable } from '../../types';
import { disposeObject } from '../../utils/dispose';
import type { Atmosphere } from '../Atmosphere';
import { facadeExtension } from '../Facade';

const PIER = {
  width: 14,
  deckHeight: 3,
  deckThickness: 1.2,
  pileSpacing: 18,
  pileDepth: 9,
} as const;
const PAVILION = { radius: 22, height: 7, roofRadius: 27 } as const;
const TERMINAL = { width: 54, length: 210, height: 17, roofOverhang: 6 } as const;
const COLORS = {
  deck: '#d3c7b6',
  pile: '#4a4038',
  roof: '#f2ece2',
  glass: '#1f2d36',
  glow: '#ffb070',
  terminal: '#efe8dc',
} as const;

/**
 * Attraction structures on the water: the Entertainment Pier (deck on piles with a glowing
 * pavilion) and the Cruise Terminal. Illustrative forms. [TBC: official designs]
 */
export class Waterfront implements Disposable {
  readonly object = new Group();

  constructor(atmosphere: Atmosphere) {
    this.object.add(this.pier(atmosphere), this.terminal(atmosphere));
    this.object.traverse((child) => {
      child.layers.enable(LAYERS.REFLECTED);
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }

  private pier(atmosphere: Atmosphere): Object3D {
    const { position } = ATTRACTIONS['entertainment-pier'];
    const root = MASTERPLAN.shoreX + 10;
    const length = root - position.x;
    const group = new Group();
    group.name = 'entertainment-pier';

    const deckMaterial = atmosphere.patch(
      new MeshStandardMaterial({ color: COLORS.deck, roughness: 0.8 }),
    );
    const deck = new Mesh(new BoxGeometry(length, PIER.deckThickness, PIER.width), deckMaterial);
    deck.position.set(root - length / 2, PIER.deckHeight, position.z);

    const pileCount = Math.floor(length / PIER.pileSpacing) * 2;
    const piles = new InstancedMesh(
      new CylinderGeometry(0.5, 0.5, PIER.pileDepth + PIER.deckHeight, 6),
      atmosphere.patch(new MeshStandardMaterial({ color: COLORS.pile, roughness: 0.9 })),
      pileCount,
    );
    const matrix = new Matrix4();
    for (let i = 0; i < pileCount; i++) {
      const along = Math.floor(i / 2) * PIER.pileSpacing + PIER.pileSpacing / 2;
      const side = i % 2 === 0 ? -1 : 1;
      matrix.makeTranslation(
        root - along,
        (PIER.deckHeight - PIER.pileDepth) / 2,
        position.z + side * (PIER.width / 2 - 1),
      );
      piles.setMatrixAt(i, matrix);
    }

    const glass = atmosphere.patch(
      new MeshStandardMaterial({
        color: COLORS.glass,
        metalness: 0.6,
        roughness: 0.12,
        emissive: COLORS.glow,
        emissiveIntensity: 0.55,
      }),
    );
    const pavilion = new Mesh(
      new CylinderGeometry(PAVILION.radius, PAVILION.radius, PAVILION.height, 40),
      glass,
    );
    pavilion.position.set(position.x, PIER.deckHeight + PAVILION.height / 2, position.z);
    const roof = new Mesh(
      new CylinderGeometry(PAVILION.roofRadius, PAVILION.roofRadius - 2, 1.2, 48),
      atmosphere.patch(new MeshStandardMaterial({ color: COLORS.roof, roughness: 0.5 })),
    );
    roof.position.set(position.x, PIER.deckHeight + PAVILION.height + 0.6, position.z);

    group.add(deck, piles, pavilion, roof);
    return group;
  }

  private terminal(atmosphere: Atmosphere): Object3D {
    const { position } = ATTRACTIONS['cruise-terminal'];
    const group = new Group();
    group.name = 'cruise-terminal';
    const centerX = MASTERPLAN.shoreX + TERMINAL.width / 2 + 8;

    const body = new Mesh(
      new BoxGeometry(TERMINAL.width, TERMINAL.height, TERMINAL.length),
      atmosphere.patch(
        new MeshStandardMaterial({ color: COLORS.terminal, roughness: 0.6 }),
        facadeExtension(),
      ),
    );
    body.position.set(centerX, COAST.landHeight + TERMINAL.height / 2, position.z);

    // A thin, wide canopy roof reads as a terminal rather than another block.
    const roof = new Mesh(
      new BoxGeometry(
        TERMINAL.width + TERMINAL.roofOverhang * 2,
        1.4,
        TERMINAL.length + TERMINAL.roofOverhang * 2,
      ),
      atmosphere.patch(new MeshStandardMaterial({ color: COLORS.roof, roughness: 0.45 })),
    );
    roof.position.set(centerX, COAST.landHeight + TERMINAL.height + 0.7, position.z);
    roof.rotation.z = -0.03;

    group.add(body, roof);
    return group;
  }

  dispose(): void {
    disposeObject(this.object);
  }
}
