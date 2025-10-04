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
  const scenes = game.scene.getScenes(true);
  scenes.forEach(scene => {
    if (scene && typeof scene.resize === 'function') {
      scene.resize(window.innerWidth, window.innerHeight);
    }
  });
});