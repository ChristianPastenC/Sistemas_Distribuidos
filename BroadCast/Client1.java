package BroadCast;

import javax.swing.SwingUtilities;

public class Client1 {
  public static void main(String[] args) {
    DistributedNode.NodeInfo serverInfo = new DistributedNode.NodeInfo("127.0.0.1", 12344);
    DistributedNode node1 = new DistributedNode("NODO-1", "127.0.0.1", 12345, serverInfo);
    node1.start();
    SwingUtilities.invokeLater(() -> new DistributedNodeGUI(node1).setVisible(true));
  }
}
