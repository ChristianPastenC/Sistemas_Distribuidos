import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import LoginScene from './scenes/LoginScene'

const config = {
  type: Phaser.AUTO,
  scale: {
    width: 1000, height: 450,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
  },
  backgroundColor: '#1d1d1d',
  scene: [
    GameScene, LoginScene
  ]
};

const game = new Phaser.Game(config);