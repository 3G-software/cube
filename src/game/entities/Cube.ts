import {
  Scene,
  Mesh,
  MeshBuilder,
  Vector3,
  StandardMaterial,
  Color3,
  Animation,
  TransformNode,
  Quaternion,
} from '@babylonjs/core';
import { CubeOrientation, Direction, Position, CubeState, OccupiedTiles, AnimationCallback } from '../../utils/Types';
import { TILE_SIZE, CUBE_WIDTH, CUBE_HEIGHT, ROLL_DURATION, COLORS } from '../../utils/Constants';

export class Cube {
  private scene: Scene;
  private mesh: Mesh;
  private pivotNode: TransformNode;

  private _x: number = 0;
  private _z: number = 0;
  private _orientation: CubeOrientation = CubeOrientation.STANDING;

  private isAnimating: boolean = false;
  private animationQueue: (() => void)[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    this.pivotNode = new TransformNode('cubePivot', scene);
    this.mesh = this.createMesh();
  }

  private createMesh(): Mesh {
    // Create the 1x1x2 cuboid
    const cube = MeshBuilder.CreateBox('cube', {
      width: CUBE_WIDTH,
      height: CUBE_HEIGHT,
      depth: CUBE_WIDTH,
    }, this.scene);

    // Material
    const material = new StandardMaterial('cubeMaterial', this.scene);
    material.diffuseColor = Color3.FromHexString(COLORS.CUBE);
    material.specularColor = new Color3(0.3, 0.3, 0.3);
    material.emissiveColor = Color3.FromHexString(COLORS.CUBE).scale(0.1);
    cube.material = material;

    // Enable edge rendering for better visibility
    cube.enableEdgesRendering();
    cube.edgesWidth = 2.0;
    cube.edgesColor = new Color3(0.2, 0.4, 0.6).toColor4(1);

    cube.parent = this.pivotNode;

    return cube;
  }

  // Initialize cube at starting position
  public initialize(state: CubeState): void {
    this._x = state.x;
    this._z = state.z;
    this._orientation = state.orientation;
    this.updateMeshPosition();
  }

  // Get current state
  public getState(): CubeState {
    return {
      x: this._x,
      z: this._z,
      orientation: this._orientation,
    };
  }

  // Get occupied tile positions
  public getOccupiedTiles(): OccupiedTiles {
    const primary: Position = { x: this._x, z: this._z };

    switch (this._orientation) {
      case CubeOrientation.STANDING:
        return { primary };
      case CubeOrientation.LYING_X:
        return { primary, secondary: { x: this._x + 1, z: this._z } };
      case CubeOrientation.LYING_Z:
        return { primary, secondary: { x: this._x, z: this._z + 1 } };
    }
  }

  // Check if cube is standing
  public isStanding(): boolean {
    return this._orientation === CubeOrientation.STANDING;
  }

  // Check if animating
  public getIsAnimating(): boolean {
    return this.isAnimating;
  }

  // Move the cube in a direction
  public move(direction: Direction, onComplete?: AnimationCallback): boolean {
    if (this.isAnimating) {
      return false;
    }

    const moveResult = this.calculateMove(direction);
    if (!moveResult) {
      return false;
    }

    this.animateRoll(direction, moveResult, onComplete);
    return true;
  }

