import React, { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";
import toast from "react-hot-toast";
import timeAgo from "../utils/timeAgo";

export default function CommentBox({
  postId,
  onClose,
  highlightCommentId
}) {
  const me = JSON.parse(localStorage.getItem("user"));

  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const [expanded, setExpanded] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [highlightedId, setHighlightedId] = useState(null);
  const commentRefs = useRef({});

  /* ===============================
      LOAD COMMENTS
      =============================== */
  useEffect(() => {
    api.get(`/comments/${postId}`).then(res => setComments(res.data));
  }, [postId]);

  /* ===============================
      SOCKET UPDATES
      =============================== */
  useEffect(() => {
    const onNew = c => {
      if (String(c.post) === String(postId)) {
        setComments(p => [...p, c]);
      }
    };
    const onEdit = u =>
      setComments(p => p.map(c => (c._id === u._id ? u : c)));
    const onDelete = ({ commentId }) =>
      setComments(p => p.filter(c => c._id !== commentId));

    socket.on("comment:new", onNew);
    socket.on("comment:edit", onEdit);
    socket.on("comment:delete", onDelete);

    return () => {
      socket.off("comment:new", onNew);
      socket.off("comment:edit", onEdit);
      socket.off("comment:delete", onDelete);
    };
  }, [postId]);

  /* ===============================
      AUTO EXPAND + SCROLL + HIGHLIGHT
      =============================== */
  useEffect(() => {
    if (!highlightCommentId || comments.length === 0) return;

    const expandMap = {};
    let current = comments.find(c => c._id === highlightCommentId);

    while (current?.parent) {
      expandMap[current.parent] = true;
      current = comments.find(c => c._id === current.parent);
    }

    setExpanded(p => ({ ...p, ...expandMap }));

    setTimeout(() => {
      const el = commentRefs.current[highlightCommentId];
      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedId(highlightCommentId);
      setTimeout(() => setHighlightedId(null), 2500);
    }, 400);
  }, [highlightCommentId, comments]);

  /* ===============================
      CREATE COMMENT / REPLY (FIXED)
      =============================== */
  const submit = async () => {
    if (!text.trim() || !me) return;

    try {
      const parentId = replyTo?.parent || replyTo?._id || null;

      const res = await api.post(`/comments/${postId}`, {
        text,
        parentCommentId: parentId
      });

      // Local update
      setComments(p => [...p, res.data]);
      setText("");
      setReplyTo(null);
      
      // Note: The Profile count is refreshed via the onClose handler 
      // or you could add a specific onUpdate callback here if needed.
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to post comment"
      );
    }
  };

  /* ===============================
      EDIT
      =============================== */
  const startEdit = c => {
    setEditingId(c._id);
    setEditText(c.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async id => {
    try {
      const res = await api.put(`/comments/${id}`, { text: editText });
      setComments(p => p.map(c => (c._id === id ? res.data : c)));
      cancelEdit();
      toast.success("Comment updated");
    } catch (err) {
      toast.error("Failed to update comment");
    }
  };

  /* ===============================
      DELETE
      =============================== */
  const deleteComment = async () => {
    try {
      await api.delete(`/comments/${confirmDeleteId}`);
      setConfirmDeleteId(null);
      toast.success("Comment deleted");
    } catch (err) {
      toast.error("Failed to delete comment");
    }
  };

  /* ===============================
      FIXED OWNER CHECK
      =============================== */
  const isOwner = c => {
    if (!me || !c?.user?._id) return false;
    const myId = me._id || me.id;
    return String(c.user._id) === String(myId);
  };

  const parents = comments.filter(c => !c.parent);
  const replies = comments.filter(c => c.parent);

  const getReplies = parentId =>
    replies.filter(r => String(r.parent) === String(parentId));

  const renderText = text =>
    text.split(/(@[a-zA-Z0-9_]+)/g).map((part, i) =>
      part.startsWith("@") ? (
        <Link
          key={i}
          to={`/profile/${part.slice(1)}`}
          className="text-blue-500 hover:underline"
        >
          {part}
        </Link>
      ) : (
        <span key={i}>{part}</span>
      )
    );

  const handleClose = () => {
    // When closing, the Profile.js onClose will trigger handleCommentAdded
    onClose();
    const url = new URL(window.location.href);
    url.searchParams.delete("post");
    url.searchParams.delete("comment");
    window.history.replaceState({}, "", url.pathname);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} />

      <div className="fixed inset-x-0 top-16 bottom-0 z-50 bg-white flex flex-col">
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <span className="font-semibold text-lg">Comments ({comments.length})</span>
          <X onClick={handleClose} className="cursor-pointer hover:text-red-500 transition-colors" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 bg-gray-50/30">
          {parents.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                <p>No comments yet.</p>
                <p className="text-sm">Start the conversation!</p>
             </div>
          ) : (
            parents.map(c => {
              const childReplies = getReplies(c._id);
              const isExpanded = expanded[c._id];

              return (
                <div key={c._id} className="bg-white p-1 rounded-lg shadow-sm border border-transparent hover:border-gray-100">
                  <CommentItem
                    ref={el => (commentRefs.current[c._id] = el)}
                    c={c}
                    highlighted={highlightedId === c._id}
                    isOwner={isOwner}
                    renderText={renderText}
                    startEdit={startEdit}
                    editingId={editingId}
                    editText={editText}
                    setEditText={setEditText}
                    saveEdit={saveEdit}
                    cancelEdit={cancelEdit}
                    setReplyTo={comment => {
                      setReplyTo(comment);
                      setText(`@${comment.user.username} `);
                    }}
                    setConfirmDeleteId={setConfirmDeleteId}
                    timeAgo={timeAgo}
                  />

                  {childReplies.length > 0 && (
                    <div className="mt-1">
                      <button
                        className="ml-12 text-xs font-bold text-blue-500 hover:text-blue-700"
                        onClick={() =>
                          setExpanded(p => ({
                            ...p,
                            [c._id]: !p[c._id]
                          }))
                        }
                      >
                        {isExpanded
                          ? "── Hide replies"
                          : `── View replies (${childReplies.length})`}
                      </button>

                      {isExpanded && (
                        <div className="ml-10 mt-3 space-y-3 border-l-2 border-gray-100 pl-2">
                          {childReplies.map(r => (
                            <CommentItem
                              key={r._id}
                              ref={el =>
                                (commentRefs.current[r._id] = el)
                              }
                              c={r}
                              highlighted={highlightedId === r._id}
                              isOwner={isOwner}
                              renderText={renderText}
                              startEdit={startEdit}
                              editingId={editingId}
                              editText={editText}
                              setEditText={setEditText}
                              saveEdit={saveEdit}
                              cancelEdit={cancelEdit}
                              setReplyTo={comment => {
                                setReplyTo(comment);
                                setText(`@${comment.user.username} `);
                              }}
                              setConfirmDeleteId={setConfirmDeleteId}
                              timeAgo={timeAgo}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t bg-white px-4 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {replyTo && (
            <div className="flex items-center justify-between bg-gray-100 px-3 py-1 rounded-t-lg border-x border-t">
              <p className="text-xs text-neutral-600">
                Replying to <span className="font-bold">@{replyTo.user.username}</span>
              </p>
              <button onClick={() => setReplyTo(null)}>
                <X size={14} className="text-neutral-500" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Add a comment…"
              className={`flex-1 border rounded-2xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none transition-all ${replyTo ? 'rounded-tl-none' : ''}`}
              rows={1}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <button
              onClick={submit}
              className="bg-blue-500 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-600 disabled:opacity-40 transition-colors h-[42px]"
              disabled={!text.trim()}
            >
              Post
            </button>
          </div>
        </div>
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl">
            <p className="font-bold text-lg mb-2">Delete comment?</p>
            <p className="text-sm text-neutral-500 mb-6">
              This will permanently remove your comment.
            </p>
            <div className="flex flex-col gap-2">
               <button
                onClick={deleteComment}
                className="w-full bg-red-500 text-white rounded-xl py-3 font-bold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="w-full border rounded-xl py-3 font-semibold hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ===============================
    COMMENT ITEM
   =============================== */
const CommentItem = React.forwardRef(
  (
    {
      c,
      renderText,
      isOwner,
      startEdit,
      editingId,
      editText,
      setEditText,
      saveEdit,
      cancelEdit,
      setReplyTo,
      setConfirmDeleteId,
      timeAgo,
      highlighted
    },
    ref
  ) => (
    <div
      ref={ref}
      className={`flex gap-3 p-2 rounded-lg transition-all duration-500 ${
        highlighted
          ? "bg-blue-50 ring-2 ring-blue-500 shadow-lg"
          : "hover:bg-gray-50"
      }`}
    >
      <Link to={`/profile/${c.user.username}`} className="shrink-0">
        <img
          src={c.user.avatar || "https://ui-avatars.com/api/?name=" + c.user.username}
          className="w-9 h-9 rounded-full object-cover border border-gray-200"
          alt={c.user.username}
        />
      </Link>

      <div className="flex-1">
        <div className="text-sm">
          <Link
            to={`/profile/${c.user.username}`}
            className="font-bold hover:underline mr-2"
          >
            {c.user.username}
          </Link>
          
          {editingId === c._id ? (
            <div className="mt-2">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="border rounded-xl p-3 w-full resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => saveEdit(c._id)}
                  className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full font-bold"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-xs bg-gray-200 px-3 py-1 rounded-full font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <span className="text-neutral-800 break-words leading-relaxed">
              {renderText(c.text)}
              {c.edited && (
                <span className="text-[10px] text-neutral-400 ml-1">
                  (edited)
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex gap-4 text-[11px] font-bold text-neutral-400 mt-2 uppercase tracking-wider">
          <span>{timeAgo(c.createdAt)}</span>
          <button
            onClick={() => setReplyTo(c)}
            className="hover:text-black transition-colors"
          >
            Reply
          </button>

          {isOwner(c) && editingId !== c._id && (
            <>
              <button
                onClick={() => startEdit(c)}
                className="hover:text-black transition-colors"
              >
                Edit
              </button>
              <button
                className="text-red-400 hover:text-red-600 transition-colors"
                onClick={() => setConfirmDeleteId(c._id)}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
);