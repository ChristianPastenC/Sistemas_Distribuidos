// src/scenes/GameScene.js
import Phaser from 'phaser';
import BoardRenderer from '../managers/BoardRenderer';
import DiceManager from '../managers/DiceManager';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.config = {
      boardDimension: 10,
    };
  }

  init(data) {
    this.wsManager = data.wsManager;
    this.gameState = data.gameState;
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
    this.setupWebSocketCallbacks();
    this.updateUI();

    const firstTilePos = this.tilePositions[1];
    if (firstTilePos) {
      this.cameras.main.centerOn(firstTilePos.x, firstTilePos.y);
    }
  }

  getVerticalTilePositions(dimension, tileSize, offsetX, worldHeight) {
    const positions = {};
    const totalTiles = dimension * dimension;
    for (let i = 1; i <= totalTiles; i++) {
      const row = Math.floor((i - 1) / dimension);
      const col = (i - 1) % dimension;
      const y = worldHeight - (row * tileSize) - (tileSize / 2);
      let x;
      if (row % 2 === 0) {
        x = offsetX + (col * tileSize) + (tileSize / 2);
      } else {
        x = offsetX + ((dimension - 1 - col) * tileSize) + (tileSize / 2);
      }
      positions[i] = { x, y };
    }
    return positions;
  }

  initializeGame() {
    const canvasWidth = this.cameras.main.width;
    const boardWidth = canvasWidth * 0.9;
    this.config.tileSize = boardWidth / this.config.boardDimension;

    const worldHeight = this.config.tileSize * (this.config.boardDimension + 2);
    const worldWidth = this.config.tileSize * this.config.boardDimension;

    const offsetX = (canvasWidth - worldWidth) / 2;

    this.tilePositions = this.getVerticalTilePositions(this.config.boardDimension, this.config.tileSize, offsetX, worldHeight);
    this.cameras.main.setBounds(0, 0, canvasWidth, worldHeight);

    this.snakesAndLadders = this.gameState.snakesAndLadders;

    const boardRenderer = new BoardRenderer(this, this.config.tileSize, this.config.boardDimension);
    boardRenderer.drawBoard(this.tilePositions);
    boardRenderer.drawSnakesAndLadders(this.snakesAndLadders, this.tilePositions);

    this.playerSprites = {};
    this.isProcessing = false;
  }

  setupUI() {
    this.rollDiceBtn = document.getElementById('roll-dice-btn');
    this.infoTextEl = document.getElementById('game-info-text');
    this.diceResultEl = document.getElementById('dice-result-display');
    this.playersListEl = document.getElementById('players-list-ui');

    this.rollDiceBtn.addEventListener('click', () => this.handleRoll());
    document.getElementById('game-ui-wrapper').classList.remove('hidden');
  }

  setupPlayers() {
    this.playersListEl.innerHTML = '';
    this.gameState.players.forEach(player => {
      this.createPlayerSprite(player);
      this.createPlayerUI(player);
    });
  }

  createPlayerSprite(player) {
    const pos = this.tilePositions[player.currentTile];
    const color = Phaser.Display.Color.HexStringToColor(player.color).color;
    const sprite = this.add.circle(pos.x, pos.y, this.config.tileSize * 0.3, color);
    sprite.setStrokeStyle(4, 0xffffff);
    sprite.setDepth(10);

    const offsetX = (player.id % 2) * 15 - 7.5;
    const offsetY = Math.floor(player.id / 2) * 15 - 7.5;
    sprite.x += offsetX;
    sprite.y += offsetY;

    this.playerSprites[player.id] = sprite;
  }

  createPlayerUI(player) {
    const playerEl = document.createElement('div');
    playerEl.className = 'player-info';
    playerEl.id = `player-ui-${player.id}`;
    playerEl.innerHTML = `
      <div class="player-avatar" style="background-color: ${player.color};"></div>
      <div class="player-name">${player.name}${player.id === this.wsManager.playerId ? ' (Tú)' : ''}</div>
      <div class="player-position" id="player-pos-${player.id}">Casilla: ${player.currentTile}</div>
    `;
    this.playersListEl.appendChild(playerEl);
  }

  create3DDice() {
    this.diceManager = new DiceManager(this, this.cameras.main.width / 2, this.cameras.main.height / 2);
    this.diceManager.create();
    this.diceManager.mesh.setDepth(20);
    this.diceManager.mesh.setVisible(false);
    this.diceManager.mesh.setScrollFactor(0);
  }

  setupWebSocketCallbacks() {
    this.wsManager.on('diceRolled', (data) => this.showDiceRoll(data.diceRoll));
    this.wsManager.on('playerMoved', (data) => this.animatePlayerMove(data));
    this.wsManager.on('nextTurn', (data) => {
      this.gameState = data.gameState;
      this.isProcessing = false;
      this.updateUI();
      this.rollDiceBtn.classList.remove('disabled');
      this.rollDiceBtn.textContent = 'Lanzar';
    });
    this.wsManager.on('gameOver', (data) => this.handleWin(data.winner));
    this.wsManager.on('playerLeft', (data) => {
      this.gameState = data.gameState;
      this.updateUI();
    });
    this.wsManager.on('error', (error) => alert(`Error: ${error}`));
  }

  handleRoll() {
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    if (currentPlayer.id !== this.wsManager.playerId || this.isProcessing) return;

    this.isProcessing = true;
    this.rollDiceBtn.classList.add('disabled');
    this.rollDiceBtn.textContent = '...';
    this.wsManager.rollDice();
  }

  showDiceRoll(result) {
    const camera = this.cameras.main;
    this.diceManager.mesh.setPosition(camera.scrollX + camera.width / 2, camera.scrollY + camera.height / 2);
    this.diceManager.mesh.setVisible(true);

    this.diceManager.roll((roll) => {
      this.diceResultEl.textContent = result;
      this.diceResultEl.style.visibility = 'visible';
      this.time.delayedCall(800, () => this.diceManager.mesh.setVisible(false));
    });
  }

  animatePlayerMove(moveData) {
    const player = this.gameState.players.find(p => p.id === moveData.playerId);
    const sprite = this.playerSprites[moveData.playerId];
    if (!player || !sprite) return;

    const stepTile = moveData.hasSpecial ? moveData.stepTile : moveData.toTile;
    const finalTile = moveData.toTile;

    const stepPos = this.tilePositions[stepTile];
    const finalPos = this.tilePositions[finalTile];

    if (!stepPos || !finalPos) {
      console.error("Posición de casilla inválida:", moveData);
      player.currentTile = finalTile;
      this.updatePlayerPosition(player.id, finalTile);
      return;
    }

    const playerOffsetX = (player.id % 2) * 15 - 7.5;
    const playerOffsetY = Math.floor(player.id / 2) * 15 - 7.5;

    this.tweens.add({
      targets: sprite,
      x: stepPos.x + playerOffsetX,
      y: stepPos.y + playerOffsetY,
      duration: 250 * Math.abs(stepTile - moveData.fromTile),
      ease: 'Linear',
      onUpdate: () => {
        this.cameras.main.pan(sprite.x, sprite.y, 75, 'Linear', true);
      },
      onComplete: () => {
        if (moveData.hasSpecial) {
          this.animateJump(sprite);

          this.time.delayedCall(200, () => {
            this.tweens.add({
              targets: sprite,
              x: finalPos.x + playerOffsetX,
              y: finalPos.y + playerOffsetY,
              duration: 800,
              ease: 'Power2',
              onUpdate: () => {
                this.cameras.main.pan(sprite.x, sprite.y, 75, 'Linear', true);
              },
              onComplete: () => {
                player.currentTile = finalTile;
                this.updatePlayerPosition(player.id, finalTile);
              }
            });
          });
        } else {
          player.currentTile = finalTile;
          this.updatePlayerPosition(player.id, finalTile);
        }
      }
    });
  }

  animateJump(sprite) {
    this.tweens.add({
      targets: sprite,
      scale: 1.3,
      duration: 200,
      ease: 'Sine.easeInOut',
      yoyo: true
    });
  }

  updateUI() {
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    const isMyTurn = currentPlayer.id === this.wsManager.playerId;

    this.infoTextEl.innerHTML = isMyTurn
      ? `<strong>Es tu turno</strong>`
      : `Turno de <strong style="color: ${currentPlayer.color};">${currentPlayer.name}</strong>`;

    this.gameState.players.forEach(p => {
      const playerEl = document.getElementById(`player-ui-${p.id}`);
      if (playerEl) {
        playerEl.classList.toggle('active', p.id === currentPlayer.id);
      }
    });

    const activePlayerSprite = this.playerSprites[currentPlayer.id];
    if (activePlayerSprite) {
      this.cameras.main.pan(activePlayerSprite.x, active_player_sprite.y, 1000, 'Sine.easeInOut');
    }
  }

  updatePlayerPosition(playerId, position) {
    const playerPosEl = document.getElementById(`player-pos-${playerId}`);
    if (playerPosEl) {
      playerPosEl.textContent = `Casilla: ${position}`;
    }
  }

  handleWin(winner) {
    const winnerPlayer = this.gameState.players.find(p => p.id === winner.id);
    if (!winnerPlayer) return;

    this.infoTextEl.innerHTML = `<strong style="color: ${winner.color};">${winner.name}</strong> ha ganado! 🎉`;
    const sprite = this.playerSprites[winner.id];
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        scale: 1.8,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Bounce.easeOut'
      });
    }
    this.rollDiceBtn.textContent = 'Fin';
    this.rollDiceBtn.classList.add('disabled');
  }
}