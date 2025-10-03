// game.js
class Game {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.board = Array(9).fill(null);
    this.currentPlayerIndex = 0;
    this.state = "WAITING";
    this.winner = null;
    this.isDraw = false;
    this.score = { X: 0, O: 0 };
    this.readyForNextRound = new Set();
  }

  addPlayer(playerInfo) {
    if (this.players.length >= 2) {
      throw new Error("La sala ya está llena.");
    }
    const symbol = this.players.length === 0 ? "X" : "O";
    this.players.push({ ...playerInfo, symbol });
    if (this.players.length === 2) {
      this.state = "PLAYING";
    }
  }

  removePlayer(socketId) {
    this.players = this.players.filter(p => p.socketId !== socketId);
    if (this.state === "PLAYING" || this.state === "FINISHED") {
      this.state = "ABORTED";
    }
  }

  makeMove(socketId, index) {
    if (this.state !== "PLAYING") throw new Error("La partida no está en curso.");
    const player = this.players[this.currentPlayerIndex];
    if (player.socketId !== socketId) throw new Error("No es tu turno.");
    if (this.board[index] !== null) throw new Error("La casilla ya está ocupada.");

    this.board[index] = player.symbol;

    if (this._checkWinner()) {
      this.winner = player;
      this.state = "FINISHED";
      this.score[player.symbol]++;
    } else if (this.board.every(cell => cell !== null)) {
      this.isDraw = true;
      this.state = "FINISHED";
    } else {
      this.currentPlayerIndex = 1 - this.currentPlayerIndex;
    }
  }

  resetForNewRound() {
    this.board.fill(null);
    this.winner = null;
    this.isDraw = false;
    this.state = "PLAYING";
    this.currentPlayerIndex = 0;
    this.readyForNextRound.clear();
  }

  _checkWinner() {
    const combos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    const symbol = this.players[this.currentPlayerIndex].symbol;
    return combos.some(combo => combo.every(index => this.board[index] === symbol));
  }

  getGameState() {
    return {
      id: this.id,
      board: this.board,
      players: this.players,
      currentPlayer: this.players.length > 0 ? this.players[this.currentPlayerIndex] : null,
      state: this.state,
      winner: this.winner,
      isDraw: this.isDraw,
      score: this.score,
      readyForNextRound: Array.from(this.readyForNextRound)
    };
  }
}

module.exports = { Game };