import asyncio
import websockets
import json
from datetime import datetime

CLIENTS = {}


def log_server(message):
    """Log del servidor con timestamp."""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] {message}")


async def send_to_user(username, message):
    """Envía un mensaje a un usuario específico."""
    if username in CLIENTS:
        try:
            await CLIENTS[username].send(message)
            return True
        except Exception as e:
            log_server(f"ERROR: No se pudo enviar mensaje a '{username}': {e}")
            return False
    return False


async def broadcast(message, sender_websocket):
    """Envía un mensaje a todos los clientes excepto al remitente."""
    if CLIENTS:
        tasks = []
        for client in CLIENTS.values():
            if client != sender_websocket:
                tasks.append(client.send(message))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


async def handler(websocket):
    """Handler principal que gestiona las conexiones y enruta los mensajes de señalización."""
    log_server(f"CONNECT: Cliente desde {websocket.remote_address}")
    current_user = None

    try:
        async for message in websocket:
            data = json.loads(message)
            msg_type = data.get("type")

            if msg_type == "join" and not current_user:
                current_user = data["username"]
                CLIENTS[current_user] = websocket
                log_server(
                    f"JOIN: '{current_user}' se ha unido. Total usuarios: {len(CLIENTS)}"
                )

                existing_users = [
                    user for user in CLIENTS.keys() if user != current_user
                ]
                if existing_users:
                    await websocket.send(
                        json.dumps({"type": "existing-users", "users": existing_users})
                    )
                    log_server(
                        f"INFO: Enviando lista de {len(existing_users)} usuarios existentes a '{current_user}'"
                    )

                await broadcast(
                    json.dumps({"type": "user-joined", "username": current_user}),
                    websocket,
                )
                continue

            if not current_user:
                log_server("ERROR: Mensaje recibido de cliente no unido.")
                continue

            if msg_type in ["offer", "answer", "candidate"]:
                to_user = data.get("to")
                from_user = data.get("from")

                if not to_user:
                    log_server(
                        f"ERROR: Mensaje '{msg_type}' sin destinatario de '{current_user}'"
                    )
                    continue

                success = await send_to_user(to_user, message)
                if not success:
                    log_server(
                        f"WARNING: Usuario '{to_user}' no encontrado o desconectado"
                    )
                    await websocket.send(
                        json.dumps({"type": "user-left", "username": to_user})
                    )
            else:
                log_server(
                    f"WARNING: Tipo de mensaje desconocido '{msg_type}' de '{current_user}'"
                )

    except websockets.exceptions.ConnectionClosed:
        log_server(f"DISCONNECT: Cliente {websocket.remote_address} se desconectó.")
    except Exception as e:
        log_server(f"ERROR: Excepción en handler: {e}")
    finally:
        if current_user and current_user in CLIENTS:
            del CLIENTS[current_user]
            log_server(
                f"LEAVE: '{current_user}' ha salido. Total usuarios: {len(CLIENTS)}"
            )
            await broadcast(
                json.dumps({"type": "user-left", "username": current_user}), websocket
            )


async def main():
    """Inicia el servidor WebSocket."""
    host, port = "localhost", 8765
    async with websockets.serve(handler, host, port, ping_interval=20, ping_timeout=10):
        log_server(f"Servidor de señalización WebRTC listo en ws://{host}:{port}")
        log_server("Esperando conexiones...")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServidor detenido.")
