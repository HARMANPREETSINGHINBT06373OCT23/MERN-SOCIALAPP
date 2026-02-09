import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Added for navigation
import api from "../services/api";
import { toast } from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";

export default function Settings() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const userId = storedUser?._id || storedUser?.id;

  // --- SETTINGS STATE ---
  const [isPrivate, setIsPrivate] = useState(storedUser?.isPrivate ?? false);
  const [allowMentionsFrom, setAllowMentionsFrom] = useState(storedUser?.settings?.allowMentionsFrom ?? "everyone");
  
  // --- UI & DATA STATE ---
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [unblockTarget, setUnblockTarget] = useState(null);

  // --- DELETE ACCOUNT STATE ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIdentifier, setDeleteIdentifier] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const userRes = await api.get(`/users/${userId}`);
        const userData = userRes.data;

        setIsPrivate(userData.isPrivate);
        if (userData.settings) {
          setAllowMentionsFrom(userData.settings.allowMentionsFrom ?? "everyone");
          const syncUser = { ...storedUser, isPrivate: userData.isPrivate, settings: userData.settings };
          localStorage.setItem("user", JSON.stringify(syncUser));
        }

        const blockedRes = await api.get("/users/search/users?blocked=true").catch(() => ({ data: [] }));
        setBlockedUsers(blockedRes.data || []);
      } catch (err) {
        console.error("Load Settings Error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [userId]);

  const updateSetting = async (key, value, endpoint) => {
    try {
      const res = await api.patch(endpoint, { [key]: value });
      const currentStored = JSON.parse(localStorage.getItem("user")) || {};
      const updatedUser = { ...currentStored };
      
      if (key === "isPrivate") {
        updatedUser.isPrivate = value;
      } else {
        updatedUser.settings = { ...(updatedUser.settings || {}), [key]: value };
      }
      
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return res.data;
    } catch (err) {
      toast.error(`Update failed: ${err.response?.data?.message || "Server Error"}`);
      return null;
    }
  };

  const togglePrivacy = async () => {
    const next = !isPrivate;
    const data = await updateSetting("isPrivate", next, "/users/privacy");
    if (data) {
      setIsPrivate(next);
      toast.success(next ? "Account is private 🔒" : "Account is public 🌍");
    }
  };

  const handleMentionChange = async (e) => {
    const val = e.target.value;
    const data = await updateSetting("allowMentionsFrom", val, "/users/settings");
    if (data) {
      setAllowMentionsFrom(val);
      toast.success(`Mentions updated to: ${val}`);
    }
  };

  const unblockUser = async () => {
    try {
      await api.post(`/users/unblock/${unblockTarget._id}`);
      setBlockedUsers(prev => prev.filter(u => u._id !== unblockTarget._id));
      toast.success("User unblocked");
      setUnblockTarget(null);
    } catch {
      toast.error("Failed to unblock user");
    }
  };

  // --- DELETE ACCOUNT HANDLER ---
const handlePermanentDelete = async () => {
  setIsDeleting(true);
  try {
    // 🔥 IMPORTANT: Must use { data: { ... } } for DELETE methods in Axios
    await api.delete("/users/delete", { 
      data: { 
        identifier: deleteIdentifier, 
        password: deletePassword 
      } 
    });

    toast.success("Account deleted.");
    localStorage.clear();
    window.location.href = "/register";
  } catch (err) {
    // This is where your "Deletion failed" message is coming from
    toast.error(err.response?.data?.message || "Deletion failed");
  } finally {
    setIsDeleting(false);
  }
};
  if (loading && !storedUser.settings) {
    return <div className="text-center text-neutral-500 mt-10">Syncing settings...</div>;
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20 p-4">
      
      {/* Account Privacy */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6">
        <h2 className="text-xl font-semibold mb-4 text-neutral-800">Account Privacy</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-neutral-700">Private Account</p>
            <p className="text-sm text-neutral-500">Only approved followers can see your posts</p>
          </div>
          <button
            onClick={togglePrivacy}
            className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors duration-200 ${isPrivate ? "bg-black" : "bg-neutral-300"}`}
          >
            <span className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${isPrivate ? "translate-x-6" : ""}`} />
          </button>
        </div>
      </div>

      {/* Interactions */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6">
        <h2 className="text-xl font-semibold mb-4 text-neutral-800">Interactions</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-neutral-700">Allow Mentions From</p>
              <p className="text-sm text-neutral-500">Choose who can tag you in comments</p>
            </div>
            <select 
              value={allowMentionsFrom} 
              onChange={handleMentionChange}
              className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm bg-neutral-50 focus:ring-2 focus:ring-black outline-none transition"
            >
              <option value="everyone">Everyone</option>
              <option value="following">Followers</option>
              <option value="none">No one</option>
            </select>
          </div>
        </div>
      </div>

      {/* Blocked Users */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6">
        <h2 className="text-xl font-semibold mb-4 text-neutral-800">Blocked Users</h2>
        {blockedUsers.length === 0 ? (
          <p className="text-sm text-neutral-500 italic">You haven’t blocked anyone.</p>
        ) : (
          <div className="space-y-4">
            {blockedUsers.map(user => (
              <div key={user._id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-neutral-100" alt="" />
                  <span className="font-medium text-neutral-700">{user.username}</span>
                </div>
                <button 
                  onClick={() => setUnblockTarget(user)} 
                  className="text-xs font-bold text-blue-500 hover:text-blue-700 border border-blue-200 px-3 py-1 rounded-md hover:bg-blue-50 transition"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6">
        <h2 className="text-xl font-semibold mb-2 text-red-600">Danger Zone</h2>
        <p className="text-sm text-red-700 mb-4">Deleting your account is permanent and cannot be undone.</p>
        <button 
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700 transition"
        >
          Delete Account
        </button>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-xl font-bold text-neutral-800">Confirm Deletion</h3>
            <p className="text-sm text-neutral-500">Please verify your identity to permanently delete your account.</p>
            
            <input 
              type="text"
              placeholder="Username or Email"
              className="w-full border border-neutral-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
              value={deleteIdentifier}
              onChange={(e) => setDeleteIdentifier(e.target.value)}
            />
            
            <div className="space-y-1">
              <input 
                type="password"
                placeholder="Password"
                className="w-full border border-neutral-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
              <div className="text-right">
                <button 
                  onClick={() => navigate("/Forgot")}
                  className="text-xs text-blue-500 font-semibold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 text-sm font-bold text-neutral-600 bg-neutral-100 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={handlePermanentDelete}
                disabled={isDeleting}
                className="flex-1 py-3 text-sm font-bold text-white bg-red-600 rounded-xl disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {unblockTarget && (
        <ConfirmModal
          title="Unblock user?"
          message={`They will be able to see your profile and interact with you again.`}
          confirmText="Unblock"
          onConfirm={unblockUser}
          onCancel={() => setUnblockTarget(null)}
        />
      )}
    </div>
  );
}