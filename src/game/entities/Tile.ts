import {
  Scene,
  Mesh,
  MeshBuilder,
  Vector3,
  StandardMaterial,
  Color3,
  DynamicTexture,
} from '@babylonjs/core';
import { TileType, Position } from '../../utils/Types';
import { TILE_SIZE } from '../../utils/Constants';

export abstract class Tile {
  protected scene: Scene;
  protected mesh: Mesh;
  protected _x: number;
  protected _z: number;
  protected _type: TileType;
  protected _isActive: boolean = true;
  protected coordLabel: Mesh | null = null;

  constructor(scene: Scene, x: number, z: number, type: TileType) {
    this.scene = scene;
    this._x = x;
    this._z = z;
    this._type = type;
    this.mesh = this.createMesh();
    this.updatePosition();
    this.createCoordLabel();
  }

  protected createCoordLabel(): void {
    // Create a plane to display coordinates
    const plane = MeshBuilder.CreatePlane(
      `coordLabel_${this._x}_${this._z}`,
      { size: 0.4 },
      this.scene
    );

    // Create dynamic texture for text
    const texture = new DynamicTexture(
      `coordTex_${this._x}_${this._z}`,
      { width: 128, height: 64 },
      this.scene,
      false
    );

    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 128, 64);
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this._x},${this._z}`, 64, 32);
    texture.update();

    const material = new StandardMaterial(`coordMat_${this._x}_${this._z}`, this.scene);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.backFaceCulling = false;
    material.disableLighting = true;

    plane.material = material;
    plane.rotation.x = Math.PI / 2; // Face up
    plane.position.y = 0.1; // Slightly above tile
    plane.parent = this.mesh;

    this.coordLabel = plane;
  }

  protected abstract createMesh(): Mesh;

  protected updatePosition(): void {
    this.mesh.position = new Vector3(
      this._x * TILE_SIZE,
      0,
      this._z * TILE_SIZE
    );
  }

  // Called when cube steps on this tile
  public onStep(): void {
    // Override in subclasses
  }

  // Called when cube leaves this tile
  public onLeave(): void {
    // Override in subclasses
  }

  // Check if cube can stand on this tile
  public canStand(): boolean {
    return true;
  }

  // Check if cube can lie on this tile
  public canLie(): boolean {
    return true;
  }

  // Check if tile is active (not broken/fallen)
  public isActive(): boolean {
    return this._isActive;
  }

  // Reset tile to initial state
  public reset(): void {
    this._isActive = true;
    this.mesh.setEnabled(true);
  }

  // Get position
  public getPosition(): Position {
    return { x: this._x, z: this._z };
  }

  // Dispose resources
  public dispose(): void {
    if (this.coordLabel) {
      if (this.coordLabel.material) {
        const mat = this.coordLabel.material as StandardMaterial;
        if (mat.diffuseTexture) mat.diffuseTexture.dispose();
        mat.dispose();
      }
      this.coordLabel.dispose();
      this.coordLabel = null;
    }
    if (this.mesh.material) {
      this.mesh.material.dispose();
    }
    this.mesh.dispose();
  }

  // Getters
  get x(): number { return this._x; }
  get z(): number { return this._z; }
  get type(): TileType { return this._type; }
}
