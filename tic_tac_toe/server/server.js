// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { GameManager } = require("./gameManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const gameManager = new GameManager();

io.on("connection", (socket) => {
  console.log(`[${new Date().toLocaleTimeString()}] Cliente conectado: ${socket.id}`);

  socket.on("joinGame", (username) => {
    try {
      const existingGame = gameManager.getGameBySocketId(socket.id);
      if (existingGame) {
        console.log(`Socket ${socket.id} ya está en juego ${existingGame.id}`);
        
        if (existingGame.state === "PLAYING") {
          socket.emit("gameStarted", existingGame.getGameState());
        } else if (existingGame.state === "WAITING") {
          socket.emit("waitingForOpponent");
        }
        return;
      }

      const { game, isNew } = gameManager.joinOrCreateGame(socket, username);
      const roomId = game.id;

      console.log(`[${new Date().toLocaleTimeString()}] ${username} (${socket.id}) ${isNew ? 'creó' : 'se unió a'} partida ${roomId}`);

      if (isNew) {
        socket.emit("waitingForOpponent");
      }

      io.to(roomId).emit("updatePlayers", game.getGameState().players);

      if (game.state === "PLAYING") {
        console.log(`[${new Date().toLocaleTimeString()}] Partida ${roomId} iniciada con jugadores:`, game.players.map(p => p.username));
        io.to(roomId).emit("gameStarted", game.getGameState());
      }
    } catch (error) {
      console.error(`Error en joinGame para ${socket.id}:`, error.message);
      socket.emit("gameError", { message: error.message });
    }
  });

  socket.on("makeMove", ({ index }) => {
    try {
      const game = gameManager.getGameBySocketId(socket.id);
      if (!game) {
        throw new Error("No estás en ninguna partida.");
      }

      console.log(`[${new Date().toLocaleTimeString()}] Movimiento en ${game.id}: posición ${index}`);

      game.makeMove(socket.id, index);
      const gameState = game.getGameState();

      io.to(game.id).emit("gameStateUpdate", gameState);

      if (game.state === "FINISHED") {
        console.log(`[${new Date().toLocaleTimeString()}] Partida ${game.id} terminada. Ganador:`, game.winner?.username || 'Empate');
        io.to(game.id).emit("gameOver", gameState);
      }
    } catch (error) {
      console.error(`Error en makeMove para ${socket.id}:`, error.message);
      socket.emit("gameError", { message: error.message });
    }
  });

  socket.on("playAgainRequest", () => {
    try {
      const game = gameManager.getGameBySocketId(socket.id);
      if (game && game.state === "FINISHED") {
        game.readyForNextRound.add(socket.id);
        console.log(`[${new Date().toLocaleTimeString()}] Jugador ${socket.id} listo para siguiente ronda (${game.readyForNextRound.size}/2)`);
        
        if (game.readyForNextRound.size === 2) {
          game.resetForNewRound();
          console.log(`[${new Date().toLocaleTimeString()}] Nueva ronda iniciada en partida ${game.id}`);
          io.to(game.id).emit("gameStarted", game.getGameState());
        } else {
          io.to(game.id).emit("playerReady", game.getGameState());
        }
      }
    } catch (error) {
      console.error(`Error en playAgainRequest para ${socket.id}:`, error.message);
      socket.emit("gameError", { message: error.message });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[${new Date().toLocaleTimeString()}] Cliente desconectado: ${socket.id}, razón: ${reason}`);
    
    const rematchInfo = gameManager.removePlayer(socket.id);

    if (rematchInfo && rematchInfo.remainingPlayer) {
      const { remainingPlayer } = rematchInfo;
      const remainingPlayerSocket = io.sockets.sockets.get(remainingPlayer.socketId);
      
      if (remainingPlayerSocket) {
        console.log(`[${new Date().toLocaleTimeString()}] Re-emparejando a: ${remainingPlayer.username} (${remainingPlayer.socketId})`);
        
        remainingPlayerSocket.emit("findingNewOpponent");

        setTimeout(() => {
          try {
            const { game } = gameManager.joinOrCreateGame(remainingPlayerSocket, remainingPlayer.username);
            console.log(`[${new Date().toLocaleTimeString()}] ${remainingPlayer.username} re-emparejado en ${game.id}`);
            
            if (game.state === "PLAYING") {
              io.to(game.id).emit("gameStarted", game.getGameState());
            } else {
              remainingPlayerSocket.emit("waitingForOpponent");
            }
          } catch (error) {
            console.error(`Error al re-emparejar a ${remainingPlayer.socketId}:`, error.message);
            remainingPlayerSocket.emit("gameError", { message: error.message });
          }
        }, 100);
      }
    }
  });

  socket.on("error", (error) => {
    console.error(`[${new Date().toLocaleTimeString()}] Error en socket ${socket.id}:`, error);
  });
});

setInterval(() => {
  const stats = gameManager.getStats();
  console.log(`[${new Date().toLocaleTimeString()}] Estado: ${stats.totalGames} partidas, ${stats.playingGames} jugando, ${stats.waitingGames} esperando, ${stats.totalPlayers} jugadores`);
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[${new Date().toLocaleTimeString()}] Servidor escuchando en http://localhost:${PORT}`);
});