import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  DynamicTexture,
  Vector3,
} from '@babylonjs/core';
import { Tile } from './Tile';
import { TileType } from '../../utils/Types';
import { TILE_SIZE, COLORS } from '../../utils/Constants';

export class SandTile extends Tile {
  private sandTexture: DynamicTexture | null = null;
  private grains: Mesh[] = [];

  constructor(scene: Scene, x: number, z: number) {
    super(scene, x, z, TileType.SAND);
  }

  protected createMesh(): Mesh {
    const tile = MeshBuilder.CreateBox(`sandTile_${this._x}_${this._z}`, {
      width: TILE_SIZE * 0.95,
      height: 0.15,
      depth: TILE_SIZE * 0.95,
    }, this.scene);

    const material = new StandardMaterial(`sandMat_${this._x}_${this._z}`, this.scene);

    // Create sand texture procedurally
    this.sandTexture = this.createSandTexture();
    material.diffuseTexture = this.sandTexture;
    material.diffuseColor = Color3.FromHexString(COLORS.SAND_TILE);
    material.specularColor = new Color3(0.02, 0.02, 0.02);
    material.roughness = 1;

    tile.material = material;
    tile.position.y = -0.075;
    tile.receiveShadows = true;

    // Add some particle-like dots on top to simulate sand grains
    // Pass tile as parent since this.mesh is not yet assigned
    this.addSandGrains(tile);

    return tile;
  }

  private createSandTexture(): DynamicTexture {
    const textureSize = 128;
    const texture = new DynamicTexture(
      `sandTex_${this._x}_${this._z}`,
      textureSize,
      this.scene,
      false
    );

    const ctx = texture.getContext();

    // Base sand color
    ctx.fillStyle = COLORS.SAND_TILE;
    ctx.fillRect(0, 0, textureSize, textureSize);

    // Add noise/grain pattern
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * textureSize;
      const y = Math.random() * textureSize;
      const size = Math.random() * 3 + 1;
      const brightness = Math.random() * 0.3 - 0.15;

      if (brightness > 0) {
        ctx.fillStyle = COLORS.SAND_TILE;
      } else {
        ctx.fillStyle = COLORS.SAND_TILE_DARK;
      }

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add some darker spots
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * textureSize;
      const y = Math.random() * textureSize;
      const size = Math.random() * 4 + 2;

      ctx.fillStyle = COLORS.SAND_TILE_DARK;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    texture.update();
    return texture;
  }

  private addSandGrains(parentMesh: Mesh): void {
    // Add small spheres on top to simulate sand grains
    const grainCount = 15;
    for (let i = 0; i < grainCount; i++) {
      const grain = MeshBuilder.CreateSphere(
        `grain_${this._x}_${this._z}_${i}`,
        { diameter: 0.03 + Math.random() * 0.02 },
        this.scene
      );

      const offsetX = (Math.random() - 0.5) * TILE_SIZE * 0.8;
      const offsetZ = (Math.random() - 0.5) * TILE_SIZE * 0.8;

      grain.position = new Vector3(
        offsetX,
        0.08 + Math.random() * 0.02,
        offsetZ
      );

      const grainMat = new StandardMaterial(`grainMat_${this._x}_${this._z}_${i}`, this.scene);
      grainMat.diffuseColor = Color3.FromHexString(
        Math.random() > 0.5 ? COLORS.SAND_TILE : COLORS.SAND_TILE_DARK
      );
      grainMat.specularColor = new Color3(0, 0, 0);
      grain.material = grainMat;

      grain.parent = parentMesh;
      this.grains.push(grain);
    }
  }

  // Sand tile cannot support standing cube
  public override canStand(): boolean {
    return false;
  }

  public override canLie(): boolean {
    return true;
  }

  public override dispose(): void {
    // Dispose sand grains
    this.grains.forEach(grain => {
      if (grain.material) {
        grain.material.dispose();
      }
      grain.dispose();
    });
    this.grains = [];

    // Dispose texture
    if (this.sandTexture) {
      this.sandTexture.dispose();
      this.sandTexture = null;
    }

    super.dispose();
  }
}
