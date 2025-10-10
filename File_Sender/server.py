import asyncio
import websockets
import json
from datetime import datetime

CLIENTS = {}
FILE_TRANSFER_SESSIONS = {}

def log_server(message):
    """Log del servidor con timestamp."""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] {message}")


async def process_auth_request(websocket, data):
    """Autentica a un usuario y registra su conexión."""
    username = data.get("username")
    password = data.get(
        "password"
    )

    if username in ["Node1", "Node2"]:
        CLIENTS[username] = websocket
        log_server(
            f"AUTH: {username} autenticado y conectado desde {websocket.remote_address}"
        )
        await websocket.send(
            json.dumps({"type": "AuthResponse", "success": True, "username": username})
        )
    else:
        log_server(f"AUTH: Fallo para {username}")
        await websocket.send(
            json.dumps(
                {"type": "AuthResponse", "success": False, "error": "Usuario inválido"}
            )
        )


async def forward_file_transfer_start(websocket, data, from_user):
    """Reenvía la solicitud de inicio de transferencia al destinatario."""
    to_user = "Node2" if from_user == "Node1" else "Node1"
    if to_user in CLIENTS:
        log_server(
            f"FILE_START: {from_user} -> {to_user} | Archivo: {data['fileName']} ({data['fileSize']} bytes)"
        )
        await CLIENTS[to_user].send(json.dumps(data))
    else:
        log_server(f"FILE_START_ERROR: Destinatario {to_user} no conectado.")


async def forward_file_chunk(websocket, data, from_user):
    """Reenvía un fragmento de archivo al destinatario."""
    to_user = "Node2" if from_user == "Node1" else "Node1"
    if to_user in CLIENTS:
        await CLIENTS[to_user].send(json.dumps(data))
    else:
        log_server(f"FILE_CHUNK_ERROR: Destinatario {to_user} no conectado.")


async def forward_file_transfer_end(websocket, data, from_user):
    """Reenvía la señal de fin de transferencia."""
    to_user = "Node2" if from_user == "Node1" else "Node1"
    if to_user in CLIENTS:
        log_server(f"FILE_END: {from_user} -> {to_user} | Transferencia completada.")
        await CLIENTS[to_user].send(json.dumps(data))
    else:
        log_server(f"FILE_END_ERROR: Destinatario {to_user} no conectado.")


MESSAGE_HANDLERS = {
    "AuthRequest": process_auth_request,
    "FileTransferStart": forward_file_transfer_start,
    "FileChunk": forward_file_chunk,
    "FileTransferEnd": forward_file_transfer_end,
}


async def handler(websocket):
    """Handler principal que gestiona las conexiones y enruta los mensajes."""
    log_server(f"CONNECT: Cliente desde {websocket.remote_address}")
    current_user = None
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type")

                if msg_type == "AuthRequest":
                    await process_auth_request(websocket, data)
                    for user, ws in CLIENTS.items():
                        if ws == websocket:
                            current_user = user
                            break
                    continue

                if not current_user:
                    log_server("ERROR: Mensaje recibido de cliente no autenticado.")
                    continue

                log_server(f"MESSAGE: {msg_type} de {current_user}")

                handler_func = MESSAGE_HANDLERS.get(msg_type)
                if handler_func:
                    await handler_func(websocket, data, current_user)
                else:
                    await websocket.send(
                        json.dumps(
                            {"type": "Error", "message": "Tipo de mensaje desconocido"}
                        )
                    )
            except json.JSONDecodeError:
                await websocket.send(
                    json.dumps(
                        {"type": "Error", "message": "Mensaje no es JSON válido"}
                    )
                )
            except Exception as e:
                log_server(f"HANDLER ERROR: {e}")
                await websocket.send(
                    json.dumps(
                        {"type": "Error", "message": f"Error interno del servidor: {e}"}
                    )
                )

    except websockets.exceptions.ConnectionClosed:
        log_server(f"DISCONNECT: Cliente {websocket.remote_address} se desconectó.")
    finally:
        if current_user and current_user in CLIENTS:
            del CLIENTS[current_user]
            log_server(f"CLEANUP: Sesión eliminada para {current_user}")


async def main():
    """Inicia el servidor WebSocket."""
    host, port = "localhost", 8765
    async with websockets.serve(handler, host, port, ping_interval=20, ping_timeout=10):
        log_server(f"Servidor de transferencia de archivos listo en ws://{host}:{port}")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServidor detenido.")
