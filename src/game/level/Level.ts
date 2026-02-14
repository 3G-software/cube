import { Scene } from '@babylonjs/core';
import { LevelData, TileType, Position, CubeOrientation } from '../../utils/Types';
import { Tile } from '../entities/Tile';
import { NormalTile } from '../entities/NormalTile';
import { SandTile } from '../entities/SandTile';
import { FragileTile } from '../entities/FragileTile';
import { GoalTile } from '../entities/GoalTile';

export class Level {
  private scene: Scene;
  private data: LevelData;
  private tiles: Map<string, Tile> = new Map();

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
        }
      }
    }

    return this.tiles;
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
  }
}
