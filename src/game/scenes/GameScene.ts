import {
  Scene,
  Engine,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  Color3,
  Color4,
  ShadowGenerator,
} from '@babylonjs/core';
import { Cube } from '../entities/Cube';
import { Level } from '../level/Level';
import { LevelManager } from '../level/LevelManager';
import { InputManager } from '../controls/InputManager';
import { CubeController } from '../controls/CubeController';
import { Direction, GameState, CubeState, GameMove } from '../../utils/Types';
import { CAMERA_DISTANCE, CAMERA_HEIGHT, COLORS, MAX_UNDO_STEPS } from '../../utils/Constants';

export class GameScene {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera | null = null;
  private cube: Cube | null = null;
  private level: Level | null = null;
  private levelManager: LevelManager;
  private inputManager: InputManager;
  private controller: CubeController | null = null;

  private gameState: GameState = GameState.PLAYING;
  private moveHistory: GameMove[] = [];
  private moveCount: number = 0;
  private initialState: CubeState | null = null;

  // UI elements
  private uiContainer: HTMLElement | null = null;
  private moveCountDisplay: HTMLElement | null = null;
  private levelNameDisplay: HTMLElement | null = null;

  // Callbacks
  private onWinCallback: (() => void) | null = null;
  private onLoseCallback: (() => void) | null = null;
  private onMenuCallback: (() => void) | null = null;

  constructor(engine: Engine, levelManager: LevelManager, inputManager: InputManager) {
    this.engine = engine;
    this.levelManager = levelManager;
    this.inputManager = inputManager;
    this.scene = new Scene(engine);
    this.setupScene();
  }

  private setupScene(): void {
    // Background color
    this.scene.clearColor = Color4.FromHexString(COLORS.BACKGROUND + 'FF');

    // Setup camera
    this.setupCamera();

    // Setup lighting
    this.setupLighting();

    // Create UI
    this.createUI();
  }

  private setupCamera(): void {
    this.camera = new ArcRotateCamera(
      'camera',
      Math.PI / 4,           // Alpha (horizontal rotation)
      Math.PI / 3,           // Beta (vertical angle)
      CAMERA_DISTANCE,       // Radius
      Vector3.Zero(),
      this.scene
    );

    // Set near/far clipping planes to ensure all tiles are visible
    this.camera.minZ = 0.1;
    this.camera.maxZ = 200;

    // Lock camera - no user interaction
    this.camera.lowerRadiusLimit = CAMERA_DISTANCE;
    this.camera.upperRadiusLimit = CAMERA_DISTANCE;
    this.camera.lowerBetaLimit = Math.PI / 3;
    this.camera.upperBetaLimit = Math.PI / 3;
    this.camera.lowerAlphaLimit = Math.PI / 4;
    this.camera.upperAlphaLimit = Math.PI / 4;

    // Disable all camera inputs
    this.camera.inputs.clear();
  }

  private setupLighting(): void {
    // Ambient light
    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.6;
    ambient.diffuse = new Color3(1, 1, 1);
    ambient.groundColor = new Color3(0.3, 0.3, 0.4);

    // Directional light for shadows
    const directional = new DirectionalLight('directional', new Vector3(-1, -2, -1), this.scene);
    directional.intensity = 0.8;
    directional.position = new Vector3(10, 20, 10);
  }

