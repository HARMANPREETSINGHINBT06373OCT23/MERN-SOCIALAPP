import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

/* ---------- Modern SVG Icons ---------- */
const Icons = {
  Text: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Media: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Camera: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
  Gallery: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
  Undo: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
  Redo: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>,
  Rotate: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>,
  Crop: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>,
  Back: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  Volume2: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
  VolumeX: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>,
};

const IconBtn = ({ icon: Icon, label, onClick, active }) => (
  <button
    onClick={onClick}
    className={`relative group p-3 rounded-xl transition-all duration-200 ${
      active ? "bg-white text-black scale-105 shadow-md" : "hover:bg-white/20 text-white"
    }`}
  >
    <div className="flex items-center justify-center"><Icon /></div>
    <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-tighter bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
      {label}
    </span>
  </button>
);

export default function CreatePost() {
  const navigate = useNavigate();

  // Basic State
  const [step, setStep] = useState("choice"); 
  const [file, setFile] = useState(null);
  const [src, setSrc] = useState(null);
  const [mediaType, setMediaType] = useState("text");
  const [rotation, setRotation] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  // Editor States
  const [crop, setCrop] = useState(null);
  const [drag, setDrag] = useState(null);
  
  // Video Trim States
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const imgRef = useRef(null);
  const videoRef = useRef(null);
  const webcamRef = useRef(null);
  const containerRef = useRef(null);
  const startRef = useRef({});
  const galleryInputRef = useRef(null);
  const history = useRef([]);
  const redo = useRef([]);

  /* ---------- Video Trim Sync Logic ---------- */
  useEffect(() => {
    if (mediaType === "video" && videoRef.current) {
      const handleTimeUpdate = () => {
        if (videoRef.current.currentTime < trimStart) {
          videoRef.current.currentTime = trimStart;
        }
        if (videoRef.current.currentTime > trimEnd) {
          videoRef.current.currentTime = trimStart;
        }
      };
      const v = videoRef.current;
      v.addEventListener("timeupdate", handleTimeUpdate);
      return () => v.removeEventListener("timeupdate", handleTimeUpdate);
    }
  }, [mediaType, trimStart, trimEnd]);

  /* ---------- Camera Logic ---------- */
  const startLiveCamera = async () => {
    setStep("live-camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (webcamRef.current) webcamRef.current.srcObject = stream;
    } catch (err) {
      toast.error("Camera access denied");
      setStep("media-source");
    }
  };

  const capturePhoto = () => {
    const video = webcamRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    video.srcObject.getTracks().forEach(track => track.stop());
    canvas.toBlob((blob) => {
      const capturedFile = new File([blob], "camera_snap.jpg", { type: "image/jpeg" });
      setFile(capturedFile);
      setSrc(URL.createObjectURL(capturedFile));
      setMediaType("image");
      setStep("media-editor");
    }, "image/jpeg");
  };

  /* ---------- File Handling ---------- */
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    const isVideo = selectedFile.type.startsWith("video");
    setMediaType(isVideo ? "video" : "image");
    setFile(selectedFile);
    setSrc(URL.createObjectURL(selectedFile));
    setStep("media-editor");
    if (isVideo) { setTrimStart(0); setTrimEnd(0); }
  };

  const onVideoLoad = (e) => {
    const duration = e.target.duration;
    setVideoDuration(duration);
    setTrimEnd(duration);
    setTrimStart(0);
  };

  const handleTrimChange = (e, type) => {
    const val = parseFloat(e.target.value);
    if (type === "start") {
      const newStart = Math.min(val, trimEnd - 0.2);
      setTrimStart(newStart);
      if (videoRef.current) videoRef.current.currentTime = newStart;
    } else {
      const newEnd = Math.max(val, trimStart + 0.2);
      setTrimEnd(newEnd);
      if (videoRef.current) videoRef.current.currentTime = newEnd;
    }
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    redo.current.push({ src, rotation, isMuted });
    setSrc(prev.src); setRotation(prev.rotation); setIsMuted(prev.isMuted);
  };

  const redoAction = () => {
    const next = redo.current.pop();
    if (!next) return;
    history.current.push({ src, rotation, isMuted });
    setSrc(next.src); setRotation(next.rotation); setIsMuted(next.isMuted);
  };

  const applyCrop = () => {
    if (!crop || mediaType !== "image") return;
    history.current.push({ src, rotation, isMuted });
    
    const img = imgRef.current;
    // Calculate scale between display size and actual image size
    const box = containerRef.current.getBoundingClientRect();
    const scaleX = img.naturalWidth / img.width; 
    const scaleY = img.naturalHeight / img.height;

    const canvas = document.createElement("canvas");
    // Set canvas to the actual pixel size of the crop
    canvas.width = crop.w * scaleX;
    canvas.height = crop.h * scaleY;
    
    const ctx = canvas.getContext("2d");

    // Improve quality by using imageSmoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate the offset from the image center
    const drawX = -(crop.x - img.offsetLeft + crop.w / 2) * scaleX;
    const drawY = -(crop.y - img.offsetTop + crop.h / 2) * scaleY;

    ctx.drawImage(
      img,
      drawX,
      drawY,
      img.naturalWidth,
      img.naturalHeight
    );

    // Use 0.92 for high-quality JPEG compression
    canvas.toBlob((blob) => {
      const newFile = new File([blob], "crop.jpg", { type: "image/jpeg" });
      setFile(newFile);
      setSrc(URL.createObjectURL(newFile));
      setRotation(0);
      setCrop(null);
    }, "image/jpeg", 0.92); 
  };

