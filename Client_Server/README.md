# Sistema Distribuido P2P con Hilos en Java 🚀

Este repositorio contiene un proyecto en Java que implementa un sistema distribuido de tipo Peer-to-Peer (P2P). Cada nodo en la red puede actuar simultáneamente como cliente y servidor, permitiendo la comunicación bidireccional entre múltiples pares. El sistema utiliza programación concurrente con hilos para manejar las tareas de envío y recepción de datos de manera eficiente.

---

## 🌟 Características Principales

* **Arquitectura P2P**: Cada nodo es un "peer" que puede iniciar conexiones (como cliente) y aceptar conexiones (como servidor).
* **Programación Concurrente**: Utiliza hilos para separar la lógica de servidor (escucha de conexiones) y cliente (envío de mensajes), garantizando un funcionamiento fluido y no bloqueante.
* **Comunicación TCP/IP**: La comunicación entre nodos se realiza a través del protocolo TCP para asegurar la entrega fiable de los mensajes.
* **Interfaz de Usuario (GUI)**: Incluye una interfaz gráfica de usuario sencilla para cada nodo, que permite la interacción en tiempo real. La GUI es independiente de la lógica del nodo, lo que facilita su mantenimiento y extensión. 
* **Registro de Eventos**: Un sistema de log en la consola registra todas las transacciones de mensajes (envíos y recepciones), proporcionando una visión clara del flujo de datos en la red.
* **Configuración Dinámica**: Los nodos y sus conexiones se configuran fácilmente en el código, permitiendo la creación de topologías de red personalizadas.

---

## 🛠️ Tecnologías Utilizadas

* **Java**: Lenguaje de programación principal.
* **Java Swing**: Para la construcción de la interfaz gráfica de usuario (GUI).
* **`java.net.Socket` y `java.net.ServerSocket`**: Para la comunicación a través de sockets TCP.
* **`java.util.concurrent`**: Para la gestión de hilos y la concurrencia (`ExecutorService`, `BlockingQueue`).

---
