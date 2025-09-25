package Client_Server;

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

public class DistributedNode {
  private String nodeId;
  private String ip;
  private int port;
  private List<NodeInfo> otherNodes;
  private ServerSocket serverSocket;
  private volatile boolean running = true;
  private ExecutorService executor;

  private BlockingQueue<String[]> messageQueue = new LinkedBlockingQueue<>();
  private MessageListener listener;

  public interface MessageListener {
    void onMessageReceived(String message);

    void onMessageSent(String message);

    void onStatusUpdate(String status);
  }

  public void setMessageListener(MessageListener listener) {
    this.listener = listener;
  }

  public static class NodeInfo {
    public String nodeId;
    public String ip;
    public int port;

    public NodeInfo(String nodeId, String ip, int port) {
      this.nodeId = nodeId;
      this.ip = ip;
      this.port = port;
    }

    @Override
    public String toString() {
      return nodeId + " (" + ip + ":" + port + ")";
    }
  }

  public DistributedNode(String nodeId, String ip, int port) {
    this.nodeId = nodeId;
    this.ip = ip;
    this.port = port;
    this.otherNodes = new ArrayList<>();
    this.executor = Executors.newCachedThreadPool();
  }

  public String getNodeId() {
    return nodeId;
  }

  public List<NodeInfo> getOtherNodes() {
    return otherNodes;
  }

  public void addOtherNode(String nodeId, String ip, int port) {
    otherNodes.add(new NodeInfo(nodeId, ip, port));
  }

  public void start() {
    Thread serverThread = new Thread(this::runServer);
    serverThread.setDaemon(true);
    serverThread.start();

    Thread clientThread = new Thread(this::runClient);
    clientThread.setDaemon(true);
    clientThread.start();

    if (listener != null) {
      listener.onStatusUpdate("Nodo " + nodeId + " iniciado. Servidor escuchando en " + ip + ":" + port);
    }
  }

  private void runServer() {
    try {
      serverSocket = new ServerSocket(port, 50, InetAddress.getByName(ip));
      System.out.println(nodeId + " Escuchando en " + ip + ":" + port);

      while (running) {
        try {
          Socket clientSocket = serverSocket.accept();
          executor.submit(() -> handleClientConnection(clientSocket));
        } catch (IOException e) {
          if (running) {
            System.err.println(nodeId + " Error aceptando conexión: " + e.getMessage());
          }
        }
      }
    } catch (IOException e) {
      System.err.println(nodeId + " Error iniciando servidor: " + e.getMessage());
    }
  }

  private void handleClientConnection(Socket clientSocket) {
    try (BufferedReader input = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));
        PrintWriter output = new PrintWriter(clientSocket.getOutputStream(), true)) {

      String message = input.readLine();

      if (message != null) {
        String senderInfo = clientSocket.getInetAddress().getHostAddress() + ":" + clientSocket.getPort();
        String receivedMessage = "Mensaje recibido desde " + nodeId + "(" + senderInfo + "): " + message;

        System.out.println("MENSAJE RECIBIDO");

        if (listener != null) {
          listener.onMessageReceived(receivedMessage);
        }

        String response = nodeId + " - Mensaje '" + message + "' recibido con éxito.";
        output.println(response);
      }

    } catch (IOException e) {
      System.err.println(nodeId + " Error manejando cliente: " + e.getMessage());
    }
  }

  private void runClient() {
    while (running) {
      try {
        String[] messageData = messageQueue.take();
        String targetNodeId = messageData[0];
        String message = messageData[1];

        NodeInfo targetNode = otherNodes.stream()
            .filter(node -> node.nodeId.equals(targetNodeId))
            .findFirst().orElse(null);

        if (targetNode != null) {
          sendMessage(targetNode, message);
        } else {
          if (listener != null) {
            listener.onStatusUpdate("Error: Nodo destino " + targetNodeId + " no encontrado.");
          }
        }
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        break;
      }
    }
  }

  public void sendMessageToNode(String targetNodeId, String message) {
    try {
      messageQueue.put(new String[] { targetNodeId, message });
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  private void sendMessage(NodeInfo targetNode, String message) {
    try (Socket socket = new Socket(targetNode.ip, targetNode.port)) {
      PrintWriter output = new PrintWriter(socket.getOutputStream(), true);
      BufferedReader input = new BufferedReader(new InputStreamReader(socket.getInputStream()));

      output.println(message);
      String response = input.readLine();

      System.out.println("ENVIADO desde " + nodeId + " a " + targetNode.nodeId + ": " + message);

      String sentMessage = "Mensaje enviado a " + targetNode.toString() + ": '" + message + "' - Respuesta: "
          + response;
      if (listener != null) {
        listener.onMessageSent(sentMessage);
      }
    } catch (IOException e) {
      if (listener != null) {
        listener.onStatusUpdate("Error enviando mensaje a " + targetNode + ": " + e.getMessage());
      }
    }
  }

  public void stop() {
    running = false;
    try {
      if (serverSocket != null && !serverSocket.isClosed()) {
        serverSocket.close();
      }
      executor.shutdown();
      if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
        executor.shutdownNow();
      }
    } catch (IOException | InterruptedException e) {
      System.err.println(nodeId + " Error cerrando nodo: " + e.getMessage());
    }
  }
}