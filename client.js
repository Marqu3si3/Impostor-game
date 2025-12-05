let ws;
let nickname = "";
let roomCode = "";
let playerId = Math.random().toString(36).substring(2, 10);

const WEBSOCKET_URL = "wss://impostor-game-xi10.onrender.com";


// -------------------- UTIL -------------------- //

function show(id) {
    document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function goToMenu() {
    nickname = document.getElementById('nickname').value.trim();
    if (!nickname) return alert("Digite um nickname");
    show('menuScreen');
}

function backToMenu() {
    show('menuScreen');
}

function showJoinRoom() {
    show('joinRoomScreen');
}

// -------------------- WEBSOCKET -------------------- //

function connectWS() {
    ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
        console.log("Conectado ao servidor WebSocket");
    };

    ws.onmessage = (msg) => {
        let data = JSON.parse(msg.data);

        // Sala criada
        if (data.type === "roomCreated") {
            roomCode = data.roomCode;
            document.getElementById("roomCodeDisplay").innerText = roomCode;
            show('lobbyScreen');
        }

        // Atualização dos jogadores
        if (data.type === "playerList") {
            let ul = document.getElementById('playerList');
            ul.innerHTML = "";
            data.players.forEach(p => {
                let li = document.createElement('li');
                li.innerText = p.nickname;
                ul.appendChild(li);
            });
        }

        // Entrou na sala existente
        if (data.type === "joinedRoom") {
            show('lobbyScreen');
        }

        // Papel do jogador (impostor/civil)
        if (data.type === "role") {
            document.getElementById("roleDisplay").innerText = 
                data.role === "impostor" ? "Você é o IMPOSTOR!" : "Você é Civil";
            show("roleScreen");
        }

        // Início do jogo
        if (data.type === "gameStarted") {
            show("gameScreen");
        }

        // Recebendo dicas
        if (data.type === "tipsUpdated") {
            let list = document.getElementById("tipsList");
            list.innerHTML = "";
            for (let p in data.tips) {
                let li = document.createElement("li");
                li.innerText = data.tips[p];
                list.appendChild(li);
            }
        }

        // Recebendo votos
        if (data.type === "votesUpdated") {
            let list = document.getElementById("voteList");
            list.innerHTML = "";
            for (let p in data.votes) {
                let li = document.createElement("li");
                li.innerText = data.votes[p];
                list.appendChild(li);
            }
        }

        // Sala inválida
        if (data.type === "error") {
            alert(data.message);
        }
    };

    ws.onclose = () => {
        console.log("WS desconectado. Tentando reconectar...");
        setTimeout(connectWS, 1000);
    };
}

// -------------------- AÇÕES -------------------- //

function createRoom() {
    connectWS();
    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: "createRoom",
            nickname,
            playerId
        }));
    };
}

function joinRoom() {
    let code = document.getElementById("joinCode").value.toUpperCase();
    if (!code) return;

    connectWS();
    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: "joinRoom",
            roomCode: code,
            nickname,
            playerId
        }));
    };
}

function startGame() {
    ws.send(JSON.stringify({
        type: "startGame",
        roomCode
    }));
}

function sendTip() {
    let tip = document.getElementById("tipInput").value.trim();
    if (!tip) return;
    ws.send(JSON.stringify({
        type: "sendTip",
        roomCode,
        playerId,
        tip
    }));
}

function votePlayer() {
    let vote = document.getElementById("voteInput").value.trim();
    if (!vote) return;
    ws.send(JSON.stringify({
        type: "vote",
        roomCode,
        playerId,
        vote
    }));
}
