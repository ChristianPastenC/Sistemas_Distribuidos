// src/managers/WebSocketManager.js
export default class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.connected = false;
    this.playerId = null;
    this.callbacks = {
      onJoinSuccess: null,
      onJoinError: null,
      onPlayerJoined: null,
      onPlayerReady: null,
      onGameStart: null,
      onDiceRolled: null,
      onPlayerMoved: null,
      onNextTurn: null,
      onGameOver: null,
      onPlayerLeft: null,
      onError: null
    };
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('Conectado al servidor');
          this.connected = true;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('Error en WebSocket:', error);
          this.connected = false;
          if (this.callbacks.onError) {
            this.callbacks.onError(error);
          }
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Desconectado del servidor');
          this.connected = false;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      console.log('Mensaje recibido del servidor:', message);

      switch (message.type) {
        case 'JOIN_SUCCESS':
          this.playerId = message.playerId;
          if (this.callbacks.onJoinSuccess) {
            this.callbacks.onJoinSuccess(message);
          }
          break;

        case 'JOIN_ERROR':
          if (this.callbacks.onJoinError) {
            this.callbacks.onJoinError(message.error);
          }
          break;

        case 'PLAYER_JOINED':
          if (this.callbacks.onPlayerJoined) {
            this.callbacks.onPlayerJoined(message);
          }
          break;

        case 'PLAYER_READY':
          if (this.callbacks.onPlayerReady) {
            this.callbacks.onPlayerReady(message);
          }
          break;

        case 'GAME_START':
          if (this.callbacks.onGameStart) {
            this.callbacks.onGameStart(message);
          }
          break;

        case 'DICE_ROLLED':
          if (this.callbacks.onDiceRolled) {
            this.callbacks.onDiceRolled(message);
          }
          break;

        case 'PLAYER_MOVED':
          if (this.callbacks.onPlayerMoved) {
            this.callbacks.onPlayerMoved(message);
          }
          break;

        case 'NEXT_TURN':
          if (this.callbacks.onNextTurn) {
            this.callbacks.onNextTurn(message);
          }
          break;

        case 'GAME_OVER':
          if (this.callbacks.onGameOver) {
            this.callbacks.onGameOver(message);
          }
          break;

        case 'PLAYER_LEFT':
          if (this.callbacks.onPlayerLeft) {
            this.callbacks.onPlayerLeft(message);
          }
          break;

        case 'ERROR':
          if (this.callbacks.onError) {
            this.callbacks.onError(message.error);
          }
          break;

        default:
          console.log('Mensaje desconocido:', message);
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
    }
  }

  send(message) {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('No conectado al servidor');
    }
  }

  joinRoom(roomId, playerName) {
    this.send({
      type: 'JOIN_ROOM',
      roomId: roomId,
      playerName: playerName
    });
  }

  setReady() {
    this.send({
      type: 'PLAYER_READY'
    });
  }

  rollDice() {
    this.send({
      type: 'ROLL_DICE'
    });
  }

  leaveRoom() {
    this.send({
      type: 'LEAVE_ROOM'
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  // Métodos para registrar callbacks
  on(event, callback) {
    const callbackName = `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;
    if (this.callbacks.hasOwnProperty(callbackName)) {
      this.callbacks[callbackName] = callback;
    }
  }
}