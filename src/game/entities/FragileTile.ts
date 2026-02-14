import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Animation,
  Vector3,
  ParticleSystem,
  Texture,
} from '@babylonjs/core';
import { Tile } from './Tile';
import { TileType, AnimationCallback } from '../../utils/Types';
import { TILE_SIZE, COLORS, TILE_BREAK_DURATION } from '../../utils/Constants';

export class FragileTile extends Tile {
  private hasStepped: boolean = false;
  private isBroken: boolean = false;
  private crackLines: Mesh[] = [];

  constructor(scene: Scene, x: number, z: number) {
    super(scene, x, z, TileType.FRAGILE);
  }

  protected createMesh(): Mesh {
    const tile = MeshBuilder.CreateBox(`fragileTile_${this._x}_${this._z}`, {
      width: TILE_SIZE * 0.95,
      height: 0.15,
      depth: TILE_SIZE * 0.95,
    }, this.scene);

    const material = new StandardMaterial(`fragileMat_${this._x}_${this._z}`, this.scene);

    // Ice/glass appearance
    material.diffuseColor = Color3.FromHexString(COLORS.FRAGILE_TILE);
    material.specularColor = new Color3(0.8, 0.8, 0.9);
    material.specularPower = 64;
    material.alpha = 0.85;

    // Add slight emissive for glow effect
    material.emissiveColor = Color3.FromHexString(COLORS.FRAGILE_TILE).scale(0.15);

    tile.material = material;
    tile.position.y = -0.075;
    tile.receiveShadows = true;

    // Add ice-like edge rendering
    tile.enableEdgesRendering();
    tile.edgesWidth = 1.5;
    tile.edgesColor = new Color4(0.7, 0.85, 0.95, 0.8);

    return tile;
  }

  public override onStep(): void {
    if (!this.hasStepped && !this.isBroken) {
      this.hasStepped = true;
      // Visual feedback - add cracks and change appearance
      const material = this.mesh.material as StandardMaterial;
      material.diffuseColor = Color3.FromHexString(COLORS.FRAGILE_TILE_CRACKED);
      material.alpha = 0.7;

      // Add crack lines
      this.addCrackLines();

      // Update edge color to show stress
      this.mesh.edgesColor = new Color4(0.9, 0.95, 1, 1);
      this.mesh.edgesWidth = 2.5;
    }
  }

  private addCrackLines(): void {
    // Create crack pattern using thin boxes
    const crackCount = 5;
    for (let i = 0; i < crackCount; i++) {
      const length = 0.2 + Math.random() * 0.4;
      const crack = MeshBuilder.CreateBox(
        `crack_${this._x}_${this._z}_${i}`,
        { width: length, height: 0.22, depth: 0.02 },
        this.scene
      );

      const angle = Math.random() * Math.PI;
      crack.rotation.y = angle;

      const offsetX = (Math.random() - 0.5) * 0.5;
      const offsetZ = (Math.random() - 0.5) * 0.5;
      crack.position = new Vector3(offsetX, 0, offsetZ);

      const crackMat = new StandardMaterial(`crackMat_${i}`, this.scene);
      crackMat.diffuseColor = new Color3(0.95, 0.98, 1);
      crackMat.alpha = 0.6;
      crackMat.emissiveColor = new Color3(0.8, 0.9, 1);
      crack.material = crackMat;

      crack.parent = this.mesh;
      this.crackLines.push(crack);
    }
  }

  public override onLeave(): void {
    if (this.hasStepped && !this.isBroken) {
      this.breakTile();
    }
  }

