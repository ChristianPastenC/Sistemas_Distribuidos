// src/scenes/LobbyScene.js
import Phaser from 'phaser';

export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
    this.wsManager = null;
    this.gameState = null;
    this.playerCards = [];
    this.isReady = false;
  }

  init(data) {
    this.wsManager = data.wsManager;
    this.gameState = data.gameState;
  }

  create() {
    this.cameras.main.setBackgroundColor('#f0ebe2');

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, 80, 'Sala de Espera', {
      fontFamily: 'Bungee',
      fontSize: '48px',
      color: '#3a5a40',
    }).setOrigin(0.5);

    this.add.text(centerX, 150, 'Esperando jugadores (mínimo 2, máximo 5)', {
      fontFamily: 'Poppins',
      fontSize: '20px',
      color: '#555'
    }).setOrigin(0.5);

    this.playersContainer = this.add.container(centerX, centerY);

    this.createReadyButton(centerX, centerY + 200);

    this.updatePlayersUI();

    this.setupWebSocketCallbacks();
  }

  createReadyButton(x, y) {
    const button = this.add.text(x, y, 'ESTOY LISTO', {
      fontFamily: 'Bungee',
      fontSize: '32px',
      color: '#f8f9fa',
      backgroundColor: '#d4a373',
      padding: { x: 40, y: 20 },
      align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const shadow = this.add.text(x + 6, y + 6, 'ESTOY LISTO', {
      fontFamily: 'Bungee',
      fontSize: '32px',
      color: '#a17c58',
      padding: { x: 40, y: 20 }
    }).setOrigin(0.5);
    this.children.sendToBack(shadow);

    button.on('pointerdown', () => {
      if (!this.isReady) {
        this.isReady = true;
        this.wsManager.setReady();
        button.setText('ESPERANDO...');
        button.setBackgroundColor('#2a9d8f');
        button.disableInteractive();
      }
    });

    button.on('pointerover', () => {
      if (!this.isReady) button.y = y - 2;
    });
    button.on('pointerout', () => {
      if (!this.isReady) button.y = y;
    });

    this.readyButton = button;
  }

  setupWebSocketCallbacks() {
    this.wsManager.on('playerJoined', (data) => {
      this.gameState = data.gameState;
      this.updatePlayersUI();
    });

    this.wsManager.on('playerReady', (data) => {
      this.gameState = data.gameState;
      this.updatePlayersUI();
    });

    this.wsManager.on('gameStart', (data) => {
      this.gameState = data.gameState;
      // Iniciar el juego
      this.scene.start('GameScene', {
        wsManager: this.wsManager,
        gameState: this.gameState
      });
    });

    this.wsManager.on('playerLeft', (data) => {
      this.gameState = data.gameState;
      this.updatePlayersUI();
    });
  }

  updatePlayersUI() {
    this.playerCards.forEach(card => card.destroy());
    this.playerCards = [];

    const players = this.gameState.players;
    const cardWidth = 250;
    const cardHeight = 120;
    const gap = 20;
    const totalWidth = Math.min(players.length, 2) * (cardWidth + gap) - gap;
    const rows = Math.ceil(players.length / 2);

    players.forEach((player, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = (col - 0.5) * (cardWidth + gap);
      const y = (row - (rows - 1) / 2) * (cardHeight + gap);

      const card = this.add.container(x, y);

      const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0xffffff);
      bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(player.color).color);

      const avatar = this.add.circle(-80, 0, 35, Phaser.Display.Color.HexStringToColor(player.color).color);
      avatar.setStrokeStyle(4, 0xffffff);

      const nameText = this.add.text(0, -20, player.name, {
        fontFamily: 'Poppins',
        fontSize: '22px',
        color: '#333',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const statusText = this.add.text(0, 15, player.ready ? '✓ LISTO' : 'Esperando...', {
        fontFamily: 'Poppins',
        fontSize: '16px',
        color: player.ready ? '#2a9d8f' : '#999'
      }).setOrigin(0.5);

      if (player.id === this.wsManager.playerId) {
        const youLabel = this.add.text(80, -40, 'TÚ', {
          fontFamily: 'Bungee',
          fontSize: '14px',
          color: '#d4a373'
        }).setOrigin(0.5);
        card.add(youLabel);
      }

      card.add([bg, avatar, nameText, statusText]);
      this.playersContainer.add(card);
      this.playerCards.push(card);
    });
  }
}