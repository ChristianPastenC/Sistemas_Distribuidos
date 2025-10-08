// src/scenes/MenuScene.js
import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this.selectedPlayers = 2;
  }

  create() {
    this.cameras.main.setBackgroundColor('#f0ebe2');

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY - 200, 'Snakes & Ladders', {
      fontFamily: 'Bungee',
      fontSize: '64px',
      color: '#3a5a40',
    }).setOrigin(0.5);

    this.add.text(centerX, centerY - 100, 'Selecciona el número de jugadores', {
      fontFamily: 'Poppins',
      fontSize: '28px',
      color: '#333'
    }).setOrigin(0.5);

    this.createPlayerButtons(centerX, centerY);
    this.createStartButton(centerX, centerY + 200);
  }

  createPlayerButtons(centerX, centerY) {
    const playerColors = [0xd90429, 0x0077b6, 0xfca311, 0x5f0f40];
    this.playerButtons = [];

    const buttonWidth = 120;
    const totalWidth = (4 * buttonWidth);
    const startX = centerX - totalWidth / 2 + buttonWidth / 2;

    for (let i = 0; i < 4; i++) {
      const x = startX + (i * buttonWidth);
      const numPlayers = i + 1;

      const container = this.add.container(x, centerY);
      const circle = this.add.circle(0, 0, 40, playerColors[i]);
      circle.setStrokeStyle(4, 0xffffff);

      const text = this.add.text(0, 0, (i + 1).toString(), {
        fontFamily: 'Bungee',
        fontSize: '40px',
        color: '#ffffff'
      }).setOrigin(0.5);

      container.add([circle, text]);
      container.setSize(80, 80);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerdown', () => this.selectPlayers(numPlayers));

      this.playerButtons.push({ container, circle, numPlayers });
    }
    this.selectPlayers(2);
  }

  selectPlayers(num) {
    this.selectedPlayers = num;
    this.playerButtons.forEach(btn => {
      const isActive = btn.numPlayers === num;
      this.tweens.add({
        targets: btn.container,
        scale: isActive ? 1.15 : 1.0,
        duration: 200,
        ease: 'Back.easeOut'
      });
      btn.circle.setStrokeStyle(isActive ? 6 : 4, isActive ? 0xd4a373 : 0xffffff);
    });
  }

  createStartButton(centerX, y) {
    const button = this.add.text(centerX, y, 'COMENZAR', {
      fontFamily: 'Bungee',
      fontSize: '32px',
      color: '#f8f9fa',
      backgroundColor: '#d4a373',
      padding: { x: 40, y: 20 },
      align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const shadow = this.add.text(centerX + 6, y + 6, 'COMENZAR', {
      fontFamily: 'Bungee',
      fontSize: '32px',
      color: '#a17c58',
      padding: { x: 40, y: 20 }
    }).setOrigin(0.5);
    this.children.sendToBack(shadow);


    button.on('pointerdown', () => {
      document.getElementById('game-ui-wrapper').classList.remove('hidden');

      this.scene.start('GameScene', { numPlayers: this.selectedPlayers });
    });

    button.on('pointerover', () => button.y = y - 2);
    button.on('pointerout', () => button.y = y);
  }
}