  // Calculate the result of a move
  private calculateMove(direction: Direction): { newX: number; newZ: number; newOrientation: CubeOrientation } | null {
    let newX = this._x;
    let newZ = this._z;
    let newOrientation = this._orientation;

    switch (this._orientation) {
      case CubeOrientation.STANDING:
        switch (direction) {
          case Direction.UP:
            newZ -= 2;
            newOrientation = CubeOrientation.LYING_Z;
            break;
          case Direction.DOWN:
            newZ += 1;
            newOrientation = CubeOrientation.LYING_Z;
            break;
          case Direction.LEFT:
            newX -= 2;
            newOrientation = CubeOrientation.LYING_X;
            break;
          case Direction.RIGHT:
            newX += 1;
            newOrientation = CubeOrientation.LYING_X;
            break;
        }
        break;

      case CubeOrientation.LYING_X:
        switch (direction) {
          case Direction.UP:
            newZ -= 1;
            break;
          case Direction.DOWN:
            newZ += 1;
            break;
          case Direction.LEFT:
            newX -= 1;
            newOrientation = CubeOrientation.STANDING;
            break;
          case Direction.RIGHT:
            newX += 2;
            newOrientation = CubeOrientation.STANDING;
            break;
        }
        break;

      case CubeOrientation.LYING_Z:
        switch (direction) {
          case Direction.UP:
            newZ -= 1;
            newOrientation = CubeOrientation.STANDING;
            break;
          case Direction.DOWN:
            newZ += 2;
            newOrientation = CubeOrientation.STANDING;
            break;
          case Direction.LEFT:
            newX -= 1;
            break;
          case Direction.RIGHT:
            newX += 1;
            break;
        }
        break;
    }

    return { newX, newZ, newOrientation };
  }

