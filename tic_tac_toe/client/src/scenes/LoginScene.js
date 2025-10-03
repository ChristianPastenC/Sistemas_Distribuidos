import Phaser from 'phaser';

class LoginScene extends Phaser.Scene {

  constructor() {
    super({ key: 'LoginScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height * 0.2, 'Ingresa tu nombre', {
      fontSize: '40px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const inputElement = this.add.dom(width / 2, height * 0.35).createFromHTML(`
      <input type="text" id="usernameInput" placeholder="Tu nombre" style="width: 80%; max-width: 400px; padding: 15px; font-size: 20px; border-radius: 5px; border: 1px solid #ccc; text-align: center;">
    `);

    const joinButton = this.add.text(width / 2, height * 0.5, 'Unirse al juego', {
      fontSize: '32px',
      fill: '#00ff00',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

    joinButton.on('pointerdown', () => {
      const username = inputElement.getChildByID('usernameInput').value.trim();
      if (username) {
        inputElement.setVisible(false);
        this.scene.start('GameScene', { username });
      } else {
        alert('Por favor, ingresa un nombre para continuar.');
      }
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      joinButton.emit('pointerdown');
    });
  }
}

export default LoginScene;