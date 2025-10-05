// gameManager.js
const { Game } = require("./game");

class GameManager {
  constructor() {
    this.games = new Map();
    this.players = new Map();
  }

  joinOrCreateGame(socket, username) {
    const existingRoomId = this.players.get(socket.id);
    if (existingRoomId) {
      const existingGame = this.games.get(existingRoomId);
      if (existingGame) {
        return { game: existingGame, isNew: false };
      } else {
        this.players.delete(socket.id);
      }
    }

    let waitingGame = null;
    for (const game of this.games.values()) {
      if (game.state === "WAITING" && game.players.length === 1) {
        const waitingPlayer = game.players[0];
        if (this.players.has(waitingPlayer.socketId)) {
          waitingGame = game;
          break;
        } else {
          this.games.delete(game.id);
        }
      }
    }

    if (waitingGame) {
      waitingGame.addPlayer({ username, socketId: socket.id });
      socket.join(waitingGame.id);
      this.players.set(socket.id, waitingGame.id);
      return { game: waitingGame, isNew: false };
    } else {
      const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newGame = new Game(roomId);
      this.games.set(roomId, newGame);
      
      newGame.addPlayer({ username, socketId: socket.id });
      socket.join(roomId);
      this.players.set(socket.id, roomId);
      return { game: newGame, isNew: true };
    }
  }
  
  getGameBySocketId(socketId) {
    const roomId = this.players.get(socketId);
    if (!roomId) return null;
    return this.games.get(roomId);
  }

  removePlayer(socketId) {
    const roomId = this.players.get(socketId);
    if (!roomId) return null;

    const game = this.games.get(roomId);
    if (!game) {
      this.players.delete(socketId);
      return null;
    }

    const wasPlaying = game.state === "PLAYING" || game.state === "FINISHED";
    const remainingPlayer = game.players.find(p => p.socketId !== socketId);
    
    game.removePlayer(socketId);
    this.players.delete(socketId);
    
    if (game.players.length === 0) {
      this.games.delete(roomId);
      return null;
    }

    if (wasPlaying && remainingPlayer) {
      this.games.delete(roomId);
      this.players.delete(remainingPlayer.socketId);
      return { remainingPlayer };
    }

    return null;
  }

  getStats() {
    const totalGames = this.games.size;
    let playingGames = 0;
    let waitingGames = 0;
    
    for (const game of this.games.values()) {
      if (game.state === "PLAYING") playingGames++;
      if (game.state === "WAITING") waitingGames++;
    }
    
    return {
      totalGames,
      playingGames,
      waitingGames,
      totalPlayers: this.players.size
    };
  }

  cleanupOrphanedGames() {
    let cleaned = 0;
    for (const [roomId, game] of this.games.entries()) {
      if (game.state === "WAITING" && game.players.length === 1) {
        const player = game.players[0];
        if (!this.players.has(player.socketId)) {
          this.games.delete(roomId);
          cleaned++;
        }
      } else if (game.players.length === 0) {
        this.games.delete(roomId);
        cleaned++;
      }
    }
    return cleaned;
  }
}

module.exports = { GameManager };