import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux"; // Added to check guest status
import api from "../services/api";
import socket from "../services/socket";
import { Bell, X } from "lucide-react";
import toast from "react-hot-toast";

/* ---------------- TIME AGO ---------------- */
const timeAgo = date => {
  const sec = Math.floor((Date.now() - new Date(date)) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  return `${Math.floor(day / 30)}mo`;
};

export default function NotificationBell() {
  const { isGuest } = useSelector((state) => state.auth); // Access guest status
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const audioRef = useRef(null);
  const audioUnlocked = useRef(false);
  const navigate = useNavigate();

  /* ---------------- LOAD ---------------- */
  useEffect(() => {
    // 🛑 GUEST CHECK: Stop API call if Guest
    if (isGuest) return;

    api
      .get("/notifications")
      .then(res => setNotifications(res.data))
      .catch(() => toast.error("Failed to load notifications"));
  }, [isGuest]); // Added isGuest to dependency

  /* ---------------- REALTIME ---------------- */
  useEffect(() => {
    // 🛑 GUEST CHECK: Don't listen for sockets if Guest
    if (isGuest) return;

    const handler = notification => {
      setNotifications(prev => [notification, ...prev]);

      if (audioUnlocked.current && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    };

    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
  }, [isGuest]); // Added isGuest to dependency

  const unreadCount = notifications.filter(n => !n.isRead).length;

  /* ---------------- BELL CLICK ---------------- */
  const handleBellClick = async () => {
    // If guest, just toggle the empty menu or show a message
    if (isGuest) {
      setOpen(o => !o);
      return;
    }

    if (!audioUnlocked.current && audioRef.current) {
      try {
        await audioRef.current.play();
        audioRef.current.pause();
        audioUnlocked.current = true;
      } catch {}
    }

    if (!open) {
      const unreadIds = notifications
        .filter(n => !n.isRead)
        .map(n => n._id);

      if (unreadIds.length > 0) {
        await Promise.all(
          unreadIds.map(id =>
            api.patch(`/notifications/${id}/read`).catch(() => {})
          )
        );

        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true }))
        );
      }
    }

    setOpen(o => !o);
  };

  /* ---------------- NAVIGATION (FINAL FIX) ---------------- */
  const handleNotificationClick = n => {
    setOpen(false);

    // FOLLOW → PROFILE
    if (n.type.startsWith("follow")) {
      navigate(`/profile/${n.sender.username}`);
      return;
    }

    // ✅ ALWAYS extract STRING IDs
    const postId =
      typeof n.post === "string"
        ? n.post
        : n.post?._id;

    const commentId =
      typeof n.comment === "string"
        ? n.comment
        : n.comment?._id;

    // LIKE → ONLY SCROLL TO POST (NO COMMENT PANEL)
    if (n.type === "like") {
      if (postId) {
        navigate(`/?post=${postId}`);
      }
      return;
    }

    // COMMENT / REPLY / MENTION → OPEN COMMENTS
    if (["comment", "reply", "mention"].includes(n.type)) {
      if (!postId) return;

      const params = new URLSearchParams();
      params.set("post", postId);

      if (commentId) {
        params.set("comment", commentId);
      }

      navigate(`/?${params.toString()}`);
    }
  };

  /* ---------------- DELETE ---------------- */
  const deleteNotification = id => {
    if (isGuest) return; // Prevent actions for guests

    toast(t => (
      <div className="flex gap-3 items-center">
        <span className="text-sm">Delete notification?</span>
        <button
          className="text-red-600 font-semibold text-sm"
          onClick={async () => {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n._id !== id));
            toast.dismiss(t.id);
          }}
        >
          Delete
        </button>
        <button onClick={() => toast.dismiss(t.id)}>Cancel</button>
      </div>
    ));
  };

  /* ---------------- FOLLOW REQUEST ---------------- */
  const acceptRequest = async n => {
    if (isGuest) return;
    await api.post(`/follow-requests/${n.sender._id}/accept`);
    setNotifications(prev =>
      prev.map(x =>
        x._id === n._id ? { ...x, type: "follow" } : x
      )
    );
    toast.success("Follow request accepted");
  };

  const rejectRequest = async n => {
    if (isGuest) return;
    await api.delete(`/follow-requests/${n.sender._id}/reject`);
    setNotifications(prev => prev.filter(x => x._id !== n._id));
    toast("Follow request rejected");
  };

  /* ---------------- TEXT ---------------- */
  const getText = n => {
    switch (n.type) {
      case "follow_request":
        return "sent you a follow request";
      case "follow":
        return "has started following you";
      case "follow_accepted":
        return "accepted your follow request";
      case "like":
        return "liked your post";
      case "comment":
        return "commented on your post";
      case "reply":
        return "replied to your comment";
      case "mention":
        return "mentioned you ";
      default:
        return "sent you a notification";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <audio ref={audioRef} src="/notification.wav" preload="auto" />

      <button
        onClick={handleBellClick}
        className="relative p-2 bg-white rounded-full shadow hover:bg-neutral-100"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs px-1.5 rounded-full">
            {unreadCount > 10 ? "10+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white border shadow-xl rounded-xl overflow-hidden">
          <div className="flex justify-between items-center p-3 border-b">
            <span className="font-semibold">Notifications</span>
            <button onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {isGuest ? (
              <div className="p-8 text-center">
                <p className="text-sm text-neutral-500 italic">Login to see real notifications</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-400">
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className="flex gap-3 p-3 border-b cursor-pointer hover:bg-neutral-100"
                >
                  <img
                    src={n.sender?.avatar || `https://ui-avatars.com/api/?name=${n.sender?.username}`}
                    className="w-8 h-8 rounded-full object-cover"
                  />

                  <div className="flex-1 text-sm">
                    <span className="font-semibold">
                      {n.sender?.username}
                    </span>{" "}
                    {getText(n)}

                    <div className="text-xs text-neutral-400 mt-1">
                      {timeAgo(n.createdAt)} ago
                    </div>

                    {n.type === "follow_request" && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            acceptRequest(n);
                          }}
                          className="text-xs bg-black text-white px-2 py-1 rounded"
                        >
                          Accept
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            rejectRequest(n);
                          }}
                          className="text-xs border px-2 py-1 rounded"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteNotification(n._id);
                    }}
                    className="text-neutral-400 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}