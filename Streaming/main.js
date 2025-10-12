document.addEventListener('DOMContentLoaded', () => {
  const WS_URL = "ws://localhost:8765";

  const peerConnectionConfig = {
    'iceServers': [
      { 'urls': 'stun:stun.l.google.com:19302' },
      { 'urls': 'stun:stun1.l.google.com:19302' }
    ]
  };

  const usernameInput = document.getElementById('usernameInput');
  const btnConnect = document.getElementById('btnConnect');
  const status = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const videoGrid = document.getElementById('video-grid');
  const participantCount = document.getElementById('participantCount');
  const connectionStatus = document.getElementById('connectionStatus');

  let ws = null;
  let localStream = null;
  let username = '';
  let peerConnections = {};

  const updateConnectionStatus = () => {
    const peers = Object.keys(peerConnections);
    const totalParticipants = peers.length + 1;

    participantCount.textContent = `Participantes: ${totalParticipants}`;

    if (peers.length === 0) {
      connectionStatus.innerHTML = '<p class="text-slate-400">No hay otras conexiones activas</p>';
    } else {
      let html = '';
      peers.forEach(peer => {
        const pc = peerConnections[peer];
        const state = pc.connectionState;
        const iceState = pc.iceConnectionState;
        const stateColor = state === 'connected' ? 'text-green-600' :
          state === 'connecting' ? 'text-yellow-600' : 'text-red-600';
        html += `<p><span class="font-medium">${peer}:</span> <span class="${stateColor}">${state}</span> (${iceState})</p>`;
      });
      connectionStatus.innerHTML = html;
    }
  };

  const updateUI = (isConnected) => {
    usernameInput.disabled = isConnected;
    btnConnect.disabled = isConnected;
    if (isConnected) {
      status.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500 text-white';
      status.textContent = 'ON';
      statusText.textContent = `Conectado como: ${username}`;
    } else {
      status.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500 text-white';
      status.textContent = 'OFF';
      statusText.textContent = 'Desconectado';
    }
  };

  const addVideoStream = (stream, user) => {
    const existingVideo = document.getElementById(`video-${user}`);

    if (existingVideo) {
      existingVideo.srcObject = stream;
      return;
    }

    const videoContainer = document.createElement('div');
    videoContainer.id = `video-container-${user}`;
    videoContainer.className = 'relative bg-black rounded-md overflow-hidden aspect-video';

    const video = document.createElement('video');
    video.id = `video-${user}`;
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = (user === username);

    video.onloadedmetadata = () => {
      video.play().catch(e => console.error(`Error reproduciendo video de ${user}:`, e));
    };

    const nameTag = document.createElement('div');
    nameTag.className = 'absolute bottom-2 left-2 bg-slate-900 bg-opacity-70 text-white text-sm px-3 py-1 rounded';
    nameTag.textContent = user === username ? `${user} (Tú)` : user;

    videoContainer.appendChild(video);
    videoContainer.appendChild(nameTag);
    videoGrid.appendChild(videoContainer);
  };

  const removeVideoStream = (user) => {
    const videoContainer = document.getElementById(`video-container-${user}`);
    if (videoContainer) {
      videoContainer.remove();
    }
  };

  const connectToServer = async () => {
    username = usernameInput.value.trim();
    if (!username) {
      alert('Por favor, ingresa un nombre de usuario.');
      return;
    }

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      addVideoStream(localStream, username);
    } catch (error) {
      alert("No se pudo acceder a la cámara/micrófono. Por favor, otorga los permisos necesarios.");
      return;
    }

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', username: username }));
      updateUI(true);
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'existing-users':
          for (const user of data.users) {
            if (username > user)
              await createPeerConnection(user, true);
          }
          break;

        case 'user-joined':
          if (username > data.username)
            await createPeerConnection(data.username, true);

          break;

        case 'offer':
          if (!peerConnections[data.from])
            await createPeerConnection(data.from, false);

          try {
            const pc = peerConnections[data.from];

            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            await createAnswer(data.from);
          } catch (error) { throw new Error(error, data.from); }
          break;

        case 'answer':
          try {
            const pc = peerConnections[data.from];
            if (pc.signalingState === "stable") return;

            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          } catch (error) { throw new Error(error, data.from); }
          break;

        case 'candidate':
          try {
            const pc = peerConnections[data.from];
            if (pc) {
              if (pc.remoteDescription)
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              else {
                if (!pc.pendingCandidates) pc.pendingCandidates = [];
                pc.pendingCandidates.push(data.candidate);
              }
            }
          } catch (error) { throw new Error(error, data.from); }
          break;

        case 'user-left':
          removeVideoStream(data.username);
          if (peerConnections[data.username]) {
            peerConnections[data.username].close();
            delete peerConnections[data.username];
          }
          updateConnectionStatus();
          break;
      }
    };

    ws.onerror = (error) => {
      alert('Error de conexión con el servidor');
    };

    ws.onclose = () => {
      cleanup();
    };
  };

  const createPeerConnection = async (peerUsername, isInitiator) => {
    const pc = new RTCPeerConnection(peerConnectionConfig);
    peerConnections[peerUsername] = pc;
    pc.pendingCandidates = [];

    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        addVideoStream(event.streams[0], peerUsername);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(JSON.stringify({
          type: 'candidate',
          to: peerUsername,
          from: username,
          candidate: event.candidate
        }));
      }
    };

    pc.onconnectionstatechange = () => updateConnectionStatus();

    pc.oniceconnectionstatechange = () => updateConnectionStatus();

    if (isInitiator) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({
          type: 'offer',
          to: peerUsername,
          from: username,
          offer: pc.localDescription
        }));
      } catch (error) { throw new Error(error, peerUsername); }
    }
  };

  const createAnswer = async (peerUsername) => {
    try {
      const pc = peerConnections[peerUsername];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      ws.send(JSON.stringify({
        type: 'answer',
        to: peerUsername,
        from: username,
        answer: pc.localDescription
      }));

      if (pc.pendingCandidates && pc.pendingCandidates.length > 0) {
        for (const candidate of pc.pendingCandidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pc.pendingCandidates = [];
      }
    } catch (error) { throw new Error(error, peerUsername); }
  };

  const cleanup = () => {
    updateUI(false);

    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
      localStream = null;
    }

    Object.keys(peerConnections).forEach(peer => {
      peerConnections[peer].close();
    });
    peerConnections = {};

    videoGrid.innerHTML = '';
    updateConnectionStatus();
  };

  btnConnect.addEventListener('click', connectToServer);

  window.addEventListener('beforeunload', () => {
    if (ws) ws.close();
    cleanup();
  });

  updateUI(false);
  updateConnectionStatus();
});