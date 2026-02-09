import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import PostCard from "../components/PostCard";

export default function PostPage() {
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const commentId = searchParams.get("comment");
  const [post, setPost] = useState(null);

  useEffect(() => {
    api.get(`/posts/${postId}`).then(res => setPost(res.data));
  }, [postId]);

  // cleanup URL after opening
  useEffect(() => {
    if (!commentId) return;

    const t = setTimeout(() => {
      navigate(`/post/${postId}`, { replace: true });
    }, 800);

    return () => clearTimeout(t);
  }, [commentId, postId, navigate]);

  if (!post) return null;

  return (
    <div className="fixed inset-0 bg-black/60 pointer-events-none">
  <div className="max-w-xl mx-auto pointer-events-auto">
    <PostCard
      post={post}
      autoOpenComments={!!commentId}
      highlightCommentId={commentId}
    />
  </div>
</div>

  );
}
