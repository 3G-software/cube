import { Engine, Scene } from '@babylonjs/core';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { LevelManager } from './level/LevelManager';
import { InputManager } from './controls/InputManager';
import { AdManager } from './ads/AdManager';
import { SceneType } from '../utils/Types';

export class Game {
  private canvas: HTMLCanvasElement;
  private engine: Engine;

  private menuScene: MenuScene | null = null;
  private levelSelectScene: LevelSelectScene | null = null;
  private gameScene: GameScene | null = null;

  private levelManager: LevelManager;
  private inputManager: InputManager;
  private adManager: AdManager;

  private currentScene: SceneType = SceneType.MENU;
  private activeScene: Scene | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Set canvas size to match display size with device pixel ratio
    this.resizeCanvas();

    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true, // Enable antialiasing for smoother edges
    });

    // Enable high DPI support for sharper graphics on mobile devices
    this.engine.setHardwareScalingLevel(1 / window.devicePixelRatio);

    this.levelManager = new LevelManager();
    this.inputManager = new InputManager(canvas);
    this.adManager = new AdManager();

    this.initialize();
  }

  private initialize(): void {
    // Initialize level manager
    this.levelManager.initialize();

    // Create scenes
    this.createScenes();

    // Setup window resize handler
    window.addEventListener('resize', () => {
      this.resizeCanvas();
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

  private resizeCanvas(): void {
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    // Set canvas internal size to match display size * device pixel ratio
    this.canvas.width = displayWidth * dpr;
    this.canvas.height = displayHeight * dpr;
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
      const currentLevel = this.levelManager.getCurrentLevel();
      if (currentLevel) {
        this.adManager.resetRetryCount(currentLevel.id);
      }
      this.showWinDialog();
    });
    this.gameScene.onLose(() => {
      const currentLevel = this.levelManager.getCurrentLevel();
      if (currentLevel) {
        this.adManager.recordRetry(currentLevel.id);

        // Check if we should show an ad
        if (this.adManager.shouldShowAd(currentLevel.id)) {
          this.adManager.showAd(() => {
            this.showLoseDialog();
          });
        } else {
          this.showLoseDialog();
        }
      } else {
        this.showLoseDialog();
      }
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
      max-width: 90%;
      width: 400px;
      box-sizing: border-box;
    `;

    const title = document.createElement('h2');
    title.textContent = '关卡完成！';
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
      flex-direction: column;
      gap: 15px;
      justify-content: center;
      width: 100%;
    `;

    // Next level button
    const nextBtn = this.createDialogButton('下一关', '#2ecc71', () => {
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
    const menuBtn = this.createDialogButton('菜单', '#666', () => {
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
      max-width: 90%;
      width: 400px;
      box-sizing: border-box;
    `;

    const title = document.createElement('h2');
    title.textContent = '掉下去了！';
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
      flex-direction: column;
      gap: 15px;
      justify-content: center;
      width: 100%;
    `;

    // Retry button
    const retryBtn = this.createDialogButton('重试', '#e74c3c', () => {
      dialog.remove();
      this.gameScene?.restart();
      this.inputManager.setEnabled(true);
    });
    buttonContainer.appendChild(retryBtn);

    // Menu button
    const menuBtn = this.createDialogButton('菜单', '#666', () => {
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

    // Create fireworks canvas
    this.createFireworks(overlay);

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
      z-index: 1000;
      max-width: 90%;
      width: 400px;
      box-sizing: border-box;
    `;

    const title = document.createElement('h2');
    title.textContent = '恭喜！';
    title.style.cssText = `
      color: #f1c40f;
      font-family: Arial, sans-serif;
      font-size: 32px;
      margin: 0 0 10px 0;
    `;
    dialog.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = '你已完成所有关卡！';
    subtitle.style.cssText = `
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 18px;
      margin: 0 0 30px 0;
    `;
    dialog.appendChild(subtitle);

    // Menu button
    const menuBtn = this.createDialogButton('返回菜单', '#f1c40f', () => {
      dialog.remove();
      this.removeFireworks();
      this.switchToScene(SceneType.MENU);
    });
    dialog.appendChild(menuBtn);

    overlay.appendChild(dialog);
  }

  private createFireworks(container: HTMLElement): void {
    const canvas = document.createElement('canvas');
    canvas.id = 'fireworks-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999;
    `;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d')!;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
    }> = [];

    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];

    const createFirework = (x: number, y: number) => {
      const particleCount = 50;
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = 2 + Math.random() * 3;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    let lastFirework = 0;
    const animate = (time: number) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create new firework every 500ms
      if (time - lastFirework > 500) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height * 0.5;
        createFirework(x, y);
        lastFirework = time;
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.life -= 0.01;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, 3, 3);
      }

      ctx.globalAlpha = 1;

      const animId = requestAnimationFrame(animate);
      (canvas as any).__animId = animId;
    };

    animate(0);
  }

  private removeFireworks(): void {
    const canvas = document.getElementById('fireworks-canvas');
    if (canvas) {
      const animId = (canvas as any).__animId;
      if (animId) {
        cancelAnimationFrame(animId);
      }
      canvas.remove();
    }
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
      width: 100%;
      min-width: 200px;
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
