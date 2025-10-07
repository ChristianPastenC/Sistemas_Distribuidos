document.addEventListener('DOMContentLoaded', () => {
  const WS_URL = "ws://localhost:8765";
  let sharedPacket = null;

  const nodes = {
    1: {
      user: 'Node1', pass: 'secure_pass_node1', ws: null, token: null, status: 'disconnected',
      encryptedValue: null,
      ui: {
        status: document.getElementById('status1'), log: document.getElementById('log1'),
        buttons: [
          document.getElementById('btnConnect1'),
          document.getElementById('btnRequest1'),
          document.getElementById('btnSend1'),
        ],
        packetBox: document.getElementById('packetBox1'),
        packetContent: document.getElementById('packetContent1'),
      },
    },
    2: {
      user: 'Node2', pass: 'secure_pass_node2', ws: null, token: null, status: 'disconnected',
      privateKey: null, publicKeyPem: null,
      ui: {
        status: document.getElementById('status2'), log: document.getElementById('log2'),
        buttons: [
          document.getElementById('btnConnect2'),
          document.getElementById('btnDecrypt2'),
        ],
        packetBox: document.getElementById('packetBox2'),
        packetContent: document.getElementById('packetContent2'),
      },
    },
  };

  const log = (nodeId, msg) => {
    const time = new Date().toLocaleTimeString();
    nodes[nodeId].ui.log.innerHTML += `<div><span class="text-slate-400">${time}</span> ${msg}</div>`;
    nodes[nodeId].ui.log.scrollTop = nodes[nodeId].ui.log.scrollHeight;
  };

  const updateUI = () => {
    for (const id in nodes) {
      const node = nodes[id];
      const s = node.status;
      node.ui.status.textContent = s === 'disconnected' ? 'OFF' : s === 'connected' ? 'ON' : 'AUTH';
      node.ui.status.className = `text-xs font-semibold px-2 py-0.5 rounded-full text-white ${
        s === 'disconnected' ? 'bg-red-500' : s === 'connected' ? 'bg-amber-500' : 'bg-green-500'}`;
    }
    nodes[1].ui.buttons[0].disabled = nodes[1].status === 'authenticated';
    nodes[1].ui.buttons[1].disabled = nodes[1].status !== 'authenticated';
    nodes[1].ui.buttons[2].disabled = !nodes[1].encryptedValue;
    nodes[2].ui.buttons[0].disabled = nodes[2].status === 'authenticated';
    nodes[2].ui.buttons[1].disabled = !sharedPacket || nodes[2].status !== 'authenticated';
  };

  const handleMessage = (nodeId, data) => {
    const node = nodes[nodeId];
    log(nodeId, `<span class="text-cyan-400">${data.type}</span>`);
    switch (data.type) {
      case 'AuthResponse':
        if (data.success) {
          node.status = 'authenticated';
          node.token = data.token;
          if (nodeId == 2) {
            const keypair = forge.pki.rsa.generateKeyPair({ bits: 4096 });
            node.privateKey = keypair.privateKey;
            node.publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
            node.ws.send(JSON.stringify({ type: 'PublicKeyRegistration', token: node.token, publicKey: node.publicKeyPem }));
          }
        }
        break;
      case 'EncryptedValueResponse':
        nodes[1].encryptedValue = data.encryptedValue;
        log(1, 'Valor cifrado recibido.');
        break;
      case 'DecryptionResponse':
        try {
          const decrypted = node.privateKey.decrypt(forge.util.decode64(data.encryptedPlainValue), 'RSA-OAEP', {
            md: forge.md.sha256.create(),
            mgf1: { md: forge.md.sha256.create() }
          });
          document.getElementById('resultValue').textContent = forge.util.decodeUtf8(decrypted);
          document.getElementById('resultBox').classList.remove('hidden');
          log(2, '<span class="text-emerald-400">Descifrado OK!</span>');
        } catch (e) { log(2, `<span class="text-red-400">Error descifrando: ${e.message}</span>`); }
        break;
    }
    updateUI();
  };

  const connect = (nodeId) => {
    const node = nodes[nodeId];
    if (node.ws) node.ws.close();
    log(nodeId, 'Conectando...');
    node.ws = new WebSocket(WS_URL);

    node.ws.onopen = () => {
      node.status = 'connected';
      updateUI();
      node.ws.send(JSON.stringify({ type: 'AuthRequest', username: node.user, password: node.pass }));
    };
    node.ws.onmessage = (event) => handleMessage(nodeId, JSON.parse(event.data));
    node.ws.onclose = () => {
      node.status = 'disconnected';
      updateUI();
    };
  };

  nodes[1].ui.buttons[0].addEventListener('click', () => connect(1));
  nodes[2].ui.buttons[0].addEventListener('click', () => connect(2));

  nodes[1].ui.buttons[1].addEventListener('click', () => {
    log(1, 'Solicitando valor...');
    nodes[1].ws.send(JSON.stringify({ type: 'RequestEncryptedValue', token: nodes[1].token }));
  });

  nodes[1].ui.buttons[2].addEventListener('click', () => {
    const packet = { encryptedValue: nodes[1].encryptedValue };
    const encodedPacket = btoa(JSON.stringify(packet));

    nodes[1].ui.packetContent.textContent = encodedPacket;
    nodes[1].ui.packetBox.classList.remove('hidden');
    log(1, 'Paquete codificado y "enviado".');

    setTimeout(() => {
      sharedPacket = packet;
      nodes[2].ui.packetContent.textContent = encodedPacket;
      nodes[2].ui.packetBox.classList.remove('hidden');
      log(2, 'Paquete "recibido".');
      updateUI();
    }, 500);
  });

  nodes[2].ui.buttons[1].addEventListener('click', () => {
    log(2, 'Solicitando descifrado...');
    const md = forge.md.sha256.create();
    md.update(sharedPacket.encryptedValue, 'utf8');
    const signature = nodes[2].privateKey.sign(md);
    nodes[2].ws.send(JSON.stringify({
      type: 'DecryptionRequest', token: nodes[2].token, publicKey: nodes[2].publicKeyPem,
      encryptedValue: sharedPacket.encryptedValue, signature: forge.util.encode64(signature)
    }));
  });

  updateUI();
});