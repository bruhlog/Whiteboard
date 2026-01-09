const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const cors = require("cors");
const rooms = {};
const BOARDS_DIR = path.join(__dirname, "boards");

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
  console.log("Connected:", socket.id);

  socket.on("join-room", (roomId) => {
  socket.join(roomId);
  console.log(`User joined room ${roomId}`);

  // If room not in memory, load from disk
  if (!rooms[roomId]) {
    const savedStrokes = loadBoardFromFile(roomId);

    rooms[roomId] = {
      strokes: savedStrokes || [],
      redo: []
    };
  }

  // Send existing strokes ONLY to joining user
  socket.emit("rebuild", rooms[roomId].strokes);
});
socket.on("save-board", (roomId) => {
  const room = rooms[roomId];
  if (!room) return;

  saveBoardToFile(roomId, room.strokes);
  console.log(`Board ${roomId} saved`);
});


  socket.on("draw-start", (data) => {
  const { roomId } = data;

  if (!rooms[roomId]) {
    rooms[roomId] = { strokes: [], redo: [] };
  }

  rooms[roomId].strokes.push({
    points: [{ x: data.x, y: data.y }],
    color: data.color,
    size: data.size
  });

  socket.to(roomId).emit("draw-start", data);
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

