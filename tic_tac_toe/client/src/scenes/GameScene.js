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
    this.scoreText = null;
    this.resetButton = null;
  }

  create() {
    this.socket = io(SERVER_URL);
    const { width, height } = this.scale;

    this.statusText = this.add.text(width / 2, height * 0.15, 'Conectando...', {
      fontSize: '48px', fill: '#ffffff', fontStyle: 'bold', align: 'center',
      wordWrap: { width: width * 0.9, useAdvancedWrap: true }
    }).setOrigin(0.5);

    this.scoreText = this.add.text(width / 2, 50, '', {
        fontSize: '32px', fill: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.drawBoard();
    this.setupSocketEvents();

    this.socket.emit('joinGame', this.username);
  }

  drawBoard() {
    const { width, height } = this.scale;
    const boardSize = width * 0.9;
    const gap = 10;
    const cellSize = (boardSize - (gap * 2)) / 3;
    const startX = (width - boardSize) / 2;
    const startY = height / 2 - boardSize / 2;

    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = startX + col * (cellSize + gap);
      const y = startY + row * (cellSize + gap);
      const cell = this.add.rectangle(x, y, cellSize, cellSize, 0x1a1a1a)
        .setOrigin(0, 0).setStrokeStyle(4, 0xffffff);
      cell.setInteractive({ cursor: 'pointer' }).setData('index', i);
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
    this.socket.on('waitingForOpponent', () => this.statusText.setText('Esperando a un oponente...'));

    this.socket.on('gameStarted', (gameState) => {
      if (this.resetButton) this.resetButton.destroy();
      this.resetButton = null;
      const me = gameState.players.find(p => p.socketId === this.socket.id);
      if (me) this.playerSymbol = me.symbol;
      
      if (gameState.score.X === 0 && gameState.score.O === 0) {
        this.updateScore(gameState.players, gameState.score);
      }

      this.updateGame(gameState);
    });

    this.socket.on('gameStateUpdate', (gameState) => this.updateGame(gameState));

    this.socket.on('gameOver', (gameState) => {
      this.canPlay = false;
      let resultText;
      if (gameState.isDraw) resultText = '¡Empate!';
      else {
        const iAmWinner = gameState.winner.socketId === this.socket.id;
        resultText = iAmWinner ? '¡Has ganado!' : 'Has perdido...';
      }
      this.statusText.setText(resultText);
      this.updateScore(gameState.players, gameState.score);
      this.showResetButton();
    });

    this.socket.on('playerReady', (gameState) => {
        if(this.resetButton) {
            const amIReady = gameState.readyForNextRound.includes(this.socket.id);
            if(amIReady) {
                this.resetButton.setText('Esperando...').disableInteractive();
            } else {
                const readyPlayer = gameState.players.find(p => gameState.readyForNextRound.includes(p.socketId));
                this.statusText.setText(`${readyPlayer.username} quiere la revancha.`);
            }
        }
    });

    this.socket.on('findingNewOpponent', () => {
        this.canPlay = false;
        if (this.resetButton) this.resetButton.destroy();
        this.resetButton = null;
        
        this.statusText.setText('Oponente desconectado.\nBuscando nueva partida...');
        this.scoreText.setText('');
        
        this.boardSymbols.forEach(symbol => symbol.destroy());
        this.boardSymbols = [];
        this.serverBoard = Array(9).fill(null);
    });
    
    this.socket.on('gameError', (error) => {
      alert(`Error del servidor: ${error.message}`);
      this.canPlay = true;
    });

    this.socket.on('opponentDisconnected', () => {
      this.canPlay = false;
      this.statusText.setText('Tu oponente se desconectó.');
      if (this.resetButton) this.resetButton.destroy();
    });
  }
  
  showResetButton() {
    if (this.resetButton) return;
    const { width, height } = this.scale;
    this.resetButton = this.add.text(width / 2, height * 0.85, 'Jugar de Nuevo', {
      fontSize: '32px', fill: '#00ff00', backgroundColor: '#333',
      padding: { x: 15, y: 10 }, fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

    this.resetButton.on('pointerdown', () => {
      this.socket.emit('playAgainRequest');
    });
  }

  updateScore(players, score) {
    const playerX = players.find(p => p.symbol === 'X');
    const playerO = players.find(p => p.symbol === 'O');
    if(playerX && playerO) {
        this.scoreText.setText(`${playerX.username} (X): ${score.X} - ${playerO.username} (O): ${score.O}`);
    }
  }

  updateGame(gameState) {
    this.serverBoard = gameState.board;
    const { width } = this.scale;
    this.boardSymbols.forEach(symbol => symbol.destroy());
    this.boardSymbols = [];
    
    const boardSize = width * 0.9, gap = 10, cellSize = (boardSize - (gap * 2)) / 3;
    const fontSize = `${cellSize * 0.8}px`;

    this.serverBoard.forEach((symbol, index) => {
      if (symbol) {
        const cell = this.boardCells[index];
        const symbolText = this.add.text(cell.x + cell.width / 2, cell.y + cell.height / 2, symbol, {
          fontSize: fontSize, fill: symbol === 'X' ? '#ff6666' : '#6666ff', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.boardSymbols.push(symbolText);
      }
    });

    this.updateScore(gameState.players, gameState.score);

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