package BroadCast;

import javax.swing.*;
import java.awt.*;

public class NodeLauncherGUI extends JFrame {

    private final JTextField nodeNameField;
    private final JTextField portField;
    private final JButton launchButton;
    private final JTextArea logArea;

    private final String serverIp = "127.0.0.1";
    private final int serverPort = 12344;

    public NodeLauncherGUI() {
        setTitle("Lanzador de Nodos Cliente");
        setSize(400, 300);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);

        JPanel panel = new JPanel(new GridLayout(4, 2, 10, 10));
        panel.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        nodeNameField = new JTextField("NODO-");
        portField = new JTextField("12345");
        launchButton = new JButton("Lanzar Nodo");
        logArea = new JTextArea("Nodos lanzados:\n");
        logArea.setEditable(false);

        panel.add(new JLabel("Nombre del Nodo:"));
        panel.add(nodeNameField);
        panel.add(new JLabel("Puerto de Escucha:"));
        panel.add(portField);
        panel.add(new JLabel());
        panel.add(launchButton);

        setLayout(new BorderLayout());
        add(panel, BorderLayout.NORTH);
        add(new JScrollPane(logArea), BorderLayout.CENTER);

        launchButton.addActionListener(_ -> launchNode());
    }

    private void launchNode() {
        String nodeName = nodeNameField.getText().trim();
        String portStr = portField.getText().trim();

        if (nodeName.isEmpty() || portStr.isEmpty()) {
            JOptionPane.showMessageDialog(this, "El nombre y el puerto no pueden estar vacíos.", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        try {
            int port = Integer.parseInt(portStr);

            DistributedNode.NodeInfo serverInfo = new DistributedNode.NodeInfo(serverIp, serverPort);

            DistributedNode newNode = new DistributedNode(nodeName, "127.0.0.1", port, serverInfo);
            newNode.start();

            SwingUtilities.invokeLater(() -> new DistributedNodeGUI(newNode).setVisible(true));

            logArea.append("- " + nodeName + " en el puerto " + port + "\n");
            nodeNameField.setText("NODO-");
            portField.setText(String.valueOf(port + 1));
            
        } catch (NumberFormatException ex) {
            JOptionPane.showMessageDialog(this, "El puerto debe ser un número válido.", "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new NodeLauncherGUI().setVisible(true));
    }
}