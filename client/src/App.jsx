import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

/* ---------- AUTH PAGES ---------- */
import Login from "./pages/Login";
import Register from "./pages/Register";
import Forgot from "./pages/Forgot";
import ResetPassword from "./pages/ResetPassword";

/* ---------- APP PAGES ---------- */
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";
import CreatePost from "./pages/CreatePost";
import Settings from "./pages/Settings";
import Search from "./pages/Search"; // ✅ ADDED

/* ---------- LAYOUT ---------- */
import Layout from "./components/Layout";

export default function App() {
  const { isAuth } = useSelector(state => state.auth);

  return (
    <Routes>
      {/* ================= AUTH ROUTES ================= */}
      <Route
        path="/login"
        element={!isAuth ? <Login /> : <Navigate to="/" />}
      />

      <Route
        path="/register"
        element={!isAuth ? <Register /> : <Navigate to="/" />}
      />

      <Route path="/forgot" element={<Forgot />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* ================= PROTECTED ROUTES ================= */}
      <Route
        path="/profile-setup"
        element={isAuth ? <ProfileSetup /> : <Navigate to="/login" />}
      />

      {/* ================= MAIN APP ================= */}
      <Route
        path="/"
        element={
          isAuth ? (
            <Layout>
              <Home />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* ✅ SEARCH */}
      <Route
        path="/search"
        element={
          isAuth ? (
            <Layout>
              <Search />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* ✅ MY PROFILE */}
      <Route
        path="/profile"
        element={
          isAuth ? (
            <Layout>
              <Profile />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* ✅ OTHER USERS PROFILE */}
      <Route
        path="/profile/:username"
        element={
          isAuth ? (
            <Layout>
              <Profile />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* ✅ CREATE POST */}
      <Route
        path="/create"
        element={
          isAuth ? (
            <Layout>
              <CreatePost />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* ✅ SETTINGS */}
      <Route
        path="/settings"
        element={
          isAuth ? (
            <Layout>
              <Settings />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* ================= FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
