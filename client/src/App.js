import { useState } from "react";
import Whiteboard from "./Whiteboard";
import socket from "./socket";

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);

  // Read invite token from URL (if any)
  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get("invite");

  const joinRoom = () => {
    if (!roomId) {
      alert("Please enter a Room ID");
      return;
    }

    socket.emit("join-room", {
      roomId,
      inviteToken
    });

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
