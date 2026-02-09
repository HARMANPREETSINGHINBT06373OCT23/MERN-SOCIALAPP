import { Heart, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";
import toast from "react-hot-toast";
import CommentBox from "./CommentBox";

export default function PostActions({ post }) {
  const me = JSON.parse(localStorage.getItem("user"));
  const [searchParams] = useSearchParams();

  const canInteract = !!me;

  // 1. FIXED LIKE PERSISTENCE: Check if me._id exists in the likes array using string comparison
  const [liked, setLiked] = useState(
    me ? post.likes?.some(id => String(id) === String(me._id || me.id)) : false
  );
  // Support both 'likes' array or the 'likesCount' number from the backend
  const [likes, setLikes] = useState(post.likesCount ?? post.likes?.length ?? 0);
  
  // 2. LIVE COMMENT COUNT: Support both 'comments' array or 'commentsCount'
  const [commentCount, setCommentCount] = useState(post.commentsCount ?? post.comments?.length ?? 0);
  const [showComments, setShowComments] = useState(false);

  /* ===============================
       SYNC STATE ON PROP CHANGE
     =============================== */
  useEffect(() => {
    setLiked(me ? post.likes?.some(id => String(id) === String(me._id || me.id)) : false);
    setLikes(post.likesCount ?? post.likes?.length ?? 0);
    setCommentCount(post.commentsCount ?? post.comments?.length ?? 0);
  }, [post, me?._id]);

  /* ===============================
       URL IS SOURCE OF TRUTH
     =============================== */
  const postIdFromUrl = searchParams.get("post");
  const highlightCommentId = searchParams.get("comment");

  useEffect(() => {
    if (postIdFromUrl === post._id && highlightCommentId) {
      setShowComments(true);
    }
  }, [postIdFromUrl, highlightCommentId, post._id]);

  /* ===============================
       TOGGLE LIKE
     =============================== */
  const toggleLike = async () => {
    if (!me) return;

    try {
      const res = await api.post(`/posts/${post._id}/like`);
      // Use res.data.likesCount (backend) or res.data.likes (legacy)
      setLiked(res.data.liked);
      setLikes(res.data.likesCount ?? res.data.likes);
    } catch (err) {
      toast.error(err.response?.data?.message || "Cannot like this post");
    }
  };

  const handleCommentClick = () => {
    if (!canInteract) return;
    if (post.commentsBlocked) {
      toast.error("Comments are disabled for this post");
      return;
    }
    setShowComments(true);
  };

  /* ===============================
       SOCKET REALTIME UPDATES
     =============================== */
  useEffect(() => {
    // Listen for Likes
    const likeHandler = (data) => {
      if (String(data.postId) !== String(post._id)) return;
      
      // Update count using likesCount from backend emission
      setLikes(data.likesCount ?? data.likes);
      
      // Update heart color only for the person who clicked it
      const myId = me?._id || me?.id;
      if (myId && String(data.userId) === String(myId)) {
        setLiked(data.liked);
      }
    };

    // Listen for New Comments (Live Count)
    const commentHandler = (data) => {
      if (String(data.postId) === String(post._id)) {
        setCommentCount(prev => prev + 1);
      }
    };

    socket.on("post:like", likeHandler);
    socket.on("comment:new", commentHandler);

    return () => {
      socket.off("post:like", likeHandler);
      socket.off("comment:new", commentHandler);
    };
  }, [post._id, me]);

  return (
    <>
      {/* ACTIONS */}
      <div className="flex gap-4 px-4 pt-2">
        {/* ❤️ LIKE */}
        <button onClick={toggleLike} className="transition-transform active:scale-125">
          <Heart
            size={22}
            className={`cursor-pointer transition-colors ${
              liked
                ? "fill-red-500 text-red-500"
                : "text-neutral-800"
            } ${
              !canInteract && "opacity-40 cursor-not-allowed"
            }`}
          />
        </button>

        {/* 💬 COMMENT */}
        <button onClick={handleCommentClick} className="flex items-center gap-1.5 transition-transform active:scale-110">
          <MessageCircle
            size={22}
            className={`cursor-pointer text-neutral-800 ${
              !canInteract && "opacity-40 cursor-not-allowed"
            } ${
              post.commentsBlocked && "opacity-40"
            }`}
          />
          {/* LIVE COMMENT COUNT NEXT TO ICON (IG STYLE) */}
          {commentCount > 0 && (
            <span className="text-sm font-semibold text-neutral-800">
              {commentCount}
            </span>
          )}
        </button>
      </div>

      {/* LIKE COUNT */}
      <p className="px-4 text-sm font-bold mt-1">
        {likes.toLocaleString()} {likes === 1 ? 'like' : 'likes'}
      </p>

      {/* COMMENTS MODAL */}
      {showComments && !post.commentsBlocked && (
        <CommentBox
          postId={post._id}
          highlightCommentId={highlightCommentId}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  );
}