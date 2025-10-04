import Phaser from 'phaser';
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

class GameScene extends Phaser.Scene {

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('pieceX', 'assets/x.png');
    this.load.image('pieceO', 'assets/o.png');
  }

  init(data) {
    this.username = data.username || `Player_${Phaser.Math.Between(100, 999)}`;
    this.socket = null;
    this.playerSymbol = null;
    this.canPlay = false;
    this.serverBoard = Array(9).fill(null);
    this.gameState = null;
    this.uiElements = null;
    this.pieceElements = null;
    this.indicatorTween = null;
    this.winningLineGraphics = null;
    this.boardGraphics = null;
    this.interactiveCells = [];
  }

  create() {
    this.cameras.main.setBackgroundColor('#f8f9fa');
    this.uiElements = this.add.group();
    this.pieceElements = this.add.group();

    this.drawInitialMessage('Conectando...');
    
    this.socket = io(SERVER_URL);
    
    this.setupSocketEvents();
    
    this.socket.emit('joinGame', this.username);
  }

  setupSocketEvents() {
    this.socket.on('waitingForOpponent', () => {
      this.drawInitialMessage('Esperando a un oponente...');
    });

    this.socket.on('gameStarted', (gameState) => {
      const me = gameState.players.find(p => p.socketId === this.socket.id);
      if (me) this.playerSymbol = me.symbol;
      
      this.gameState = {
        board: gameState.board,
        state: gameState.state,
        players: gameState.players,
        score: gameState.score,
        currentPlayer: gameState.currentPlayer,
        winner: null,
        isDraw: false
      };
      
      this.serverBoard = [...gameState.board];
      this.canPlay = true;
      this.drawGameUI();
    });

    this.socket.on('gameStateUpdate', (gameState) => {
      this.serverBoard = [...gameState.board];
      this.canPlay = true;
      this.gameState = {
        ...this.gameState,
        board: gameState.board,
        state: gameState.state,
        currentPlayer: gameState.currentPlayer,
        score: gameState.score
      };
      this.updateGameUI();
    });

    this.socket.on('gameOver', (gameState) => {
      this.canPlay = false;
      this.serverBoard = [...gameState.board];
      
      let winningLine = null;
      if (!gameState.isDraw && gameState.winner) {
        winningLine = this.calculateWinningLine(gameState.board);
      }
      
      this.gameState = {
        ...this.gameState,
        board: gameState.board,
        state: 'FINISHED',
        winner: gameState.winner,
        isDraw: gameState.isDraw,
        score: gameState.score,
        winningLine: winningLine
      };
      this.updateGameUI();
      this.showRestartButton();
    });

    this.socket.on('playerReady', (gameState) => {
      if (this.restartButton) {
        const amIReady = gameState.readyForNextRound?.includes(this.socket.id);
        if (amIReady) {
          this.restartButton.setText('Esperando...').disableInteractive();
        } else {
          const readyPlayer = gameState.players.find(p => 
            gameState.readyForNextRound?.includes(p.socketId)
          );
          if (readyPlayer && this.turnIndicatorText) {
            this.turnIndicatorText.setText(`${readyPlayer.username} quiere la revancha.`);
          }
        }
      }
    });

    this.socket.on('findingNewOpponent', () => {
      this.canPlay = false;
      this.serverBoard = Array(9).fill(null);
      if (this.restartButton) {
        this.restartButton.destroy();
        this.restartButton = null;
      }
      this.drawInitialMessage('Oponente desconectado.\nBuscando nueva partida...');
    });

    this.socket.on('gameError', (error) => {
      console.error('Error del servidor:', error.message);
      alert(`Error del servidor: ${error.message}`);
      this.canPlay = true;
    });

    this.socket.on('opponentDisconnected', () => {
      this.canPlay = false;
      if (this.restartButton) {
        this.restartButton.destroy();
        this.restartButton = null;
      }
      this.drawInitialMessage('Tu oponente se desconectó.');
    });
  }

  drawInitialMessage(message) {
    this.uiElements.clear(true, true);
    this.pieceElements.clear(true, true);
    if (this.winningLineGraphics) {
      this.winningLineGraphics.destroy();
      this.winningLineGraphics = null;
    }
    if (this.boardGraphics) {
      this.boardGraphics.destroy();
      this.boardGraphics = null;
    }
    this.interactiveCells.forEach(cell => cell.destroy());
    this.interactiveCells = [];
    
    const { width, height } = this.scale;
    this.statusText = this.add.text(width / 2, height / 2, message, {
      fontSize: '48px',
      color: '#495057',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      wordWrap: { width: width * 0.9 }
    }).setOrigin(0.5);
    this.uiElements.add(this.statusText);
  }

  drawGameUI() {
    this.uiElements.clear(true, true);
    if (this.restartButton) {
      this.restartButton.destroy();
      this.restartButton = null;
    }
    if (this.winningLineGraphics) {
      this.winningLineGraphics.destroy();
      this.winningLineGraphics = null;
    }
    if (this.boardGraphics) {
      this.boardGraphics.destroy();
      this.boardGraphics = null;
    }
    this.interactiveCells.forEach(cell => cell.destroy());
    this.interactiveCells = [];
    
    this.createScoreboard();
    this.createTurnIndicator();
    this.createBoard();
    this.updateBoardPieces();
  }

  updateBoardPieces() {
    this.pieceElements.clear(true, true);
    if (!this.gameState || !this.boardRect) return;

    const { x, y, cell } = this.boardRect;
    const pieceScale = 0.7;

    this.gameState.board.forEach((symbol, index) => {
      if (symbol) {
        const row = Math.floor(index / 3);
        const col = index % 3;

        const pieceKey = (symbol === 'X') ? 'pieceX' : 'pieceO';

        const pieceX = x + col * cell + cell / 2;
        const pieceY = y + row * cell + cell / 2;

        const piece = this.add.image(pieceX, pieceY, pieceKey);

        piece.setDisplaySize(cell * pieceScale, cell * pieceScale);

        this.pieceElements.add(piece);
      }
    });
  }

  updateGameUI() {
    this.updateScoreboard();
    this.updateTurnIndicator();
    this.updateBoardPieces();
    
    if (this.winningLineGraphics) {
      this.winningLineGraphics.destroy();
      this.winningLineGraphics = null;
    }
    
    if (this.gameState?.winningLine) {
      this.drawWinningLine();
    }
  }

  createScoreboard() {
    const style = {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    };
    this.scoreXText = this.add.text(0, 0, '', { ...style, color: '#007bff' }).setOrigin(0.5);
    this.scoreOText = this.add.text(0, 0, '', { ...style, color: '#dc3545' }).setOrigin(0.5);
    this.uiElements.addMultiple([this.scoreXText, this.scoreOText]);
    this.updateScoreboard();
    this.positionUI();
  }

  updateScoreboard() {
    if (!this.gameState || !this.scoreXText) return;
    const { score, players } = this.gameState;
    const playerX = players.find(p => p.symbol === 'X');
    const playerO = players.find(p => p.symbol === 'O');
    this.scoreXText.setText(`${playerX ? playerX.username.split(' ')[0] : 'X'}: ${score.X}`);
    this.scoreOText.setText(`${playerO ? playerO.username.split(' ')[0] : 'O'}: ${score.O}`);
  }

  createTurnIndicator() {
    this.turnIndicatorText = this.add.text(0, 0, '', {
      fontSize: '36px',
      color: '#343a40',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);
    this.uiElements.add(this.turnIndicatorText);
    this.updateTurnIndicator();
    this.positionUI();
  }

  updateTurnIndicator() {
    if (!this.gameState || !this.turnIndicatorText) return;
    
    const { state, players, currentPlayer, winner, isDraw } = this.gameState;
    const isMyTurn = currentPlayer?.socketId === this.socket.id;
    
    let text = '';
    let color = '#343a40';

    if (state === 'WAITING') {
      text = 'Esperando oponente...';
    } else if (state === 'PLAYING' && currentPlayer) {
      const opponent = players.find(p => p.socketId !== this.socket.id);
      text = isMyTurn ? `¡Es tu turno!` : `Turno de ${opponent?.username || '...'}`;
    } else if (state === 'FINISHED') {
      if (isDraw) {
        text = '¡Es un empate!';
        color = '#6c757d';
      } else if (winner) {
        const iAmWinner = winner.socketId === this.socket.id;
        text = iAmWinner ? '¡Has ganado! :)' : `Has Perdido :(`;
        color = iAmWinner ? '#28a745' : '#dc3545';
      }
    }
    
    this.turnIndicatorText.setText(text).setColor(color);
    
    if (this.indicatorTween) this.indicatorTween.stop();
    this.turnIndicatorText.setScale(1);

    if (isMyTurn && state === 'PLAYING') {
      this.indicatorTween = this.tweens.add({
        targets: this.turnIndicatorText,
        scale: 1.1,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  createBoard() {
    this.boardGraphics = this.add.graphics();
    
    for (let i = 0; i < 9; i++) {
      const cell = this.add.rectangle(0, 0, 1, 1, 0x000000, 0)
        .setOrigin(0)
        .setInteractive({ cursor: 'pointer' });
      cell.on('pointerdown', () => this.handleCellClick(i));
      this.interactiveCells.push(cell);
    }
    
    this.positionBoard();
  }

  handleCellClick(index) {
    if (!this.gameState) return;
    
    const isMyTurn = this.gameState.currentPlayer?.socketId === this.socket.id;
    
    if (this.canPlay && isMyTurn && this.serverBoard[index] === null) {
      this.canPlay = false;
      this.socket.emit('makeMove', { index });
    }
  }

  calculateWinningLine(board) {
    const winningCombinations = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ];

    for (const combination of winningCombinations) {
      const [a, b, c] = combination;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return combination;
      }
    }

    return null;
  }

  drawWinningLine() {
    const { winningLine } = this.gameState;
    
    if (!winningLine || !this.boardRect) {
      return;
    }
    
    if (!Array.isArray(winningLine) || winningLine.length < 3) {
      return;
    }
    
    const { x, y, cell } = this.boardRect;
    const startCell = winningLine[0];
    const endCell = winningLine[2];
    
    const startX = x + (startCell % 3) * cell + cell / 2;
    const startY = y + Math.floor(startCell / 3) * cell + cell / 2;
    const endX = x + (endCell % 3) * cell + cell / 2;
    const endY = y + Math.floor(endCell / 3) * cell + cell / 2;
    
    this.winningLineGraphics = this.add.graphics();
    this.winningLineGraphics.lineStyle(12, 0x28a745, 1);
    this.winningLineGraphics.beginPath();
    this.winningLineGraphics.moveTo(startX, startY);
    this.winningLineGraphics.lineTo(endX, endY);
    this.winningLineGraphics.strokePath();
    
    this.winningLineGraphics.setAlpha(0);
    this.tweens.add({
      targets: this.winningLineGraphics,
      alpha: 1,
      duration: 500,
      ease: 'Power2'
    });
  }

  showRestartButton() {
    if (this.restartButton) return;
    
    const { width, height } = this.scale;
    this.restartButton = this.add.text(width / 2, height - 80, 'Jugar de Nuevo', {
      fontSize: '28px',
      color: '#ffffff',
      backgroundColor: '#28a745',
      padding: { x: 25, y: 12 },
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    
    this.restartButton.on('pointerdown', () => {
      this.socket.emit('playAgainRequest');
    });
    
    this.restartButton.on('pointerover', () => this.restartButton.setBackgroundColor('#218838'));
    this.restartButton.on('pointerout', () => this.restartButton.setBackgroundColor('#28a745'));
  }

  positionUI() {
    const { width, height } = this.scale;
    const isLandscape = width > height;
    
    if (this.scoreXText) this.scoreXText.setPosition(width * 0.25, isLandscape ? 40 : 60);
    if (this.scoreOText) this.scoreOText.setPosition(width * 0.75, isLandscape ? 40 : 60);
    if (this.turnIndicatorText) this.turnIndicatorText.setPosition(width / 2, isLandscape ? 100 : 130);
    if (this.restartButton) this.restartButton.setPosition(width / 2, height - 80);
    if (this.statusText) this.statusText.setPosition(width / 2, height / 2);
  }

  positionBoard() {
    if (!this.boardGraphics) return;
    
    const { width, height } = this.scale;
    const isLandscape = width > height;
    
    let boardSize, startX, startY;
    
    if (isLandscape) {
      boardSize = Math.min(width * 0.5, height * 0.7);
      startX = (width - boardSize) / 2;
      startY = 140;
    } else {
      boardSize = Math.min(width * 0.8, height * 0.5);
      startX = (width - boardSize) / 2;
      startY = (height / 2) - (boardSize / 2) + 50;
    }
    
    const cellSize = boardSize / 3;
    
    this.boardRect = { x: startX, y: startY, size: boardSize, cell: cellSize };
    
    this.boardGraphics.clear();
    this.boardGraphics.lineStyle(10, 0xdee2e6, 1);
    
    this.boardGraphics.beginPath();
    this.boardGraphics.moveTo(startX + cellSize, startY + 10);
    this.boardGraphics.lineTo(startX + cellSize, startY + boardSize - 10);
    this.boardGraphics.strokePath();
    
    this.boardGraphics.beginPath();
    this.boardGraphics.moveTo(startX + cellSize * 2, startY + 10);
    this.boardGraphics.lineTo(startX + cellSize * 2, startY + boardSize - 10);
    this.boardGraphics.strokePath();
    
    this.boardGraphics.beginPath();
    this.boardGraphics.moveTo(startX + 10, startY + cellSize);
    this.boardGraphics.lineTo(startX + boardSize - 10, startY + cellSize);
    this.boardGraphics.strokePath();
    
    this.boardGraphics.beginPath();
    this.boardGraphics.moveTo(startX + 10, startY + cellSize * 2);
    this.boardGraphics.lineTo(startX + boardSize - 10, startY + cellSize * 2);
    this.boardGraphics.strokePath();

    this.interactiveCells.forEach((cell, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      cell.setPosition(startX + col * cellSize, startY + row * cellSize);
      cell.setSize(cellSize, cellSize);
    });
  }

  resize(width, height) {
    this.positionUI();
    if (this.gameState && this.boardGraphics) {
      this.positionBoard();
      this.updateBoardPieces();
      
      if (this.gameState.winningLine) {
        if (this.winningLineGraphics) {
          this.winningLineGraphics.destroy();
        }
        this.drawWinningLine();
      }
    }
  }
}

export default GameScene;