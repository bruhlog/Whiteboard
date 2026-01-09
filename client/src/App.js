import { useState } from "react";
import Whiteboard from "./Whiteboard";
import socket from "./socket";

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);

  const joinRoom = () => {
    if (!roomId) return;
    socket.emit("join-room", roomId);
    setJoined(true);
  };

  return (
    <div style={{ padding: 20 }}>
      {!joined ? (
        <>
          <h2>Join Whiteboard</h2>
          <input
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={joinRoom}>Join</button>
        </>
      ) : (
        <Whiteboard roomId={roomId} />
      )}
    </div>
  );
}

export default App;
