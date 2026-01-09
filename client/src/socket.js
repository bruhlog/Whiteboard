import { io } from "socket.io-client";
import { getUser } from "./auth";

const user = getUser();
const socket = io(process.env.REACT_APP_SOCKET_URL, {
  auth: {
    user
  }
});


export default socket;
