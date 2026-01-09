import { useRef, useState, useEffect } from "react";
import socket from "./socket";
import Toolbar from "./Toolbar";

function Whiteboard({ roomId }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(3);

  // Cursor positions of other users
  const [cursors, setCursors] = useState({});

  /* =======================
     CANVAS INITIALIZATION
  ======================= */
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 800;
    canvas.height = 500;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctxRef.current = ctx;

    /* ---- DRAW EVENTS ---- */
    socket.on("draw-start", ({ x, y, color, size }) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.moveTo(x, y);
    });

    socket.on("draw-move", ({ x, y }) => {
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    /* ---- UNDO / REDO REBUILD ---- */
    socket.on("rebuild", (strokes) => {
      redrawAll(strokes);
    });

    /* ---- CLEAR BOARD ---- */
    socket.on("clear-board", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    /* ---- CURSOR PRESENCE ---- */
    socket.on("cursor", ({ id, x, y }) => {
      setCursors((prev) => ({
        ...prev,
        [id]: { x, y }
      }));
    });

    return () => {
      socket.off("draw-start");
      socket.off("draw-move");
      socket.off("rebuild");
      socket.off("clear-board");
      socket.off("cursor");
    };
  }, []);

  /* =======================
     REDRAW ALL STROKES
  ======================= */
  const redrawAll = (strokes) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach((stroke) => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;

      stroke.points.forEach((p, index) => {
        if (index === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });

      ctx.stroke();
    });
  };

  /* =======================
     LOCAL DRAWING
  ======================= */
  const startDrawing = (e) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    ctxRef.current.beginPath();
    ctxRef.current.strokeStyle = color;
    ctxRef.current.lineWidth = size;
    ctxRef.current.moveTo(x, y);

    socket.emit("draw-start", {
      roomId,
      x,
      y,
      color,
      size
    });

    setDrawing(true);
  };

  const draw = (e) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    // Cursor broadcast (even if not drawing)
    socket.emit("cursor", { roomId, x, y });

    if (!drawing) return;

    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();

    socket.emit("draw-move", { roomId, x, y });
  };

  const stopDrawing = () => {
  setDrawing(false);
  socket.emit("draw-end", roomId);
};
const createInvite = () => {
  socket.emit("create-invite", roomId, (token) => {
    const link = `${window.location.origin}/?room=${roomId}&invite=${token}`;
    alert("Invite link:\n" + link);
  });
};


  /* =======================
     TOOLBAR ACTIONS
  ======================= */
  const clearBoard = () => {
    socket.emit("clear-board", roomId);
  };

  const undo = () => {
    socket.emit("undo", roomId);
  };

  const redo = () => {
    socket.emit("redo", roomId);
  };
  const saveBoard = () => {
  socket.emit("save-board", roomId);
};


  /* =======================
     RENDER
  ======================= */
  return (
    <div style={{ position: "relative" }}>
      <Toolbar
        color={color}
        setColor={setColor}
        size={size}
        setSize={setSize}
        clear={clearBoard}
        undo={undo}
        redo={redo}
      />

      <canvas
        ref={canvasRef}
        style={{ border: "1px solid black" }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />

      {/* Other users' cursors */}
      {Object.entries(cursors).map(([id, c]) => (
        <div
          key={id}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            width: 8,
            height: 8,
            background: "red",
            borderRadius: "50%",
            pointerEvents: "none"
          }}
        />
      ))}
    </div>
  );
}

export default Whiteboard;
