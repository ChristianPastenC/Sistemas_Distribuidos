package BroadCast;

import javax.swing.SwingUtilities;

public class Client2 {
  public static void main(String[] args) {
    DistributedNode.NodeInfo serverInfo = new DistributedNode.NodeInfo("127.0.0.1", 12344);
    DistributedNode node2 = new DistributedNode("NODO-2", "127.0.0.1", 12346, serverInfo);
    node2.start();
    SwingUtilities.invokeLater(() -> new DistributedNodeGUI(node2).setVisible(true));
  }
}
