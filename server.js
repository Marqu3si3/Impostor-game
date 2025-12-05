import WebSocket, { WebSocketServer } from "ws";

const PORT = process.env.PORT || 10000;
const wss = new WebSocketServer({ port: PORT });

console.log("Servidor WebSocket rodando na porta", PORT);

let rooms = {};

function sendToRoom(roomCode, data) {
    wss.clients.forEach(ws => {
        if (ws.roomCode === roomCode) {
            ws.send(JSON.stringify(data));
        }
    });
}

wss.on("connection", ws => {

    ws.on("message", msg => {
        let data = JSON.parse(msg);

        // ----------- CRIAR SALA ----------- //
        if (data.type === "createRoom") {

            let code = Math.random().toString(36).substring(2, 6).toUpperCase();
            ws.roomCode = code;

            rooms[code] = {
                players: [{ id: data.playerId, nickname: data.nickname }],
                tips: {},
                votes: {}
            };

            ws.send(JSON.stringify({ type: "roomCreated", roomCode: code }));
            sendToRoom(code, { type: "playerList", players: rooms[code].players });
        }

        // ----------- ENTRAR NA SALA ----------- //
        if (data.type === "joinRoom") {

            if (!rooms[data.roomCode]) {
                ws.send(JSON.stringify({ type: "error", message: "Sala inexistente" }));
                return;
            }

            ws.roomCode = data.roomCode;
            rooms[data.roomCode].players.push({ id: data.playerId, nickname: data.nickname });

            sendToRoom(data.roomCode, {
                type: "playerList",
                players: rooms[data.roomCode].players
            });
        }

        // ----------- INICIAR PARTIDA ----------- //
        if (data.type === "startGame") {

            let room = rooms[data.roomCode];
            if (!room) return;

            let impostorIndex = Math.floor(Math.random() * room.players.length);
            let impostor = room.players[impostorIndex];

            // Envia papéis individualmente
            wss.clients.forEach(client => {
                if (client.roomCode === data.roomCode) {
                    let isImpostor = room.players.find(p => p.id === client.id) === impostor;

                    client.send(JSON.stringify({
                        type: "role",
                        role: isImpostor ? "impostor" : "civil"
                    }));
                }
            });

            sendToRoom(data.roomCode, { type: "gameStarted" });
        }

        // ----------- RECEBER DICA ----------- //
        if (data.type === "sendTip") {
            rooms[data.roomCode].tips[data.playerId] = data.tip;
            sendToRoom(data.roomCode, { type: "tipsUpdated", tips: rooms[data.roomCode].tips });
        }

        // ----------- VOTAR ----------- //
        if (data.type === "vote") {
            rooms[data.roomCode].votes[data.playerId] = data.vote;
            sendToRoom(data.roomCode, { type: "votesUpdated", votes: rooms[data.roomCode].votes });
        }

    });

    // ----------- DESCONECTAR ----------- //
    ws.on("close", () => {
        if (!ws.roomCode || !rooms[ws.roomCode]) return;

        rooms[ws.roomCode].players = rooms[ws.roomCode].players.filter(p => p.id !== ws.id);

        sendToRoom(ws.roomCode, {
            type: "playerList",
            players: rooms[ws.roomCode].players
        });
    });

});