const submit = async () => {
    if (mediaType === "text" && !caption.trim()) return toast.error("Write a caption first");
    if (mediaType !== "text" && !file) return toast.error("Select media first");

    // 1. Extract mentions to check permissions
    const mentions = caption.match(/@(\w+)/g)?.map(m => m.substring(1)) || [];

    const fd = new FormData();
    if (file) fd.append("image", file);
    fd.append("caption", caption);
    fd.append("mediaType", mediaType);
    fd.append("rotation", rotation);
    fd.append("isMuted", isMuted);
    fd.append("trimStart", trimStart);
    fd.append("trimEnd", trimEnd);
    
    // Send mentions as a stringified array so backend can process notifications
    fd.append("mentions", JSON.stringify(mentions));

    try {
      setLoading(true);
      const response = await api.post("/posts", fd);
      toast.success("Shared successfully! ✨"); 
      navigate("/");
    } catch (err) { 
      // Handle the "User disabled mentions" error from backend
      const errorMessage = err.response?.data?.message || "Error sharing post";
      toast.error(errorMessage); 
    } finally { 
      setLoading(false); 
    }
  };
  const goBack = () => {
    if (step === "choice") navigate("/");
    else if (step === "media-source") setStep("choice");
    else if (step === "live-camera") {
        if (webcamRef.current?.srcObject) webcamRef.current.srcObject.getTracks().forEach(t => t.stop());
        setStep("media-source");
    }
    else { setStep("choice"); setSrc(null); setFile(null); setCrop(null); }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-end sm:items-center justify-center"
         onMouseMove={(e) => {
           if (!drag || !crop) return;
           const p = e.touches ? e.touches[0] : e;
           const dx = p.clientX - startRef.current.x;
           const dy = p.clientY - startRef.current.y;
           let { x, y, w, h } = startRef.current.crop;
           if (drag === "move") { x += dx; y += dy; }
           else {
             if (drag.includes("r")) w += dx;
             if (drag.includes("l")) { x += dx; w -= dx; }
             if (drag.includes("b")) h += dy;
             if (drag.includes("t")) { y += dy; h -= dy; }
           }
           setCrop({ x: Math.max(0, x), y: Math.max(0, y), w: Math.max(80, w), h: Math.max(80, h) });
         }} 
         onMouseUp={() => setDrag(null)}>
      
      <div className="bg-white w-full sm:max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[96vh] overflow-hidden">
        
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100">
          <button onClick={goBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Icons.Back /></button>
          <span className="font-black text-xl tracking-tighter uppercase">New Post</span>
          <button onClick={submit} disabled={loading} className="bg-black text-white px-6 py-2 rounded-full font-bold text-sm hover:scale-105 transition-all disabled:opacity-20">
            {loading ? "..." : "Post"}
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === "choice" && (
            <div className="space-y-4 py-10">
              <button onClick={() => { setStep("text-editor"); setMediaType("text"); }} className="w-full flex items-center gap-6 p-8 rounded-[2rem] bg-gray-50 hover:bg-black hover:text-white transition-all group">
                <div className="w-14 h-14 bg-black group-hover:bg-white group-hover:text-black rounded-2xl flex items-center justify-center text-white"><Icons.Text /></div>
                <div className="text-left"><h3 className="font-extrabold text-xl">Text Story</h3><p className="text-sm opacity-60 font-medium">Post a status update</p></div>
              </button>
              <button onClick={() => setStep("media-source")} className="w-full flex items-center gap-6 p-8 rounded-[2rem] bg-gray-50 hover:bg-black hover:text-white transition-all group">
                <div className="w-14 h-14 bg-black group-hover:bg-white group-hover:text-black rounded-2xl flex items-center justify-center text-white"><Icons.Media /></div>
                <div className="text-left"><h3 className="font-extrabold text-xl">Multimedia</h3><p className="text-sm opacity-60 font-medium">Photo or Video</p></div>
              </button>
            </div>
          )}

          {step === "media-source" && (
            <div className="grid grid-cols-2 gap-4 py-12">
              <button onClick={startLiveCamera} className="flex flex-col items-center gap-4 p-10 rounded-[2.5rem] bg-gray-50 hover:bg-black hover:text-white transition-all shadow-sm">
                <Icons.Camera /><span className="font-bold text-xs uppercase tracking-widest">Live Camera</span>
              </button>
              <button onClick={() => galleryInputRef.current.click()} className="flex flex-col items-center gap-4 p-10 rounded-[2.5rem] bg-gray-50 hover:bg-black hover:text-white transition-all shadow-sm">
                <Icons.Gallery /><span className="font-bold text-xs uppercase tracking-widest">Gallery</span>
              </button>
              <input ref={galleryInputRef} type="file" hidden accept="image/*,video/*" onChange={handleFileSelect} />
            </div>
          )}

          {step === "live-camera" && (
            <div className="relative rounded-[2.5rem] overflow-hidden aspect-square bg-black shadow-2xl">
              <video ref={webcamRef} autoPlay playsInline className="w-full h-full object-cover" />
              <button onClick={capturePhoto} className="absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full border-8 border-white/30 hover:scale-110 active:scale-90" />
            </div>
          )}

          {(step === "media-editor" || step === "text-editor") && (
            <div className="space-y-6">
              {src && (
                <div className="space-y-4">
                  <div ref={containerRef} className="relative bg-black rounded-[2.5rem] overflow-hidden aspect-square flex items-center justify-center">
                    {mediaType === "image" ? (
                      <img ref={imgRef} src={src} className="max-w-full max-h-full object-contain" style={{ transform: `rotate(${rotation}deg)` }} />
                    ) : (
                      <video ref={videoRef} src={src} autoPlay loop muted={isMuted} onLoadedMetadata={onVideoLoad} className="max-w-full max-h-full object-contain" style={{ transform: `rotate(${rotation}deg)` }} />
                    )}
                    {crop && (
                      <div className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] cursor-move" style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }} onMouseDown={(e) => { e.stopPropagation(); setDrag("move"); startRef.current = { x: e.clientX, y: e.clientY, crop: { ...crop } }; }}>
                        {["tl","tr","bl","br"].map(k => (
                          <span key={k} onMouseDown={(e) => { e.stopPropagation(); setDrag(k); startRef.current = { x: e.clientX, y: e.clientY, crop: { ...crop } }; }} className={`absolute w-5 h-5 bg-white border-2 border-black rounded-full ${k==='tl'?'-top-2.5 -left-2.5':k==='tr'?'-top-2.5 -right-2.5':k==='bl'?'-bottom-2.5 -left-2.5':'-bottom-2.5 -right-2.5'}`} />
                        ))}
                      </div>
                    )}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl rounded-2xl flex gap-1 px-3 py-2 border border-white/20">
                      <IconBtn icon={Icons.Undo} label="Undo" onClick={undo} />
                      <IconBtn icon={Icons.Redo} label="Redo" onClick={redoAction} />
                      <IconBtn icon={Icons.Rotate} label="Rotate" onClick={() => { history.current.push({src, rotation, isMuted}); setRotation(r => r + 90); }} />
                      {mediaType === "video" && <IconBtn icon={isMuted ? Icons.VolumeX : Icons.Volume2} label="Mute" onClick={() => setIsMuted(!isMuted)} active={isMuted} />}
                      {mediaType === "image" && <IconBtn icon={Icons.Crop} label="Crop" onClick={crop ? applyCrop : () => {
                        const box = containerRef.current.getBoundingClientRect();
                        const s = Math.min(box.width, box.height) * 0.7; setCrop({ x: (box.width - s) / 2, y: (box.height - s) / 2, w: s, h: s });
                      }} active={!!crop} />}
                    </div>
                  </div>

                  {mediaType === "video" && (
                    <div className="px-2 pt-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                        <span>{trimStart.toFixed(1)}s</span>
                        <span className="text-black">Trim Video</span>
                        <span>{trimEnd.toFixed(1)}s</span>
                      </div>
                      <div className="relative h-12 bg-gray-100 rounded-xl border border-gray-200">
                        {/* Selected Track Background */}
                        <div className="absolute h-full bg-black/10 border-x-4 border-black z-10 pointer-events-none"
                          style={{ left: `${(trimStart / videoDuration) * 100}%`, width: `${((trimEnd - trimStart) / videoDuration) * 100}%` }}
                        />
                        {/* Start Slider (Z-index 30 if closer to start) */}
                        <input type="range" min="0" max={videoDuration} step="0.1" value={trimStart}
                          onChange={(e) => handleTrimChange(e, "start")}
                          style={{ zIndex: (trimStart > videoDuration / 2) ? 20 : 40 }}
                          className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer pointer-events-none active:z-50"
                        />
                        {/* End Slider (Z-index 40 if closer to end) */}
                        <input type="range" min="0" max={videoDuration} step="0.1" value={trimEnd}
                          onChange={(e) => handleTrimChange(e, "end")}
                          style={{ zIndex: (trimEnd < videoDuration / 2) ? 20 : 40 }}
                          className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer pointer-events-none active:z-50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <textarea className="w-full border-0 focus:ring-0 text-xl font-medium p-6 resize-none placeholder-gray-300 min-h-[160px] bg-gray-50 rounded-[2rem]" placeholder={step === "text-editor" ? "What's happening?..." : "Write a caption..."} value={caption} onChange={(e) => setCaption(e.target.value)} autoFocus />
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        input[type=range]::-webkit-slider-thumb {
          pointer-events: auto;
          width: 16px;
          height: 48px;
          -webkit-appearance: none;
          background: #000;
          border-radius: 4px;
          cursor: grab;
        }
        input[type=range]::-moz-range-thumb {
          pointer-events: auto;
          width: 16px;
          height: 48px;
          background: #000;
          border-radius: 4px;
          cursor: grab;
        }
      `}} />
    </div>
  );
}