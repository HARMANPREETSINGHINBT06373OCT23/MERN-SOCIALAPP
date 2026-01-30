import axios from "axios";
import store from "../store/store";
import { logout } from "../store/authSlice";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

// REQUEST INTERCEPTOR
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const { token, isGuest } = state.auth;

    /**
     * IMPORTANT:
     * - Real users → send JWT
     * - Guest users → DO NOT send Authorization header
     */
    if (token && !isGuest) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;
