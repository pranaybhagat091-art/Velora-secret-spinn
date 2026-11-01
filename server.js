const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-before-deploying";

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true }));

// Demo-friendly in-memory rooms. Rooms reset if the server restarts.
const rooms = new Map();
const clean = (s, max=40) => String(s || "").replace(/[<>]/g, "").trim().slice(0, max);
const roomCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

function publicState(room) {
  return {
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name })),
    current: room.current,
    question: room.question,
    chat: room.chat.slice(-80)
  };
}
function emitState(code) {
  const room = rooms.get(code);
  if (room) io.to(code).emit("state", publicState(room));
}
function addChat(room, name, message, system=false) {
  room.chat.push({ name, message, system, at: Date.now() });
  room.chat = room.chat.slice(-100);
}

io.on("connection", socket => {
  socket.on("createRoom", ({ name, password }, cb) => {
    if (password !== ADMIN_PASSWORD) return cb?.({ error: "Admin password is incorrect." });
    const code = roomCode();
    const room = { code, adminId: socket.id, players: new Map(), questions: [], question: "", current: null, chat: [] };
    rooms.set(code, room);
    joinRoom(socket, room, name, true);
    cb?.({ code, admin: true });
  });

  socket.on("joinRoom", ({ code, name, password }, cb) => {
    code = clean(code, 8).toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb?.({ error: "Room not found. Check the room code." });
    const isAdmin = password === ADMIN_PASSWORD && room.adminId === socket.id;
    joinRoom(socket, room, name, isAdmin);
    cb?.({ ok: true, admin: isAdmin, state: publicState(room) });
  });

  function joinRoom(sock, room, rawName, isAdmin) {
    const name = clean(rawName, 20) || "Player";
    sock.join(room.code);
    room.players.set(sock.id, { id: sock.id, name, isAdmin });
    sock.data.roomCode = room.code;
    if (isAdmin) room.adminId = sock.id;
    addChat(room, "VELORA", `${name} joined the room.`, true);
    emitState(room.code);
  }

  socket.on("setQuestions", ({ questions }, cb) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.adminId !== socket.id) return cb?.({ error: "Admin access required." });
    const list = Array.isArray(questions) ? questions.map(q => clean(q, 240)).filter(Boolean).slice(0, 200) : [];
    if (!list.length) return cb?.({ error: "Add at least one question." });
    room.questions = list;
    cb?.({ ok: true, count: list.length });
  });

  socket.on("spin", cb => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return cb?.({ error: "Join a room first." });
    const players = [...room.players.values()];
    if (players.length < 2) return cb?.({ error: "At least two players are needed to spin." });
    if (!room.questions.length) return cb?.({ error: "The admin hasn't added any questions yet." });
    const chosen = players[crypto.randomInt(players.length)];
    const question = room.questions[crypto.randomInt(room.questions.length)];
    room.current = chosen.name;
    room.question = question;
    addChat(room, "VELORA", `🍾 The bottle chose ${chosen.name}!`, true);
    addChat(room, "VELORA", `❓ ${question}`, true);
    emitState(room.code);
    cb?.({ ok: true });
  });

  socket.on("chat", ({ message }, cb) => {
    const room = rooms.get(socket.data.roomCode);
    const player = room?.players.get(socket.id);
    const text = clean(message, 500);
    if (!room || !player) return cb?.({ error: "Join a room first." });
    if (!text) return;
    addChat(room, player.name, text);
    emitState(room.code);
    cb?.({ ok: true });
  });

  socket.on("clearChat", cb => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.adminId !== socket.id) return cb?.({ error: "Admin access required." });
    room.chat = [];
    emitState(room.code);
    cb?.({ ok: true });
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    const player = room.players.get(socket.id);
    room.players.delete(socket.id);
    if (room.adminId === socket.id) room.adminId = null;
    if (player) addChat(room, "VELORA", `${player.name} left the room.`, true);
    if (room.players.size === 0) rooms.delete(code);
    else emitState(code);
  });
});

const html = path.join(__dirname, "public", "index.html");
if (!require("fs").existsSync(html)) {
  console.error("Missing public/index.html");
}
server.listen(PORT, () => console.log(`VELORA running on port ${PORT}`));
