import { Scene, MeshBuilder, DynamicTexture, StandardMaterial, Mesh, Vector3 } from '@babylonjs/core';
import { LevelData, TileType, Position, CubeOrientation } from '../../utils/Types';
import { Tile } from '../entities/Tile';
import { NormalTile } from '../entities/NormalTile';
import { SandTile } from '../entities/SandTile';
import { FragileTile } from '../entities/FragileTile';
import { GoalTile } from '../entities/GoalTile';
import { TILE_SIZE } from '../../utils/Constants';

export class Level {
  private scene: Scene;
  private data: LevelData;
  private tiles: Map<string, Tile> = new Map();
  private debugLabels: Mesh[] = [];

  constructor(scene: Scene, data: LevelData) {
    this.scene = scene;
    this.data = data;
  }

  // Build the level tiles
  public build(): Map<string, Tile> {
    this.dispose(); // Clean up any existing tiles

    for (let z = 0; z < this.data.tiles.length; z++) {
      for (let x = 0; x < this.data.tiles[z].length; x++) {
        const tileCode = this.data.tiles[z][x];
        const tile = this.createTile(x, z, tileCode);

        if (tile) {
          this.tiles.set(`${x},${z}`, tile);
        } else {
          // Create debug label for empty tiles
          this.createEmptyTileLabel(x, z);
        }
      }
    }

    return this.tiles;
  }

  // Create debug label for empty tile positions
  private createEmptyTileLabel(x: number, z: number): void {
    const plane = MeshBuilder.CreatePlane(
      `emptyLabel_${x}_${z}`,
      { size: 0.6 },
      this.scene
    );

    const texture = new DynamicTexture(
      `emptyTex_${x}_${z}`,
      { width: 128, height: 64 },
      this.scene,
      false
    );

    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.fillRect(0, 0, 128, 64);
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${x},${z}`, 64, 32);
    texture.update();

    const material = new StandardMaterial(`emptyMat_${x}_${z}`, this.scene);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.backFaceCulling = false;
    material.disableLighting = true;

    plane.material = material;
    plane.rotation.x = Math.PI / 2;
    plane.position = new Vector3(x * TILE_SIZE, -0.05, z * TILE_SIZE);

    this.debugLabels.push(plane);
  }

  // Create a tile based on code
  private createTile(x: number, z: number, code: number): Tile | null {
    // Check if this is the goal position
    if (x === this.data.goal.x && z === this.data.goal.z) {
      return new GoalTile(this.scene, x, z);
    }

    switch (code) {
      case TileType.EMPTY:
        return null;
      case TileType.NORMAL:
        return new NormalTile(this.scene, x, z);
      case TileType.SAND:
        return new SandTile(this.scene, x, z);
      case TileType.FRAGILE:
        return new FragileTile(this.scene, x, z);
      case TileType.GOAL:
        return new GoalTile(this.scene, x, z);
      default:
        return new NormalTile(this.scene, x, z);
    }
  }

  // Get level data
  public getData(): LevelData {
    return this.data;
  }

  // Get tiles
  public getTiles(): Map<string, Tile> {
    return this.tiles;
  }

  // Get start position
  public getStart(): { x: number; z: number; orientation: CubeOrientation } {
    return {
      x: this.data.start.x,
      z: this.data.start.z,
      orientation: this.data.start.orientation,
    };
  }

  // Get goal position
  public getGoal(): Position {
    return this.data.goal;
  }

  // Get level size
  public getSize(): { width: number; height: number } {
    return this.data.size;
  }

  // Reset all tiles to initial state
  public reset(): void {
    this.tiles.forEach(tile => tile.reset());
  }

  // Dispose all tiles
  public dispose(): void {
    this.tiles.forEach(tile => tile.dispose());
    this.tiles.clear();

    // Dispose debug labels
    this.debugLabels.forEach(label => {
      if (label.material) {
        const mat = label.material as StandardMaterial;
        if (mat.diffuseTexture) mat.diffuseTexture.dispose();
        mat.dispose();
      }
      label.dispose();
    });
    this.debugLabels = [];
  }
}
