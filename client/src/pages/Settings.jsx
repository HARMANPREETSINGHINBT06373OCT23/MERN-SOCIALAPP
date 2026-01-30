import { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";

export default function Settings() {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const userId = storedUser?._id || storedUser?.id;

  const [isPrivate, setIsPrivate] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔒 blocked users
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [unblockTarget, setUnblockTarget] = useState(null);

  /* ===============================
     LOAD SETTINGS
     =============================== */
  useEffect(() => {
    const loadSettings = async () => {
      if (!userId) {
        toast.error("User not found");
        setLoading(false);
        return;
      }

      try {
        const [privacyRes, blockedRes] = await Promise.all([
          api.get(`/users/${userId}`),
          api.get("/settings/blocked-users")
        ]);

        setIsPrivate(privacyRes.data.isPrivate);
        setBlockedUsers(blockedRes.data || []);
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [userId]);

  /* ===============================
     TOGGLE PRIVACY
     =============================== */
  const togglePrivacy = async () => {
    try {
      const next = !isPrivate;
      setIsPrivate(next);

      const res = await api.put("/settings/privacy", {
        isPrivate: next
      });

      setIsPrivate(res.data.isPrivate);

      const updatedUser = {
        ...storedUser,
        isPrivate: res.data.isPrivate
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success(
        res.data.isPrivate
          ? "Account is now private 🔒"
          : "Account is now public 🌍"
      );
    } catch {
      toast.error("Failed to update privacy");
    }
  };

  /* ===============================
     UNBLOCK USER
     =============================== */
  const unblockUser = async () => {
    try {
      await api.post(`/users/unblock/${unblockTarget._id}`);

      setBlockedUsers(prev =>
        prev.filter(u => u._id !== unblockTarget._id)
      );

      toast.success("User unblocked");
      setUnblockTarget(null);
    } catch {
      toast.error("Failed to unblock user");
    }
  };

  if (loading || isPrivate === null) {
    return (
      <div className="text-center text-neutral-500 mt-10">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">

      {/* ================= PRIVACY ================= */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Account Privacy
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Private Account</p>
            <p className="text-sm text-neutral-500">
              Only approved followers can see your posts
            </p>
          </div>

          <button
            onClick={togglePrivacy}
            className={`w-12 h-6 rounded-full flex items-center px-1 transition ${
              isPrivate ? "bg-black" : "bg-neutral-300"
            }`}
          >
            <span
              className={`w-4 h-4 bg-white rounded-full transition ${
                isPrivate ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* ================= BLOCKED USERS ================= */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Blocked Users
        </h2>

        {blockedUsers.length === 0 ? (
          <p className="text-sm text-neutral-500">
            You haven’t blocked anyone.
          </p>
        ) : (
          <div className="space-y-4">
            {blockedUsers.map(user => (
              <div
                key={user._id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="font-medium">
                    {user.username}
                  </span>
                </div>

                <button
                  onClick={() => setUnblockTarget(user)}
                  className="text-sm border px-3 py-1 rounded"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= CONFIRM UNBLOCK ================= */}
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
