package Socket_TCP;

import java.net.*;
import java.io.*;
import java.util.Scanner;

public class ClientTCP {
  public static void main(String[] args) {
    Socket socket = null;
    Scanner scanner = new Scanner(System.in);

    try {
      System.out.println("=== CLIENTE TCP ===");

      // Get IP and server port from user
      System.out.print("Ingresa la IP del servidor (ejemplo: 127.0.0.1): ");
      String serverIP = scanner.nextLine();

      System.out.print("Ingresa el puerto del servidor (ejemplo: 12345): ");
      int serverPort = Integer.parseInt(scanner.nextLine());

      System.out.println("\n=== CONFIGURACIÓN DEL CLIENTE ===");
      System.out.println("IP del servidor destino: " + serverIP);
      System.out.println("Puerto del servidor destino: " + serverPort);
      System.out.println("Intentando conectar con el servidor...");

      socket = new Socket(serverIP, serverPort);

      // Show connection data
      System.out.println("¡Conexión establecida exitosamente!");
      System.out.println("IP local del cliente: " + socket.getLocalAddress().getHostAddress());
      System.out.println("Puerto local del cliente: " + socket.getLocalPort());
      System.out.println("==================================\n");

      // Create input and output flows
      PrintWriter output = new PrintWriter(socket.getOutputStream(), true);
      BufferedReader input = new BufferedReader(
          new InputStreamReader(socket.getInputStream()));

      // Send Message to Server    
      String mensaje = "¡¡¡HOLA MUNDO!!!";
      System.out.println("Enviando mensaje al servidor: " + mensaje);
      output.println(mensaje);
      System.out.println("Mensaje enviado correctamente.");

      // Set timeout for the response
      socket.setSoTimeout(5000);

      // Get response from server
      System.out.println("Esperando respuesta del servidor...");
      String respuesta = input.readLine();

      if (respuesta != null) {
        // Show response
        System.out.println("\n=== RESPUESTA DEL SERVIDOR ===");
        System.out.println("Respuesta: " + respuesta);
        System.out.println("==============================\n");

        System.out.println("Comunicación completada exitosamente.");
      } else {
        System.out.println("No se recibió respuesta del servidor.");
      }

      // Close flows
      output.close();
      input.close();

    } catch (ConnectException e) {
      System.err.println("Error: No se pudo conectar con el servidor.");
      System.err.println("Verifica que el servidor esté ejecutándose en la IP y puerto especificados.");
    } catch (SocketTimeoutException e) {
      System.err.println("Error: Timeout - No se recibió respuesta del servidor a tiempo.");
    } catch (UnknownHostException e) {
      System.err.println("Error: No se pudo resolver la dirección IP: " + e.getMessage());
    } catch (NumberFormatException e) {
      System.err.println("Error: El puerto debe ser un número válido.");
    } catch (Exception e) {
      System.err.println("Error en el cliente TCP: " + e.getMessage());
      e.printStackTrace();
    } finally {
      if (socket != null && !socket.isClosed()) {
        try {
          socket.close();
          System.out.println("Conexión TCP cerrada.");
        } catch (IOException e) {
          System.err.println("Error al cerrar la conexión: " + e.getMessage());
        }
      }
      scanner.close();
    }
  }
}