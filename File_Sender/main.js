document.addEventListener('DOMContentLoaded', () => {
  const WS_URL = "ws://localhost:8765";
  const CHUNK_SIZE = 64 * 1024;

  const nodes = {
    1: {
      user: 'Node1', pass: 'secure_pass_node1', ws: null, status: 'disconnected',
      ui: {
        status: document.getElementById('status1'), log: document.getElementById('log1'),
        buttons: [
          document.getElementById('btnConnect1'),
          document.getElementById('btnSend1'),
        ],
        fileInput: document.getElementById('fileInput'),
      },
    },
    2: {
      user: 'Node2', pass: 'secure_pass_node2', ws: null, status: 'disconnected',
      fileChunks: [],
      fileMetadata: null,
      ui: {
        status: document.getElementById('status2'), log: document.getElementById('log2'),
        buttons: [
          document.getElementById('btnConnect2'),
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
      node.ui.status.className = `text-xs font-semibold px-2 py-0.5 rounded-full text-white ${s === 'disconnected' ? 'bg-red-500' : s === 'connected' ? 'bg-amber-500' : 'bg-green-500'}`;
    }
    nodes[1].ui.buttons[0].disabled = nodes[1].status === 'authenticated';
    nodes[1].ui.buttons[1].disabled = nodes[1].status !== 'authenticated' || !nodes[1].ui.fileInput.files[0];
    nodes[2].ui.buttons[0].disabled = nodes[2].status === 'authenticated';
  };

  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const reconstructAndDownloadFile = () => {
    const node = nodes[2];
    log(2, '<span class="text-emerald-400">Reconstruyendo archivo...</span>');
    const fileBlob = new Blob(node.fileChunks);
    const downloadUrl = URL.createObjectURL(fileBlob);

    const resultBox = document.getElementById('resultBox');
    const resultValue = document.getElementById('resultValue');
    const previewBox = document.getElementById('previewBox');

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = node.fileMetadata.fileName;
    a.textContent = `Descargar ${node.fileMetadata.fileName}`;
    a.className = 'text-indigo-600 hover:underline';
    resultValue.innerHTML = '';
    resultValue.appendChild(a);

    previewBox.innerHTML = '';
    const extension = node.fileMetadata.fileName.split('.').pop().toLowerCase();

    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
    const textExtensions = ['txt', 'js', 'py', 'html', 'css', 'json', 'md', 'xml', 'csv'];

    if (imageExtensions.includes(extension)) {
      const img = document.createElement('img');
      img.src = downloadUrl;
      img.className = 'max-w-full h-auto rounded';
      previewBox.appendChild(img);
    } else if (textExtensions.includes(extension)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const pre = document.createElement('pre');
        pre.textContent = e.target.result;
        pre.className = 'text-xs font-mono whitespace-pre-wrap';
        previewBox.appendChild(pre);
      };
      reader.readAsText(fileBlob);
    } else if (extension === 'pdf') {
      const embed = document.createElement('embed');
      embed.src = downloadUrl;
      embed.type = 'application/pdf';
      embed.className = 'w-full h-96';
      previewBox.appendChild(embed);
    } else {
      previewBox.innerHTML = `<p class="text-slate-500 text-sm">La previsualización no está disponible para archivos de tipo '.${extension}'.</p>`;
    }

    resultBox.classList.remove('hidden');

    node.fileChunks = [];
    node.fileMetadata = null;
    node.ui.packetBox.classList.add('hidden');
  };

  const handleMessage = (nodeId, data) => {
    const node = nodes[nodeId];
    log(nodeId, `<span class="text-cyan-400">${data.type}</span>`);
    switch (data.type) {
      case 'AuthResponse':
        if (data.success) {
          node.status = 'authenticated';
        }
        break;

      case 'FileTransferStart':
        document.getElementById('resultBox').classList.add('hidden');
        nodes[2].fileMetadata = { fileName: data.fileName, fileSize: data.fileSize, totalChunks: data.totalChunks };
        nodes[2].fileChunks = [];
        nodes[2].ui.packetContent.textContent = `${data.fileName} (${(data.fileSize / 1024).toFixed(2)} KB)`;
        nodes[2].ui.packetBox.classList.remove('hidden');
        log(2, `Iniciando recepción de ${data.fileName}`);
        break;

      case 'FileChunk':
        const byteString = atob(data.chunk);
        const len = byteString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = byteString.charCodeAt(i);
        }
        nodes[2].fileChunks[data.sequence] = bytes.buffer;
        log(2, `Recibido paquete ${data.sequence + 1} de ${nodes[2].fileMetadata.totalChunks}`);
        break;

      case 'FileTransferEnd':
        log(2, 'Transferencia finalizada desde el emisor.');
        reconstructAndDownloadFile();
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
  nodes[1].ui.fileInput.addEventListener('change', updateUI);

  nodes[1].ui.buttons[1].addEventListener('click', async () => {
    const file = nodes[1].ui.fileInput.files[0];
    if (!file) {
      log(1, '<span class="text-red-400">Error: No se ha seleccionado ningún archivo.</span>');
      return;
    }

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    log(1, `Fragmentando '${file.name}' en ${totalChunks} paquetes...`);

    nodes[1].ws.send(JSON.stringify({
      type: 'FileTransferStart',
      fileName: file.name,
      fileSize: file.size,
      totalChunks: totalChunks
    }));

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = start + CHUNK_SIZE;
      const chunk = file.slice(start, end);

      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = (e) => {
          const base64Chunk = arrayBufferToBase64(e.target.result);
          nodes[1].ws.send(JSON.stringify({
            type: 'FileChunk',
            sequence: i,
            chunk: base64Chunk
          }));
          log(1, `Enviado paquete ${i + 1} de ${totalChunks}`);
          resolve();
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(chunk);
      });
    }

    nodes[1].ws.send(JSON.stringify({ type: 'FileTransferEnd' }));
    log(1, '<span class="text-emerald-400">Archivo enviado completamente.</span>');
  });

  updateUI();
});