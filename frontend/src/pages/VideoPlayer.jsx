import { useParams, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import {
    MdPlayArrow,
    MdPause,
    MdVolumeUp,
    MdFullscreen,
    MdFullscreenExit,
    MdSkipNext,
} from "react-icons/md";
import { FaChevronRight } from "react-icons/fa";
import api from "../api/axios";

export default function VideoPlayer() {
    const { title, series, episode } = useParams(); // filename episode
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const episodeListRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);

    const hideTimer = useRef(null);

    // Video Data
    const [video_data, setVideoData] = useState(null);

    useEffect(() => {
        const fetchVideoDetail = async () => {
            try {
                const res = await api.get("/api/video/" + title + "/" + series);

                const raw = res.data.data;

                const episodes = raw.episodes.map(ep => {
                    const filenameWithoutExt = ep.filename.replace(/\.[^/.]+$/, ""); // hapus extension

                    return {
                        title: filenameWithoutExt, // 🔥 sekarang pakai filename tanpa extension
                        filename: ep.filename,
                        file_src: `${api.defaults.baseURL}${ep.stream_url}`
                    };
                });


                setVideoData({
                    title: raw.title,
                    series: series,
                    file_list: episodes
                });

            } catch (err) {
                console.error("Gagal fetch video detail:", err);
            }
        };

        fetchVideoDetail();
    }, []);

    // Identify current episode from params
    const currentIndex = video_data?.file_list.findIndex(
        (item) => item.filename === episode || episode == undefined
    );
    const currentEpisode =
        currentIndex >= 0 ? video_data.file_list[currentIndex] : video_data?.file_list[0];

    const hasNext =
        currentIndex >= 0 && currentIndex < video_data.file_list.length - 1;

    // Format time 00:00
    const formatTime = (sec) => {
        if (!sec) return "00:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) videoRef.current.pause();
        else videoRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
        const v = e.target.value;
        videoRef.current.currentTime = v;
        setProgress(v);
    };

    const updateProgress = () => setProgress(videoRef.current.currentTime);

    const handleLoadedMetadata = () =>
        setDuration(videoRef.current.duration || 0);

    const handleVolume = (e) => {
        const v = e.target.value;
        videoRef.current.volume = v;
        setVolume(v);
    };

    const toggleFullscreen = () => {
        if (!isFullscreen) containerRef.current.requestFullscreen();
        else document.exitFullscreen();
    };

    const handleNext = () => {
        if (!hasNext) return;
        const nextEp = video_data.file_list[currentIndex + 1];
        navigate(
            `/video/${encodeURIComponent(video_data?.title)}/${encodeURIComponent(
                nextEp.filename
            )}`
        );
    };

    // Detect fullscreen
    useEffect(() => {
        const handler = () =>
            setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, []);

    // Auto hide controls
    const resetHide = () => {
        setShowControls(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
            if (videoRef.current && !videoRef.current.paused) {
                setShowControls(false);
            }
        }, 3000);
    };

    useEffect(() => {
        resetHide();
        window.addEventListener("mousemove", resetHide);
        window.addEventListener("touchstart", resetHide);
        return () => {
            window.removeEventListener("mousemove", resetHide);
            window.removeEventListener("touchstart", resetHide);
        };
    }, [isPlaying]);

    // Reset when episode changes
    useEffect(() => {
        if (!videoRef.current) return;
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setProgress(0);
        setIsPlaying(false);
    }, [episode]);

    // Scroll episode list to current item
    useEffect(() => {
        if (!episodeListRef.current) return;
        const el = episodeListRef.current.querySelector(".ep-active");
        if (el) {
            episodeListRef.current.scrollTo({
                top: el.offsetTop - 80,
                behavior: "smooth",
            });
        }
    }, [currentEpisode]);

    return (
        <div className="p-4 flex flex-col items-center space-y-6">

            {/* VIDEO PLAYER */}
            <div
                ref={containerRef}
                className={`
          relative bg-black overflow-hidden shadow-xl
          ${isFullscreen
                        ? "w-screen h-screen fixed inset-0 rounded-none max-w-none"
                        : "w-full max-w-4xl rounded-xl"
                    }
        `}
            >
                <video
                    src={currentEpisode?.file_src}
                    ref={videoRef}
                    onTimeUpdate={updateProgress}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="w-full h-full object-contain bg-black"
                />

                {/* CONTROLS */}
                <div
                    className={`
            absolute inset-0 flex flex-col justify-end
            transition-opacity duration-300
            ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}
          `}
                    style={{
                        background:
                            showControls && isFullscreen
                                ? "linear-gradient(to top, rgba(0,0,0,0.6), transparent)"
                                : "transparent",
                    }}
                >
                    {/* Seekbar */}
                    <div className="px-4 pb-3 flex items-center gap-2 text-white text-sm">
                        <span>{formatTime(progress)}</span>

                        <input
                            type="range"
                            min="0"
                            max={duration}
                            value={progress}
                            onChange={handleSeek}
                            className="flex-1 cursor-pointer accent-red-600 h-1"
                        />

                        <span>{formatTime(duration)}</span>
                    </div>

                    {/* Bottom Controls */}
                    <div className="px-4 pb-4 flex items-center justify-between text-white text-xl">

                        {/* LEFT */}
                        <div className="flex items-center gap-4">

                            {/* Play/Pause (BIGGER) */}
                            <button
                                onClick={togglePlay}
                                className="hover:opacity-80 transition text-4xl"
                            >
                                {isPlaying ? <MdPause /> : <MdPlayArrow />}
                            </button>

                            {/* Next episode */}
                            <button
                                onClick={handleNext}
                                disabled={!hasNext}
                                className={`hover:opacity-80 transition text-3xl ${!hasNext ? "opacity-40 cursor-not-allowed" : ""
                                    }`}
                            >
                                <MdSkipNext />
                            </button>

                            {/* Volume */}
                            <div className="flex items-center gap-2">
                                <MdVolumeUp className="text-2xl" />
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={handleVolume}
                                    className="w-28 cursor-pointer accent-red-600"
                                />
                            </div>
                        </div>

                        {/* RIGHT */}
                        <button
                            onClick={toggleFullscreen}
                            className="hover:opacity-80 transition"
                        >
                            {isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
                        </button>
                    </div>
                </div>
            </div>

            {/* TITLE */}
            <div className="flex items-center gap-2 text-gray-700 text-sm flex-wrap w-full max-w-4xl">
                <span
                    className="cursor-pointer hover:text-green-600"
                    onClick={() => navigate("/")}
                >
                    Menu
                </span>

                <div className="flex items-center gap-2">
                    <FaChevronRight className="text-gray-400 text-xs" />
                    <span
                        className="cursor-pointer hover:text-green-600"
                        onClick={() => navigate('/video')}
                    >
                        Video
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <FaChevronRight className="text-gray-400 text-xs" />
                    <span
                        className="cursor-pointer hover:text-green-600"
                        onClick={() => navigate('/video/'+title)}
                    >
                        {title}
                    </span>
                </div>
            </div>
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-800">
                    {video_data?.title} - {video_data?.series}
                </h1>
                <p className="text-lg text-gray-600">{currentEpisode?.title}</p>
            </div>

            {/* EPISODE GRID LIST */}
            <div
                ref={episodeListRef}
                className="
    w-full max-w-4xl 
    bg-white rounded-xl 
    border p-4
  "
            >
                <div className="max-h-60 overflow-y-auto">
                    <div
                        className="
      grid 
      grid-cols-2 
      sm:grid-cols-3 
      md:grid-cols-4 
      lg:grid-cols-6 
      gap-4
    "
                    >
                        {video_data?.file_list.map((ep, index) => {
                            const isActive = ep.filename === currentEpisode.filename;

                            return (
                                <div
                                    key={index}
                                    onClick={() =>
                                        navigate(
                                            `/video/${encodeURIComponent(video_data.title)}/${encodeURIComponent(video_data.series)}/${encodeURIComponent(
                                                ep.filename
                                            )}`
                                        )
                                    }
                                    className={`
            text-center p-3 rounded-lg cursor-pointer transition 
            ${isActive
                                            ? "bg-green-200 border border-green-500 font-semibold ep-active"
                                            : "bg-gray-100 hover:bg-gray-200"
                                        }
          `}
                                >
                                    {ep.title}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div >
    );
}
