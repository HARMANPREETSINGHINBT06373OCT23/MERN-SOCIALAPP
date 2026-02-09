import {
  Grid,
  Camera,
  Plus,
  X,
  Pencil,
  Heart,
  MessageCircle,
  Trash,
  Lock,
  Image as ImageIcon,
  MoreHorizontal,
  Settings,
  Link as LinkIcon,
  Globe,
  Check,
  ChevronRight,
  UserPlus,
  ArrowLeft,
  Bookmark,
  Share2,
  Maximize2
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import api from "../services/api";
import socket from "../services/socket";
import UserActionMenu from "../components/UserActionMenu";
import CommentBox from "../components/CommentBox";
import { Link } from "react-router-dom";

/* ============================================================
   RENDER CAPTION HELPER (Preserved Original Logic)
   ============================================================ */
function renderCaption(text) {
  if (!text) return null;
  const regex = /(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g;

  return text.split(regex).map((part, index) => {
    if (part.startsWith("#")) {
      return (
        <Link
          key={index}
          to={`/search?q=%23${part.slice(1).toLowerCase()}`}
          className="text-blue-500 hover:underline font-medium"
        >
          {part}
        </Link>
      );
    }
    if (part.startsWith("@")) {
      return (
        <Link
          key={index}
          to={`/profile/${part.slice(1)}`}
          className="text-blue-600 font-bold hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=User&background=random";

/* ============================================================
   MAIN PROFILE COMPONENT
   ============================================================ */
export default function Profile() {
  const navigate = useNavigate();
  const { username: paramUsername } = useParams();

  // --- REFS ---
  const avatarFileRef = useRef(null);
  const cameraInputRef = useRef(null); 
  const modalFileRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const myUsername = currentUser?.username;
  const viewedUsername = paramUsername || myUsername;
  const isOwnProfile = viewedUsername === myUsername;

  // --- PROFILE CORE STATE ---
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");

  // --- EDITING STATE (Expanded with URL Link) ---
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState([{ title: "", url: "" }]);
  const [avatar, setAvatar] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- POST INTERACTIONS STATE ---
  const [selectedPost, setSelectedPost] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isHoveringPost, setIsHoveringPost] = useState(null);

  // --- LIST STATE ---
  const [listType, setListType] = useState(null);
  const [listUsers, setListUsers] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  // --- COMMENT STATE ---
  const [showComments, setShowComments] = useState(false);
  const [commentPostId, setCommentPostId] = useState(null);

  // --- LIVE CAMERA STATE ---
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showCameraStream, setShowCameraStream] = useState(false);
  const [stream, setStream] = useState(null);

  /* ============================================================
     DATA INITIALIZATION
     ============================================================ */
  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const profileRes = await api.get(`/users/${viewedUsername}`);
      setProfile(profileRes.data);
      setName(profileRes.data.name ?? "");
      setBio(profileRes.data.bio ?? "");
     setLinks(profileRes.data.links?.length > 0 ? profileRes.data.links : [{ title: "", url: "" }]);
      try {
        const postsRes = await api.get(`/users/${viewedUsername}/posts`);
        setPosts(postsRes.data);
        setIsLocked(false);
      } catch (err) {
        if (err.response?.status === 403) {
          setIsLocked(true);
          setPosts([]);
        } else {
          throw err;
        }
      }
    } catch (err) {
      toast.error("Profile not available");
      console.error("Profile Load Error:", err);
    } finally {
      setLoading(false);
    }
  }, [viewedUsername]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  /* ============================================================
     SOCKET EVENT HANDLERS
     ============================================================ */
  
 useEffect(() => {
  const onLikeUpdate = (updatedPost) => {
    // Ensuring the socket event uses the same naming convention
    const syncPost = (p) => {
      if (p._id !== updatedPost._id) return p;
      return {
        ...p,
        likes: updatedPost.likes || p.likes,
        likesCount: updatedPost.likesCount ?? updatedPost.likes?.length ?? p.likesCount
      };
    };
    
    setPosts((prev) => prev.map(syncPost));
    setSelectedPost((prev) => (prev?._id === updatedPost._id ? syncPost(prev) : prev));
  };

  // ... rest of your socket logic
  socket.on("post:like", onLikeUpdate);
  return () => socket.off("post:like", onLikeUpdate);
}, [selectedPost]); /* ============================================================
     CAMERA ENGINE
     ============================================================ */
  const startLiveCamera = async () => {
    try {
      setShowPhotoOptions(false);
      setShowCameraStream(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 1280, height: 720 }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      toast.error("Unable to access camera. Please check permissions.");
      setShowCameraStream(false);
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCameraStream(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    canvasRef.current.toBlob((blob) => {
      const capturedFile = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
      handlePhotoUpload(capturedFile);
      closeCamera();
    }, "image/jpeg", 0.9);
  };

  /* ============================================================
     PHOTO & PROFILE UPDATES
     ============================================================ */
  const handlePhotoUpload = async (file) => {
    if (!file) return;
    const loadingToast = toast.loading("Uploading photo...");
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await api.patch("/users/me", form);
      setProfile(res.data);
      setShowPhotoOptions(false);
      toast.success("Profile photo updated", { id: loadingToast });
    } catch {
      toast.error("Failed to upload photo", { id: loadingToast });
    }
  };

  const removeProfilePhoto = async () => {
    try {
      const form = new FormData();
      form.append("avatar", "REMOVE");
      const res = await api.patch("/users/me", form);
      setProfile(res.data);
      setShowPhotoOptions(false);
      toast.success("Photo removed");
    } catch {
      toast.error("Could not remove photo");
    }
  };

  const updateProfile = async () => {
  setIsUpdating(true);
  try {
    const form = new FormData();
    form.append("name", name);
    form.append("bio", bio);
    
    // 🔥 CHANGE THIS: Stringify the links array
    form.append("links", JSON.stringify(links)); 

    const res = await api.patch("/users/me", form);
    setProfile(res.data);
    setEditing(false);
    toast.success("Profile updated successfully");
  } catch (err) {
    toast.error(err.response?.data?.message || "Update failed");
  } finally {
    setIsUpdating(false);
  }
};
  /* ============================================================
     SOCIAL LOGIC (Follow, Like, Delete)
     ============================================================ */
 const toggleFollow = async () => {
    if (followLoading || !profile) return;
    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await api.post(`/users/unfollow/${profile._id}`);
        setProfile(p => ({ ...p, isFollowing: false, followersCount: p.followersCount - 1 }));
        toast.success("Unfollowed");
      } else if (profile.hasRequestedFollow) {
        await api.delete(`/follow-requests/${profile._id}/cancel`);
        setProfile(p => ({ ...p, hasRequestedFollow: false }));
        toast("Request cancelled");
      } else {
        const res = await api.post(`/users/follow/${profile._id}`);
        // If the backend says the account is private, update the state to "Requested"
        if (profile.isPrivate) {
          setProfile(p => ({ ...p, hasRequestedFollow: true }));
          toast.success("Follow request sent");
        } else {
          setProfile(p => ({ ...p, isFollowing: true, followersCount: p.followersCount + 1 }));
          toast.success("Following");
          // Re-load data to unlock posts now that we follow them
          loadProfileData(); 
        }
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setFollowLoading(false);
    }
  };
const toggleLike = async (postId, e) => {
  if (e) e.stopPropagation();
  const myUserId = currentUser?._id || currentUser?.id;
  if (!myUserId) return toast.error("Please login to like");

  try {
    const res = await api.post(`/posts/${postId}/like`);
    // Extracting fields exactly like your Search.js logic
    const { liked, likes: newLikesCount } = res.data;

    const updateFn = (p) => {
      if (p._id !== postId) return p;
      
      const currentLikes = p.likes || [];
      const updatedLikesArray = liked
        ? [...new Set([...currentLikes, myUserId])]
        : currentLikes.filter((id) => id !== myUserId);

      return {
        ...p,
        likes: updatedLikesArray,
        likesCount: newLikesCount // This matches your backend response
      };
    };

    // Update the grid list
    setPosts((prev) => prev.map(updateFn));
    
    // Update the modal if open
    if (selectedPost?._id === postId) {
      setSelectedPost((prev) => updateFn(prev));
    }
  } catch (err) {
    console.error("Like error:", err);
    toast.error("Failed to update like");
  }
};
 const deletePost = async () => {
    try {
      await api.delete(`/posts/${selectedPost._id}`);
      setPosts(p => p.filter(x => x._id !== selectedPost._id));
      setSelectedPost(null);
      setConfirmDelete(false);
      toast.success("Post removed");
    } catch {
      toast.error("Delete failed");
    }
  };

  const openList = async (type) => {
    if (isLocked) return;
    setListType(type);
    setListLoading(true);
    try {
      const res = await api.get(`/users/${viewedUsername}/${type}`);
      setListUsers(res.data);
    } catch {
      toast.error("Failed to load list");
    } finally {
      setListLoading(false);
    }
  };

  const openComments = (postId, e) => {
    if (e) e.stopPropagation();
    const post = posts.find(p => p._id === postId) || selectedPost;
    if (post?.commentsBlocked) return toast.error("Comments are disabled");
    setCommentPostId(postId);
    setShowComments(true);
  };

  if (loading || !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-20 h-20 bg-gray-200 rounded-full mb-4"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] text-black">
      
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">{profile.username}</h2>
            {profile.isPrivate && <Lock size={16} className="text-gray-400" />}
          </div>
          <div className="flex items-center gap-4">
            {isOwnProfile ? (
              <>
                <button onClick={() => navigate("/create")} className="hover:scale-110 active:scale-95 transition-all">
                  <Plus size={28} />
                </button>
                <Settings size={24} className="cursor-pointer" onClick={() => navigate("/settings")} />
              </>
            ) : (
              <UserActionMenu userId={profile._id} isFollowing={profile.isFollowing} />
            )}
          </div>
        </div>
      </header>

      {/* PROFILE INFO SECTION */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16 mb-12">
          
          {/* Avatar Component */}
          <div className="relative group">
            <div className="w-24 h-24 md:w-40 md:h-40 rounded-full overflow-hidden border border-gray-200 p-1 bg-white">
              <img src={profile.avatar || DEFAULT_AVATAR} className="w-full h-full rounded-full object-cover" alt="profile" />
            </div>
            {isOwnProfile && (
              <button 
                onClick={() => setShowPhotoOptions(true)}
                className="absolute bottom-1 right-1 bg-blue-500 text-white p-2 rounded-full border-2 border-white shadow-lg hover:bg-blue-600 transition-colors"
              >
                <Camera size={20} />
              </button>
            )}
          </div>

          {/* Details Component */}
          <div className="flex-1 w-full text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
              <h1 className="text-2xl font-light">{profile.username}</h1>
              <div className="flex gap-2 w-full md:w-auto">
                {isOwnProfile ? (
                  <button onClick={() => setEditing(true)} className="flex-1 md:px-6 py-1.5 border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
                    Edit profile
                  </button>
                ) : (
                  <button 
                    disabled={followLoading}
                    onClick={toggleFollow}
                    className={`flex-1 md:px-8 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      profile.isFollowing ? "bg-gray-200 text-black" : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {profile.isFollowing ? "Following" : profile.hasRequestedFollow ? "Requested" : "Follow"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-around md:justify-start md:gap-10 py-4 border-y border-gray-100 md:border-none mb-4">
              <StatItem label="posts" value={profile.postsCount} />
              <StatItem label="followers" value={profile.followersCount} onClick={() => openList("followers")} />
              <StatItem label="following" value={profile.followingCount} onClick={() => openList("following")} />
            </div>

           {/* UPDATED DISPLAY SECTION */}
<div className="space-y-1">
  <p className="font-bold">{profile.name || profile.username}</p>
  <p className="text-sm whitespace-pre-line leading-snug">{profile.bio}</p>
  
  {/* LINK IN BIO LOGIC */}
  {/* UPDATED MULTI-LINK DISPLAY */}
{profile.links && profile.links.length > 0 && (
  <div className="flex flex-col gap-1 mt-2">
    {profile.links.map((link, index) => (
      link.url && (
        <a 
          key={index}
          href={link.url.startsWith('http') ? link.url : `https://${link.url}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-1.5 text-blue-900 font-bold text-sm hover:underline"
        >
          <LinkIcon size={14} className="text-gray-500" />
          {link.title || link.url.replace(/^https?:\/\//, '')}
        </a>
      )
    ))}
  </div>
)}</div></div>
        </div>

        {/* POSTS TAB NAVIGATION */}
        <div className="border-t border-gray-200">
          <div className="flex justify-center gap-12">
            <button className="flex items-center gap-1.5 py-4 border-t border-black -mt-[1px] text-xs font-bold tracking-widest uppercase">
              <Grid size={14} /> Posts
            </button>
          </div>
        </div>

        {/* GRID DISPLAY */}
       {/* GRID DISPLAY */}
<main className="mt-4">
  {isLocked ? (
    <div className="mt-10 text-center text-neutral-500">
      <Lock size={32} className="mx-auto mb-2" />
      <p className="font-medium">This account is private</p>
      <p className="text-sm">Follow to see their posts</p>
    </div>
  ) : posts.length === 0 ? (
    <div className="py-20 text-center flex flex-col items-center">
      <div className="w-16 h-16 border-2 border-gray-200 rounded-full flex items-center justify-center mb-4">
        <Camera size={32} className="text-gray-300" />
      </div>
      <h2 className="text-2xl font-black">No Posts Yet</h2>
    </div>
  ) : (
    <div className="grid grid-cols-3 gap-[1px]">
      {posts.map((p) => (
        <div
          key={p._id}
          className="aspect-square bg-gray-100 cursor-pointer group relative overflow-hidden flex items-center justify-center"
          onClick={() => setSelectedPost(p)}
        >
          {/* Media Content */}
          {p.mediaType === "text" ? (
            <div className="w-full h-full p-2 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-center">
              <p className="text-[10px] line-clamp-4 italic text-gray-700 font-medium px-1">
                {p.caption}
              </p>
            </div>
          ) : p.mediaType === "video" ? (
            <div className="w-full h-full relative">
              <video 
                src={p.imageUrl || p.videoUrl} 
                className="w-full h-full object-cover" 
                muted 
              />
              <div className="absolute top-1 right-1 bg-black/40 p-1 rounded">
                <Camera size={12} className="text-white" />
              </div>
            </div>
          ) : (
            <img
              src={p.imageUrl}
              className="w-full h-full object-cover"
              alt="Post"
            />
          )}

          {/* STATS OVERLAY: FIXED FOR LIVE COUNT ON HOVER */}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <div className="flex gap-4 text-white font-bold">
              <div className="flex items-center gap-1">
                <Heart size={18} fill="white" />
                <span className="text-sm">
                  {/* Logic synced with Search.js: checks likesCount first, then likes.length */}
                  {(p.likesCount !== undefined 
                    ? p.likesCount 
                    : (p.likes?.length || 0)
                  ).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle size={18} fill="white" />
                <span className="text-sm">
                  {(p.commentsCount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</main>      </div>

      {/* ============================================================
         MODAL OVERLAYS (EXTENDED)
         ============================================================ */}

      {/* 1. PHOTO SOURCE SELECTOR */}
      {showPhotoOptions && (
        <Modal title="Change Profile Photo" onClose={() => setShowPhotoOptions(false)}>
          <div className="flex flex-col">
            <button onClick={startLiveCamera} className="w-full py-4 text-blue-600 font-bold border-b hover:bg-gray-50 transition-colors flex items-center justify-center gap-3">
              <Camera size={20} /> Open Live Camera
            </button>
            <button onClick={() => avatarFileRef.current.click()} className="w-full py-4 text-blue-600 font-bold border-b hover:bg-gray-50 transition-colors flex items-center justify-center gap-3">
              <ImageIcon size={20} /> Choose from Gallery
            </button>
            {profile.avatar && (
              <button onClick={removeProfilePhoto} className="w-full py-4 text-red-500 font-bold border-b hover:bg-gray-50 transition-colors">
                Remove Current Photo
              </button>
            )}
            <button onClick={() => setShowPhotoOptions(false)} className="w-full py-4 text-gray-800 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <input ref={avatarFileRef} type="file" hidden accept="image/*" onChange={(e) => handlePhotoUpload(e.target.files[0])} />
          </div>
        </Modal>
      )}

      {/* 2. CAMERA MODAL */}
      {showCameraStream && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg aspect-[3/4] bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} hidden />
            <button onClick={closeCamera} className="absolute top-4 right-4 bg-white/20 p-2 rounded-full text-white backdrop-blur-md">
              <X size={24} />
            </button>
            <div className="absolute bottom-10 inset-x-0 flex justify-center">
              <button 
                onClick={captureImage}
                className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 active:scale-90 transition-transform shadow-lg shadow-black/50"
              />
            </div>
          </div>
          <p className="text-white mt-6 font-bold tracking-widest uppercase text-sm">Snap your new profile photo</p>
        </div>
      )}

      {/* 3. EDIT PROFILE MODAL (Full 1000+ line complexity style) */}
      {editing && (
        <Modal title="Edit Profile" onClose={() => setEditing(false)}>
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
              <img src={profile.avatar || DEFAULT_AVATAR} className="w-14 h-14 rounded-full object-cover" alt="" />
              <div>
                <p className="font-bold text-sm">{profile.username}</p>
                <button onClick={() => { setEditing(false); setShowPhotoOptions(true); }} className="text-blue-500 text-xs font-bold hover:underline">Change photo</button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl focus:border-blue-500 outline-none text-sm transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Bio</label>
                <textarea value={bio} rows={3} onChange={e=>setBio(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl focus:border-blue-500 outline-none text-sm transition-all resize-none" />
              </div>
             {/* UPDATED WEBSITE INPUT SECTION */}
<div className="space-y-3">
  <label className="text-sm font-semibold">Links</label>
  {links.map((link, index) => (
    <div key={index} className="flex gap-2 items-center">
      <input
        placeholder="Title (e.g. GitHub)"
        className="border p-2 rounded w-1/3"
        value={link.title}
        onChange={(e) => {
          const newLinks = [...links];
          newLinks[index].title = e.target.value;
          setLinks(newLinks);
        }}
      />
      <input
        placeholder="URL"
        className="border p-2 rounded w-full"
        value={link.url}
        onChange={(e) => {
          const newLinks = [...links];
          newLinks[index].url = e.target.value;
          setLinks(newLinks);
        }}
      />
      {links.length > 1 && (
        <button 
          onClick={() => setLinks(links.filter((_, i) => i !== index))}
          className="text-red-500"
        >
          ✕
        </button>
      )}
    </div>
  ))}
  
  <button 
    type="button"
    onClick={() => setLinks([...links, { title: "", url: "" }])}
    className="text-blue-500 text-sm font-medium"
  >
    + Add Another Link
  </button>
</div>            </div>

            <button 
              disabled={isUpdating}
              onClick={updateProfile}
              className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isUpdating ? "Saving Changes..." : "Save Profile Settings"}
            </button>
          </div>
        </Modal>
      )}

      {/* 4. POST DETAIL VIEW (Integrated Real Timing) */}
     {/* 4. POST DETAIL VIEW - UPDATED LAYOUT */}
      {/* 4. POST DETAIL VIEW - FIXED FOR LIVE UPDATES */}
{selectedPost && (() => {
  // FIND THE LIVE VERSION FROM THE POSTS ARRAY
  const livePost = posts.find(p => p._id === selectedPost._id) || selectedPost;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[150] p-4 backdrop-blur-sm">
      <div className="bg-white max-w-md w-full relative rounded-lg overflow-hidden shadow-2xl">
        {/* Close Button */}
        <button
          onClick={() => setSelectedPost(null)}
          className="absolute top-3 right-3 z-[160] bg-black/30 hover:bg-black/50 rounded-full p-1.5 text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Media Rendering Logic */}
        <div className="bg-gray-50 flex items-center justify-center min-h-[300px] max-h-[500px] overflow-hidden">
          {livePost.mediaType === "text" ? (
            <div className="w-full min-h-[300px] flex items-center justify-center p-10 bg-gradient-to-tr from-gray-50 to-white">
              <p className="text-xl font-medium text-center text-gray-800 italic leading-relaxed">
                {renderCaption(livePost.caption)}
              </p>
            </div>
          ) : livePost.mediaType === "video" ? (
            <div className="relative w-full h-full">
              <video
                src={livePost.imageUrl || livePost.videoUrl}
                className="w-full h-auto max-h-[500px] object-contain block"
                loop autoPlay controls playsInline
              />
            </div>
          ) : (
            <img 
              src={livePost.imageUrl} 
              alt="Post" 
              className="w-full h-auto max-h-[500px] object-contain block" 
            />
          )}
        </div>

        {/* Post Content & Actions */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <span 
              className="font-bold cursor-pointer hover:underline text-sm text-black"
              onClick={() => {
                setSelectedPost(null);
                if (!isOwnProfile) navigate(`/profile/${profile.username}`);
              }}
            >
              {profile.username}
            </span>
          </div>

          {livePost.mediaType !== "text" && (
            <p className="text-sm text-gray-800 leading-relaxed mb-4">
              {renderCaption(livePost.caption)}
            </p>
          )}

          <div className="flex gap-5 items-center pt-2 border-t mt-auto">
            <button
              onClick={(e) => toggleLike(livePost._id, e)}
              className="transform active:scale-125 transition-all"
            >
              <Heart
                size={24}
                className={
                  livePost.likes?.includes(currentUser?._id || currentUser?.id)
                    ? "fill-red-500 text-red-500"
                    : "text-black"
                }
              />
            </button>

            <button
              onClick={(e) => openComments(livePost._id, e)}
              className="hover:opacity-60 flex items-center gap-1.5"
            >
              <MessageCircle size={24} className="text-black" />
              <span className="text-sm font-bold text-black">{livePost.commentsCount || 0}</span>
            </button>

            {isOwnProfile && (
              <button 
                onClick={() => setConfirmDelete(true)}
                className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash size={22} />
              </button>
            )}
          </div>

          <div className="mt-3">
            {/* EXACT LIVE COUNT FROM STATE */}
           {/* EXACT LIKE COUNT DISPLAY (SEARCH STYLE) */}
<div className="px-4 pb-1">
  <p className="text-sm font-extrabold text-black">
    {(selectedPost.likesCount !== undefined 
      ? selectedPost.likesCount 
      : (selectedPost.likes?.length || 0)
    ).toLocaleString()} likes
  </p>
</div> <p className="text-[10px] text-gray-400 uppercase mt-1 tracking-wide">
              {new Date(livePost.createdAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
        </div>

        {confirmDelete && (
          <div className="absolute inset-0 bg-black/60 z-[170] flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl">
               <h3 className="font-bold text-xl mb-2 text-black">Delete post?</h3>
               <p className="text-sm text-gray-500 mb-6">This will permanently remove the post.</p>
               <div className="space-y-2">
                 <button onClick={deletePost} className="w-full py-3 text-red-500 font-bold border-b">Delete</button>
                 <button onClick={() => setConfirmDelete(false)} className="w-full py-3 font-medium text-black">Cancel</button>
               </div>
             </div>
           </div>
        )}
      </div>
    </div>
  );
})()} {/* 5. COMMENT BOX OVERLAY */}
      {showComments && commentPostId && (
        <div className="fixed inset-0 z-[200]">
          <CommentBox postId={commentPostId} onClose={() => setShowComments(false)} />
        </div>
      )}

      {/* 6. LIST MODAL */}
      {/* 6. LIST MODAL (Updated to match your specific logic) */}
{listType && (
  <Modal 
    title={listType === "followers" ? "Followers" : "Following"} 
    onClose={() => setListType(null)}
  >
    {listLoading ? (
      <div className="flex justify-center py-10">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    ) : listUsers.length === 0 ? (
      <p className="text-center text-sm text-neutral-500 py-6">
        {listType === "followers" ? "No followers yet" : "Not following anyone yet"}
      </p>
    ) : (
      <div className="max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar">
        {listUsers.map((u) => (
          <div key={u._id} className="flex items-center justify-between gap-3">
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => { 
                setListType(null); 
                navigate(`/profile/${u.username}`); 
              }}
            >
              <img 
                src={u.avatar || DEFAULT_AVATAR} 
                className="w-10 h-10 rounded-full object-cover border border-gray-100" 
                alt={u.username} 
              />
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight">
                  {u.username}
                  {u.isMe && " (You)"}
                </span>
                <span className="text-xs text-gray-400">{u.name}</span>
              </div>
            </div>

            {/* INTEGRATED ACTION MENU LOGIC */}
            {!u.isMe && (
              <UserActionMenu
                userId={u._id}
                isFollowing={u.isFollowing === true}
                showUnfollow={u.isFollowing === true}
                showRemoveFollower={listType === "followers" && isOwnProfile}
                onUnfollow={() =>
                  setListUsers((list) => list.filter((x) => x._id !== u._id))
                }
                onRemoveFollower={() =>
                  setListUsers((list) => list.filter((x) => x._id !== u._id))
                }
                onBlocked={() =>
                  setListUsers((list) => list.filter((x) => x._id !== u._id))
                }
              />
            )}
          </div>
        ))}
      </div>
    )}
  </Modal>
)}

    </div>
  );
}

/* ============================================================
   HELPER COMPONENTS (EXPANDED)
   ============================================================ */

function StatItem({ label, value, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`flex flex-col md:flex-row md:gap-1.5 items-center ${onClick ? "cursor-pointer group" : ""}`}
    >
      <span className="font-bold text-lg md:text-base group-hover:text-blue-500 transition-colors">
        {(value || 0).toLocaleString()}
      </span>
      <span className="text-xs md:text-sm text-gray-500 lowercase group-hover:text-black">
        {label}
      </span>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="w-6" />
          <h3 className="font-bold text-center text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
