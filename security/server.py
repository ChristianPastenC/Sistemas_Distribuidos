import asyncio
import websockets
import json
import uuid
import base64
import requests
import os
from datetime import datetime
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

DB_FILE = "database.txt"
API_SECRET_KEY_HEX = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
API_SECRET_KEY = bytes.fromhex(API_SECRET_KEY_HEX)
REST_API_URL = "https://jsonplaceholder.typicode.com/posts/1"


def log_server(message):
    """Log del servidor con timestamp."""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] {message}")


def load_database():
    """Carga o crea la base de datos desde un archivo."""
    if not os.path.exists(DB_FILE):
        initial_data = {
            "users": {
                "Node1": {"password": "secure_pass_node1", "public_key_pem": ""},
                "Node2": {"password": "secure_pass_node2", "public_key_pem": ""},
            },
            "api_secret_key": API_SECRET_KEY_HEX,
        }
        save_database(initial_data)
        return initial_data
    with open(DB_FILE, "r") as f:
        return json.load(f)


def save_database(data):
    """Guarda la base de datos en el archivo."""
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)
    log_server(f"[DB] Base de datos guardada en {DB_FILE}")


DB = load_database()
USERS_DB = DB["users"]
AUTH_SESSIONS = {}


def encrypt_with_api_key(plaintext):
    """Cifra datos con la clave API usando AES-256-GCM."""
    iv = os.urandom(12)
    cipher = Cipher(
        algorithms.AES(API_SECRET_KEY), modes.GCM(iv), backend=default_backend()
    )
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(plaintext.encode("utf-8")) + encryptor.finalize()
    return base64.b64encode(iv + encryptor.tag + ciphertext).decode("utf-8")


def decrypt_with_api_key(encrypted_b64):
    """Descifra datos cifrados con la clave API."""
    encrypted_data = base64.b64decode(encrypted_b64)
    iv, tag, ciphertext = (
        encrypted_data[:12],
        encrypted_data[12:28],
        encrypted_data[28:],
    )
    cipher = Cipher(
        algorithms.AES(API_SECRET_KEY), modes.GCM(iv, tag), backend=default_backend()
    )
    decryptor = cipher.decryptor()
    return (decryptor.update(ciphertext) + decryptor.finalize()).decode("utf-8")


async def process_auth_request(websocket, data):
    """Autentica a un usuario y le asigna una sesión."""
    username, password = data.get("username"), data.get("password")
    if USERS_DB.get(username, {}).get("password") == password:
        token = str(uuid.uuid4())
        AUTH_SESSIONS[websocket] = {"username": username, "token": token}
        log_server(f"AUTH: {username} autenticado | Token: {token[:8]}...")
        await websocket.send(
            json.dumps({"type": "AuthResponse", "success": True, "token": token})
        )
    else:
        log_server(f"AUTH: Fallo para {username}")
        await websocket.send(
            json.dumps(
                {
                    "type": "AuthResponse",
                    "success": False,
                    "error": "Credenciales inválidas",
                }
            )
        )


async def process_request_encrypted_value(websocket, data, username):
    """Obtiene datos de una API externa, los cifra y los envía al cliente."""
    log_server(f"REQUEST: {username} solicita valor cifrado desde {REST_API_URL}")
    try:
        response = requests.get(REST_API_URL, timeout=5)
        response.raise_for_status()
        api_data = response.json()
        raw_value = (
            f"API_DATA: {api_data.get('title', 'N/A')} | ID: {api_data.get('id')}"
        )
        encrypted_value = encrypt_with_api_key(raw_value)
        log_server(f"ENCRYPT: Valor cifrado con API Key enviado a {username}")
        await websocket.send(
            json.dumps(
                {"type": "EncryptedValueResponse", "encryptedValue": encrypted_value}
            )
        )
    except requests.RequestException as e:
        log_server(f"REST API ERROR: {e}")
        await websocket.send(
            json.dumps(
                {"type": "Error", "message": "Error al consultar la API externa."}
            )
        )


async def process_decryption_request(websocket, data, username):
    """Descifra un valor, lo re-cifra con la clave pública del cliente y lo envía."""
    public_key_pem = data.get("publicKey")
    encrypted_value = data.get("encryptedValue")

    if not all([public_key_pem, encrypted_value]):
        return await websocket.send(
            json.dumps({"type": "Error", "message": "Faltan parámetros."})
        )

    try:
        decrypted_value = decrypt_with_api_key(encrypted_value)
        log_server(f"DECRYPT: Valor descifrado para {username}")

        public_key = serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
        re_encrypted = public_key.encrypt(
            decrypted_value.encode("utf-8"),
            padding.OAEP(
                mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None
            ),
        )
        re_encrypted_b64 = base64.b64encode(re_encrypted).decode("utf-8")
        log_server(f"RE-ENCRYPT: Valor re-cifrado con la clave pública de {username}")
        await websocket.send(
            json.dumps(
                {"type": "DecryptionResponse", "encryptedPlainValue": re_encrypted_b64}
            )
        )
    except Exception as e:
        log_server(f"DECRYPT/RE-ENCRYPT ERROR: {e}")
        await websocket.send(
            json.dumps(
                {
                    "type": "Error",
                    "message": "No se pudo procesar la solicitud de descifrado.",
                }
            )
        )


async def process_public_key_registration(websocket, data, username):
    """Registra la clave pública de un usuario en la 'base de datos'."""
    public_key_pem = data.get("publicKey")
    if public_key_pem:
        USERS_DB[username]["public_key_pem"] = public_key_pem
        save_database(DB)
        log_server(f"KEY REGISTER: Clave pública de {username} registrada.")
        await websocket.send(
            json.dumps(
                {"type": "Status", "message": "Clave pública registrada correctamente"}
            )
        )
    else:
        await websocket.send(
            json.dumps({"type": "Error", "message": "No se proporcionó clave pública"})
        )


MESSAGE_HANDLERS = {
    "AuthRequest": process_auth_request,
    "RequestEncryptedValue": process_request_encrypted_value,
    "DecryptionRequest": process_decryption_request,
    "PublicKeyRegistration": process_public_key_registration,
}


async def handler(websocket):
    """Handler principal que gestiona las conexiones y enruta los mensajes."""
    log_server(f"🔌 CONNECT: Cliente desde {websocket.remote_address}")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type")
                log_server(f"MESSAGE: {msg_type} de {websocket.remote_address}")

                handler_func = MESSAGE_HANDLERS.get(msg_type)

                if msg_type == "AuthRequest":
                    await handler_func(websocket, data)
                    continue

                session = AUTH_SESSIONS.get(websocket)
                if not session or session.get("token") != data.get("token"):
                    await websocket.send(
                        json.dumps(
                            {
                                "type": "Error",
                                "message": "Token inválido o sesión no encontrada",
                            }
                        )
                    )
                    continue

                if handler_func:
                    await handler_func(websocket, data, session["username"])
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
        if websocket in AUTH_SESSIONS:
            username = AUTH_SESSIONS[websocket]["username"]
            del AUTH_SESSIONS[websocket]
            log_server(f"CLEANUP: Sesión eliminada para {username}")


async def main():
    """Inicia el servidor WebSocket."""
    host, port = "localhost", 8765
    async with websockets.serve(handler, host, port, ping_interval=20, ping_timeout=10):
        log_server(f"Servidor listo en ws://{host}:{port}")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServidor detenido.")
