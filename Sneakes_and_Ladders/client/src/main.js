// src/main.js
import Phaser from 'phaser';
import MenuScene from './scenes/MenuScene';
import GameScene from './scenes/GameScene';

const config = {
  type: Phaser.WEBGL,
  parent: window.PHASER_PARENT_ID || 'app',
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0,0,0,0)',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [MenuScene, GameScene],
  render: {
    pixelArt: false,
    antialias: true
  }
};

const game = new Phaser.Game(config);

game.events.on('ready', () => {
  game.scene.scenes.forEach(scene => {
    scene.events.on('create', () => {
      if (scene.scene.key === 'GameScene') {
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
          canvasContainer.appendChild(game.canvas);
        }
      }
    });
  });
});