  // Animate the rolling motion
  private animateRoll(
    direction: Direction,
    moveResult: { newX: number; newZ: number; newOrientation: CubeOrientation },
    onComplete?: AnimationCallback
  ): void {
    this.isAnimating = true;

    // Calculate pivot point and rotation axis
    const pivot = this.calculatePivotPoint(direction);
    const rotationAxis = this.calculateRotationAxis(direction);
    const rotationAngle = Math.PI / 2;

    // Store original position
    const originalPos = this.mesh.position.clone();

    // Set pivot node position
    this.pivotNode.position = new Vector3(
      this._x * TILE_SIZE + pivot.x,
      pivot.y,
      this._z * TILE_SIZE + pivot.z
    );

    // Offset mesh from pivot
    this.mesh.position = new Vector3(
      this._x * TILE_SIZE - this.pivotNode.position.x + this.getMeshOffsetX(),
      this.getMeshOffsetY() - pivot.y,
      this._z * TILE_SIZE - this.pivotNode.position.z + this.getMeshOffsetZ()
    );

    // Create rotation animation
    const rotationAnimation = new Animation(
      'cubeRoll',
      'rotationQuaternion',
      60,
      Animation.ANIMATIONTYPE_QUATERNION,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const startQuat = this.pivotNode.rotationQuaternion || Quaternion.Identity();
    const endQuat = Quaternion.RotationAxis(rotationAxis, rotationAngle).multiply(startQuat);

    const keyframes = [
      { frame: 0, value: startQuat },
      { frame: 10, value: endQuat },
    ];

    rotationAnimation.setKeys(keyframes);
    this.pivotNode.rotationQuaternion = startQuat;

    this.scene.beginDirectAnimation(
      this.pivotNode,
      [rotationAnimation],
      0,
      10,
      false,
      1000 / ROLL_DURATION * (10 / 60),
      () => {
        // Update state
        this._x = moveResult.newX;
        this._z = moveResult.newZ;
        this._orientation = moveResult.newOrientation;

        // Reset pivot and update mesh position
        this.pivotNode.rotationQuaternion = Quaternion.Identity();
        this.pivotNode.position = Vector3.Zero();
        this.updateMeshPosition();

        this.isAnimating = false;

        if (onComplete) {
          onComplete();
        }
      }
    );
  }

  // Calculate pivot point for rolling
  private calculatePivotPoint(direction: Direction): Vector3 {
    const halfTile = TILE_SIZE / 2;

    switch (this._orientation) {
      case CubeOrientation.STANDING:
        switch (direction) {
          case Direction.UP:
            return new Vector3(0, 0, -halfTile);
          case Direction.DOWN:
            return new Vector3(0, 0, halfTile);
          case Direction.LEFT:
            return new Vector3(-halfTile, 0, 0);
          case Direction.RIGHT:
            return new Vector3(halfTile, 0, 0);
        }
        break;

      case CubeOrientation.LYING_X:
        switch (direction) {
          case Direction.UP:
            return new Vector3(halfTile, 0, -halfTile);
          case Direction.DOWN:
            return new Vector3(halfTile, 0, halfTile);
          case Direction.LEFT:
            return new Vector3(-halfTile, 0, 0);
          case Direction.RIGHT:
            return new Vector3(TILE_SIZE + halfTile, 0, 0);
        }
        break;

      case CubeOrientation.LYING_Z:
        switch (direction) {
          case Direction.UP:
            return new Vector3(0, 0, -halfTile);
          case Direction.DOWN:
            return new Vector3(0, 0, TILE_SIZE + halfTile);
          case Direction.LEFT:
            return new Vector3(-halfTile, 0, halfTile);
          case Direction.RIGHT:
            return new Vector3(halfTile, 0, halfTile);
        }
        break;
    }

    return Vector3.Zero();
  }

  // Calculate rotation axis (Babylon.js uses right-hand rule for quaternion rotation)
  private calculateRotationAxis(direction: Direction): Vector3 {
    switch (direction) {
      case Direction.UP:
        return new Vector3(-1, 0, 0);
      case Direction.DOWN:
        return new Vector3(1, 0, 0);
      case Direction.LEFT:
        return new Vector3(0, 0, 1);
      case Direction.RIGHT:
        return new Vector3(0, 0, -1);
      default:
        return new Vector3(-1, 0, 0);
    }
  }

  // Get mesh Y offset based on orientation
  private getMeshOffsetY(): number {
    switch (this._orientation) {
      case CubeOrientation.STANDING:
        return CUBE_HEIGHT / 2;
      case CubeOrientation.LYING_X:
      case CubeOrientation.LYING_Z:
      default:
        return CUBE_WIDTH / 2;
    }
  }

  // Get mesh X offset
  private getMeshOffsetX(): number {
    if (this._orientation === CubeOrientation.LYING_X) {
      return TILE_SIZE / 2;
    }
    return 0;
  }

  // Get mesh Z offset
  private getMeshOffsetZ(): number {
    if (this._orientation === CubeOrientation.LYING_Z) {
      return TILE_SIZE / 2;
    }
    return 0;
  }

  // Update mesh position based on current state
  private updateMeshPosition(): void {
    const baseX = this._x * TILE_SIZE;
    const baseZ = this._z * TILE_SIZE;

    switch (this._orientation) {
      case CubeOrientation.STANDING:
        this.mesh.position = new Vector3(baseX, CUBE_HEIGHT / 2, baseZ);
        this.mesh.rotation = new Vector3(0, 0, 0);
        break;
      case CubeOrientation.LYING_X:
        this.mesh.position = new Vector3(baseX + TILE_SIZE / 2, CUBE_WIDTH / 2, baseZ);
        this.mesh.rotation = new Vector3(0, 0, Math.PI / 2);
        break;
      case CubeOrientation.LYING_Z:
        this.mesh.position = new Vector3(baseX, CUBE_WIDTH / 2, baseZ + TILE_SIZE / 2);
        this.mesh.rotation = new Vector3(Math.PI / 2, 0, 0);
        break;
    }
  }

  // Fall animation when cube goes off the edge
  // fallSide: 'primary' = primary tile is empty, 'secondary' = secondary tile is empty, 'both' = both empty
  // fallType: 'normal' = fall off edge, 'sand' = sink into sand
  public animateFall(onComplete?: AnimationCallback, fallSide: 'primary' | 'secondary' | 'both' = 'both', fallType: 'normal' | 'sand' = 'normal'): void {
    this.isAnimating = true;

    // Sand sinking animation
    if (fallType === 'sand') {
      this.animateSandSink(onComplete);
      return;
    }

    // If lying and only one side is empty, do tilt animation first
    if (fallSide !== 'both' && this._orientation !== CubeOrientation.STANDING) {
      this.animateTiltAndFall(fallSide, onComplete);
      return;
    }

    // Simple fall animation for standing or both sides empty
    const fallAnimation = new Animation(
      'cubeFall',
      'position.y',
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keyframes = [
      { frame: 0, value: this.mesh.position.y },
      { frame: 30, value: -10 },
    ];

    fallAnimation.setKeys(keyframes);

    // Add rotation during fall
    const rotateAnimation = new Animation(
      'cubeFallRotate',
      'rotation',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const rotateKeyframes = [
      { frame: 0, value: this.mesh.rotation.clone() },
      { frame: 30, value: this.mesh.rotation.add(new Vector3(Math.PI, Math.PI / 2, 0)) },
    ];

    rotateAnimation.setKeys(rotateKeyframes);

    this.scene.beginDirectAnimation(
      this.mesh,
      [fallAnimation, rotateAnimation],
      0,
      30,
      false,
      1,
      () => {
        this.isAnimating = false;
        if (onComplete) {
          onComplete();
        }
      }
    );
  }

  // Sand sinking animation - cube slowly sinks and gets swallowed
  private animateSandSink(onComplete?: AnimationCallback): void {
    // Phase 1: Slight wobble and start sinking
    const wobbleAnimation = new Animation(
      'cubeWobble',
      'rotation',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const currentRotation = this.mesh.rotation.clone();
    const wobbleKeyframes = [
      { frame: 0, value: currentRotation },
      { frame: 5, value: currentRotation.add(new Vector3(0.03, 0, 0.02)) },
      { frame: 10, value: currentRotation.add(new Vector3(-0.02, 0, 0.03)) },
      { frame: 15, value: currentRotation.add(new Vector3(0.02, 0, -0.02)) },
      { frame: 20, value: currentRotation.add(new Vector3(-0.01, 0, 0.01)) },
    ];

    wobbleAnimation.setKeys(wobbleKeyframes);

    // Slow sinking animation
    const sinkAnimation = new Animation(
      'cubeSink',
      'position.y',
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const startY = this.mesh.position.y;
    const sinkKeyframes = [
      { frame: 0, value: startY },
      { frame: 10, value: startY - 0.1 },
      { frame: 30, value: startY - 0.5 },
      { frame: 50, value: startY - 1.2 },
      { frame: 60, value: -3 },
    ];

    sinkAnimation.setKeys(sinkKeyframes);

    // Scale animation - slight compression as it sinks
    const scaleAnimation = new Animation(
      'cubeScale',
      'scaling',
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const scaleKeyframes = [
      { frame: 0, value: new Vector3(1, 1, 1) },
      { frame: 30, value: new Vector3(0.98, 0.95, 0.98) },
      { frame: 50, value: new Vector3(0.9, 0.8, 0.9) },
      { frame: 60, value: new Vector3(0.7, 0.5, 0.7) },
    ];

    scaleAnimation.setKeys(scaleKeyframes);

    this.scene.beginDirectAnimation(
      this.mesh,
      [wobbleAnimation, sinkAnimation, scaleAnimation],
      0,
      60,
      false,
      0.8,
      () => {
        this.isAnimating = false;
        if (onComplete) {
          onComplete();
        }
      }
    );
  }

  // Tilt and fall animation when one side is empty
  private animateTiltAndFall(fallSide: 'primary' | 'secondary', onComplete?: AnimationCallback): void {
    const halfTile = TILE_SIZE / 2;

    // Calculate pivot point based on which side has ground
    // Pivot should be on the side that HAS ground (opposite of empty side)
    let pivotOffset: Vector3;
    let tiltAxis: Vector3;

    if (this._orientation === CubeOrientation.LYING_X) {
      if (fallSide === 'primary') {
        // Primary (left) is empty, pivot on right side (secondary)
        pivotOffset = new Vector3(TILE_SIZE + halfTile, 0, 0);
        tiltAxis = new Vector3(0, 0, 1);
      } else {
        // Secondary (right) is empty, pivot on left side (primary)
        pivotOffset = new Vector3(-halfTile, 0, 0);
        tiltAxis = new Vector3(0, 0, -1);
      }
    } else { // LYING_Z
      if (fallSide === 'primary') {
        // Primary (front) is empty, pivot on back side (secondary)
        pivotOffset = new Vector3(0, 0, TILE_SIZE + halfTile);
        tiltAxis = new Vector3(-1, 0, 0);
      } else {
        // Secondary (back) is empty, pivot on front side (primary)
        pivotOffset = new Vector3(0, 0, -halfTile);
        tiltAxis = new Vector3(1, 0, 0);
      }
    }

    // Set up pivot for tilt
    this.pivotNode.position = new Vector3(
      this._x * TILE_SIZE + pivotOffset.x + this.getMeshOffsetX(),
      0,
      this._z * TILE_SIZE + pivotOffset.z + this.getMeshOffsetZ()
    );

    // Offset mesh from pivot
    this.mesh.position = new Vector3(
      this._x * TILE_SIZE + this.getMeshOffsetX() - this.pivotNode.position.x,
      this.getMeshOffsetY(),
      this._z * TILE_SIZE + this.getMeshOffsetZ() - this.pivotNode.position.z
    );

    // Phase 1: Tilt animation
    const tiltAnimation = new Animation(
      'cubeTilt',
      'rotationQuaternion',
      60,
      Animation.ANIMATIONTYPE_QUATERNION,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const startQuat = Quaternion.Identity();
    const tiltQuat = Quaternion.RotationAxis(tiltAxis, Math.PI / 4);

    const tiltKeyframes = [
      { frame: 0, value: startQuat },
      { frame: 15, value: tiltQuat },
    ];

    tiltAnimation.setKeys(tiltKeyframes);
    this.pivotNode.rotationQuaternion = startQuat;

    this.scene.beginDirectAnimation(
      this.pivotNode,
      [tiltAnimation],
      0,
      15,
      false,
      1,
      () => {
        // Phase 2: Fall animation
        const fallAnimation = new Animation(
          'cubeFall',
          'position.y',
          60,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const fallKeyframes = [
          { frame: 0, value: this.pivotNode.position.y },
          { frame: 20, value: -10 },
        ];

        fallAnimation.setKeys(fallKeyframes);

        // Continue tilting while falling
        const continueTiltAnimation = new Animation(
          'cubeContinueTilt',
          'rotationQuaternion',
          60,
          Animation.ANIMATIONTYPE_QUATERNION,
          Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const endQuat = Quaternion.RotationAxis(tiltAxis, Math.PI);
        const continueTiltKeyframes = [
          { frame: 0, value: tiltQuat },
          { frame: 20, value: endQuat },
        ];

        continueTiltAnimation.setKeys(continueTiltKeyframes);

        this.scene.beginDirectAnimation(
          this.pivotNode,
          [fallAnimation, continueTiltAnimation],
          0,
          20,
          false,
          1,
          () => {
            this.isAnimating = false;
            this.pivotNode.rotationQuaternion = Quaternion.Identity();
            this.pivotNode.position = Vector3.Zero();
            if (onComplete) {
              onComplete();
            }
          }
        );
      }
    );
  }

  // Reset to a state
  public reset(state: CubeState): void {
    this._x = state.x;
    this._z = state.z;
    this._orientation = state.orientation;
    this.isAnimating = false;
    this.mesh.rotation = Vector3.Zero();
    this.mesh.scaling = Vector3.One();
    this.pivotNode.rotationQuaternion = Quaternion.Identity();
    this.pivotNode.position = Vector3.Zero();
    this.updateMeshPosition();
  }

  // Dispose resources
  public dispose(): void {
    this.mesh.dispose();
    this.pivotNode.dispose();
  }

  // Getters
  get x(): number { return this._x; }
  get z(): number { return this._z; }
  get orientation(): CubeOrientation { return this._orientation; }
}
