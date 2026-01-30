import { Link } from "react-router-dom";
import PostActions from "./PostActions";

/* ===============================
   HELPER: PARSE CAPTION
   =============================== */
function renderCaption(text) {
  if (!text) return null;

  return text.split(/(#[a-zA-Z0-9_]+)/g).map((part, index) =>
    part.startsWith("#") ? (
      <Link
        key={index}
        to={`/search?q=%23${part.slice(1)}`}
        className="text-blue-500 hover:underline"
      >
        {part}
      </Link>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

export default function PostCard({ post }) {
  return (
    <div className="bg-white border rounded-xl mb-6">
      {/* HEADER */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-full bg-neutral-300" />
        <Link
          to={`/profile/${post.user.username}`}
          className="font-semibold hover:underline"
        >
          {post.user.username}
        </Link>
      </div>

      {/* IMAGE */}
      <img
        src={post.imageUrl}
        alt="post"
        className="w-full max-h-[500px] object-cover"
      />

      {/* ACTIONS — SINGLE SOURCE OF TRUTH */}
      <PostActions post={post} />

      {/* CAPTION */}
      <div className="px-4 pb-4 text-sm">
        <Link
          to={`/profile/${post.user.username}`}
          className="font-semibold mr-1 hover:underline"
        >
          {post.user.username}
        </Link>
        {renderCaption(post.caption)}
      </div>
    </div>
  );
}
