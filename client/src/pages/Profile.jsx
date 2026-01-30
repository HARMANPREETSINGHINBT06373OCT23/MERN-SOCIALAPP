import {
  Grid,
  Camera,
  Plus,
  X,
  Pencil,
  Heart,
  MessageCircle,
  Trash,
  Lock
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../services/api";
import UserActionMenu from "../components/UserActionMenu";
 import { Link } from "react-router-dom";

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

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=User&background=random";

export default function Profile() {
  const navigate = useNavigate();
  const { username: paramUsername } = useParams();

  const avatarFileRef = useRef(null);
  const modalFileRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const myUsername = currentUser?.username;

  const viewedUsername = paramUsername || myUsername;
  const isOwnProfile = viewedUsername === myUsername;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const [selectedPost, setSelectedPost] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [listType, setListType] = useState(null);
  const [listUsers, setListUsers] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  /* ===============================
     LOAD PROFILE + POSTS
     =============================== */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);

        const profileRes = await api.get(`/users/${viewedUsername}`);
        setProfile(profileRes.data);
        setName(profileRes.data.name ?? "");
        setBio(profileRes.data.bio ?? "");

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
      } catch {
        toast.error("Profile not available");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [viewedUsername]);

  /* ===============================
     FOLLOW / UNFOLLOW
     =============================== */
  const toggleFollow = async () => {
    if (followLoading) return;

    try {
      setFollowLoading(true);

      if (profile.isFollowing) {
        await api.post(`/users/unfollow/${profile._id}`);
        setProfile(p => ({
          ...p,
          isFollowing: false,
          followersCount: p.followersCount - 1
        }));
        toast.success("Unfollowed");
        return;
      }

      if (profile.hasRequestedFollow) {
        await api.delete(`/follow-requests/${profile._id}/cancel`);
        setProfile(p => ({ ...p, hasRequestedFollow: false }));
        toast("Follow request cancelled");
        return;
      }

      await api.post(`/users/follow/${profile._id}`);

      if (profile.isPrivate) {
        setProfile(p => ({ ...p, hasRequestedFollow: true }));
        toast.success("Follow request sent");
      } else {
        setProfile(p => ({
          ...p,
          isFollowing: true,
          followersCount: p.followersCount + 1
        }));
        toast.success("Followed");
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setFollowLoading(false);
    }
  };

  /* ===============================
     FOLLOW LIST
     =============================== */
  const openList = async type => {
    if (isLocked) return;

    try {
      setListType(type);
      setListLoading(true);
      const res = await api.get(`/users/${viewedUsername}/${type}`);
      setListUsers(res.data);
    } catch {
      toast.error("Failed to load list");
    } finally {
      setListLoading(false);
    }
  };

  /* ===============================
     AVATAR
     =============================== */
  const uploadAvatar = async file => {
    if (!file) return;

    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await api.patch("/users/me", form);
      setProfile(res.data);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to update photo");
    }
  };

  /* ===============================
     UPDATE PROFILE
     =============================== */
  const updateProfile = async () => {
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("bio", bio);

      if (removeAvatar) form.append("avatar", "REMOVE");
      else if (avatar) form.append("avatar", avatar);

      const res = await api.patch("/users/me", form);
      setProfile(res.data);
      setEditing(false);
      setAvatar(null);
      setRemoveAvatar(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Update failed");
    }
  };

  /* ===============================
     DELETE POST
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

  if (loading || !profile) return null;

  return (
    <div className="min-h-screen bg-white text-black">
      {/* TOP BAR */}
      <div className="sticky top-0 z-10 flex justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">{profile.username}</h2>
          {profile.isPrivate && <Lock size={16} />}
        </div>

        {!isOwnProfile ? (
          <UserActionMenu
            userId={profile._id}
            isFollowing={profile.isFollowing}
            onBlocked={() => navigate("/")}
            onUnfollow={() =>
              setProfile(p => ({
                ...p,
                isFollowing: false,
                followersCount: p.followersCount - 1
              }))
            }
          />
        ) : (
          <button onClick={() => navigate("/create")}>
            <Plus />
          </button>
        )}
      </div>

      {/* PROFILE HEADER */}
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="flex gap-6 items-center">
          <div className="relative">
            <img
              src={profile.avatar || DEFAULT_AVATAR}
              className="w-24 h-24 rounded-full object-cover"
            />
            {isOwnProfile && (
              <>
                <button
                  onClick={() => avatarFileRef.current.click()}
                  className="absolute bottom-0 right-0 bg-blue-500 p-1 rounded-full"
                >
                  <Plus size={16} className="text-white" />
                </button>
                <input
                  ref={avatarFileRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={e => uploadAvatar(e.target.files[0])}
                />
              </>
            )}
          </div>

          <div className="flex flex-1 justify-around text-center">
            <Stat label="Posts" value={profile.postsCount} />
            <Stat
              label="Followers"
              value={profile.followersCount}
              onClick={() => openList("followers")}
            />
            <Stat
              label="Following"
              value={profile.followingCount}
              onClick={() => openList("following")}
            />
          </div>
        </div>

        <div className="mt-4">
          <p className="font-semibold">
            {profile.name?.trim() || profile.username}
          </p>
          <p className="text-sm whitespace-pre-line">
            {profile.bio || "Welcome to my profile 👋"}
          </p>
        </div>

        <div className="flex gap-2 mt-4">
          {isOwnProfile ? (
            <button
              onClick={() => setEditing(true)}
              className="flex-1 border py-1.5 rounded flex items-center justify-center gap-2"
            >
              <Pencil size={14} /> Edit profile
            </button>
          ) : (
            <button
              disabled={followLoading}
              onClick={toggleFollow}
              className={`flex-1 py-1.5 rounded ${
                profile.isFollowing
                  ? "border"
                  : profile.hasRequestedFollow
                  ? "border text-neutral-500"
                  : "bg-blue-500 text-white"
              }`}
            >
              {profile.isFollowing
                ? "Unfollow"
                : profile.hasRequestedFollow
                ? "Requested"
                : "Follow"}
            </button>
          )}
        </div>
      </div>

      {/* POSTS */}
      <div className="border-t py-2 flex justify-center">
        <Grid />
      </div>

      {isLocked ? (
        <div className="mt-10 text-center text-neutral-500">
          <Lock size={32} className="mx-auto mb-2" />
          <p className="font-medium">This account is private</p>
          <p className="text-sm">Follow to see their posts</p>
        </div>
      ) : posts.length === 0 ? (
        <EmptyState />
      ) : (
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

      {/* FOLLOW LIST MODAL */}
     {/* FOLLOW LIST MODAL */}
{/* FOLLOW LIST MODAL */}
{/* FOLLOW LIST MODAL */}
{/* FOLLOW LIST MODAL */}
{listType && (
  <Modal
    title={listType === "followers" ? "Followers" : "Following"}
    onClose={() => setListType(null)}
  >
    {listLoading ? (
      <p className="text-center">Loading...</p>
    ) : listUsers.length === 0 ? (
      <p className="text-center text-sm text-neutral-500 py-6">
        {listType === "followers"
          ? "No followers yet"
          : "Not following anyone yet"}
      </p>
    ) : (
      <div className="space-y-3">
        {listUsers.map(u => (
          <div
            key={u._id}
            className="flex items-center gap-3 justify-between"
          >
            {/* USER INFO */}
            <div
              onClick={() => {
                setListType(null);
                navigate(`/profile/${u.username}`);
              }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <img
                src={u.avatar || DEFAULT_AVATAR}
                className="w-9 h-9 rounded-full"
                alt={u.username}
              />
              <span className="font-medium">
                {u.username}
                {u.isMe && " (You)"}
              </span>
            </div>

            {/* ACTION MENU — FINAL, CORRECT RULES */}
            {!u.isMe && (
              <UserActionMenu
                userId={u._id}

                /* 🔥 Unfollow ONLY if I actually follow them */
                isFollowing={u.isFollowing === true}
                showUnfollow={u.isFollowing === true}

                /* 🔥 Remove follower ONLY on my followers list */
                showRemoveFollower={
                  listType === "followers" && isOwnProfile
                }

                onUnfollow={() =>
                  setListUsers(list =>
                    list.filter(x => x._id !== u._id)
                  )
                }

                onRemoveFollower={() =>
                  setListUsers(list =>
                    list.filter(x => x._id !== u._id)
                  )
                }

                onBlocked={() =>
                  setListUsers(list =>
                    list.filter(x => x._id !== u._id)
                  )
                }
              />
            )}
          </div>
        ))}
      </div>
    )}
  </Modal>
)}
      {/* POST MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
          <div className="bg-white max-w-md w-full relative">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3"
            >
              <X />
            </button>

            <img src={selectedPost.imageUrl} />

            <div className="p-3">
              <p
  className="font-semibold cursor-pointer hover:underline"
  onClick={() => setSelectedPost(null)}
>
  {profile.username}
</p>

<p className="text-sm whitespace-pre-line">
  {renderCaption(selectedPost.caption)}
</p>


              <div className="flex gap-4 mt-3">
                <Heart />
                <MessageCircle />
                {isOwnProfile && (
                  <Trash
                    onClick={() => setConfirmDelete(true)}
                    className="ml-auto cursor-pointer"
                  />
                )}
              </div>
            </div>

            {confirmDelete && (
              <ConfirmDelete
                onConfirm={deletePost}
                onCancel={() => setConfirmDelete(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {editing && (
        <Modal title="Edit Profile" onClose={() => setEditing(false)}>
          <div className="text-center mb-3 space-y-2">
            <button
              onClick={() => modalFileRef.current.click()}
              className="text-blue-500 text-sm block w-full"
            >
              Change profile photo
            </button>
            <button
              onClick={() => setRemoveAvatar(true)}
              className="text-red-500 text-sm block w-full"
            >
              Remove profile photo
            </button>
          </div>

          <input
            ref={modalFileRef}
            type="file"
            hidden
            accept="image/*"
            onChange={e => setAvatar(e.target.files[0])}
          />

          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="border p-2 w-full mb-2"
            placeholder="Name"
          />

          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={4}
            className="border p-2 w-full mb-3 resize-none"
            placeholder="Bio"
          />

          <button
            onClick={updateProfile}
            className="bg-black text-white w-full py-2 rounded"
          >
            Save
          </button>
        </Modal>
      )}
    </div>
  );
}

/* ===== HELPERS ===== */

function Stat({ label, value, onClick }) {
  return (
    <div
      onClick={onClick}
      className={onClick ? "cursor-pointer" : "cursor-default"}
    >
      <p className="font-semibold">{value}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center mt-20 text-neutral-500">
      <Camera size={36} className="mx-auto mb-2" />
      No posts yet
    </div>
  );
}

function ConfirmDelete({ onConfirm, onCancel }) {
  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-4 rounded w-72 text-center">
        <p className="mb-4 font-semibold">Delete this post permanently?</p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white py-2 rounded"
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({ children, title, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-4 w-full max-w-sm rounded relative">
        <button onClick={onClose} className="absolute right-3 top-3">
          <X />
        </button>
        <h3 className="font-semibold mb-3 text-center">{title}</h3>
        {children}
      </div>
    </div>
  );
}
