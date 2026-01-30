import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { X, Heart, MessageCircle, Trash } from "lucide-react";
import { toast } from "react-hot-toast";

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=User&background=random";

/* ===============================
   HELPER: PARSE CAPTION WITH HASHTAGS
   =============================== */
function renderCaption(text) {
  if (!text) return null;

  const parts = text.split(/(#[a-zA-Z0-9_]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith("#")) {
      const tag = part.slice(1).toLowerCase();
      return (
        <Link
          key={index}
          to={`/search?q=%23${tag}`}
          className="text-blue-500 hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const myUserId = currentUser?._id;

  /* ===============================
     READ QUERY FROM URL
     =============================== */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    setQuery(q);
  }, [location.search]);

  /* ===============================
     SEARCH LOGIC
     =============================== */
  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setPosts([]);
      return;
    }

    const runSearch = async () => {
      try {
        setLoading(true);

        if (query.startsWith("#")) {
          const tag = query.replace("#", "").toLowerCase();
          const res = await api.get(
            `/posts/search/hashtags?q=${tag}`
          );
          setPosts(res.data);
          setUsers([]);
        } else {
          const res = await api.get(
            `/users/search/users?q=${query}`
          );
          setUsers(res.data);
          setPosts([]);
        }
      } catch (err) {
        console.error("SEARCH ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    const delay = setTimeout(runSearch, 400);
    return () => clearTimeout(delay);
  }, [query]);

  /* ===============================
     DELETE POST (OWNER ONLY)
     =============================== */
  const deletePost = async () => {
    try {
      await api.delete(`/posts/${selectedPost._id}`);
      setPosts(p => p.filter(x => x._id !== selectedPost._id));
      setSelectedPost(null);
      setConfirmDelete(false);
      toast.success("Post deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* SEARCH INPUT */}
      <input
        value={query}
        onChange={e => {
          const val = e.target.value;
          setQuery(val);
          navigate(`/search?q=${val}`);
        }}
        placeholder="Search users or #hashtags"
        className="w-full border p-3 rounded mb-4"
      />

      {loading && (
        <p className="text-center text-neutral-500">
          Searching…
        </p>
      )}

      {/* USER RESULTS */}
      {!query.startsWith("#") &&
        users.map(u => (
          <div
            key={u._id}
            onClick={() => navigate(`/profile/${u.username}`)}
            className="flex gap-3 items-center cursor-pointer mb-3"
          >
            <img
              src={u.avatar || DEFAULT_AVATAR}
              className="w-9 h-9 rounded-full"
            />
            <span className="font-medium">
              {u.username}
            </span>
          </div>
        ))}

      {/* HASHTAG POSTS GRID */}
      {query.startsWith("#") && posts.length > 0 && (
        <div className="grid grid-cols-3 gap-[1px]">
          {posts.map(p => (
            <img
              key={p._id}
              src={p.imageUrl}
              className="aspect-square object-cover cursor-pointer"
              onClick={() => setSelectedPost(p)}
            />
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading &&
        query &&
        posts.length === 0 &&
        users.length === 0 && (
          <p className="text-center text-neutral-500 mt-6">
            No results found
          </p>
        )}

      {/* ===============================
         POST PREVIEW MODAL
         =============================== */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
          <div className="bg-white max-w-md w-full relative">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3"
            >
              <X />
            </button>

            {/* HEADER (CLICKABLE USER) */}
            <div className="flex items-center gap-3 p-3 border-b">
              <img
                src={
                  selectedPost.user.avatar ||
                  DEFAULT_AVATAR
                }
                className="w-9 h-9 rounded-full cursor-pointer"
                onClick={() =>
                  navigate(
                    `/profile/${selectedPost.user.username}`
                  )
                }
              />
              <span
                className="font-semibold cursor-pointer hover:underline"
                onClick={() =>
                  navigate(
                    `/profile/${selectedPost.user.username}`
                  )
                }
              >
                {selectedPost.user.username}
              </span>
            </div>

            {/* IMAGE */}
            <img
              src={selectedPost.imageUrl}
              className="w-full"
            />

            {/* ACTIONS */}
            <div className="flex gap-4 p-3">
              <Heart />
              <MessageCircle />

              {selectedPost.user._id === myUserId && (
                <Trash
                  onClick={() => setConfirmDelete(true)}
                  className="ml-auto cursor-pointer text-red-500"
                />
              )}
            </div>

            {/* CAPTION (HASHTAGS CLICKABLE) */}
            <div className="px-3 pb-4 text-sm whitespace-pre-line">
              {renderCaption(selectedPost.caption)}
            </div>

            {/* CONFIRM DELETE */}
            {confirmDelete && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-white p-4 rounded w-72 text-center">
                  <p className="mb-4 font-semibold">
                    Delete this post permanently?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={deletePost}
                      className="flex-1 bg-red-500 text-white py-2 rounded"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() =>
                        setConfirmDelete(false)
                      }
                      className="flex-1 border py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
