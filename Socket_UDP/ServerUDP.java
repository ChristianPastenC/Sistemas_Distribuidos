import java.net.*;

public class ServerUDP {
  public static void main(String[] args) {
    DatagramSocket socket = null;

    try {
      // Server configuration
      String ip = "127.0.0.1";
      int puerto = 12345; // Port upper to 10000

      // Create server socket
      socket = new DatagramSocket(puerto, InetAddress.getByName(ip));

      System.out.println("=== SERVIDOR UDP INICIADO ===");
      System.out.println("IP del servidor: " + ip);
      System.out.println("Puerto del servidor: " + puerto);
      System.out.println("Esperando mensajes del cliente...\n");

      // Buffer for geting data
      byte[] buffer = new byte[1024];

      while (true) {
        // Create package to get data
        DatagramPacket packageReceived = new DatagramPacket(buffer, buffer.length);

        // Get package from Client
        socket.receive(packageReceived);

        // Extract information package
        String receivedMsg = new String(packageReceived.getData(), 0, packageReceived.getLength());
        String clientIP = packageReceived.getAddress().getHostAddress();
        int clientPort = packageReceived.getPort();

        System.out.println("=== MENSAJE RECIBIDO ===");
        System.out.println("Mensaje: " + receivedMsg);
        System.out.println("IP del cliente: " + clientIP);
        System.out.println("Puerto del cliente: " + clientPort);
        System.out.println("Hora: " + new java.util.Date());
        System.out.println("========================\n");

        // Send Confirmation response
        String response = "Mensaje recibido correctamente en el servidor";
        byte[] responseData = response.getBytes();

        DatagramPacket paqueteRespuesta = new DatagramPacket(
            responseData,
            responseData.length,
            packageReceived.getAddress(),
            packageReceived.getPort());

        socket.send(paqueteRespuesta);
        System.out.println("Respuesta enviada al cliente.\n");
      }

    } catch (Exception e) {
      System.err.println("Error en el servidor: " + e.getMessage());
      e.printStackTrace();
    } finally {
      if (socket != null && !socket.isClosed()) {
        socket.close();
        System.out.println("Servidor UDP cerrado.");
      }
    }
  }
}