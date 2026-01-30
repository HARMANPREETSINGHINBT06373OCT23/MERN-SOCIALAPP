import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Menu,
  LogOut,
  Home,
  User,
  PlusSquare,
  Settings,
  Search
} from "lucide-react";
import { logout } from "../store/authSlice";
import { useState } from "react";
import NotificationBell from "./NotificationBell";

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const LinkItem = ({ to, label, Icon }) => (
    <NavLink
      to={to}
      onClick={() => setOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2 rounded-lg transition ${
          isActive
            ? "bg-black text-white"
            : "hover:bg-neutral-100"
        }`
      }
    >
      <Icon size={20} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-white p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">SocialApp</h1>
          <NotificationBell />
        </div>

        <nav className="space-y-2">
          <LinkItem to="/" label="Home" Icon={Home} />
          <LinkItem to="/search" label="Search" Icon={Search} /> {/* ✅ ADDED */}
          <LinkItem to="/create" label="Create" Icon={PlusSquare} />
          <LinkItem to="/profile" label="Profile" Icon={User} />
          <LinkItem to="/settings" label="Settings" Icon={Settings} />
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-2 text-red-600 hover:opacity-80"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">
        {/* MOBILE HEADER */}
        <header className="md:hidden sticky top-0 z-40 h-14 border-b bg-white flex items-center px-4">
          <button onClick={() => setOpen(!open)}>
            <Menu />
          </button>
          <div className="flex items-center gap-3 ml-3">
            <span className="font-semibold">SocialApp</span>
            <NotificationBell />
          </div>
        </header>

        {/* MOBILE MENU */}
        {open && (
          <div className="md:hidden bg-white border-b p-3 space-y-2">
            <LinkItem to="/" label="Home" Icon={Home} />
            <LinkItem to="/search" label="Search" Icon={Search} /> {/* ✅ ADDED */}
            <LinkItem to="/create" label="Create" Icon={PlusSquare} />
            <LinkItem to="/profile" label="Profile" Icon={User} />
            <LinkItem to="/settings" label="Settings" Icon={Settings} />

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 mt-2"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        )}

        {/* PAGE CONTENT */}
        <main className="p-4 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