  private createUI(): void {
    const overlay = document.getElementById('ui-overlay')!;

    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'game-ui';
    this.uiContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      pointer-events: none;
    `;

    // Level name
    this.levelNameDisplay = document.createElement('div');
    this.levelNameDisplay.style.cssText = `
      color: white;
      font-family: Arial, sans-serif;
      font-size: 18px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    `;
    this.uiContainer.appendChild(this.levelNameDisplay);

    // Move counter
    this.moveCountDisplay = document.createElement('div');
    this.moveCountDisplay.style.cssText = `
      color: white;
      font-family: Arial, sans-serif;
      font-size: 18px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    `;
    this.uiContainer.appendChild(this.moveCountDisplay);

    overlay.appendChild(this.uiContainer);

    // Create action buttons
    this.createActionButtons(overlay);
  }

  private createActionButtons(overlay: HTMLElement): void {
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'action-buttons';
    buttonContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;

    const buttonStyle = `
      width: 50px;
      height: 50px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
    `;

    // Undo button
    const undoBtn = document.createElement('button');
    undoBtn.innerHTML = '↩';
    undoBtn.title = 'Undo';
    undoBtn.style.cssText = buttonStyle;
    undoBtn.addEventListener('click', () => this.undo());
    buttonContainer.appendChild(undoBtn);

    // Restart button
    const restartBtn = document.createElement('button');
    restartBtn.innerHTML = '↻';
    restartBtn.title = 'Restart';
    restartBtn.style.cssText = buttonStyle;
    restartBtn.addEventListener('click', () => this.restart());
    buttonContainer.appendChild(restartBtn);

    // Menu button
    const menuBtn = document.createElement('button');
    menuBtn.innerHTML = '☰';
    menuBtn.title = 'Menu';
    menuBtn.style.cssText = buttonStyle;
    menuBtn.addEventListener('click', () => {
      if (this.onMenuCallback) {
        this.onMenuCallback();
      }
    });
    buttonContainer.appendChild(menuBtn);

    overlay.appendChild(buttonContainer);
  }

  public loadLevel(): void {
    const levelData = this.levelManager.getCurrentLevel();
    if (!levelData) {
      console.error('No level data available');
      return;
    }

    // Clean up existing level
    if (this.level) {
      this.level.dispose();
    }
    if (this.cube) {
      this.cube.dispose();
    }

    // Create new level
    this.level = new Level(this.scene, levelData);
    const tiles = this.level.build();

    // Create cube
    this.cube = new Cube(this.scene);
    const start = this.level.getStart();
    this.initialState = { x: start.x, z: start.z, orientation: start.orientation };
    this.cube.initialize(this.initialState);

    // Create controller
    this.controller = new CubeController(
      this.cube,
      tiles,
      levelData.size.width,
      levelData.size.height,
      this.level.getGoal()
    );

    // Setup controller callbacks
    this.controller.onMove((move) => {
      this.moveHistory.push(move);
      if (this.moveHistory.length > MAX_UNDO_STEPS) {
        this.moveHistory.shift();
      }
      this.moveCount++;
      this.updateUI();
    });

    this.controller.onWin(() => {
      this.gameState = GameState.WON;
      this.inputManager.setEnabled(false);
      this.levelManager.completeLevel(this.moveCount);
      if (this.onWinCallback) {
        this.onWinCallback();
      }
    });

    this.controller.onLose(() => {
      this.gameState = GameState.LOST;
      this.inputManager.setEnabled(false);
      if (this.onLoseCallback) {
        this.onLoseCallback();
      }
    });

    // Setup input handling
    this.inputManager.onInput((direction) => {
      if (this.gameState === GameState.PLAYING && this.controller) {
        this.controller.tryMove(direction);
      }
    });

    // Center camera on level
    this.centerCamera();

    // Reset game state
    this.gameState = GameState.PLAYING;
    this.moveHistory = [];
    this.moveCount = 0;
    this.inputManager.setEnabled(true);
    this.inputManager.showDPad();

    // Update UI
    this.updateUI();
  }

  private centerCamera(): void {
    if (!this.camera || !this.level) return;

    // Calculate actual bounds of tiles (not just declared size)
    const tiles = this.level.getTiles();
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    tiles.forEach((tile) => {
      const pos = tile.getPosition();
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minZ = Math.min(minZ, pos.z);
      maxZ = Math.max(maxZ, pos.z);
    });

    // Fallback to declared size if no tiles
    if (minX === Infinity) {
      const size = this.level.getSize();
      minX = 0;
      maxX = size.width - 1;
      minZ = 0;
      maxZ = size.height - 1;
    }

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    this.camera.target = new Vector3(centerX, 0, centerZ);

    // Adjust camera distance based on actual tile area
    const actualWidth = maxX - minX + 1;
    const actualHeight = maxZ - minZ + 1;
    const maxDimension = Math.max(actualWidth, actualHeight);
    const dynamicDistance = Math.max(CAMERA_DISTANCE, maxDimension * 2.5);
    this.camera.radius = dynamicDistance;
    this.camera.lowerRadiusLimit = dynamicDistance;
    this.camera.upperRadiusLimit = dynamicDistance;
  }

  private updateUI(): void {
    const levelData = this.levelManager.getCurrentLevel();

    if (this.levelNameDisplay && levelData) {
      const levelIndex = this.levelManager.getCurrentLevelIndex() + 1;
      this.levelNameDisplay.textContent = `Level ${levelIndex}: ${levelData.name}`;
    }

    if (this.moveCountDisplay) {
      this.moveCountDisplay.textContent = `Moves: ${this.moveCount}`;
    }
  }

  public undo(): void {
    if (this.gameState !== GameState.PLAYING) return;
    if (this.moveHistory.length === 0) return;
    if (!this.cube || !this.level) return;

    const lastMove = this.moveHistory.pop()!;

    // Restore cube state
    this.cube.reset(lastMove.previousState);

    // Restore broken tiles
    // Note: This is simplified - a full implementation would need to track tile states
    this.level.reset();

    this.moveCount = Math.max(0, this.moveCount - 1);
    this.updateUI();
  }

  public restart(): void {
    if (!this.cube || !this.level || !this.initialState) return;

    // Reset cube
    this.cube.reset(this.initialState);

    // Reset level tiles
    this.level.reset();

    // Reset game state
    this.gameState = GameState.PLAYING;
    this.moveHistory = [];
    this.moveCount = 0;
    this.inputManager.setEnabled(true);

    this.updateUI();
  }

  // Event callbacks
  public onWin(callback: () => void): void {
    this.onWinCallback = callback;
  }

  public onLose(callback: () => void): void {
    this.onLoseCallback = callback;
  }

  public onMenu(callback: () => void): void {
    this.onMenuCallback = callback;
  }

  public getScene(): Scene {
    return this.scene;
  }

  public show(): void {
    this.inputManager.showDPad();
    if (this.uiContainer) {
      this.uiContainer.style.display = 'flex';
    }
    const actionButtons = document.getElementById('action-buttons');
    if (actionButtons) {
      actionButtons.style.display = 'flex';
    }
  }

  public hide(): void {
    this.inputManager.hideDPad();
    if (this.uiContainer) {
      this.uiContainer.style.display = 'none';
    }
    const actionButtons = document.getElementById('action-buttons');
    if (actionButtons) {
      actionButtons.style.display = 'none';
    }
  }

  public dispose(): void {
    if (this.level) {
      this.level.dispose();
    }
    if (this.cube) {
      this.cube.dispose();
    }
    if (this.uiContainer) {
      this.uiContainer.remove();
    }
    const actionButtons = document.getElementById('action-buttons');
    if (actionButtons) {
      actionButtons.remove();
    }
    this.scene.dispose();
  }
}
