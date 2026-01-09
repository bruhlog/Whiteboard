const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const cors = require("cors");
const rooms = {};
const BOARDS_DIR = path.join(__dirname, "boards");
const users = {};
const boards = {};
const invites = {};


const getBoardPath = (roomId) =>
  path.join(BOARDS_DIR, `${roomId}.json`);

const saveBoardToFile = (roomId, strokes) => {
  fs.writeFileSync(
    getBoardPath(roomId),
    JSON.stringify(strokes, null, 2)
  );
};

const loadBoardFromFile = (roomId) => {
  const file = getBoardPath(roomId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file));
};


const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});
app.get("/", (req, res) => {
  res.send("Whiteboard server running");
});


io.on("connection", (socket) => {
  const user = socket.handshake.auth.user;

  if (!user || !user.id) {
    socket.disconnect();
    return;
  }

  socket.user = user;
  users[socket.id] = user;
  console.log("Connected:", user.name, socket.id);
  socket.on("join-room", ({ roomId, inviteToken }) => {
  // Create board if doesn't exist
  if (!boards[roomId]) {
    boards[roomId] = {
      ownerId: socket.user.id,
      members: [socket.user.id]
    };
  }

  const board = boards[roomId];

  // If not owner, must have valid invite
  if (
    board.ownerId !== socket.user.id &&
    !board.members.includes(socket.user.id)
  ) {
    const invite = invites[inviteToken];
    if (!invite || invite.roomId !== roomId) {
      socket.emit("error", "Invalid invite");
      return;
    }
    board.members.push(socket.user.id);
  }

  socket.join(roomId);

  // Load strokes
  if (!rooms[roomId]) {
    const savedStrokes = loadBoardFromFile(roomId);
    rooms[roomId] = {
      strokes: savedStrokes || [],
      redo: []
    };
  }

  socket.emit("rebuild", rooms[roomId].strokes);
});
const crypto = require("crypto");

socket.on("create-invite", (roomId, callback) => {
  const board = boards[roomId];
  if (!board) return;

  if (board.ownerId !== socket.user.id) return;

  const token = crypto.randomBytes(16).toString("hex");

  invites[token] = {
    roomId,
    createdAt: Date.now()
  };

  callback(token);
});

socket.on("save-board", (roomId) => {
  const room = rooms[roomId];
  if (!room) return;

  saveBoardToFile(roomId, room.strokes);
  console.log(`Board ${roomId} saved`);
});


socket.on("draw-start", (data) => {
  const board = boards[data.roomId];
  if (!board || !board.members.includes(socket.user.id)) return;

  if (!rooms[data.roomId]) {
    rooms[data.roomId] = { strokes: [], redo: [] };
  }

  rooms[data.roomId].strokes.push({
    points: [{ x: data.x, y: data.y }],
    color: data.color,
    size: data.size,
    userId: socket.user.id
  });

  socket.to(data.roomId).emit("draw-start", data);
});


socket.on("draw-end", (roomId) => {
  const room = rooms[roomId];
  if (!room) return;

  saveBoardToFile(roomId, room.strokes);
});


socket.on("draw-move", ({ roomId, x, y }) => {
  const room = rooms[roomId];
  if (!room) return;

  room.strokes[room.strokes.length - 1].points.push({ x, y });

  socket.to(roomId).emit("draw-move", { x, y });
});
socket.on("undo", (roomId) => {
  const room = rooms[roomId];
  if (!room || room.strokes.length === 0) return;

  const stroke = room.strokes.pop();
  room.redo.push(stroke);

  io.to(roomId).emit("rebuild", room.strokes);
});

socket.on("redo", (roomId) => {
  const room = rooms[roomId];
  if (!room || room.redo.length === 0) return;

  const stroke = room.redo.pop();
  room.strokes.push(stroke);

  io.to(roomId).emit("rebuild", room.strokes);
});


  socket.on("clear-board", (roomId) => {
    io.to(roomId).emit("clear-board");
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

