import { Heart, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";
import CommentBox from "./CommentBox";

export default function PostActions({ post }) {
  const me = JSON.parse(localStorage.getItem("user"));

  // 🔓 frontend should NOT hard-block
  const canInteract = !!me;

  const [liked, setLiked] = useState(
    me ? post.likes.includes(me._id) : false
  );
  const [likes, setLikes] = useState(
    post.likes?.length || 0
  );
  const [showComments, setShowComments] = useState(false);

  /* ===============================
     TOGGLE LIKE (SAFE + OPTIMISTIC)
     =============================== */
  const toggleLike = async () => {
    if (!me) return;

    try {
      const res = await api.post(
        `/posts/${post._id}/like`
      );

      // immediate UI update (don’t wait for socket)
      setLiked(res.data.liked);
      setLikes(res.data.likes);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Cannot like this post"
      );
    }
  };

  /* ===============================
     SOCKET REAL-TIME UPDATE
     =============================== */
  useEffect(() => {
    const handler = data => {
      if (data.postId !== post._id) return;

      setLikes(data.likes);

      if (me && data.userId === me._id) {
        setLiked(data.liked);
      }
    };

    socket.on("post:like", handler);
    return () => socket.off("post:like", handler);
  }, [post._id, me?._id]);

  return (
    <>
      <div className="flex gap-4 px-4 pt-2">
        {/* ❤️ LIKE */}
        <button onClick={toggleLike}>
          <Heart
            size={22}
            className={`cursor-pointer ${
              liked
                ? "fill-red-500 text-red-500"
                : ""
            } ${
              !canInteract &&
              "opacity-40 cursor-not-allowed"
            }`}
          />
        </button>

        {/* 💬 COMMENT */}
        <button
          onClick={() =>
            canInteract && setShowComments(true)
          }
        >
          <MessageCircle
            size={22}
            className={`cursor-pointer ${
              !canInteract &&
              "opacity-40 cursor-not-allowed"
            }`}
          />
        </button>
      </div>

      {/* LIKE COUNT */}
      <p className="px-4 text-sm font-medium">
        {likes} likes
      </p>

      {/* COMMENTS MODAL */}
      {showComments && (
        <CommentBox
          postId={post._id}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  );
}
