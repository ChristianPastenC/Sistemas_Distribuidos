import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import LoginScene from './scenes/LoginScene';

const config = {
  type: Phaser.AUTO,
  width: 600,
  height: 900,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  parent: 'game-container',
  dom: {
    createContainer: true
  },
  scene: [LoginScene, GameScene]
};

const game = new Phaser.Game(config);