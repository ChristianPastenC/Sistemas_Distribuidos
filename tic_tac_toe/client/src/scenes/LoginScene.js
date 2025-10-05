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

    const inputElement = this.add.dom(width / 2, height * 0.45).createFromHTML(`
      <input 
        type="text" 
        id="usernameInput" 
        placeholder="Tu nombre" 
        maxlength="20" 
        autocomplete="off"
        style="width: 80%; max-width: 400px; padding: 18px; font-size: 22px; border-radius: 10px; border: 2px solid #ced4da; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    `);

    this.time.delayedCall(100, () => {
      const input = document.getElementById('usernameInput');
      if (input) {
        input.focus();
      }
    });

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
      this.time.delayedCall(50, () => {
        const usernameInput = document.getElementById('usernameInput');
        
        if (usernameInput) {
          const username = usernameInput.value.trim();
          
          if (username && username.length > 0) {
            this.scene.start('GameScene', {
              username: username
            });
          } else {
            usernameInput.style.border = '2px solid #dc3545';
            usernameInput.placeholder = 'Por favor ingresa tu nombre';
            
            setTimeout(() => {
              if (usernameInput) {
                usernameInput.style.border = '2px solid #ced4da';
                usernameInput.placeholder = 'Tu nombre';
              }
            }, 2000);
          }
        }
      });
    });

    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) {
      usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          
          this.time.delayedCall(50, () => {
            const input = document.getElementById('usernameInput');
            if (input) {
              const username = input.value.trim();
              
              if (username && username.length > 0) {
                this.scene.start('GameScene', {
                  username: username
                });
              } else {
                input.style.border = '2px solid #dc3545';
                input.placeholder = 'Por favor ingresa tu nombre';
                
                setTimeout(() => {
                  if (input) {
                    input.style.border = '2px solid #ced4da';
                    input.placeholder = 'Tu nombre';
                  }
                }, 2000);
              }
            }
          });
        }
      });

      setTimeout(() => {
        usernameInput.focus();
      }, 100);
    }

    joinButton.on('pointerover', () => joinButton.setBackgroundColor('#0056b3'));
    joinButton.on('pointerout', () => joinButton.setBackgroundColor('#007bff'));
  }

  resize() {
    this.drawScene();
  }
}

export default LoginScene;