// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

class GameRoom {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.maxPlayers = 5;
    this.minPlayers = 2;
    this.gameStarted = false;
    this.currentPlayerIndex = 0;
    this.snakesAndLadders = this.generateSnakesAndLadders();
    this.isProcessingTurn = false;
  }

  generateSnakesAndLadders() {
    const specials = {};
    const occupiedCells = new Set([1, 100]);

    const isTooClose = (start, end) => {
      const minDistance = 5;
      for (const existingStart in specials) {
        const existingEnd = specials[existingStart];
        if (
          Math.abs(start - existingStart) < minDistance ||
          Math.abs(end - existingEnd) < minDistance ||
          Math.abs(start - existingEnd) < minDistance ||
          Math.abs(end - parseInt(existingStart)) < minDistance
        ) {
          return true;
        }
      }
      return false;
    };

    for (let i = 0; i < 5; i++) {
      let start, end, attempts = 0;
      do {
        start = Math.floor(Math.random() * 88) + 2;
        end = start + 10 + Math.floor(Math.random() * 31);
        end = Math.min(end, 99);
        attempts++;
        if (attempts > 100) break;
      } while (
        occupiedCells.has(start) ||
        occupiedCells.has(end) ||
        isTooClose(start, end)
      );
      if (attempts <= 100) {
        specials[start] = end;
        occupiedCells.add(start);
        occupiedCells.add(end);
      }
    }

    for (let i = 0; i < 5; i++) {
      let start, end, attempts = 0;
      do {
        start = Math.floor(Math.random() * 89) + 11;
        end = Math.max(start - 40, 2) + Math.floor(Math.random() * 31);
        end = Math.min(end, start - 10);
        attempts++;
        if (attempts > 100) break;
      } while (
        occupiedCells.has(start) ||
        occupiedCells.has(end) ||
        isTooClose(start, end)
      );
      if (attempts <= 100) {
        specials[start] = end;
        occupiedCells.add(start);
        occupiedCells.add(end);
      }
    }

    return specials;
  }

  addPlayer(ws, playerName) {
    if (this.players.length >= this.maxPlayers) {
      return { success: false, error: 'Sala llena' };
    }
    if (this.gameStarted) {
      return { success: false, error: 'Juego ya iniciado' };
    }

    const playerColors = ['#d90429', '#0077b6', '#fca311', '#5f0f40', '#2a9d8f'];
    const playerId = this.players.length;

    const player = {
      id: playerId,
      ws: ws,
      name: playerName || `Jugador ${playerId + 1}`,
      color: playerColors[playerId],
      currentTile: 1,
      ready: false
    };

    this.players.push(player);
    return { success: true, player };
  }

  removePlayer(ws) {
    const index = this.players.findIndex(p => p.ws === ws);
    if (index !== -1) {
      const removedPlayer = this.players[index];
      this.players.splice(index, 1);

      this.players.forEach((p, i) => {
        p.id = i;
      });

      if (index < this.currentPlayerIndex) {
        this.currentPlayerIndex = Math.max(0, this.currentPlayerIndex - 1);
      } else if (index === this.currentPlayerIndex && this.players.length > 0) {
        this.currentPlayerIndex = this.currentPlayerIndex % this.players.length;
      }

      if (this.players.length < this.minPlayers) {
        this.gameStarted = false;
        this.currentPlayerIndex = 0;
        this.isProcessingTurn = false;
      }

      return true;
    }
    return false;
  }

  canStart() {
    return this.players.length >= this.minPlayers &&
      this.players.length <= this.maxPlayers &&
      this.players.every(p => p.ready);
  }

  startGame() {
    if (!this.canStart()) return false;
    this.gameStarted = true;
    this.currentPlayerIndex = 0;
    this.isProcessingTurn = false;
    return true;
  }

  getCurrentPlayer() {
    if (this.players.length === 0) return null;
    return this.players[this.currentPlayerIndex];
  }

  nextTurn() {
    if (this.players.length === 0) return null;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.isProcessingTurn = false;
    return this.getCurrentPlayer();
  }

  movePlayer(playerId, diceRoll) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;

    const fromTile = player.currentTile;
    const newTile = Math.min(100, player.currentTile + diceRoll);

    let stepTile = newTile;
    let finalTile = newTile;
    let hasSpecial = false;

    if (this.snakesAndLadders[newTile]) {
      hasSpecial = true;
      finalTile = this.snakesAndLadders[newTile];
    }

    player.currentTile = finalTile;

    const hasWon = finalTile === 100;

    return {
      playerId,
      fromTile,
      stepTile,
      toTile: finalTile,
      hasSpecial,
      hasWon
    };
  }

  broadcast(message, excludeWs = null) {
    this.players.forEach(player => {
      if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    });
  }

  broadcastAll(message) {
    this.broadcast(message, null);
  }

  getGameState() {
    return {
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        currentTile: p.currentTile,
        ready: p.ready
      })),
      currentPlayerIndex: this.currentPlayerIndex,
      gameStarted: this.gameStarted,
      snakesAndLadders: this.snakesAndLadders
    };
  }
}

