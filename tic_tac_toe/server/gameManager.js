// gameManager.js
const { Game } = require("./game");

class GameManager {
  constructor() {
    this.games = new Map();
    this.players = new Map();
  }

  joinOrCreateGame(socket, username) {
    let waitingGame = null;
    for (const game of this.games.values()) {
      if (game.state === "WAITING") {
        waitingGame = game;
        break;
      }
    }

    if (waitingGame) {
      waitingGame.addPlayer({ username, socketId: socket.id });
      socket.join(waitingGame.id);
      this.players.set(socket.id, waitingGame.id);
      return { game: waitingGame, isNew: false };
    } else {
      const roomId = `room-${Date.now()}`;
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
    return this.games.get(roomId);
  }

  removePlayer(socketId) {
    const roomId = this.players.get(socketId);
    if (!roomId) return null;

    const game = this.games.get(roomId);
    if (!game) return null;

    const opponent = game.players.find(p => p.socketId !== socketId);
    
    game.removePlayer(socketId);
    this.players.delete(socketId);
    
    if (game.players.length === 0) {
      this.games.delete(roomId);
      return null;
    }

    return { 
      opponentSocket: opponent ? opponent.socketId : null, 
      roomId 
    };
  }
}

module.exports = { GameManager };