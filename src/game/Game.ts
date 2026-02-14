import { Engine, Scene } from '@babylonjs/core';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { LevelManager } from './level/LevelManager';
import { InputManager } from './controls/InputManager';
import { SceneType } from '../utils/Types';

export class Game {
  private canvas: HTMLCanvasElement;
  private engine: Engine;

  private menuScene: MenuScene | null = null;
  private levelSelectScene: LevelSelectScene | null = null;
  private gameScene: GameScene | null = null;

  private levelManager: LevelManager;
  private inputManager: InputManager;

  private currentScene: SceneType = SceneType.MENU;
  private activeScene: Scene | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    this.levelManager = new LevelManager();
    this.inputManager = new InputManager(canvas);

    this.initialize();
  }

  private initialize(): void {
    // Initialize level manager
    this.levelManager.initialize();

    // Create scenes
    this.createScenes();

    // Setup window resize handler
    window.addEventListener('resize', () => {
      this.engine.resize();
    });

    // Start with menu
    this.switchToScene(SceneType.MENU);

    // Start render loop
    this.engine.runRenderLoop(() => {
      if (this.activeScene) {
        this.activeScene.render();
      }
    });
  }

  private createScenes(): void {
    // Menu scene
    this.menuScene = new MenuScene(this.engine);
    this.menuScene.onPlay(() => {
      this.startGame();
    });
    this.menuScene.onLevelSelect(() => {
      this.switchToScene(SceneType.LEVEL_SELECT);
    });

    // Level select scene
    this.levelSelectScene = new LevelSelectScene(this.engine, this.levelManager);
    this.levelSelectScene.onLevelSelected((index) => {
      this.levelManager.setCurrentLevel(index);
      this.startGame();
    });
    this.levelSelectScene.onBack(() => {
      this.switchToScene(SceneType.MENU);
    });

    // Game scene
    this.gameScene = new GameScene(this.engine, this.levelManager, this.inputManager);
    this.gameScene.onWin(() => {
      this.showWinDialog();
    });
    this.gameScene.onLose(() => {
      this.showLoseDialog();
    });
    this.gameScene.onMenu(() => {
      this.switchToScene(SceneType.MENU);
    });
  }

  private switchToScene(sceneType: SceneType): void {
    // Hide all scenes
    this.menuScene?.hide();
    this.levelSelectScene?.hide();
    this.gameScene?.hide();
    this.inputManager.hideDPad();

    // Show and activate the requested scene
    switch (sceneType) {
      case SceneType.MENU:
        this.menuScene?.show();
        this.activeScene = this.menuScene?.getScene() || null;
        break;

      case SceneType.LEVEL_SELECT:
        this.levelSelectScene?.show();
        this.activeScene = this.levelSelectScene?.getScene() || null;
        break;

      case SceneType.GAME:
        this.gameScene?.show();
        this.activeScene = this.gameScene?.getScene() || null;
        break;
    }

    this.currentScene = sceneType;
  }

  private startGame(): void {
    this.switchToScene(SceneType.GAME);
    this.gameScene?.loadLevel();
  }

  private showWinDialog(): void {
    this.removeExistingDialogs();

    const overlay = document.getElementById('ui-overlay')!;

    const dialog = document.createElement('div');
    dialog.id = 'win-dialog';
    dialog.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      border: 2px solid #2ecc71;
      box-shadow: 0 0 30px rgba(46, 204, 113, 0.5);
    `;

    const title = document.createElement('h2');
    title.textContent = 'Level Complete!';
    title.style.cssText = `
      color: #2ecc71;
      font-family: Arial, sans-serif;
      font-size: 32px;
      margin: 0 0 30px 0;
    `;
    dialog.appendChild(title);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 15px;
      justify-content: center;
    `;

    // Next level button
    const nextBtn = this.createDialogButton('Next Level', '#2ecc71', () => {
      dialog.remove();
      if (this.levelManager.goToNextLevel()) {
        this.gameScene?.loadLevel();
      } else {
        // All levels completed
        this.showAllCompleteDialog();
      }
    });
    buttonContainer.appendChild(nextBtn);

    // Menu button
    const menuBtn = this.createDialogButton('Menu', '#666', () => {
      dialog.remove();
      this.switchToScene(SceneType.MENU);
    });
    buttonContainer.appendChild(menuBtn);

    dialog.appendChild(buttonContainer);
    overlay.appendChild(dialog);
  }

  private showLoseDialog(): void {
    this.removeExistingDialogs();

    const overlay = document.getElementById('ui-overlay')!;

    const dialog = document.createElement('div');
    dialog.id = 'lose-dialog';
    dialog.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      border: 2px solid #e74c3c;
      box-shadow: 0 0 30px rgba(231, 76, 60, 0.5);
    `;

    const title = document.createElement('h2');
    title.textContent = 'Fell Off!';
    title.style.cssText = `
      color: #e74c3c;
      font-family: Arial, sans-serif;
      font-size: 32px;
      margin: 0 0 30px 0;
    `;
    dialog.appendChild(title);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 15px;
      justify-content: center;
    `;

    // Retry button
    const retryBtn = this.createDialogButton('Try Again', '#e74c3c', () => {
      dialog.remove();
      this.gameScene?.restart();
      this.inputManager.setEnabled(true);
    });
    buttonContainer.appendChild(retryBtn);

    // Menu button
    const menuBtn = this.createDialogButton('Menu', '#666', () => {
      dialog.remove();
      this.switchToScene(SceneType.MENU);
    });
    buttonContainer.appendChild(menuBtn);

    dialog.appendChild(buttonContainer);
    overlay.appendChild(dialog);
  }

  private showAllCompleteDialog(): void {
    this.removeExistingDialogs();

    const overlay = document.getElementById('ui-overlay')!;

    const dialog = document.createElement('div');
    dialog.id = 'complete-dialog';
    dialog.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      border: 2px solid #f1c40f;
      box-shadow: 0 0 30px rgba(241, 196, 15, 0.5);
    `;

    const title = document.createElement('h2');
    title.textContent = 'Congratulations!';
    title.style.cssText = `
      color: #f1c40f;
      font-family: Arial, sans-serif;
      font-size: 32px;
      margin: 0 0 10px 0;
    `;
    dialog.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'You completed all levels!';
    subtitle.style.cssText = `
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 18px;
      margin: 0 0 30px 0;
    `;
    dialog.appendChild(subtitle);

    // Menu button
    const menuBtn = this.createDialogButton('Back to Menu', '#f1c40f', () => {
      dialog.remove();
      this.switchToScene(SceneType.MENU);
    });
    dialog.appendChild(menuBtn);

    overlay.appendChild(dialog);
  }

  private createDialogButton(text: string, color: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 12px 30px;
      font-family: Arial, sans-serif;
      font-size: 16px;
      font-weight: bold;
      color: white;
      background: ${color};
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.1s, opacity 0.1s;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('click', onClick);

    return btn;
  }

  private removeExistingDialogs(): void {
    document.getElementById('win-dialog')?.remove();
    document.getElementById('lose-dialog')?.remove();
    document.getElementById('complete-dialog')?.remove();
  }

  public dispose(): void {
    this.menuScene?.dispose();
    this.levelSelectScene?.dispose();
    this.gameScene?.dispose();
    this.inputManager.dispose();
    this.engine.dispose();
  }
}