const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new GameRoom(roomId));
  }
  return rooms.get(roomId);
}

app.use(express.static('public'));

wss.on('connection', (ws) => {
  console.log('Nuevo cliente conectado');
  let currentRoom = null;
  let currentPlayer = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Mensaje recibido:', message);

      switch (message.type) {
        case 'JOIN_ROOM':
          const roomId = message.roomId || 'default';
          const playerName = message.playerName || null;
          currentRoom = getOrCreateRoom(roomId);

          const result = currentRoom.addPlayer(ws, playerName);

          if (result.success) {
            currentPlayer = result.player;

            ws.send(JSON.stringify({
              type: 'JOIN_SUCCESS',
              playerId: currentPlayer.id,
              gameState: currentRoom.getGameState()
            }));

            currentRoom.broadcastAll({
              type: 'PLAYER_JOINED',
              player: {
                id: currentPlayer.id,
                name: currentPlayer.name,
                color: currentPlayer.color
              },
              gameState: currentRoom.getGameState()
            });
          } else {
            ws.send(JSON.stringify({
              type: 'JOIN_ERROR',
              error: result.error
            }));
          }
          break;

        case 'PLAYER_READY':
          if (currentRoom && currentPlayer) {
            currentPlayer.ready = true;

            currentRoom.broadcastAll({
              type: 'PLAYER_READY',
              playerId: currentPlayer.id,
              gameState: currentRoom.getGameState()
            });

            if (currentRoom.canStart()) {
              currentRoom.startGame();
              currentRoom.broadcastAll({
                type: 'GAME_START',
                gameState: currentRoom.getGameState()
              });
            }
          }
          break;

        case 'ROLL_DICE':
          if (currentRoom && currentPlayer && currentRoom.gameStarted) {
            if (currentRoom.isProcessingTurn) {
              ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'Ya se está procesando un turno'
              }));
              return;
            }

            const currentTurnPlayer = currentRoom.getCurrentPlayer();

            if (!currentTurnPlayer || currentTurnPlayer.id !== currentPlayer.id) {
              ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'No es tu turno'
              }));
              return;
            }

            currentRoom.isProcessingTurn = true;

            const diceRoll = Math.floor(Math.random() * 6) + 1;

            currentRoom.broadcastAll({
              type: 'DICE_ROLLED',
              playerId: currentPlayer.id,
              diceRoll: diceRoll
            });

            setTimeout(() => {
              const moveResult = currentRoom.movePlayer(currentPlayer.id, diceRoll);

              if (!moveResult) {
                currentRoom.isProcessingTurn = false;
                return;
              }

              currentRoom.broadcastAll({
                type: 'PLAYER_MOVED',
                ...moveResult,
                gameState: currentRoom.getGameState()
              });

              if (moveResult.hasWon) {
                setTimeout(() => {
                  currentRoom.broadcastAll({
                    type: 'GAME_OVER',
                    winner: {
                      id: currentPlayer.id,
                      name: currentPlayer.name,
                      color: currentPlayer.color
                    }
                  });
                }, 2000);
              } else {
                setTimeout(() => {
                  currentRoom.nextTurn();
                  currentRoom.broadcastAll({
                    type: 'NEXT_TURN',
                    gameState: currentRoom.getGameState()
                  });
                }, 2500);
              }
            }, 100);
          }
          break;

        case 'LEAVE_ROOM':
          if (currentRoom && currentPlayer) {
            currentRoom.removePlayer(ws);
            currentRoom.broadcastAll({
              type: 'PLAYER_LEFT',
              playerId: currentPlayer.id,
              gameState: currentRoom.getGameState()
            });

            if (currentRoom.players.length === 0) {
              rooms.delete(currentRoom.id);
            }

            currentRoom = null;
            currentPlayer = null;
          }
          break;

        default:
          console.log('Tipo de mensaje desconocido:', message.type);
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        error: 'Error procesando mensaje'
      }));
    }
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
    if (currentRoom && currentPlayer) {
      currentRoom.removePlayer(ws);
      currentRoom.broadcastAll({
        type: 'PLAYER_LEFT',
        playerId: currentPlayer.id,
        gameState: currentRoom.getGameState()
      });

      if (currentRoom.players.length === 0) {
        rooms.delete(currentRoom.id);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('Error en WebSocket:', error);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});