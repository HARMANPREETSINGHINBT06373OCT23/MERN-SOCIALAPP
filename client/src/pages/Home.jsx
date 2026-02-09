import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useSelector } from "react-redux"; // Added to check guest status
import api from "../services/api";
import PostCard from "../components/PostCard";
import { RefreshCw, Check, X, ChevronRight, Undo2 } from "lucide-react";

// --- DEMO DATA FOR GUEST MODE ---
const demoPosts = [
  { _id: 'd1', content: 'Welcome to SocialApp! This is a demo feed for guests.', user: { username: 'System', avatar: '' }, likes: [], createdAt: new Date() },
  { _id: 'd2', content: 'You can browse the layout here, but you need an account to interact!', user: { username: 'Admin', avatar: '' }, likes: [1, 2, 3], createdAt: new Date() }
];
const demoSuggestions = [
  { _id: 's1', username: 'demo_user_1', avatar: '' },
  { _id: 's2', username: 'social_explorer', avatar: '' }
];

export default function Home() {
  const { isGuest } = useSelector((state) => state.auth); // Access guest status
  const [posts, setPosts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [followingStates, setFollowingStates] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [lastDismissed, setLastDismissed] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimer = useRef(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const postIdFromUrl = searchParams.get("post");
  const commentIdFromUrl = searchParams.get("comment");

  const postRefs = useRef({});
  const observer = useRef();

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    
    // 🔥 GUEST CHECK: Bypass API calls if Guest
    if (isGuest) {
      setPosts(demoPosts);
      setSuggestions(demoSuggestions);
      setHasMore(false);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [postsRes, suggRes] = await Promise.allSettled([
        api.get(`/posts/feed?page=1`),
        api.get(`/users/suggestions`)
      ]);

      if (postsRes.status === "fulfilled") {
        setPosts(postsRes.value.data);
        setHasMore(postsRes.value.data.length === 10);
      }
      if (suggRes.status === "fulfilled") {
        setSuggestions(suggRes.value.data);
      }
    } catch (err) {
      console.error("Feed error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isGuest]); // Added isGuest to dependency

  const fetchMorePosts = useCallback(async (pageNum) => {
    if (loading || !hasMore || isGuest) return; // 🔥 Skip if guest
    setLoading(true);
    try {
      const res = await api.get(`/posts/feed?page=${pageNum}`);
      const newPosts = res.data;
      setPosts((prev) => [...prev, ...newPosts]);
      if (newPosts.length < 10) setHasMore(false);
    } catch (err) {
      console.error("Infinite scroll error:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, isGuest]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!postIdFromUrl) return;
    const scrollToPost = () => {
      const el = postRefs.current[postIdFromUrl];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
            setSearchParams({}, { replace: true });
        }, 1000); 
      }
    };
    if (posts.length > 0) scrollToPost();
  }, [posts, postIdFromUrl, setSearchParams]);

  const handleFollow = async (userId) => {
    if (isGuest) {
      return toast.error("Log in to follow users"); // Prevent API call for guests
    }
    setFollowingStates(prev => ({ ...prev, [userId]: 'loading' }));
    try {
      await api.post(`/users/follow/${userId}`);
      setFollowingStates(prev => ({ ...prev, [userId]: 'following' }));
      setTimeout(() => {
        setSuggestions(prev => prev.filter(u => u._id !== userId));
      }, 3000);
    } catch (err) {
      setFollowingStates(prev => ({ ...prev, [userId]: null }));
    }
  };

  const dismissSuggestion = (user) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setLastDismissed(user);
    setSuggestions(prev => prev.filter(u => u._id !== user._id));
    setShowUndo(true);
    undoTimer.current = setTimeout(() => {
      setShowUndo(false);
      setLastDismissed(null);
    }, 5000);
  };

  const handleUndo = () => {
    if (lastDismissed) {
      setSuggestions(prev => [lastDismissed, ...prev]);
      setShowUndo(false);
      setLastDismissed(null);
      if (undoTimer.current) clearTimeout(undoTimer.current);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchInitialData();
  };

  const lastPostRef = useCallback((node) => {
    if (loading || isGuest) return; // 🔥 Skip infinite scroll for guest
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchMorePosts(nextPage);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, page, fetchMorePosts, isGuest]);

  const SuggestionCard = ({ u, isHorizontal = false }) => {
    const state = followingStates[u._id];
    const profilePath = `/profile/${u.username}`;
    const avatarUrl = u.avatar || `https://ui-avatars.com/api/?name=${u.username}&background=random`;
    
    return (
      <div className="min-w-[160px] bg-white border rounded-xl p-4 flex flex-col items-center relative shadow-sm group">
        <button onClick={() => dismissSuggestion(u)} className="absolute top-2 right-2 text-gray-300 hover:text-gray-600 transition-colors">
          <X size={16} />
        </button>
        <Link to={profilePath} className="mb-1">
            <img src={avatarUrl} className="w-16 h-16 rounded-full object-cover border border-gray-50"  />
        </Link>
        <Link to={profilePath} className="text-xs font-bold mb-3 truncate max-w-[120px] hover:underline text-center">
            {u.username}
        </Link>
        <button 
          onClick={() => handleFollow(u._id)}
          disabled={state === 'following' || state === 'loading'}
          className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition-all ${
            state === 'following' ? 'bg-gray-100 text-gray-500' : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {state === 'loading' ? '...' : state === 'following' ? <Check size={12} className="inline mr-1" /> : 'Follow'}
          {state === 'following' && 'Following'}
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 relative">
      {showUndo && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-4">
          <span className="text-sm">Suggestion removed.</span>
          <button onClick={handleUndo} className="text-yellow-400 text-sm font-bold flex items-center gap-1 hover:text-yellow-300">
            <Undo2 size={14} /> UNDO
          </button>
          <button onClick={() => setShowUndo(false)} className="text-gray-400 hover:text-white"><X size={14}/></button>
        </div>
      )}

      <div className="w-full pb-10">
        <div className="sticky top-0 z-20 flex justify-center h-0">
          <button onClick={handleRefresh} className={`mt-4 bg-white shadow-md border rounded-full p-2 transition-all duration-300 ${refreshing ? "rotate-180 opacity-100" : "opacity-0 hover:opacity-100"}`}>
            <RefreshCw size={20} className={`${refreshing ? "animate-spin" : ""} text-blue-500`} />
          </button>
        </div>

        {!loading && posts.length === 0 && suggestions.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-center mb-1">Welcome to your feed</h2>
            <p className="text-gray-500 text-center mb-8 text-sm">Follow people to see their posts here.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {suggestions.map(u => <SuggestionCard key={u._id} u={u} />)}
            </div>
          </div>
        )}

        <div className="space-y-4 mt-4">
          {posts.map((post, index) => {
            const isLast = posts.length === index + 1;
            return (
              <div key={`${post._id}-${index}`} ref={(el) => {
                  postRefs.current[post._id] = el;
                  if (isLast) lastPostRef(el);
                }}
              >
                <PostCard post={post} highlightCommentId={post._id === postIdFromUrl ? commentIdFromUrl : null} />
                
                {index === 1 && suggestions.length > 0 && (
                  <div className="py-6 border-y bg-gray-50/40 my-6 px-4 -mx-4">
                    <div className="flex justify-between items-center mb-4 px-2">
                      <p className="font-bold text-sm text-gray-700 uppercase tracking-tighter">People you may know {isGuest && "(Demo)"}</p>
                      <Link to="/search" className="text-blue-500 text-xs font-bold flex items-center">See All <ChevronRight size={14} /></Link>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                      {suggestions.map(u => <SuggestionCard key={u._id} u={u} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="p-4 space-y-8 mt-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-gray-200 rounded-full" /><div className="h-4 w-24 bg-gray-200 rounded" /></div>
                <div className="aspect-square bg-gray-200 rounded-lg w-full" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}