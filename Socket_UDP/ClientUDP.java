import java.net.*;
import java.util.Scanner;

public class ClientUDP {
  public static void main(String[] args) {
    DatagramSocket socket = null;
    Scanner scanner = new Scanner(System.in);

    try {
      System.out.println("=== CLIENTE UDP ===");

      // Request IP & Port
      System.out.print("Ingresa la IP del servidor (ejemplo: 127.0.0.1): ");
      String serverIP = scanner.nextLine();

      System.out.print("Ingresa el puerto del servidor (ejemplo: 12345): ");
      int serverPort = Integer.parseInt(scanner.nextLine());

      // Create Client Socket
      socket = new DatagramSocket();

      System.out.println("\n=== CONFIGURACIÓN DEL CLIENTE ===");
      System.out.println("IP del servidor destino: " + serverIP);
      System.out.println("Puerto del servidor destino: " + serverPort);
      System.out.println("Puerto local del cliente: " + socket.getLocalPort());
      System.out.println("================================\n");

      // Message to send
      String message = "¡¡¡HOLA MUNDO!!!";
      byte[] dataToSend = message.getBytes();

      // Create package to send
      InetAddress serverAddress = InetAddress.getByName(serverIP);
      DatagramPacket pkgToSend = new DatagramPacket(
          dataToSend,
          dataToSend.length,
          serverAddress,
          serverPort);

      // Send package to server
      System.out.println("Enviando message al servidor: " + message);
      socket.send(pkgToSend);
      System.out.println("Mensaje enviado correctamente.");

      // Response timeout
      socket.setSoTimeout(5000);

      // Buffer to get response
      byte[] bufferRespuesta = new byte[1024];
      DatagramPacket paqueteRespuesta = new DatagramPacket(bufferRespuesta, bufferRespuesta.length);

      // Get Response from server
      System.out.println("Esperando respuesta del servidor...");
      socket.receive(paqueteRespuesta);

      // Show response
      String respuesta = new String(paqueteRespuesta.getData(), 0, paqueteRespuesta.getLength());
      System.out.println("\n=== RESPUESTA DEL SERVIDOR ===");
      System.out.println("Respuesta: " + respuesta);
      System.out.println("==============================\n");

      System.out.println("Comunicación completada exitosamente.");

    } catch (SocketTimeoutException e) {
      System.err.println("Error: No se recibió respuesta del servidor (timeout)");
      System.err.println("Verifica que el servidor esté ejecutándose en la IP y puerto especificados.");
    } catch (UnknownHostException e) {
      System.err.println("Error: No se pudo resolver la dirección IP: " + e.getMessage());
    } catch (Exception e) {
      System.err.println("Error en el cliente: " + e.getMessage());
      e.printStackTrace();
    } finally {
      if (socket != null && !socket.isClosed()) {
        socket.close();
        System.out.println("Cliente UDP cerrado.");
      }
      scanner.close();
    }
  }
}