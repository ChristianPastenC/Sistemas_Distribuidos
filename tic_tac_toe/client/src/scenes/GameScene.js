import Phaser from 'phaser';
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

class GameScene extends Phaser.Scene {

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.username = data.username || `Jugador_${Phaser.Math.Between(100, 999)}`;
    this.boardCells = [];
    this.boardSymbols = [];
    this.serverBoard = [];
    this.canPlay = false;
    this.playerSymbol = null;
    this.statusText = null;
    this.socket = null;
  }

  create() {
    this.socket = io(SERVER_URL);

    this.statusText = this.add.text(400, 80, 'Conectando...', {
      fontSize: '32px',
      fill: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    this.drawBoard();
    this.setupSocketEvents();

    this.socket.emit('joinGame', this.username);
  }

  drawBoard() {
    const cellSize = 150;
    const gap = 10;
    const startX = (this.sys.game.config.width - (cellSize * 3 + gap * 2)) / 2;
    const startY = (this.sys.game.config.height - (cellSize * 3 + gap * 2)) / 2 + 50;

    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = startX + col * (cellSize + gap);
      const y = startY + row * (cellSize + gap);

      const cell = this.add.rectangle(x, y, cellSize, cellSize, 0x1a1a1a)
        .setOrigin(0, 0)
        .setStrokeStyle(4, 0xffffff);

      cell.setInteractive({ cursor: 'pointer' });
      cell.setData('index', i);
      this.boardCells.push(cell);
    }

    this.input.on('gameobjectdown', (pointer, gameObject) => {
      const index = gameObject.getData('index');
      if (index !== undefined && this.canPlay && this.serverBoard[index] === null) {
        this.canPlay = false;
        this.socket.emit('makeMove', { index });
      }
    });
  }

  setupSocketEvents() {
    this.socket.on('waitingForOpponent', () => {
      this.statusText.setText('Esperando a un oponente...');
    });

    this.socket.on('gameStarted', (gameState) => {
      const me = gameState.players.find(p => p.socketId === this.socket.id);
      if (me) {
        this.playerSymbol = me.symbol;
      }
      this.updateGame(gameState);
    });

    this.socket.on('gameStateUpdate', (gameState) => {
      this.updateGame(gameState);
    });

    this.socket.on('gameOver', (gameState) => {
      this.canPlay = false;
      let resultText;
      if (gameState.isDraw) {
        resultText = '¡Empate!';
      } else {
        const iAmWinner = gameState.winner.socketId === this.socket.id;
        resultText = iAmWinner ? '¡Has ganado!' : 'Has perdido...';
      }
      this.statusText.setText(resultText);
      this.showResetButton();
    });

    this.socket.on('gameError', (error) => {
      alert(`Error del servidor: ${error.message}`);
      this.canPlay = true;
    });



    this.socket.on('opponentDisconnected', () => {
      this.canPlay = false;
      this.statusText.setText('Tu oponente se desconectó.\n¡Ganaste por abandono!');
      this.showResetButton();
    });
  }
  
  showResetButton() {
    const resetButton = this.add.text(400, this.sys.game.config.height - 50, 'Jugar de Nuevo', {
      fontSize: '24px',
      fill: '#00ff00',
      backgroundColor: '#333',
      padding: { x: 15, y: 10 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

    resetButton.on('pointerdown', () => {
      this.socket.disconnect();
      this.scene.start('LoginScene');
    });
  }

  updateGame(gameState) {
    this.serverBoard = gameState.board;

    this.boardSymbols.forEach(symbol => symbol.destroy());
    this.boardSymbols = [];

    this.serverBoard.forEach((symbol, index) => {
      if (symbol) {
        const cell = this.boardCells[index];
        const symbolText = this.add.text(
          cell.x + cell.width / 2,
          cell.y + cell.height / 2,
          symbol, {
          fontSize: '96px',
          fill: symbol === 'X' ? '#ff6666' : '#6666ff',
          fontStyle: 'bold'
        }
        ).setOrigin(0.5);
        this.boardSymbols.push(symbolText);
      }
    });

    if (gameState.state === 'PLAYING') {
      const isMyTurn = gameState.currentPlayer.socketId === this.socket.id;
      this.canPlay = isMyTurn;
      const opponent = gameState.players.find(p => p.socketId !== this.socket.id);
      const opponentName = opponent ? opponent.username : '...';
      this.statusText.setText(isMyTurn ? `¡Es tu turno! (${this.playerSymbol})` : `Turno de ${opponentName}`);
    }
  }
}

export default GameScene;