  private breakTile(onComplete?: AnimationCallback): void {
    this.isBroken = true;
    this._isActive = false;

    // Create shatter particle effect
    this.createShatterEffect();

    // Fall and shatter animation
    const fallAnimation = new Animation(
      'tileBreak',
      'position.y',
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keyframes = [
      { frame: 0, value: this.mesh.position.y },
      { frame: 15, value: -2 },
    ];

    fallAnimation.setKeys(keyframes);

    // Scale and fade animation
    const scaleAnimation = new Animation(
      'tileScale',
      'scaling',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const scaleKeyframes = [
      { frame: 0, value: new Vector3(1, 1, 1) },
      { frame: 5, value: new Vector3(1.1, 0.8, 1.1) },
      { frame: 15, value: new Vector3(0.3, 0.1, 0.3) },
    ];

    scaleAnimation.setKeys(scaleKeyframes);

    // Alpha fade
    const material = this.mesh.material as StandardMaterial;
    const alphaAnimation = new Animation(
      'tileAlpha',
      'alpha',
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const alphaKeyframes = [
      { frame: 0, value: material.alpha },
      { frame: 15, value: 0 },
    ];

    alphaAnimation.setKeys(alphaKeyframes);

    this.scene.beginDirectAnimation(
      this.mesh,
      [fallAnimation, scaleAnimation],
      0,
      15,
      false,
      1000 / TILE_BREAK_DURATION * (15 / 60),
      () => {
        this.mesh.setEnabled(false);
        if (onComplete) {
          onComplete();
        }
      }
    );

    this.scene.beginDirectAnimation(
      material,
      [alphaAnimation],
      0,
      15,
      false,
      1000 / TILE_BREAK_DURATION * (15 / 60)
    );
  }

  private createShatterEffect(): void {
    // Create ice shard particles
    const particleSystem = new ParticleSystem(
      `shatter_${this._x}_${this._z}`,
      50,
      this.scene
    );

    // Use a simple white texture for particles
    particleSystem.particleTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVQYV2NkYGD4z4AHMP7//x8fN+IGAwAAhBAF/d/MYqsAAAAASUVORK5CYII=', this.scene);

    particleSystem.emitter = new Vector3(
      this._x * TILE_SIZE,
      0,
      this._z * TILE_SIZE
    );

    particleSystem.minSize = 0.05;
    particleSystem.maxSize = 0.15;
    particleSystem.minLifeTime = 0.3;
    particleSystem.maxLifeTime = 0.8;

    particleSystem.emitRate = 100;
    particleSystem.direction1 = new Vector3(-1, 2, -1);
    particleSystem.direction2 = new Vector3(1, 4, 1);
    particleSystem.minEmitPower = 1;
    particleSystem.maxEmitPower = 3;

    particleSystem.color1 = new Color4(0.8, 0.9, 1, 1);
    particleSystem.color2 = new Color4(0.6, 0.8, 0.95, 1);
    particleSystem.colorDead = new Color4(0.9, 0.95, 1, 0);

    particleSystem.gravity = new Vector3(0, -9.8, 0);

    particleSystem.start();

    // Stop after a short burst
    setTimeout(() => {
      particleSystem.stop();
      setTimeout(() => particleSystem.dispose(), 1000);
    }, 100);
  }

  public override isActive(): boolean {
    return !this.isBroken;
  }

  public override reset(): void {
    this.hasStepped = false;
    this.isBroken = false;
    this._isActive = true;
    this.mesh.setEnabled(true);
    this.mesh.position.y = -0.075;
    this.mesh.scaling = new Vector3(1, 1, 1);

    // Remove crack lines
    this.crackLines.forEach(crack => crack.dispose());
    this.crackLines = [];

    const material = this.mesh.material as StandardMaterial;
    material.diffuseColor = Color3.FromHexString(COLORS.FRAGILE_TILE);
    material.alpha = 0.85;

    this.mesh.edgesColor = new Color4(0.7, 0.85, 0.95, 0.8);
    this.mesh.edgesWidth = 1.5;
  }

  // Check if this tile has been stepped on but not broken yet
  public isCracked(): boolean {
    return this.hasStepped && !this.isBroken;
  }

  // Force break without animation (for instant state changes)
  public instantBreak(): void {
    this.isBroken = true;
    this._isActive = false;
    this.mesh.setEnabled(false);
  }
}
