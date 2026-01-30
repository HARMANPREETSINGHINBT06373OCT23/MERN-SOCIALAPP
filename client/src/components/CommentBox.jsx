import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";
import timeAgo from "../utils/timeAgo";

export default function CommentBox({ postId, onClose }) {
  const me = JSON.parse(localStorage.getItem("user"));

  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const [expanded, setExpanded] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  /* ===============================
     LOAD COMMENTS
     =============================== */
  useEffect(() => {
    api.get(`/comments/${postId}`).then(res =>
      setComments(res.data)
    );
  }, [postId]);

  /* ===============================
     SOCKET UPDATES
     =============================== */
  useEffect(() => {
    socket.on("comment:new", comment => {
      setComments(prev => [...prev, comment]);
    });

    socket.on("comment:edit", updated => {
      setComments(prev =>
        prev.map(c =>
          c._id === updated._id ? updated : c
        )
      );
    });

    socket.on("comment:delete", ({ commentId }) => {
      setComments(prev =>
        prev.filter(c => c._id !== commentId)
      );
    });

    return () => {
      socket.off("comment:new");
      socket.off("comment:edit");
      socket.off("comment:delete");
    };
  }, []);

  /* ===============================
     CREATE COMMENT / REPLY
     =============================== */
  const submit = async () => {
    if (!text.trim() || !me) return;

    const res = await api.post(`/comments/${postId}`, {
      text,
     parentCommentId: replyTo?._id
 || null
    });

    setComments(prev => [...prev, res.data]);
    setText("");
    setReplyTo(null);
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
    const res = await api.put(`/comments/${id}`, {
      text: editText
    });

    setComments(prev =>
      prev.map(c =>
        c._id === id ? res.data : c
      )
    );

    cancelEdit();
  };

  /* ===============================
     DELETE
     =============================== */
  const deleteComment = async () => {
    await api.delete(`/comments/${confirmDeleteId}`);
    setConfirmDeleteId(null);
  };

  /* ===============================
     HELPERS
     =============================== */
  const isOwner = c =>
    me && me.username === c.user.username;

  const parents = comments.filter(c => !c.parent);
  const replies = comments.filter(c => c.parent);

  const getReplies = parentId =>
    replies.filter(
      r => String(r.parent) === String(parentId)
    );

  return (
    <>
      {/* OVERLAY */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* PANEL */}
      <div className="fixed inset-x-0 top-16 bottom-0 z-50 bg-white flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <span className="font-semibold">Comments</span>
          <X onClick={onClose} className="cursor-pointer" />
        </div>

        {/* COMMENTS */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {parents.map(c => {
            const childReplies = getReplies(c._id);
            const isExpanded = expanded[c._id];

            return (
              <div key={c._id}>
                {/* PARENT */}
                <div className="flex gap-3">
                  <Link to={`/profile/${c.user.username}`}>
                    <img
                      src={c.user.avatar || "/avatar.png"}
                      className="w-8 h-8 rounded-full"
                    />
                  </Link>

                  <div className="flex-1">
                    <p className="text-sm">
                      <Link
                        to={`/profile/${c.user.username}`}
                        className="font-semibold"
                      >
                        {c.user.username}
                      </Link>{" "}
                      {editingId === c._id ? (
                        <input
                          value={editText}
                          onChange={e =>
                            setEditText(e.target.value)
                          }
                          className="border p-1 w-full mt-1"
                        />
                      ) : (
                        <>
                          {c.text}
                          {c.edited && (
                            <span className="text-xs text-neutral-400">
                              {" "} (edited)
                            </span>
                          )}
                        </>
                      )}
                    </p>

                    <div className="flex gap-4 text-xs text-neutral-400 mt-1">
                      <span>{timeAgo(c.createdAt)}</span>

                      <button onClick={() => setReplyTo(c)}>
                        Reply
                      </button>

                      {childReplies.length > 0 && (
                        <button
                          onClick={() =>
                            setExpanded(prev => ({
                              ...prev,
                              [c._id]: !prev[c._id]
                            }))
                          }
                        >
                          {isExpanded
                            ? "Hide replies"
                            : `View replies (${childReplies.length})`}
                        </button>
                      )}

                      {isOwner(c) && editingId !== c._id && (
                        <>
                          <button onClick={() => startEdit(c)}>
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDeleteId(c._id)
                            }
                            className="text-red-500"
                          >
                            Delete
                          </button>
                        </>
                      )}

                      {editingId === c._id && (
                        <>
                          <button onClick={() => saveEdit(c._id)}>
                            Save
                          </button>
                          <button onClick={cancelEdit}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* REPLIES */}
                {isExpanded && (
                  <div className="ml-10 mt-3 space-y-3">
                    {childReplies.map(r => (
                      <div key={r._id} className="flex gap-3">
                        <Link to={`/profile/${r.user.username}`}>
                          <img
                            src={r.user.avatar || "/avatar.png"}
                            className="w-7 h-7 rounded-full"
                          />
                        </Link>

                        <div className="flex-1">
                          <p className="text-sm">
                            <Link
                              to={`/profile/${r.user.username}`}
                              className="font-semibold"
                            >
                              {r.user.username}
                            </Link>{" "}
                            {editingId === r._id ? (
                              <input
                                value={editText}
                                onChange={e =>
                                  setEditText(e.target.value)
                                }
                                className="border p-1 w-full mt-1"
                              />
                            ) : (
                              <>
                                {r.text}
                                {r.edited && (
                                  <span className="text-xs text-neutral-400">
                                    {" "} (edited)
                                  </span>
                                )}
                              </>
                            )}
                          </p>

                          <div className="flex gap-4 text-xs text-neutral-400 mt-1">
                            <span>{timeAgo(r.createdAt)}</span>

                            {isOwner(r) && editingId !== r._id && (
                              <>
                                <button onClick={() => startEdit(r)}>
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    setConfirmDeleteId(r._id)
                                  }
                                  className="text-red-500"
                                >
                                  Delete
                                </button>
                              </>
                            )}

                            {editingId === r._id && (
                              <>
                                <button onClick={() => saveEdit(r._id)}>
                                  Save
                                </button>
                                <button onClick={cancelEdit}>
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* INPUT */}
        <div className="border-t px-4 py-3">
          {replyTo && (
            <p className="text-xs mb-1">
              Replying to @{replyTo.user.username}
              <button
                className="ml-2"
                onClick={() => setReplyTo(null)}
              >
                ✕
              </button>
            </p>
          )}

          <div className="flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 border rounded-full px-4 py-2"
            />
            <button onClick={submit}>Post</button>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRM */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-xl p-5 w-72 text-center">
            <p className="font-semibold mb-2">
              Delete comment?
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border rounded py-2"
              >
                Cancel
              </button>
              <button
                onClick={deleteComment}
                className="flex-1 bg-red-500 text-white rounded py-2"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
