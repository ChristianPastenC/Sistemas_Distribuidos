package BroadCast;

import java.io.*;
import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

public class ServerNode {
  private final int port;
  private final Set<NodeInfo> registeredNodes = new CopyOnWriteArraySet<>();
  private ExecutorService connectionExecutor;
  private ScheduledExecutorService resourceMonitorExecutor;
  private ServerSocket serverSocket;
  private volatile boolean running = true;
  private final OperatingSystemMXBean osBean = ManagementFactory.getPlatformMXBean(OperatingSystemMXBean.class);

  public static class NodeInfo {
    public final String ip;
    public final int port;

    public NodeInfo(String ip, int port) {
      this.ip = ip;
      this.port = port;
    }

    @Override
    public String toString() {
      return ip + ":" + port;
    }

    @Override
    public boolean equals(Object obj) {
      if (this == obj)
        return true;
      if (obj == null || getClass() != obj.getClass())
        return false;
      NodeInfo nodeInfo = (NodeInfo) obj;
      return port == nodeInfo.port && ip.equals(nodeInfo.ip);
    }

    @Override
    public int hashCode() {
      return Objects.hash(ip, port);
    }
  }

  public ServerNode(int port) {
    this.port = port;
  }

  public void startServer() {
    connectionExecutor = Executors.newCachedThreadPool();
    resourceMonitorExecutor = Executors.newSingleThreadScheduledExecutor();

    resourceMonitorExecutor.scheduleAtFixedRate(this::logResourceUsage, 0, 5, TimeUnit.SECONDS);

    System.out.println("Servidor iniciando en el puerto: " + port);

    runServerLoop();
  }

  private void logResourceUsage() {
    Runtime runtime = Runtime.getRuntime();
    long usedMemory = (runtime.totalMemory() - runtime.freeMemory()) / 1024 / 1024;
    long maxMemory = runtime.maxMemory() / 1024 / 1024;
    double cpuLoad = osBean.getSystemLoadAverage();

    System.out.println("---  Estado del Servidor    ---");
    System.out.printf("Memoria RAM: Usada %d MB / Disponible %d MB\n", usedMemory, maxMemory);
    System.out.printf("Carga de CPU (promedio 1 min): %.2f%%\n", cpuLoad < 0 ? 0 : cpuLoad * 100);
    System.out.println("Nodos Activos: " + registeredNodes.size());
  }

  private void runServerLoop() {
    try {
      serverSocket = new ServerSocket(port);
      System.out.println("Servidor escuchando activamente en el puerto: " + port);
      while (running) {
        try {
          Socket clientSocket = serverSocket.accept();
          connectionExecutor.submit(() -> handleClientConnection(clientSocket));
        } catch (IOException e) {
          if (running) {
            System.err.println("Error aceptando una conexión de cliente: " + e.getMessage());
          }
        }
      }
    } catch (IOException e) {
      System.err.println("Error crítico que ha detenido el servidor. ¿El puerto " + port + " ya está en uso?");
      System.err.println("Detalle: " + e.getMessage());
    } finally {
      stop();
    }
  }

  private void handleClientConnection(Socket clientSocket) {
    try (BufferedReader input = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()))) {
      String message = input.readLine();
      if (message != null) {
        if (message.startsWith("REGISTER:")) {
          String[] parts = message.substring(9).split(":");
          NodeInfo newNode = new NodeInfo(parts[0], Integer.parseInt(parts[1]));
          if (registeredNodes.add(newNode)) {
            System.out.println("Nuevo nodo registrado: " + newNode);
            broadcast("ESTADO: Nuevo nodo unido -> " + newNode);
          }
        } else {
          System.out.println("Mensaje recibido, retransmitiendo: " + message);
          broadcast(message);
        }
      }
    } catch (IOException | NumberFormatException e) {
      System.err.println("Error manejando la conexión del cliente: " + e.getMessage());
    }
  }

  private void broadcast(String message) {
    for (NodeInfo node : registeredNodes) {
      connectionExecutor.submit(() -> {
        try (Socket socket = new Socket(node.ip, node.port);
            PrintWriter output = new PrintWriter(socket.getOutputStream(), true)) {
          output.println(message);
        } catch (IOException e) {
          System.err.println("Falló la conexión con el nodo " + node + ". Eliminando de la lista");
          registeredNodes.remove(node);
        }
      });
    }
  }

  public void stop() {
    if (!running)
      return;
    running = false;
    System.out.println("Cerrando el servidor...");

    if (resourceMonitorExecutor != null)
      resourceMonitorExecutor.shutdownNow();
    if (connectionExecutor != null)
      connectionExecutor.shutdownNow();

    try {
      if (serverSocket != null && !serverSocket.isClosed()) {
        serverSocket.close();
      }
    } catch (IOException e) {
      System.err.println("Error cerrando el socket del servidor: " + e.getMessage());
    }
    System.out.println("Servidor detenido");
  }

  public static void main(String[] args) {
    ServerNode server = new ServerNode(12344);
    server.startServer();
  }
}