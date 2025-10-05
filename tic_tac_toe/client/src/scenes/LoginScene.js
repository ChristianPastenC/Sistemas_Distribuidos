import Phaser from 'phaser';

class LoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoginScene' });
    this.inputElement = null;
    this.joinButton = null;
    this.isProcessing = false;
    this.titleText = null;
    this.currentInputId = null;
  }

  create() {
    this.drawScene();
  }

  drawScene() {
    this.cleanupScene();

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#f8f9fa');

    this.titleText = this.add.text(width / 2, height * 0.3, 'Ingresa tu nombre', {
      fontSize: `${Math.max(24, width * 0.04)}px`,
      color: '#343a40',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    this.currentInputId = `usernameInput_${this.scene.key}`;

    const html = `
      <input 
        type="text"
        id="${this.currentInputId}"
        class="login-input"
        placeholder="Tu nombre"
        maxlength="20"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        inputmode="text"
        style="
          width: 80%;
          max-width: 400px;
          padding: 18px;
          font-size: 22px;
          border-radius: 10px;
          border: 2px solid #ced4da;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          display: block;
          margin: 0 auto;
          pointer-events: auto;
          touch-action: manipulation;
          background: #fff;
        ">
    `;

    this.inputElement = this.add.dom(width / 2, height * 0.45).createFromHTML(html);

    this.inputElement.node.style.position = 'absolute';
    this.inputElement.node.style.zIndex = '1000';
    this.inputElement.node.style.pointerEvents = 'auto';

    this.inputElement.setInteractive({ cursor: 'text' }).disableInteractive();

    this.setupEnterKeyHandler();

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) {
      setTimeout(() => {
        const input = document.getElementById(this.currentInputId);
        if (input) input.focus();
      }, 300);
    }

    this.joinButton = this.add.text(width / 2, height * 0.6, 'Unirse al juego', {
      fontSize: `${Math.max(20, width * 0.03)}px`,
      color: '#ffffff',
      backgroundColor: '#007bff',
      padding: { x: 30, y: 15 },
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      borderRadius: 10
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

    this.joinButton.on('pointerdown', () => {
      const input = document.getElementById(this.currentInputId);
      if (input) input.blur();
      this.handleJoin();
    });

    this.joinButton.on('pointerover', () => {
      if (!this.isProcessing) this.joinButton.setBackgroundColor('#0056b3');
    });
    this.joinButton.on('pointerout', () => {
      if (!this.isProcessing) this.joinButton.setBackgroundColor('#007bff');
    });
  }

  setupEnterKeyHandler() {
    const input = document.getElementById(this.currentInputId);
    if (!input) return;

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
        this.handleJoin();
      }
    });

    input.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      setTimeout(() => input.focus(), 10);
    });

    input.addEventListener('focus', () => {
      setTimeout(() => input.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    });
  }

  handleJoin() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    const input = document.getElementById(this.currentInputId);
    if (!input) return;

    const username = input.value.trim();

    if (username.length > 0) {
      input.disabled = true;
      this.joinButton.disableInteractive();
      this.joinButton.setBackgroundColor('#6c757d');
      this.joinButton.setText('Conectando...');

      this.time.delayedCall(100, () => {
        this.scene.start('GameScene', { username });
      });
    } else {
      input.style.border = '2px solid #dc3545';
      input.placeholder = 'Por favor ingresa tu nombre';
      setTimeout(() => {
        input.style.border = '2px solid #ced4da';
        input.placeholder = 'Tu nombre';
        this.isProcessing = false;
      }, 2000);
    }
  }

  cleanupScene() {
    const existingInput = document.getElementById(this.currentInputId);
    if (existingInput && existingInput.parentNode) {
      existingInput.parentNode.removeChild(existingInput);
    }
    if (this.inputElement) {
      this.inputElement.destroy();
      this.inputElement = null;
    }
    if (this.titleText) {
      this.titleText.destroy();
      this.titleText = null;
    }
    if (this.joinButton) {
      this.joinButton.destroy();
      this.joinButton = null;
    }
    this.children.removeAll(true);
    this.isProcessing = false;
  }

  resize() {
    const { width, height } = this.scale;
    if (this.titleText) this.titleText.setPosition(width / 2, height * 0.3);
    if (this.inputElement) this.inputElement.setPosition(width / 2, height * 0.45);
    if (this.joinButton) this.joinButton.setPosition(width / 2, height * 0.6);
  }

  shutdown() {
    this.cleanupScene();
  }
}

export default LoginScene;