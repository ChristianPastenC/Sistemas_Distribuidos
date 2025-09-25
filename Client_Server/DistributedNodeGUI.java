package Client_Server;

import javax.swing.*;
import java.awt.*;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.util.stream.Collectors;

public class DistributedNodeGUI extends JFrame implements DistributedNode.MessageListener {
  private DistributedNode node;
  private JTextArea chatArea;
  private JTextField messageField;
  private JComboBox<String> targetNodeDropdown;
  private JButton sendButton;
  private JLabel statusLabel;
  private JTextArea activeNodesArea;

  public DistributedNodeGUI(DistributedNode node, java.util.List<DistributedNode.NodeInfo> allNodes) {
    this.node = node;
    node.setMessageListener(this);

    setTitle("Nodo " + node.getNodeId());
    setSize(700, 500);
    setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
    setLocationRelativeTo(null);

    initComponents(allNodes);
    setupListeners();

    addWindowListener(new WindowAdapter() {
      @Override
      public void windowClosing(WindowEvent e) {
        node.stop();
        dispose();
      }
    });
  }

  private void initComponents(java.util.List<DistributedNode.NodeInfo> allNodes) {
    JPanel mainPanel = new JPanel(new BorderLayout());

    JPanel topPanel = new JPanel(new BorderLayout());
    statusLabel = new JLabel("Iniciando nodo...", SwingConstants.CENTER);
    topPanel.add(statusLabel, BorderLayout.NORTH);

    activeNodesArea = new JTextArea("Nodos activos:\n" +
        allNodes.stream().map(Object::toString).collect(Collectors.joining("\n")));
    activeNodesArea.setEditable(false);
    activeNodesArea.setBorder(BorderFactory.createTitledBorder("Nodos en la red"));
    topPanel.add(new JScrollPane(activeNodesArea), BorderLayout.CENTER);

    mainPanel.add(topPanel, BorderLayout.NORTH);

    chatArea = new JTextArea();
    chatArea.setEditable(false);
    chatArea.setBorder(BorderFactory.createTitledBorder("Registro de mensajes"));
    mainPanel.add(new JScrollPane(chatArea), BorderLayout.CENTER);

    JPanel inputPanel = new JPanel(new BorderLayout());

    targetNodeDropdown = new JComboBox<>();
    node.getOtherNodes().forEach(otherNode -> targetNodeDropdown.addItem(otherNode.nodeId));
    inputPanel.add(targetNodeDropdown, BorderLayout.WEST);

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
    String targetNodeId = (String) targetNodeDropdown.getSelectedItem();
    String message = messageField.getText();

    if (targetNodeId != null && !message.trim().isEmpty()) {
      node.sendMessageToNode(targetNodeId, message);
      messageField.setText("");
    }
  }

  @Override
  public void onMessageReceived(String message) {
    SwingUtilities.invokeLater(() -> chatArea.append("RECIBIDO " + message + "\n"));
  }

  @Override
  public void onMessageSent(String message) {
    SwingUtilities.invokeLater(() -> chatArea.append("ENVIADO " + message + "\n"));
  }

  @Override
  public void onStatusUpdate(String status) {
    SwingUtilities.invokeLater(() -> {
      chatArea.append("ESTADO " + status + "\n");
      statusLabel.setText(status);
    });
  }

  public static void main(String[] args) {
    System.out.println("COMUNICACIÓN CLIENTE-SERVIDOR (P2P)");

    DistributedNode node1 = new DistributedNode("NODO-1", "127.0.0.1", 12345);
    DistributedNode node2 = new DistributedNode("NODO-2", "127.0.0.1", 12346);
    DistributedNode node3 = new DistributedNode("NODO-3", "127.0.0.1", 12347);

    node1.addOtherNode("NODO-2", "127.0.0.1", 12346);
    node1.addOtherNode("NODO-3", "127.0.0.1", 12347);

    node2.addOtherNode("NODO-1", "127.0.0.1", 12345);
    node2.addOtherNode("NODO-3", "127.0.0.1", 12347);

    node3.addOtherNode("NODO-1", "127.0.0.1", 12345);
    node3.addOtherNode("NODO-2", "127.0.0.1", 12346);

    java.util.List<DistributedNode.NodeInfo> allNodes = java.util.Arrays.asList(
        new DistributedNode.NodeInfo("NODO-1", "127.0.0.1", 12345),
        new DistributedNode.NodeInfo("NODO-2", "127.0.0.1", 12346),
        new DistributedNode.NodeInfo("NODO-3", "127.0.0.1", 12347));

    node1.start();
    node2.start();
    node3.start();

    SwingUtilities.invokeLater(() -> {
      new DistributedNodeGUI(node1, allNodes).setVisible(true);
      new DistributedNodeGUI(node2, allNodes).setVisible(true);
      new DistributedNodeGUI(node3, allNodes).setVisible(true);
    });
  }
}