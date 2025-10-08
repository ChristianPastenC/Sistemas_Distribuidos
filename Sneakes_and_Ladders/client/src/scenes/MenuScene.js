// src/scenes/MenuScene.js
import Phaser from 'phaser';
import WebSocketManager from '../managers/WebSocketManager';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this.wsManager = null;
  }

  create() {
    this.cameras.main.setBackgroundColor('#f0ebe2');

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY - 250, 'Serpientes y Escaleras', {
      fontFamily: 'Bungee',
      fontSize: '56px',
      color: '#3a5a40',
    }).setOrigin(0.5);

    this.createPlayerNameInput(centerX, centerY - 150);

    this.createRoomIdInput(centerX, centerY - 70);

    this.createJoinButton(centerX, centerY + 20);

    this.statusText = this.add.text(centerX, centerY + 120, '', {
      fontFamily: 'Poppins',
      fontSize: '18px',
      color: '#d90429',
      align: 'center'
    }).setOrigin(0.5);

    this.connectToServer();
  }

  createPlayerNameInput(x, y) {
    this.add.text(x, y - 30, 'Tu Nombre:', {
      fontFamily: 'Poppins',
      fontSize: '20px',
      color: '#333',
      fontStyle: '600'
    }).setOrigin(0.5);

    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.id = 'player-name-input';
    inputElement.placeholder = 'Ingresa tu nombre';
    inputElement.maxLength = 20;
    inputElement.className = 'phaser-input';
    inputElement.style.cssText = `
      left: 50%;
      top: ${y - 12}px;
      width: 300px;
      height: 45px;
      transform: translateX(-50%);
    `;

    document.body.appendChild(inputElement);
    this.playerNameInput = inputElement;
  }

  createRoomIdInput(x, y) {
    this.add.text(x, y - 30, 'ID de Sala:', {
      fontFamily: 'Poppins',
      fontSize: '20px',
      color: '#333',
      fontStyle: '600'
    }).setOrigin(0.5);

    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.id = 'room-id-input';
    inputElement.placeholder = 'default';
    inputElement.value = 'default';
    inputElement.maxLength = 20;
    inputElement.className = 'phaser-input';
    inputElement.style.cssText = `
      left: 50%;
      top: ${y - 12}px;
      width: 300px;
      height: 45px;
      transform: translateX(-50%);
    `;

    document.body.appendChild(inputElement);
    this.roomIdInput = inputElement;
  }

  createJoinButton(x, y) {
    const button = this.add.text(x, y, 'UNIRSE A SALA', {
      fontFamily: 'Bungee',
      fontSize: '28px',
      color: '#f8f9fa',
      backgroundColor: '#d4a373',
      padding: { x: 35, y: 15 },
      align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const shadow = this.add.text(x + 5, y + 5, 'UNIRSE A SALA', {
      fontFamily: 'Bungee',
      fontSize: '28px',
      color: '#a17c58',
      padding: { x: 35, y: 15 }
    }).setOrigin(0.5);
    this.children.sendToBack(shadow);

    button.on('pointerdown', () => {
      this.joinRoom();
    });

    button.on('pointerover', () => button.y = y - 2);
    button.on('pointerout', () => button.y = y);

    this.joinButton = button;
  }

  async connectToServer() {
    try {
      const wsUrl = 'ws://localhost:3000';
      this.wsManager = new WebSocketManager(wsUrl);

      await this.wsManager.connect();

      this.statusText.setText('Conectado al servidor');
      this.statusText.setColor('#2a9d8f');

      this.setupWebSocketCallbacks();

    } catch (error) {
      console.error('Error conectando al servidor:', error);
      this.statusText.setText('Error: No se pudo conectar al servidor\nVerifica que el servidor esté corriendo');
      this.statusText.setColor('#d90429');
    }
  }

  setupWebSocketCallbacks() {
    this.wsManager.on('joinSuccess', (data) => {
      this.statusText.setText('Esperando otros jugadores...');
      this.statusText.setColor('#2a9d8f');

      if (this.playerNameInput) this.playerNameInput.remove();
      if (this.roomIdInput) this.roomIdInput.remove();

      this.scene.start('LobbyScene', {
        wsManager: this.wsManager,
        gameState: data.gameState
      });
    });

    this.wsManager.on('joinError', (error) => {
      this.statusText.setText(`Error: ${error}`);
      this.statusText.setColor('#d90429');
    });

    this.wsManager.on('error', (error) => {
      this.statusText.setText(`Error: ${error}`);
      this.statusText.setColor('#d90429');
    });
  }

  joinRoom() {
    const playerName = this.playerNameInput.value.trim() || 'Jugador';
    const roomId = this.roomIdInput.value.trim() || 'default';

    if (!this.wsManager || !this.wsManager.connected) {
      this.statusText.setText('No conectado al servidor');
      this.statusText.setColor('#d90429');
      return;
    }

    this.statusText.setText('Uniéndose a la sala...');
    this.statusText.setColor('#0077b6');

    this.wsManager.joinRoom(roomId, playerName);
  }

  shutdown() {
    if (this.playerNameInput) this.playerNameInput.remove();
    if (this.roomIdInput) this.roomIdInput.remove();
  }
}