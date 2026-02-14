import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';
import { Tile } from './Tile';
import { TileType } from '../../utils/Types';
import { TILE_SIZE, COLORS } from '../../utils/Constants';

export class NormalTile extends Tile {
  constructor(scene: Scene, x: number, z: number) {
    super(scene, x, z, TileType.NORMAL);
  }

  protected createMesh(): Mesh {
    const tile = MeshBuilder.CreateBox(`tile_${this._x}_${this._z}`, {
      width: TILE_SIZE * 0.95,
      height: 0.15,
      depth: TILE_SIZE * 0.95,
    }, this.scene);

    const material = new StandardMaterial(`tileMat_${this._x}_${this._z}`, this.scene);
    material.diffuseColor = Color3.FromHexString(COLORS.NORMAL_TILE);
    material.specularColor = new Color3(0.1, 0.1, 0.1);
    tile.material = material;

    tile.position.y = -0.075;
    tile.receiveShadows = true;

    return tile;
  }
}
