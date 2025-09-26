package BroadCast;

import java.io.*;
import java.net.*;
import java.util.concurrent.*;

public class DistributedNode {
  private String nodeId;
  private String ip;
  private int port;
  private NodeInfo serverNode;
  private ServerSocket serverSocket;
  private volatile boolean running = true;
  private ExecutorService executor;

  private MessageListener listener;

  public interface MessageListener {
    void onMessageReceived(String message);

    void onStatusUpdate(String status);
  }

  public void setMessageListener(MessageListener listener) {
    this.listener = listener;
  }

  public static class NodeInfo {
    public String ip;
    public int port;

    public NodeInfo(String ip, int port) {
      this.ip = ip;
      this.port = port;
    }

    @Override
    public String toString() {
      return ip + ":" + port;
    }
  }

  public DistributedNode(String nodeId, String ip, int port, NodeInfo serverNode) {
    this.nodeId = nodeId;
    this.ip = ip;
    this.port = port;
    this.serverNode = serverNode;
    this.executor = Executors.newCachedThreadPool();
  }

  public String getNodeId() {
    return nodeId;
  }

  public void start() {
    Thread serverThread = new Thread(this::runServer);
    serverThread.setDaemon(true);
    serverThread.start();

    registerWithServer();

    if (listener != null) {
      listener.onStatusUpdate("Nodo " + nodeId + " iniciado. Escuchando en " + ip + ":" + port);
    }
  }

  private void runServer() {
    try {
      serverSocket = new ServerSocket(port, 50, InetAddress.getByName(ip));
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
    try (BufferedReader input = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()))) {
      String message = input.readLine();
      if (message != null && listener != null) {
        listener.onMessageReceived(message);
      }
    } catch (IOException e) {
      System.err.println(nodeId + " Error manejando cliente: " + e.getMessage());
    }
  }

  private void registerWithServer() {
    sendMessageToServer("REGISTER:" + this.ip + ":" + this.port);
  }

  public void sendMessage(String message) {
    sendMessageToServer(nodeId + ": " + message);
  }

  private void sendMessageToServer(String message) {
    try (Socket socket = new Socket(serverNode.ip, serverNode.port)) {
      PrintWriter output = new PrintWriter(socket.getOutputStream(), true);
      output.println(message);
    } catch (IOException e) {
      if (listener != null) {
        listener.onStatusUpdate("Error enviando mensaje al servidor: " + e.getMessage());
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