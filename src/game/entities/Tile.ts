import {
  Scene,
  Mesh,
  MeshBuilder,
  Vector3,
  StandardMaterial,
  Color3,
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

  constructor(scene: Scene, x: number, z: number, type: TileType) {
    this.scene = scene;
    this._x = x;
    this._z = z;
    this._type = type;
    this.mesh = this.createMesh();
    this.updatePosition();
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
