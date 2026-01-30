import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: JSON.parse(localStorage.getItem("user")),
  token: localStorage.getItem("accessToken"),
  isAuth: !!localStorage.getItem("accessToken"),
  isGuest: localStorage.getItem("guest") === "true"
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuth = true;
      state.isGuest = false;

      localStorage.setItem("accessToken", action.payload.token);
      localStorage.setItem("user", JSON.stringify(action.payload.user));
      localStorage.removeItem("guest");
    },

    setGuest(state) {
      state.user = { username: "Guest" };
      state.token = "guest";
      state.isAuth = true;
      state.isGuest = true;

      localStorage.setItem("guest", "true");
    },

    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuth = false;
      state.isGuest = false;

      localStorage.clear();
    }
  }
});

export const { setAuth, setGuest, logout } = authSlice.actions;
export default authSlice.reducer;
