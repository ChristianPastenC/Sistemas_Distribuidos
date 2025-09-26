package BroadCast;

import javax.swing.SwingUtilities;

public class Client3 {
  public static void main(String[] args) {
    DistributedNode.NodeInfo serverInfo = new DistributedNode.NodeInfo("127.0.0.1", 12344);
    DistributedNode node3 = new DistributedNode("NODO-3", "127.0.0.1", 12347, serverInfo);
    node3.start();
    SwingUtilities.invokeLater(() -> new DistributedNodeGUI(node3).setVisible(true));
  }
}
