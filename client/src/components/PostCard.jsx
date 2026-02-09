import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import PostActions from "./PostActions";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=User&background=random";

/* ===============================
   HELPER: PARSE CAPTION
   =============================== */
function renderCaption(text) {
  if (!text) return null;
  const regex = /(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g;
  return text.split(regex).map((part, index) => {
    if (part.startsWith("#")) {
      return (
        <Link key={index} to={`/search?q=%23${part.slice(1).toLowerCase()}`} className="text-blue-500 hover:underline">
          {part}
        </Link>
      );
    }
    if (part.startsWith("@")) {
      return (
        <Link key={index} to={`/profile/${part.slice(1)}`} className="text-blue-600 font-semibold hover:underline">
          {part}
        </Link>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default function PostCard({ post }) {
  const [muted, setMuted] = useState(post.isMuted ?? true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const videoRef = useRef(null);
  
  const commentCount = post.comments?.length || post.commentCount || 0;

  // Sync progress bar
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const togglePlay = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  const handleFullScreen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = percentage * videoRef.current.duration;
    }
  };

  // VIDEO OPTIONS FUNCTIONS
  const downloadVideo = () => {
    const link = document.createElement("a");
    link.href = post.imageUrl || post.videoUrl;
    link.download = `video-${post._id}.mp4`;
    link.click();
    setShowMenu(false);
  };

  const togglePiP = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (videoRef.current) {
      await videoRef.current.requestPictureInPicture();
    }
    setShowMenu(false);
  };

  const changePlaybackSpeed = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowMenu(false);
  };

  return (
    <div className="bg-white border rounded-xl mb-6 overflow-hidden shadow-sm">
      {/* HEADER */}
      <div className="flex items-center justify-between p-3 px-4">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${post.user?.username}`}>
            <img 
              src={post.user?.avatar || DEFAULT_AVATAR} 
              alt={post.user?.username}
              className="w-9 h-9 rounded-full object-cover border border-gray-100"
            />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Link to={`/profile/${post.user?.username}`} className="text-sm font-semibold hover:underline leading-none">
                {post.user?.username}
              </Link>
              <span className="text-gray-400 text-[10px]">•</span>
              <span className="text-gray-400 text-xs font-normal">{post.timeAgo || "just now"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MEDIA CONTENT AREA */}
      <div className="bg-gray-50 flex items-center justify-center min-h-[300px] relative group overflow-hidden">
        
        {post.mediaType === "text" ? (
          <div className="w-full h-full min-h-[300px] flex items-center justify-center p-10 bg-gradient-to-br from-blue-50 to-indigo-50">
             <p className="text-xl md:text-2xl font-medium text-center text-gray-800 leading-relaxed italic">
                {renderCaption(post.caption)}
             </p>
          </div>
        ) : post.mediaType === "video" ? (
          <div className="relative w-full bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              onTimeUpdate={handleTimeUpdate}
              src={post.imageUrl || post.videoUrl} 
              className="w-full h-auto max-h-[580px] object-contain block"
              loop
              autoPlay
              muted={muted}
              playsInline
              style={{ transform: `rotate(${post.rotation || 0}deg)` }}
            />
            
            {/* INTERACTIVE OVERLAY */}
            <div className="absolute inset-0 z-20 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              
              {/* TOP RIGHT: Three Dots Options */}
              <div className="p-4 flex justify-end pointer-events-auto relative">
                 <button 
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                  className="p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-all cursor-pointer"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                 </button>

                 {/* DROPDOWN MENU */}
                 {showMenu && (
                   <div className="absolute right-4 top-14 w-48 bg-white rounded-lg shadow-xl border overflow-hidden text-gray-800 z-50">
                      <button onClick={downloadVideo} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download
                      </button>
                      <button onClick={togglePiP} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="13" y="11" width="7" height="5" rx="1"/></svg>
                        Picture-in-Picture
                      </button>
                      <div className="border-t"></div>
                      <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase">Speed</div>
                      <div className="flex justify-around pb-2">
                        {[0.5, 1, 1.5, 2].map(speed => (
                          <button 
                            key={speed} 
                            onClick={() => changePlaybackSpeed(speed)}
                            className="text-xs px-2 py-1 hover:bg-blue-500 hover:text-white rounded"
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                   </div>
                 )}
              </div>

              {/* CENTER: Play/Pause Hitbox */}
              <div className="flex-grow pointer-events-auto cursor-pointer" onClick={() => { togglePlay(); setShowMenu(false); }}></div>

              {/* BOTTOM: Controls Bar */}
              <div className="p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
                
                {/* PROGRESS BAR */}
                <div className="w-full h-1.5 bg-white/30 rounded-full mb-4 cursor-pointer relative group/progress overflow-hidden" onClick={handleSeek}>
                   <div className="h-full bg-white relative" style={{ width: `${progress}%` }}>
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform"></div>
                   </div>
                </div>

                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-5">
                    <button onClick={togglePlay} className="hover:scale-110 transition-transform cursor-pointer">
                      {isPlaying ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      )}
                    </button>
                    <button onClick={toggleMute} className="hover:scale-110 transition-transform cursor-pointer">
                      {muted ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                      )}
                    </button>
                  </div>

                  <button onClick={handleFullScreen} className="hover:scale-110 transition-transform cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <img src={post.imageUrl} alt="post" className="w-full h-auto max-h-[580px] object-contain block" style={{ transform: `rotate(${post.rotation || 0}deg)` }} />
        )}
      </div>

      <PostActions post={post} commentCount={commentCount} />
      {post.mediaType !== "text" && (
        <div className="px-4 pb-4 text-sm leading-relaxed">
          <Link to={`/profile/${post.user?.username}`} className="font-semibold mr-2 hover:underline">{post.user?.username}</Link>
          <span className="text-gray-800">{renderCaption(post.caption)}</span>
        </div>
      )}
    </div>
  );
}