import { Game } from './game/Game';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  // Create and start the game
  const game = new Game(canvas);

  // Handle cleanup on page unload
  window.addEventListener('beforeunload', () => {
    game.dispose();
  });
});
