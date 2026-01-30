import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ConfirmModal from "./ConfirmModal";
import api from "../services/api";
import { toast } from "react-hot-toast";

export default function UserActionMenu({
  userId,
  isFollowing,
  showUnfollow = false,
  showRemoveFollower = false,
  onBlocked,
  onUnfollow,
  onRemoveFollower
}) {
  const [open, setOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const menuRef = useRef(null);

  /* ===============================
     CLOSE ON OUTSIDE CLICK
     =============================== */
  useEffect(() => {
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ===============================
     ACTIONS
     =============================== */
  const unfollowUser = async () => {
    try {
      await api.post(`/users/unfollow/${userId}`);
      toast.success("Unfollowed");
      setOpen(false);
      onUnfollow?.();
    } catch {
      toast.error("Failed to unfollow");
    }
  };

  const removeFollower = async () => {
    try {
      // ✅ THIS MUST MATCH YOUR BACKEND ROUTE
      await api.post(`/users/removeFollower/${userId}`);
      toast.success("Follower removed");
      setConfirmRemove(false);
      setOpen(false);
      onRemoveFollower?.();
    } catch {
      toast.error("Failed to remove follower");
    }
  };

  const blockUser = async () => {
    try {
      await api.post(`/users/block/${userId}`);
      toast.success("User blocked");
      setConfirmBlock(false);
      setOpen(false);
      onBlocked?.();
    } catch {
      toast.error("Failed to block user");
    }
  };

  const shouldShowUnfollow = showUnfollow || isFollowing;

  return (
    <div className="relative" ref={menuRef}>
      {/* 3 DOT BUTTON */}
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1 rounded-full hover:bg-neutral-100"
      >
        <MoreVertical size={18} />
      </button>

      {/* MENU */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-white border rounded-xl shadow-lg z-50 overflow-hidden">
          {shouldShowUnfollow && (
            <button
              onClick={unfollowUser}
              className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
            >
              Unfollow
            </button>
          )}

          {showRemoveFollower && (
            <button
              onClick={() => setConfirmRemove(true)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
            >
              Remove follower
            </button>
          )}

          <button
            onClick={() => setConfirmBlock(true)}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Block user
          </button>
        </div>
      )}

      {/* CONFIRM REMOVE FOLLOWER */}
      {confirmRemove && (
        <ConfirmModal
          title="Remove follower?"
          message="They will no longer follow you, but won’t be blocked."
          confirmText="Remove"
          onConfirm={removeFollower}
          onCancel={() => setConfirmRemove(false)}
        />
      )}

      {/* CONFIRM BLOCK */}
      {confirmBlock && (
        <ConfirmModal
          title="Block user?"
          message="They won’t be able to see your profile, posts, or interact with you."
          confirmText="Block"
          onConfirm={blockUser}
          onCancel={() => setConfirmBlock(false)}
        />
      )}
    </div>
  );
}
