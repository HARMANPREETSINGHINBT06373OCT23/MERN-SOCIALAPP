import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

/* ---------- Icon Button ---------- */
const IconBtn = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="relative group p-2 rounded-full hover:bg-white/20 transition"
  >
    <span className="text-lg">{icon}</span>
    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-black text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
      {label}
    </span>
  </button>
);

export default function CreatePost() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [src, setSrc] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  /* crop === null → no crop box shown */
  const [crop, setCrop] = useState(null);
  const [drag, setDrag] = useState(null);

  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const startRef = useRef({});

  /* history */
  const history = useRef([]);
  const redo = useRef([]);

  /* ---------- Load Image ---------- */
  const loadImage = (file) => {
    setFile(file);
    setSrc(URL.createObjectURL(file));
    setRotation(0);
    setCrop(null);
    history.current = [];
    redo.current = [];
  };

  /* ---------- History ---------- */
  const saveHistory = () => {
    history.current.push({ src, rotation });
    redo.current = [];
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    redo.current.push({ src, rotation });
    setSrc(prev.src);
    setRotation(prev.rotation);
    setCrop(null);
  };

  const redoAction = () => {
    const next = redo.current.pop();
    if (!next) return;
    history.current.push({ src, rotation });
    setSrc(next.src);
    setRotation(next.rotation);
    setCrop(null);
  };

  /* ---------- Enable Fresh Crop ---------- */
  const startNewCrop = () => {
    const box = containerRef.current.getBoundingClientRect();
    const size = Math.min(box.width, box.height) * 0.6;

    setCrop({
      x: (box.width - size) / 2,
      y: (box.height - size) / 2,
      w: size,
      h: size,
    });
  };

  /* ---------- Drag Logic ---------- */
  const startDrag = (e, type) => {
    e.stopPropagation();
    setDrag(type);
    const p = e.touches ? e.touches[0] : e;
    startRef.current = { x: p.clientX, y: p.clientY, crop: { ...crop } };
  };

  const onMove = (e) => {
    if (!drag || !crop) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - startRef.current.x;
    const dy = p.clientY - startRef.current.y;

    let { x, y, w, h } = startRef.current.crop;

    if (drag === "move") {
      x += dx;
      y += dy;
    }
    if (drag.includes("r")) w += dx;
    if (drag.includes("l")) { x += dx; w -= dx; }
    if (drag.includes("b")) h += dy;
    if (drag.includes("t")) { y += dy; h -= dy; }

    setCrop({
      x: Math.max(0, x),
      y: Math.max(0, y),
      w: Math.max(60, w),
      h: Math.max(60, h),
    });
  };

  const stopDrag = () => setDrag(null);

  /* ---------- Apply Crop ---------- */
  const applyCrop = () => {
    if (!crop) return;
    saveHistory();

    const img = imgRef.current;
    const box = containerRef.current.getBoundingClientRect();

    const scaleX = img.naturalWidth / box.width;
    const scaleY = img.naturalHeight / box.height;

    const canvas = document.createElement("canvas");
    canvas.width = crop.w * scaleX;
    canvas.height = crop.h * scaleY;

    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      img,
      -(crop.x + crop.w / 2) * scaleX,
      -(crop.y + crop.h / 2) * scaleY,
      img.naturalWidth,
      img.naturalHeight
    );

    canvas.toBlob((blob) => {
      const newFile = new File([blob], "crop.jpg", { type: "image/jpeg" });
      setFile(newFile);
      setSrc(URL.createObjectURL(newFile));
      setRotation(0);
      setCrop(null); // ✅ hide crop box after crop
    });
  };

  /* ---------- Submit ---------- */
  const submit = async () => {
    if (!file) return toast.error("Select an image");

    const fd = new FormData();
    fd.append("image", file);
    fd.append("caption", caption);

    try {
      setLoading(true);
      await api.post("/posts", fd);
      toast.success("Post shared 📸");
      navigate("/");
    } catch {
      toast.error("Failed to post");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
      onMouseMove={onMove}
      onMouseUp={stopDrag}
      onTouchMove={onMove}
      onTouchEnd={stopDrag}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="flex justify-between px-4 py-3 border-b">
          <span className="font-semibold">Create post</span>
          <button onClick={() => navigate("/")}>✕</button>
        </div>

        <div className="p-4 space-y-4">

          {src ? (
            <div ref={containerRef} className="relative">
              <img
                ref={imgRef}
                src={src}
                alt=""
                className="w-full aspect-square object-cover rounded-xl"
                style={{ transform: `rotate(${rotation}deg)` }}
              />

              {/* Crop Overlay */}
              {crop && (
                <div
                  className="absolute border-2 border-white cursor-move"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.w,
                    height: crop.h,
                  }}
                  onMouseDown={(e) => startDrag(e, "move")}
                  onTouchStart={(e) => startDrag(e, "move")}
                >
                  {[
                    ["tl","top-0 left-0"],
                    ["tr","top-0 right-0"],
                    ["bl","bottom-0 left-0"],
                    ["br","bottom-0 right-0"],
                    ["t","top-0 left-1/2"],
                    ["b","bottom-0 left-1/2"],
                    ["l","left-0 top-1/2"],
                    ["r","right-0 top-1/2"],
                  ].map(([k,pos]) => (
                    <span
                      key={k}
                      onMouseDown={(e) => startDrag(e, k)}
                      onTouchStart={(e) => startDrag(e, k)}
                      className={`absolute ${pos} w-3 h-3 bg-white -translate-x-1/2 -translate-y-1/2`}
                    />
                  ))}
                </div>
              )}

              {/* Toolbar */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 rounded-full flex gap-2 px-3 py-1 text-white">
                <IconBtn icon="↩️" label="Undo" onClick={undo} />
                <IconBtn icon="↪️" label="Redo" onClick={redoAction} />
                <IconBtn icon="🔄" label="Rotate" onClick={() => { saveHistory(); setRotation(r => r + 90); }} />
                <IconBtn
                  icon="✂️"
                  label={crop ? "Apply crop" : "Crop"}
                  onClick={crop ? applyCrop : startNewCrop}
                />
              </div>
            </div>
          ) : (
            <label className="aspect-square border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer">
              Upload Image
              <input hidden type="file" accept="image/*" onChange={(e) => loadImage(e.target.files[0])} />
            </label>
          )}

          <textarea
            className="w-full border rounded-xl p-2 text-sm resize-none"
            placeholder="Write a caption..."
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <button
            onClick={submit}
            disabled={loading}
            className="w-full bg-black text-white py-2.5 rounded-xl"
          >
            {loading ? "Posting..." : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
