# Tic-Tac-Toe Multijugador (Simulación P2P)

Este repositorio contiene el código fuente de un juego Tic-Tac-Toe (Gato) multijugador en tiempo real, implementado bajo una arquitectura cliente-servidor para simular la comunicación entre pares (P2P) mediada por un broker central.

El proyecto fue desarrollado como parte de la práctica **U5 A1: Métodos de llamadas remotas** de la materia Sistemas Distribuidos.

## Stack Tecnológico

| Componente | Tecnología | Propósito Principal |
| :--- | :--- | :--- |
| **Backend (Servidor)** | **Node.js, Express** | Entorno de ejecución y servidor HTTP. |
| **Comunicación** | **Socket.IO** | Comunicación bidireccional (WebSockets) y gestión de salas (*rooms*). |
| **Frontend (Cliente)** | **Phaser JS (v3)** | Framework para el desarrollo del juego 2D y la interfaz gráfica. |
| **Herramienta** | **Vite** | Builder y entorno de desarrollo rápido para el cliente. |

## Arquitectura y Conceptos Clave

La aplicación utiliza una arquitectura **cliente-servidor centralizada**, pero la lógica de juego se basa en el patrón de **Publicación/Suscripción (Pub/Sub)**, mediado por el servidor:

1.  **Emparejamiento:** El servidor utiliza el módulo `GameManager` para emparejar a los jugadores de forma automática en salas de dos.
2.  **Simulación P2P:** Cuando un jugador realiza un movimiento, envía el evento `makeMove` al servidor. El servidor procesa la jugada, actualiza el estado (`Game.js`) y luego utiliza Socket.IO para hacer un **broadcast** del nuevo estado (`gameStateUpdate`) únicamente a los dos clientes dentro de esa sala.
3.  **Tolerancia a Fallos:** El servidor implementa una lógica para re-emparejar automáticamente a un jugador si su oponente se desconecta inesperadamente (evento `disconnect` en `server.js`).

## Estructura del Repositorio

| Directorio / Archivo | Descripción |
| :--- | :--- |
| `server/` | Contiene toda la lógica del backend (Node.js). |
| `server/server.js` | Archivo principal del servidor y configuración de Socket.IO. |
| `server/gameManager.js` | Lógica de emparejamiento, creación y disolución de partidas. |
| `server/game.js` | Clase que define el estado, tablero, turno y reglas de una partida. |
| `client/` | Contiene el código del cliente (Vite + Phaser JS). |
| `client/src/scenes/` | Escenas del juego (`LoginScene.js`, `GameScene.js`). |

## Enlaces de la Aplicación Desplegada

La aplicación ha sido desplegada para su acceso público.

| Componente | Enlace de Acceso | Plataforma de Despliegue | Observaciones |
| :--- | :--- | :--- | :--- |
| **Cliente (Juego)** | **[https://tictactoep2p.netlify.app/](https://tictactoep2p.netlify.app/)** | Netlify | Interfaz de juego. Requiere que dos instancias se conecten para iniciar la partida. |
| **Servidor (Backend)** | **[https://tictactoeserver-fxot.onrender.com/](https://tictactoeserver-fxot.onrender.com/)** | Render | Servidor de WebSockets. |

***NOTA IMPORTANTE sobre el Servidor:***
El servidor está alojado en un plan gratuito de Render, el cual aplica una política de **apagado por inactividad**. Si el servidor no ha recibido tráfico en los últimos 15 minutos, tardará aproximadamente **30-60 segundos en reactivarse** al recibir la primera solicitud de conexión del cliente. Por favor, sea paciente si la conexión inicial tarda.

## Guía Rápida de Instalación y Ejecución

Para ejecutar el proyecto localmente, siga estos pasos:

### 1. Clonar el Repositorio

```bash
git clone [https://github.com/ChristianPastenC/Sistemas_Distribuidos/tree/main/tic_tac_toe](https://github.com/ChristianPastenC/Sistemas_Distribuidos/tree/main/tic_tac_toe)
cd tic_tac_toe
```

### 2. Configurar el Servidor

```bash
cd server
npm install
node server.js
```
El servidor se iniciará en http://localhost:3000


### 3. Configurar y Ejecutar el Cliente

```bash
cd client
npm install
npm run dev
```
El servidor se iniciará en http://localhost:5173

Para probar la funcionalidad multijugador, abra dos pestañas del navegador en la dirección del cliente, ingrese un nombre de usuario diferente en cada una y haga clic en "Unirse al juego".

