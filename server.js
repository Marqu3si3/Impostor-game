import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 10000;

let rooms = {};

// --------------------------------------------
// Função para enviar dados para todos na sala
// --------------------------------------------
function sendToRoom(roomCode, data) {
    wss.clients.forEach(ws => {
        if (ws.roomCode === roomCode && ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(data));
        }
    });
}

// --------------------------------------------
// Conexão WebSocket
// --------------------------------------------
wss.on("connection", ws => {
    ws.on("message", msg => {
        let data = JSON.parse(msg);

        // -------------------------------
        // Criar sala
        // -------------------------------
        if (data.type === "createRoom") {
            let code = Math.random().toString(36).substring(2, 6).toUpperCase();
            ws.roomCode = code;
            ws.playerId = data.playerId;

            rooms[code] = {
                players: [{ id: data.playerId, nickname: data.nickname }],
                tips: {},
                votes: {}
            };

            ws.send(JSON.stringify({ type: "roomCreated", roomCode: code }));
            sendToRoom(code, { type: "playerList", players: rooms[code].players });
        }

        // -------------------------------
        // Entrar em sala existente
        // -------------------------------
        if (data.type === "joinRoom") {
            if (!rooms[data.roomCode]) {
                ws.send(JSON.stringify({ type: "error", message: "Sala não existe!" }));
                return;
            }

            ws.roomCode = data.roomCode;
            ws.playerId = data.playerId;

            rooms[data.roomCode].players.push({
                id: data.playerId,
                nickname: data.nickname
            });

            ws.send(JSON.stringify({ type: "joinedRoom" }));
            sendToRoom(data.roomCode, { type: "playerList", players: rooms[data.roomCode].players });
        }

        // -------------------------------
        // Iniciar jogo (escolher impostor)
        // -------------------------------
        if (data.type === "startGame") {
            let room = rooms[data.roomCode];
            if (!room) return;

            let impostorIndex = Math.floor(Math.random() * room.players.length);
            let impostorId = room.players[impostorIndex].id;

            wss.clients.forEach(client => {
                if (client.roomCode === data.roomCode) {
                    let role = client.playerId === impostorId ? "impostor" : "civil";
                    client.send(JSON.stringify({ type: "role", role }));
                }
            });

            sendToRoom(data.roomCode, { type: "gameStarted" });
        }

        // -------------------------------
        // Receber dica
        // -------------------------------
        if (data.type === "sendTip") {
            let room = rooms[data.roomCode];
            if (!room) return;

            room.tips[data.playerId] = data.tip;

            sendToRoom(data.roomCode, {
                type: "tipsUpdated",
                tips: room.tips
            });
        }

        // -------------------------------
        // Votar
        // -------------------------------
        if (data.type === "vote") {
            let room = rooms[data.roomCode];
            if (!room) return;

            room.votes[data.playerId] = data.vote;

            sendToRoom(data.roomCode, {
                type: "votesUpdated",
                votes: room.votes
            });
        }
    });

    // --------------------------------------------
    // Desconexão
    // --------------------------------------------
    ws.on("close", () => {
        if (!ws.roomCode || !rooms[ws.roomCode]) return;

        let room = rooms[ws.roomCode];
        room.players = room.players.filter(p => p.id !== ws.playerId);

        sendToRoom(ws.roomCode, {
            type: "playerList",
            players: room.players
        });
    });
});

// --------------------------------------------
// Inicia o servidor HTTP + WS
// --------------------------------------------
server.listen(PORT, () => {
    console.log("Servidor WebSocket rodando na porta " + PORT);
});
