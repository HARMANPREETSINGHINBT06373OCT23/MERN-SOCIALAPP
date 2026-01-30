import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { io } from "socket.io-client";

import App from "./App";
import { store } from "./store/store";
import "./index.css";

// socket.io connection
const socket = io("http://localhost:5000", {
  auth: {
    token: localStorage.getItem("accessToken"),
  },
});

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
      <Toaster position="top-center" />
    </BrowserRouter>
  </Provider>
);
