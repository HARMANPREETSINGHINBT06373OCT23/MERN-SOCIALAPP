import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {
    token: localStorage.getItem("accessToken")
  },
  autoConnect: true
});

export default socket;
