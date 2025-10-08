// src/scenes/GameScene.js
import Phaser from 'phaser';
import { getTilePositions, generateSnakesAndLadders } from '../utils/boardUtils';
import BoardRenderer from '../managers/BoardRenderer';
import GameManager from '../managers/GameManager';
import DiceManager from '../managers/DiceManager';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.config = {
      boardDimension: 10,
    };
  }

  init(data) {
    this.numPlayers = data.numPlayers || 2;
  }

  preload() {
    this.load.image("dice-albedo", "assets/dice/dice-albedo.png");
    this.load.obj("dice-obj", "assets/dice/dice.obj");
  }

  create() {
    this.initializeGame();
    this.setupUI();
    this.setupPlayers();
    this.create3DDice();
    this.updateUI();
  }

  initializeGame() {
    const boardSize = Math.min(this.cameras.main.width, this.cameras.main.height) * 0.98;
    this.config.tileSize = boardSize / this.config.boardDimension;

    const offsetX = (this.cameras.main.width - boardSize) / 2;
    const offsetY = (this.cameras.main.height - boardSize) / 2;

    this.tilePositions = getTilePositions(this.config.boardDimension, this.config.tileSize, offsetX, offsetY);
    this.snakesAndLadders = generateSnakesAndLadders(5, 5);

    const boardRenderer = new BoardRenderer(this, this.config.tileSize, this.config.boardDimension);
    boardRenderer.drawBoard(this.tilePositions);
    boardRenderer.drawSnakesAndLadders(this.snakesAndLadders, this.tilePositions);

    this.gameManager = new GameManager(this, this.tilePositions, this.snakesAndLadders, this.config.tileSize);
  }

  setupUI() {
    this.rollDiceBtn = document.getElementById('roll-dice-btn');
    this.infoTextEl = document.getElementById('game-info-text');
    this.diceResultEl = document.getElementById('dice-result-display');
    this.playersListEl = document.getElementById('players-list-ui');

    this.rollDiceBtn.addEventListener('click', () => {
      this.handleRoll();
    });
  }

  setupPlayers() {
    const playerColors = ['#d90429', '#0077b6', '#fca311', '#5f0f40'];
    this.playersListEl.innerHTML = '';

    for (let i = 0; i < this.numPlayers; i++) {
      const hexColor = playerColors[i];
      const phaserColor = Phaser.Display.Color.HexStringToColor(hexColor).color;
      this.gameManager.addPlayer(i, phaserColor, `Jugador ${i + 1}`);

      const playerEl = document.createElement('div');
      playerEl.className = 'player-info';
      playerEl.id = `player-ui-${i}`;
      playerEl.innerHTML = `
            <div class="player-avatar" style="background-color: ${hexColor};"></div>
            <div class="player-details">
                <div class="player-name">Jugador ${i + 1}</div>
                <div class="player-position" id="player-pos-${i}">Posición: 1</div>
            </div>
        `;
      this.playersListEl.appendChild(playerEl);
    }
  }

  create3DDice() {
    this.diceManager = new DiceManager(this, this.cameras.main.width / 2, this.cameras.main.height / 2);
    this.diceManager.create();
    this.diceManager.mesh.setDepth(20);
    this.diceManager.mesh.setVisible(false);
  }

  handleRoll() {
    if (this.gameManager.isProcessing) return;

    this.rollDiceBtn.classList.add('disabled');
    this.rollDiceBtn.textContent = 'Lanzando...';
    this.diceManager.mesh.setVisible(true);

    this.diceManager.roll((roll) => {
      this.diceResultEl.textContent = roll;
      this.diceResultEl.style.visibility = 'visible';

      this.time.delayedCall(500, () => {
        this.diceManager.mesh.setVisible(false);
        this.gameManager.moveCurrentPlayer(roll, (hasWon, player) => {
          this.updateUI();
          if (hasWon) {
            this.handleWin(player);
          } else {
            this.gameManager.nextTurn();
            this.updateUI();
            this.rollDiceBtn.classList.remove('disabled');
            this.rollDiceBtn.textContent = 'Lanzar Dado';
          }
        });
      });
    });
  }

  updateUI() {
    const currentPlayer = this.gameManager.getCurrentPlayer();

    this.infoTextEl.innerHTML = `Es el turno de <strong style="color: #${currentPlayer.color.toString(16).padStart(6, '0')};">${currentPlayer.name}</strong>`;

    this.gameManager.players.forEach(player => {
      const playerEl = document.getElementById(`player-ui-${player.id}`);
      const playerPosEl = document.getElementById(`player-pos-${player.id}`);

      if (playerPosEl) {
        playerPosEl.textContent = `Posición: ${player.currentTile}`;
      }

      if (playerEl) {
        if (player.id === currentPlayer.id) {
          playerEl.classList.add('active');
        } else {
          playerEl.classList.remove('active');
        }
      }
    });
  }

  handleWin(player) {
    this.infoTextEl.innerHTML = `¡<strong>${player.name}</strong> ha ganado! 🎉`;
    this.rollDiceBtn.textContent = 'Juego Terminado';
    this.rollDiceBtn.classList.add('disabled');

    this.tweens.add({
      targets: player.sprite,
      scale: 1.8,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Bounce.easeOut'
    });
  }
}