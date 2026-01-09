import { useRef, useState, useEffect } from "react";
import socket from "./socket";
import Toolbar from "./Toolbar";

function Whiteboard({ roomId }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
const strokesCacheRef = useRef([]);
const currentStrokeRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(3);
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;
const ZOOM_SPEED = 0.001;

  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });

  // Cursor positions of other users
  const [cursors, setCursors] = useState({});
  const cameraRef = useRef({
  x: 0,
  y: 0,
  scale: 1
  });

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
  strokesCacheRef.current = strokes;
  redrawAll(strokes);
});


    /* ---- CLEAR BOARD ---- */
    socket.on("clear-board", () => {
  strokesCacheRef.current = [];
  redrawAll([]);
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

  useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      isPanningRef.current = true;
    }
  };

  const handleKeyUp = (e) => {
    if (e.code === "Space") {
      isPanningRef.current = false;
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  };
}, []);
useEffect(() => {
  const canvas = canvasRef.current;

  const handleWheel = (e) => {
    e.preventDefault();

    const cam = cameraRef.current;

    // Mouse position in screen space
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    // Convert mouse to world coords BEFORE zoom
    const worldBefore = screenToWorld(mouseX, mouseY);

    // Calculate zoom factor
    let newScale =
      cam.scale * (1 - e.deltaY * ZOOM_SPEED);

    newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));

    cam.scale = newScale;

    // Convert mouse to world coords AFTER zoom
    const worldAfter = screenToWorld(mouseX, mouseY);

    // Adjust camera so world point stays under cursor
    cam.x += (worldAfter.x - worldBefore.x) * cam.scale;
    cam.y += (worldAfter.y - worldBefore.y) * cam.scale;

    // Redraw with new camera
    redrawAll(strokesCacheRef.current);
  };

  canvas.addEventListener("wheel", handleWheel, { passive: false });

  return () => {
    canvas.removeEventListener("wheel", handleWheel);
  };
}, []);



  const screenToWorld = (x, y) => {
  const cam = cameraRef.current;
  return {
    x: (x - cam.x) / cam.scale,
    y: (y - cam.y) / cam.scale
  };
};

const worldToScreen = (x, y) => {
  const cam = cameraRef.current;
  return {
    x: x * cam.scale + cam.x,
    y: y * cam.scale + cam.y
  };
};


  /* =======================
     REDRAW ALL STROKES
  ======================= */
  const redrawAll = (strokes) => {
  const canvas = canvasRef.current;
  const ctx = ctxRef.current;
  const cam = cameraRef.current;

  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(
    cam.scale,
    0,
    0,
    cam.scale,
    cam.x,
    cam.y
  );

  strokes.forEach((stroke) => {
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;

    stroke.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });

    ctx.stroke();
  });
};

  /* =======================
     LOCAL DRAWING
  ======================= */
  const startDrawing = (e) => {
  const { offsetX, offsetY } = e.nativeEvent;

  // 🟡 PAN MODE
  if (isPanningRef.current) {
    lastPanPointRef.current = { x: offsetX, y: offsetY };
    return;
  }

  // ✏️ DRAW MODE
  const { x, y } = screenToWorld(offsetX, offsetY);

  currentStrokeRef.current = {
  points: [{ x, y }],
  color,
  size
};

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
  const { offsetX, offsetY } = e.nativeEvent;

  // 🟡 PAN MODE
  if (isPanningRef.current) {
    const dx = offsetX - lastPanPointRef.current.x;
    const dy = offsetY - lastPanPointRef.current.y;

    cameraRef.current.x += dx;
    cameraRef.current.y += dy;

    lastPanPointRef.current = { x: offsetX, y: offsetY };

    // redraw everything with new camera
    redrawAll(
      // ⚠️ IMPORTANT: use latest strokes from server
      // We rely on last rebuild cache
      strokesCacheRef.current
    );
    return;
  }

  // ✏️ DRAW MODE
  const { x, y } = screenToWorld(offsetX, offsetY);

  socket.emit("cursor", { roomId, x, y });

  if (!drawing) return;

  ctxRef.current.lineTo(x, y);
ctxRef.current.stroke();

currentStrokeRef.current.points.push({ x, y });


  socket.emit("draw-move", { roomId, x, y });
};



  const stopDrawing = () => {
  if (currentStrokeRef.current) {
    strokesCacheRef.current.push(currentStrokeRef.current);
    currentStrokeRef.current = null;
  }
  setDrawing(false);
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
        save={saveBoard}
        invite={createInvite}
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
      {Object.entries(cursors).map(([id, c]) => {
        const { x, y } = worldToScreen(c.x, c.y);

        return (
          <div
            key={id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 8,
              height: 8,
              background: "red",
              borderRadius: "50%",
              pointerEvents: "none"
            }}
          />
        );
      })}
    </div>
  );
}

export default Whiteboard;
