import { LevelData, TileType, CubeOrientation, Direction } from '../../utils/Types';

interface RandomWalkOptions {
  width: number;
  height: number;
  steps: number;
  fillRatio: number;
}

// Generate a map by random walking from start to place tiles
export class RandomWalk {
  public static generate(options: RandomWalkOptions): number[][] {
    const { width, height, steps, fillRatio } = options;

    // Initialize empty grid
    const tiles: number[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(TileType.EMPTY));

    // Start from center
    let x = Math.floor(width / 2);
    let z = Math.floor(height / 2);

    tiles[z][x] = TileType.NORMAL;

    const directions = [
      { dx: 0, dz: -1 },
      { dx: 0, dz: 1 },
      { dx: -1, dz: 0 },
      { dx: 1, dz: 0 },
    ];

    for (let step = 0; step < steps; step++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const newX = x + dir.dx;
      const newZ = z + dir.dz;

      if (newX >= 0 && newX < width && newZ >= 0 && newZ < height) {
        x = newX;
        z = newZ;
        tiles[z][x] = TileType.NORMAL;
      }
    }

    // Fill in gaps based on fill ratio
    if (fillRatio > 0) {
      for (let fz = 0; fz < height; fz++) {
        for (let fx = 0; fx < width; fx++) {
          if (tiles[fz][fx] === TileType.EMPTY) {
            // Check if has adjacent tiles
            const hasAdjacent =
              (fz > 0 && tiles[fz - 1][fx] !== TileType.EMPTY) ||
              (fz < height - 1 && tiles[fz + 1][fx] !== TileType.EMPTY) ||
              (fx > 0 && tiles[fz][fx - 1] !== TileType.EMPTY) ||
              (fx < width - 1 && tiles[fz][fx + 1] !== TileType.EMPTY);

            if (hasAdjacent && Math.random() < fillRatio) {
              tiles[fz][fx] = TileType.NORMAL;
            }
          }
        }
      }
    }

    return tiles;
  }
}
