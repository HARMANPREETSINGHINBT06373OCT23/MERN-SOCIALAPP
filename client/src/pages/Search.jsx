import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { X, Heart, MessageCircle, Trash, Users, LayoutGrid, Search as SearchIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import CommentBox from "../components/CommentBox";

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
          className="text-blue-500 font-semibold hover:underline"
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
  
  // New state for Tab Switching
  const [searchTab, setSearchTab] = useState("accounts"); // 'accounts' or 'posts'

  // New states for Comments
  const [showComments, setShowComments] = useState(false);
  const [commentPostId, setCommentPostId] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
// More robust way to get the user ID
  const userString = localStorage.getItem("user");
  const currentUser = userString ? JSON.parse(userString) : null;
  
  // Some apps store the ID as 'id', some as '_id'. Let's check both.
  const myUserId = currentUser?._id || currentUser?.id;

  /* ===============================
      READ QUERY FROM URL
      =============================== */
  /* ===============================
      READ QUERY FROM URL
      =============================== */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    setQuery(q);
    
    // If it starts with #, automatically force the posts tab
    if (q.startsWith("#")) {
      setSearchTab("posts");
    }
  }, [location.search]);

  /* ===============================
      SEARCH LOGIC (GLOBAL SEARCH)
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
        // Parallel fetching to keep UI fast
        const [userRes, postRes] = await Promise.all([
            api.get(`/users/search/users?q=${query.replace("#", "")}`),
            api.get(`/posts/search/global?q=${encodeURIComponent(query)}`) 
        ]);
        
        setUsers(userRes.data);
        setPosts(postRes.data);

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
      LIKE / UNLIKE LOGIC (FIXED)
      =============================== */
  const toggleLike = async (postId, e) => {
    if (e) e.stopPropagation();
    if (!myUserId) return toast.error("Please login to like");

    try {
      const res = await api.post(`/posts/${postId}/like`);
      const { liked, likes: newLikesCount } = res.data;

      const updateFn = (p) => {
        if (p._id !== postId) return p;
        
        const currentLikes = p.likes || [];
        const updatedLikesArray = liked
          ? [...currentLikes, myUserId]
          : currentLikes.filter((id) => id !== myUserId);

        return {
          ...p,
          likes: updatedLikesArray,
          likesCount: newLikesCount 
        };
      };

      setPosts((prev) => prev.map(updateFn));
      if (selectedPost?._id === postId) {
        setSelectedPost((prev) => updateFn(prev));
      }
    } catch (err) {
      toast.error("Failed to update like");
    }
  };

  /* ===============================
      OPEN COMMENTS
      =============================== */
  const openComments = (post, e) => {
    if (e) e.stopPropagation();
    if (post.commentsBlocked) {
      toast.error("Comments are disabled for this post");
      return;
    }
    setCommentPostId(post._id);
    setShowComments(true);
  };

  /* ===============================
      DELETE POST
      =============================== */
  const deletePost = async () => {
    try {
      await api.delete(`/posts/${selectedPost._id}`);
      setPosts((p) => p.filter((x) => x._id !== selectedPost._id));
      setSelectedPost(null);
      setConfirmDelete(false);
      toast.success("Post deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen">
      {/* SEARCH INPUT */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
          <SearchIcon size={18} />
        </div>
        <input
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              navigate(`/search?q=${encodeURIComponent(val)}`);
            }}
            placeholder="Search users, hashtags or keywords..."
            className="w-full border-none p-3.5 pl-11 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black bg-gray-100 transition-all text-sm"
        />
      </div>

      {/* TAB SWITCHER */}
      {query && (
        <div className="flex border-b mb-6 sticky top-0 bg-white z-10">
            <button 
                onClick={() => setSearchTab("accounts")}
                className={`flex-1 py-3 flex items-center justify-center gap-2 font-bold text-sm transition-all duration-200 ${searchTab === 'accounts' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <Users size={18} /> Accounts
            </button>
            <button 
                onClick={() => setSearchTab("posts")}
                className={`flex-1 py-3 flex items-center justify-center gap-2 font-bold text-sm transition-all duration-200 ${searchTab === 'posts' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <LayoutGrid size={18} /> Posts
            </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
        </div>
      )}

      {/* ACCOUNTS TAB CONTENT */}
      {!loading && query && searchTab === "accounts" && (
        <div className="space-y-2 animate-in fade-in duration-300">
            {users.length > 0 ? (
                users.map((u) => (
                    <div
                      key={u._id}
                      onClick={() => navigate(`/profile/${u.username}`)}
                      className="flex gap-4 items-center cursor-pointer p-3 hover:bg-gray-50 rounded-xl transition border border-transparent hover:border-gray-100"
                    >
                      <img
                        src={u.avatar || DEFAULT_AVATAR}
                        className="w-14 h-14 rounded-full border object-cover shadow-sm bg-white"
                        alt={u.username}
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-black text-base">{u.username}</span>
                        <span className="text-sm text-gray-500">{u.name || "User Profile"}</span>
                      </div>
                    </div>
                  ))
            ) : (
                <div className="text-center py-20 text-gray-400">No accounts found for "{query}"</div>
            )}
        </div>
      )}

      {/* POSTS TAB CONTENT (GRID VIEW) */}
      {!loading && query && searchTab === "posts" && (
        <div className="animate-in fade-in duration-300">
            {posts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 md:gap-2">
                    {posts.map((p) => (
                        <div key={p._id} className="relative group aspect-square overflow-hidden bg-gray-100 rounded-sm">
                            {p.mediaType === "text" ? (
                              <div 
                                onClick={() => setSelectedPost(p)}
                                className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-200 text-[10px] text-gray-600 text-center italic font-medium cursor-pointer"
                              >
                                {p.caption?.substring(0, 60)}...
                              </div>
                            ) : (
                              <img
                                src={p.imageUrl}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity duration-300"
                                onClick={() => setSelectedPost(p)}
                                alt="Post"
                              />
                            )}
                            {p.mediaType === "video" && (
                                <div className="absolute top-2 right-2 text-white drop-shadow-md pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>
                                </div>
                            )}
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                               <div className="flex gap-4 text-white font-bold text-sm">
                                  <span className="flex items-center gap-1"><Heart size={16} fill="white"/> {p.likesCount || 0}</span>
                               </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-400">No posts found matching that search.</div>
            )}
        </div>
      )}

      {/* EMPTY STATE */}
      {!query && !loading && (
        <div className="flex flex-col items-center justify-center py-32 text-gray-300">
           <SearchIcon size={48} strokeWidth={1} />
           <p className="mt-4 font-medium">Search for creators or inspiration</p>
        </div>
      )}

      {/* ===============================
          POST PREVIEW MODAL
          =============================== */ }
      {selectedPost && (
        <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full relative rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3 z-10 bg-black/20 text-white rounded-full p-1 hover:bg-black/40 transition"
            >
              <X size={20} />
            </button>

            {/* HEADER */}
            <div className="flex items-center gap-3 p-4 border-b">
              <img
                src={selectedPost.user?.avatar || DEFAULT_AVATAR}
                className="w-10 h-10 rounded-full cursor-pointer object-cover border"
                onClick={() => navigate(`/profile/${selectedPost.user?.username}`)}
                alt="Avatar"
              />
              <span
                className="font-bold cursor-pointer hover:underline text-sm"
                onClick={() => navigate(`/profile/${selectedPost.user?.username}`)}
              >
                {selectedPost.user?.username}
              </span>
            </div>

            {/* CONTENT (FIXED: Handles Text, Video, Image) */}
            <div className={`flex items-center justify-center ${selectedPost.mediaType === 'text' ? 'bg-gradient-to-br from-gray-50 to-gray-100 min-h-[250px] p-8' : 'bg-black min-h-[300px]'}`}>
                {selectedPost.mediaType === "video" ? (
                    <video src={selectedPost.imageUrl} controls className="w-full h-auto max-h-[60vh]" />
                ) : selectedPost.mediaType === "image" ? (
                    <img src={selectedPost.imageUrl} className="w-full h-auto max-h-[60vh] object-contain" alt="Post Content" />
                ) : (
                    /* Hero Style for Text Posts */
                    <div className="text-center">
                        <p className="text-lg md:text-xl font-medium text-gray-800 italic leading-relaxed">
                            "{selectedPost.caption}"
                        </p>
                    </div>
                )}
            </div>

            {/* ACTIONS */}
            <div className="flex gap-4 p-4 pb-2">
              <button onClick={(e) => toggleLike(selectedPost._id, e)}>
                <Heart
                  size={26}
                  className={
                    selectedPost.likes?.includes(myUserId)
                      ? "fill-red-500 text-red-500"
                      : "text-black hover:scale-110 transition active:scale-90"
                  }
                />
              </button>
              
              <button onClick={(e) => openComments(selectedPost, e)}>
                <MessageCircle
                  size={26}
                  className={`${selectedPost.commentsBlocked ? "opacity-20 cursor-not-allowed" : "hover:scale-110 transition active:scale-90"}`}
                />
              </button>

              {selectedPost.user?._id === myUserId && (
                <Trash
                  onClick={() => setConfirmDelete(true)}
                  className="ml-auto cursor-pointer text-red-400 hover:text-red-600 transition"
                  size={22}
                />
              )}
            </div>

            {/* LIKE COUNT */}
            <div className="px-4 pb-1">
              <p className="text-sm font-extrabold text-black">
                {(selectedPost.likesCount !== undefined ? selectedPost.likesCount : (selectedPost.likes?.length || 0)).toLocaleString()} likes
              </p>
            </div>

            {/* CAPTION (Only show if not already displayed as main text content) */}
            {selectedPost.mediaType !== 'text' && (
                <div className="px-4 pb-6 text-sm whitespace-pre-line leading-relaxed">
                  <span className="font-bold mr-2">{selectedPost.user?.username}</span>
                  {renderCaption(selectedPost.caption)}
                </div>
            )}

            {/* CONFIRM DELETE OVERLAY */}
            {confirmDelete && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl w-80 text-center shadow-2xl">
                  <p className="mb-6 font-bold text-lg">Delete this post?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={deletePost}
                      className="flex-1 bg-red-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 bg-gray-100 py-3 rounded-xl text-sm font-bold hover:bg-gray-200 transition"
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

      {/* COMMENT BOX MODAL */}
      {showComments && commentPostId && (
        <CommentBox
          postId={commentPostId}
          onClose={() => {
            setShowComments(false);
            setCommentPostId(null);
          }}
        />
      )}
    </div>
  );
}