import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  GlowLayer,
  Animation,
} from '@babylonjs/core';
import { Tile } from './Tile';
import { TileType } from '../../utils/Types';
import { TILE_SIZE, COLORS } from '../../utils/Constants';

export class GoalTile extends Tile {
  private glowMesh: Mesh | null = null;

  constructor(scene: Scene, x: number, z: number) {
    super(scene, x, z, TileType.GOAL);
    this.createGlowEffect();
    this.animateGlow();
  }

  protected createMesh(): Mesh {
    // Create a tile with a hole in the center
    const tile = MeshBuilder.CreateBox(`goalTile_${this._x}_${this._z}`, {
      width: TILE_SIZE * 0.95,
      height: 0.15,
      depth: TILE_SIZE * 0.95,
    }, this.scene);

    const material = new StandardMaterial(`goalMat_${this._x}_${this._z}`, this.scene);
    material.diffuseColor = Color3.FromHexString(COLORS.GOAL_TILE);
    material.specularColor = new Color3(0.2, 0.3, 0.2);
    material.emissiveColor = Color3.FromHexString(COLORS.GOAL_GLOW).scale(0.3);
    tile.material = material;

    tile.position.y = -0.075;
    tile.receiveShadows = true;

    // Add edge rendering
    tile.enableEdgesRendering();
    tile.edgesWidth = 4.0;
    tile.edgesColor = Color3.FromHexString(COLORS.GOAL_GLOW).toColor4(1);

    return tile;
  }

  private createGlowEffect(): void {
    // Create inner glow disc
    this.glowMesh = MeshBuilder.CreateDisc(`goalGlow_${this._x}_${this._z}`, {
      radius: TILE_SIZE * 0.35,
      tessellation: 32,
    }, this.scene);

    const glowMaterial = new StandardMaterial(`goalGlowMat_${this._x}_${this._z}`, this.scene);
    glowMaterial.diffuseColor = Color3.FromHexString(COLORS.GOAL_GLOW);
    glowMaterial.emissiveColor = Color3.FromHexString(COLORS.GOAL_GLOW);
    glowMaterial.alpha = 0.6;
    this.glowMesh.material = glowMaterial;

    this.glowMesh.position.x = this._x * TILE_SIZE;
    this.glowMesh.position.y = 0.01;
    this.glowMesh.position.z = this._z * TILE_SIZE;
    this.glowMesh.rotation.x = Math.PI / 2;
  }

  private animateGlow(): void {
    if (!this.glowMesh) return;

    // Pulsing animation
    const pulseAnimation = new Animation(
      'goalPulse',
      'material.alpha',
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const keyframes = [
      { frame: 0, value: 0.4 },
      { frame: 30, value: 0.8 },
      { frame: 60, value: 0.4 },
    ];

    pulseAnimation.setKeys(keyframes);
    this.glowMesh.animations.push(pulseAnimation);

    this.scene.beginAnimation(this.glowMesh, 0, 60, true);
  }

  public override dispose(): void {
    if (this.glowMesh) {
      if (this.glowMesh.material) {
        this.glowMesh.material.dispose();
      }
      this.glowMesh.dispose();
    }
    super.dispose();
  }
}
