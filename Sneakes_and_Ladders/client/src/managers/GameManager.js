// src/managers/GameManager.js
import Player from '../entities/Player';

export default class GameManager {
  constructor(scene, tilePositions, snakesAndLadders, tileSize) {
    this.scene = scene;
    this.tilePositions = tilePositions;
    this.snakesAndLadders = snakesAndLadders;
    this.tileSize = tileSize;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.isProcessing = false;
  }

  addPlayer(id, color, name) {
    const player = new Player(this.scene, id, color, name);
    player.create(this.tilePositions, this.tileSize);
    this.players.push(player);
    return player;
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    return this.getCurrentPlayer();
  }

  moveCurrentPlayer(steps, onComplete) {
    if (this.isProcessing) return;

    this.isProcessing = true;
    const player = this.getCurrentPlayer();
    const targetTile = Math.min(100, player.currentTile + steps);

    if (targetTile === player.currentTile) {
      this.isProcessing = false;
      if (onComplete) onComplete();
      return;
    }

    player.moveTo(
      this.tilePositions,
      targetTile,
      250 * steps,
      () => {
        this.checkSpecialTile(player, onComplete);
      }
    );
  }

  checkSpecialTile(player, onComplete) {
    const targetTile = this.snakesAndLadders[player.currentTile];

    if (targetTile) {
      const isLadder = targetTile > player.currentTile;

      // Animación especial
      player.animateJump();

      setTimeout(() => {
        player.moveTo(
          this.tilePositions,
          targetTile,
          800,
          () => {
            this.checkWin(player, onComplete);
          }
        );
      }, 300);

      return { type: isLadder ? 'ladder' : 'snake', tile: targetTile };
    } else {
      this.checkWin(player, onComplete);
    }

    return null;
  }

  checkWin(player, onComplete) {
    const hasWon = player.currentTile === 100;
    this.isProcessing = false;

    if (onComplete) {
      onComplete(hasWon, player);
    }

    return hasWon;
  }

  reset() {
    this.players.forEach(player => player.destroy());
    this.players = [];
    this.currentPlayerIndex = 0;
    this.isProcessing = false;
  }
}