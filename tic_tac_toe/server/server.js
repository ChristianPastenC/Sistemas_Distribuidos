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
});

const gameManager = new GameManager();

io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on("joinGame", (username) => {
    try {
      const { game, isNew } = gameManager.joinOrCreateGame(socket, username);
      const roomId = game.id;

      if (isNew) {
        socket.emit("waitingForOpponent");
      }

      io.to(roomId).emit("updatePlayers", game.getGameState().players);

      if (game.state === "PLAYING") {
        io.to(roomId).emit("gameStarted", game.getGameState());
      }
    } catch (error) {
      socket.emit("gameError", { message: error.message });
    }
  });

  socket.on("makeMove", ({ index }) => {
    try {
      const game = gameManager.getGameBySocketId(socket.id);
      if (!game) throw new Error("No estás en ninguna partida.");

      game.makeMove(socket.id, index);
      const gameState = game.getGameState();

      io.to(game.id).emit("gameStateUpdate", gameState);

      if (game.state === "FINISHED") {
        io.to(game.id).emit("gameOver", gameState);
      }
    } catch (error) {
      socket.emit("gameError", { message: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    const disconnectedPlayerInfo = gameManager.removePlayer(socket.id);

    if (disconnectedPlayerInfo) {
      const { opponentSocket, roomId } = disconnectedPlayerInfo;
      if (opponentSocket) {
        io.to(opponentSocket).emit("opponentDisconnected");
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});