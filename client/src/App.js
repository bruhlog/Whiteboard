import { useState } from "react";
import Whiteboard from "./Whiteboard";
import socket from "./socket";

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get("invite");
  
  
socket.emit("join-room", {
  roomId,
  inviteToken
});

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
