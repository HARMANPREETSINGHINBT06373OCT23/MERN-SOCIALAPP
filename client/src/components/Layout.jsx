import { NavLink, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux"; // Added useSelector
import {
  Menu,
  LogOut,
  Home,
  User,
  PlusSquare,
  Settings,
  Search,
  UserCheck,
  ChevronRight,
  X,
  Check,
  Undo2
} from "lucide-react";
import { logout } from "../store/authSlice";
import { useState, useEffect, useRef } from "react";
import NotificationBell from "./NotificationBell";
import api from "../services/api";
import toast from "react-hot-toast"; // Ensure toast is imported for guest feedback

export default function Layout({ children }) {
  const { isGuest } = useSelector((state) => state.auth); // Get Guest Status
  const [open, setOpen] = useState(false); // Mobile Hamburger State
  const [showSuggested, setShowSuggested] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [followingStates, setFollowingStates] = useState({});
  
  // Undo Logic
  const [lastDismissed, setLastDismissed] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimer = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Fetch Suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      // 🛑 GUEST CHECK: Don't call API if guest
      if (isGuest) {
        setSuggestions([
          { _id: "d1", username: "demo_user", avatar: "" },
          { _id: "d2", username: "guest_explorer", avatar: "" }
        ]);
        return;
      }

      try {
        const res = await api.get("/users/suggestions");
        setSuggestions(res.data);
      } catch (err) {
        console.error("Layout suggestions error:", err);
      }
    };
    fetchSuggestions();
  }, [isGuest]); // Re-run if guest status changes

  const handleFollow = async (userId) => {
    // 🛑 GUEST CHECK
    if (isGuest) {
      toast.error("Login to follow users");
      return;
    }

    setFollowingStates(prev => ({ ...prev, [userId]: 'loading' }));
    try {
      await api.post(`/users/follow/${userId}`);
      setFollowingStates(prev => ({ ...prev, [userId]: 'following' }));
      setTimeout(() => {
        setSuggestions(prev => prev.filter(u => u._id !== userId));
      }, 2000);
    } catch (err) {
      setFollowingStates(prev => ({ ...prev, [userId]: null }));
    }
  };

  const dismissSuggestion = (user) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setLastDismissed(user);
    setSuggestions(prev => prev.filter(u => u._id !== user._id));
    setShowUndo(true);
    undoTimer.current = setTimeout(() => {
      setShowUndo(false);
      setLastDismissed(null);
    }, 5000);
  };

  const handleUndo = () => {
    if (lastDismissed) {
      setSuggestions(prev => [lastDismissed, ...prev]);
      setShowUndo(false);
      setLastDismissed(null);
      if (undoTimer.current) clearTimeout(undoTimer.current);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  // Helper for NavLinks to close mobile menu on click
  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink 
      to={to} 
      onClick={() => setOpen(false)}
      className={({ isActive }) => `flex items-center gap-3 px-4 py-2 rounded-lg transition ${isActive ? "bg-black text-white" : "hover:bg-neutral-100"}`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen flex bg-neutral-50 relative overflow-x-hidden">
      
      {/* UNDO TOAST */}
      {showUndo && (
        <div className="fixed bottom-20 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-neutral-900 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm">Removed.</span>
          <button onClick={handleUndo} className="text-yellow-400 text-sm font-bold flex items-center gap-1">
            <Undo2 size={14} /> UNDO
          </button>
          <button onClick={() => setShowUndo(false)} className="text-gray-400"><X size={14}/></button>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-white p-4 sticky top-0 h-screen">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">SocialApp</h1>
          <NotificationBell />
        </div>
        <nav className="space-y-2">
          <NavItem to="/" icon={Home} label="Home" />
          <NavItem to="/search" icon={Search} label="Search" />
          <button
            onClick={() => setShowSuggested(!showSuggested)}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${showSuggested ? "bg-blue-50 text-blue-600 font-semibold" : "hover:bg-neutral-100"}`}
          >
            <UserCheck size={20} />
            <span className="flex-1 text-left">Suggested</span>
            <ChevronRight size={16} className={`transition-transform ${showSuggested ? "rotate-90" : ""}`} />
          </button>
          <NavItem to="/create" icon={PlusSquare} label="Create" />
          <NavItem to="/profile" icon={User} label="Profile" />
          <NavItem to="/settings" icon={Settings} label="Settings" />
        </nav>
        <button onClick={handleLogout} className="mt-auto flex items-center gap-2 text-red-600 px-4 py-2 hover:bg-red-50 rounded-lg">
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* MAIN LAYOUT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* MOBILE HEADER */}
        <header className="md:hidden sticky top-0 z-50 h-14 border-b bg-white flex items-center px-4 justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setOpen(!open)} 
              className="p-1 hover:bg-neutral-100 rounded"
              aria-label="Toggle Menu"
            >
              {open ? <X /> : <Menu />}
            </button>
            <span className="font-bold">SocialApp</span>
          </div>
          <NotificationBell />
        </header>

        {/* MOBILE SIDEBAR OVERLAY */}
        <div className={`fixed inset-0 z-40 md:hidden transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <nav className="relative w-64 h-full bg-white p-4 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <span className="text-xl font-bold">Menu</span>
              <button onClick={() => setOpen(false)}><X /></button>
            </div>
            <div className="space-y-3">
              <NavItem to="/" icon={Home} label="Home" />
              <NavItem to="/search" icon={Search} label="Search" />
              <button
                onClick={() => { setShowSuggested(!showSuggested); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-neutral-100"
              >
                <UserCheck size={20} /> <span>Suggested</span>
              </button>
              <NavItem to="/create" icon={PlusSquare} label="Create" />
              <NavItem to="/profile" icon={User} label="Profile" />
              <NavItem to="/settings" icon={Settings} label="Settings" />
            </div>
            <button onClick={handleLogout} className="mt-auto flex items-center gap-2 text-red-600 px-4 py-2">
              <LogOut size={18} /> Logout
            </button>
          </nav>
        </div>

        {/* SUGGESTED BAR (Shared for Mobile & Desktop) */}
        {showSuggested && suggestions.length > 0 && (
          <div className="bg-white border-b border-neutral-200 animate-in slide-in-from-top duration-300 z-30 relative">
            <div className="max-w-4xl mx-auto py-5 px-4 sm:px-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                   <p className="font-bold text-sm text-gray-800">Suggested for you {isGuest && "(Demo)"}</p>
                   <Link to="/search" onClick={() => setShowSuggested(false)} className="text-blue-500 text-xs font-bold flex items-center">
                     See All <ChevronRight size={14} />
                   </Link>
                </div>
                <button onClick={() => setShowSuggested(false)} className="p-1 hover:bg-neutral-100 rounded-full">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {suggestions.map((u) => (
                  <div key={u._id} className="min-w-[150px] bg-white border rounded-xl p-4 flex flex-col items-center relative shadow-sm group">
                    <button 
                      onClick={() => dismissSuggestion(u)}
                      className="absolute top-2 right-2 text-gray-300 hover:text-gray-600"
                    >
                      <X size={15} />
                    </button>
                    <Link to={`/profile/${u.username}`} className="mb-2">
                      <img 
                        src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}&background=random`} 
                        className="w-14 h-14 rounded-full object-cover border" 
                      />
                    </Link>
                    <span className="text-xs font-bold mb-3 truncate w-full text-center">{u.username}</span>
                    <button 
                      onClick={() => handleFollow(u._id)}
                      disabled={followingStates[u._id] === 'following' || followingStates[u._id] === 'loading'}
                      className={`w-full py-1.5 rounded-lg text-[10px] font-bold ${
                        followingStates[u._id] === 'following' ? 'bg-gray-100 text-gray-500' : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {followingStates[u._id] === 'loading' ? '...' : followingStates[u._id] === 'following' ? 'Following' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className="p-4 max-w-5xl mx-auto w-full min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}