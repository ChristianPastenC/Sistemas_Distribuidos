package BroadCast;

import javax.swing.*;
import java.awt.*;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;

public class DistributedNodeGUI extends JFrame implements DistributedNode.MessageListener {
  private DistributedNode node;
  private JTextArea chatArea;
  private JTextField messageField;
  private JButton sendButton;
  private JLabel statusLabel;

  public DistributedNodeGUI(DistributedNode node) {
    this.node = node;
    node.setMessageListener(this);

    setTitle("Nodo " + node.getNodeId());
    setSize(500, 400);
    setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
    setLocationRelativeTo(null);

    initComponents();
    setupListeners();

    addWindowListener(new WindowAdapter() {
      @Override
      public void windowClosing(WindowEvent e) {
        node.stop();
        dispose();
      }
    });
  }

  private void initComponents() {
    JPanel mainPanel = new JPanel(new BorderLayout());

    statusLabel = new JLabel("Iniciando nodo...", SwingConstants.CENTER);
    mainPanel.add(statusLabel, BorderLayout.NORTH);

    chatArea = new JTextArea();
    chatArea.setEditable(false);
    chatArea.setBorder(BorderFactory.createTitledBorder("Registro de mensajes"));
    mainPanel.add(new JScrollPane(chatArea), BorderLayout.CENTER);

    JPanel inputPanel = new JPanel(new BorderLayout());
    messageField = new JTextField();
    sendButton = new JButton("Enviar");

    inputPanel.add(messageField, BorderLayout.CENTER);
    inputPanel.add(sendButton, BorderLayout.EAST);

    mainPanel.add(inputPanel, BorderLayout.SOUTH);
    add(mainPanel);
  }

  private void setupListeners() {
    sendButton.addActionListener(_ -> sendMessage());
    messageField.addActionListener(_ -> sendMessage());
  }

  private void sendMessage() {
    String message = messageField.getText();
    if (!message.trim().isEmpty()) {
      node.sendMessage(message);
      messageField.setText("");
    }
  }

  @Override
  public void onMessageReceived(String message) {
    SwingUtilities.invokeLater(() -> chatArea.append("RECIBIDO: " + message + "\n"));
  }

  @Override
  public void onStatusUpdate(String status) {
    SwingUtilities.invokeLater(() -> {
      chatArea.append("ESTADO: " + status + "\n");
      statusLabel.setText(status);
    });
  }
}