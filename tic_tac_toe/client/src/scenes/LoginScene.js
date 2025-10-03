import Phaser from 'phaser';

class LoginScene extends Phaser.Scene {

  constructor() {
    super({ key: 'LoginScene' });
  }

  create() {
    this.add.text(400, 150, 'Ingresa tu nombre', {
      fontSize: '40px',
      fill: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const inputElement = this.add.dom(400, 250).createFromHTML(`
      <input type="text" id="usernameInput" placeholder="Tu nombre" style="width: 300px; padding: 10px; font-size: 18px; border-radius: 5px; border: 1px solid #ccc;">
    `);

    const joinButton = this.add.text(400, 320, 'Unirse al juego', {
      fontSize: '28px',
      fill: '#00ff00',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

    joinButton.on('pointerdown', () => {
      const username = inputElement.getChildByID('usernameInput').value.trim();
      if (username) {
        // Ocultar el elemento DOM para que no se vea en la siguiente escena
        inputElement.setVisible(false);
        this.scene.start('GameScene', { username });
      } else {
        alert('Por favor, ingresa un nombre para continuar.');
      }
    });

    // Evento para unirse con la tecla Enter
    this.input.keyboard.on('keydown-ENTER', () => {
      joinButton.emit('pointerdown');
    });
  }
}

export default LoginScene;