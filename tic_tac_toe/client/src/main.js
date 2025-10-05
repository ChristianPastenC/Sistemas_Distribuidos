import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import LoginScene from './scenes/LoginScene';

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'game-container',
    width: '100%',
    height: '100%'
  },
  parent: 'game-container',
  dom: {
    createContainer: true
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  scene: [LoginScene, GameScene]
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);

  game.scene.scenes.forEach(scene => {
    if (scene.scene.isActive() && scene.resize) {
      scene.resize(window.innerWidth, window.innerHeight);
    }
  });
});

window.addEventListener('beforeunload', () => {
  if (window.globalSocket) {
    window.globalSocket.disconnect();
  }
});

document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);
