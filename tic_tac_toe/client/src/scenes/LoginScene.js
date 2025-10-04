import Phaser from 'phaser';

class LoginScene extends Phaser.Scene {

  constructor() {
    super({
      key: 'LoginScene'
    });
  }

  create() {
    this.drawScene();
  }

  drawScene() {
    this.children.removeAll();
    const {
      width,
      height
    } = this.scale;

    this.cameras.main.setBackgroundColor('#f8f9fa');

    this.add.text(width / 2, height * 0.3, 'Ingresa tu nombre', {
      fontSize: `${Math.max(24, width * 0.04)}px`,
      color: '#343a40',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    this.add.dom(width / 2, height * 0.45).createFromHTML(`
      <input type="text" id="usernameInput" placeholder="Tu nombre" style="width: 80%; max-width: 400px; padding: 18px; font-size: 22px; border-radius: 10px; border: 2px solid #ced4da; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    `);

    const joinButton = this.add.text(width / 2, height * 0.6, 'Unirse al juego', {
      fontSize: `${Math.max(20, width * 0.03)}px`,
      color: '#ffffff',
      backgroundColor: '#007bff',
      padding: {
        x: 30,
        y: 15
      },
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      borderRadius: 10
    }).setOrigin(0.5).setInteractive({
      cursor: 'pointer'
    });

    joinButton.on('pointerdown', () => {
      const usernameInput = document.getElementById('usernameInput');
      if (usernameInput && usernameInput.value) {
        this.scene.start('GameScene', {
          username: usernameInput.value
        });
      }
    });

    joinButton.on('pointerover', () => joinButton.setBackgroundColor('#0056b3'));
    joinButton.on('pointerout', () => joinButton.setBackgroundColor('#007bff'));
  }

  resize() {
    this.drawScene();
  }
}

export default LoginScene;