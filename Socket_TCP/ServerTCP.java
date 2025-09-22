package Socket_TCP;

import java.io.*;
import java.net.*;

public class ServerTCP {
  public static void main(String[] args) {
    ServerSocket serverSocket = null;

    try {
      // Set server
      String ip = "127.0.0.1";
      int port = 12345; 

      // Create server socket
      serverSocket = new ServerSocket(port, 50, InetAddress.getByName(ip));

      System.out.println("=== SERVIDOR TCP INICIADO ===");
      System.out.println("IP del servidor: " + ip);
      System.out.println("Puerto del servidor: " + port);
      System.out.println("Esperando conexiones de clientes...\n");

      while (true) {
        // Accept connection
        Socket clientSocket = serverSocket.accept();

        // Get client information
        String clientIP = clientSocket.getInetAddress().getHostAddress();
        int puertoCliente = clientSocket.getPort();

        System.out.println("=== CLIENTE CONECTADO ===");
        System.out.println("IP del cliente: " + clientIP);
        System.out.println("Puerto del cliente: " + puertoCliente);
        System.out.println("Hora de conexión: " + new java.util.Date());
        System.out.println("========================\n");

        // Create in out flows
        BufferedReader input = new BufferedReader(
            new InputStreamReader(clientSocket.getInputStream()));
        PrintWriter output = new PrintWriter(
            clientSocket.getOutputStream(), true);

        // Read client message
        String message = input.readLine();

        if (message != null) {
          // Shows goten message
          System.out.println("=== MENSAJE RECIBIDO ===");
          System.out.println("Mensaje: " + message);
          System.out.println("Hora: " + new java.util.Date());
          System.out.println("========================\n");

          // Send confirmation response
          String response = "Mensaje recibido correctamente en el servidor TCP";
          output.println(response);
          System.out.println("Respuesta enviada al cliente: " + response + "\n");
        }

        // Close connection
        input.close();
        output.close();
        clientSocket.close();

        System.out.println("Conexión con cliente " + clientIP + ":" + puertoCliente + " cerrada.");
        System.out.println("Esperando nuevas conexiones...\n");
      }

    } catch (Exception e) {
      System.err.println("Error en el servidor TCP: " + e.getMessage());
      e.printStackTrace();
    } finally {
      if (serverSocket != null && !serverSocket.isClosed()) {
        try {
          serverSocket.close();
          System.out.println("Servidor TCP cerrado.");
        } catch (IOException e) {
          System.err.println("Error al cerrar el servidor: " + e.getMessage());
        }
      }
    }
  }
}