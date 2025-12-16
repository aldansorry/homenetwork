import { useState, useRef, useEffect } from "react";
import {
  MdPlayArrow,
  MdPause,
  MdVolumeUp,
  MdRepeat,
  MdShuffle,
  MdDownload,
  MdSkipNext,
  MdSkipPrevious,
} from "react-icons/md";
import MenuBar from "../components/MenuBar";
import api from "../api/axios";

export default function Music() {
  // DATA MUSIK
  const [music_data, setMusicData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [downloadedTracks, setDownloadedTracks] = useState([]);


  const audioRef = useRef(null);
  const dbPromiseRef = useRef(null);
  const downloadedUrlsRef = useRef({});

  const [currentIndex, setCurrentIndex] = useState(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);

  const [selectedCategoryEdit, setSelectedCategoryEdit] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const currentTrack = currentIndex !== null ? music_data[currentIndex] : null;

  // IndexedDB helpers
  const getDB = () => {
    if (dbPromiseRef.current) return dbPromiseRef.current;

    dbPromiseRef.current = new Promise((resolve, reject) => {
      const request = indexedDB.open("music-cache", 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("tracks")) {
          db.createObjectStore("tracks", { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return dbPromiseRef.current;
  };

  const storeDownloadedTrack = async (id, title, blob) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tracks", "readwrite");
      const store = tx.objectStore("tracks");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      store.put({ id, title, blob });
    });
  };

  const readAllDownloadedTracks = async () => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tracks", "readonly");
      const store = tx.objectStore("tracks");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  };

  const refreshDownloadedTracks = async () => {
    try {
      const stored = await readAllDownloadedTracks();
      const existingUrls = downloadedUrlsRef.current;
      const nextUrls = {};

      const mapped = stored.map((item) => {
        const url = existingUrls[item.id] || URL.createObjectURL(item.blob);
        nextUrls[item.id] = url;
        return { ...item, url };
      });

      Object.keys(existingUrls).forEach((key) => {
        if (!nextUrls[key]) {
          URL.revokeObjectURL(existingUrls[key]);
        }
      });

      downloadedUrlsRef.current = nextUrls;
      setDownloadedTracks(mapped);
    } catch (error) {
      console.error("Gagal membaca data download:", error);
    }
  };

  useEffect(() => {
    refreshDownloadedTracks();
    return () => {
      Object.values(downloadedUrlsRef.current).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get("/api/music/kategori");
      setCategories(response?.data?.data || []);
    } catch (error) {
      console.error("Gagal mengambil data kategori:", error);
    }
  };

  const fetchMusic = async (category = "all", options = {}) => {
    const { preserveCurrent = false } = options;

    const currentId = preserveCurrent && currentTrack ? currentTrack.id : null;
    const wasPlaying =
      preserveCurrent && audioRef.current ? !audioRef.current.paused : false;
    const currentTime =
      preserveCurrent && audioRef.current ? audioRef.current.currentTime : 0;
    const downloadMap = downloadedTracks.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});

    const applyList = (list) => {
      let restoredIndex = null;
      if (currentId) {
        const idx = list.findIndex((item) => item.id === currentId);
        restoredIndex = idx !== -1 ? idx : null;
      }

      setMusicData(
        list.map((item, idx) => ({
          ...item,
          is_playing: restoredIndex === idx && wasPlaying,
        }))
      );

      if (preserveCurrent && restoredIndex !== null && audioRef.current) {
        setCurrentIndex(restoredIndex);
        setProgress(currentTime);

        const source = list[restoredIndex].local_url || list[restoredIndex].file_src;
        audioRef.current.src = source;
        audioRef.current.load();
        audioRef.current.currentTime = currentTime;
        audioRef.current.volume = volume;

        if (wasPlaying) {
          audioRef.current.play().catch(() => { });
        }
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setCurrentIndex(restoredIndex);
        setProgress(0);
        setDuration(0);
      }
    };

    if (category === "downloaded") {
      const downloadedList = downloadedTracks.map((item) => ({
        id: item.id,
        title: item.title,
        file_src: item.url,
        local_url: item.url,
        is_downloaded: true,
        is_playing: false,
      }));
      applyList(downloadedList);
      return;
    }

    try {
      const endpoint =
        category && category !== "all"
          ? `/api/music/kategori/${category}`
          : "/api/music";

      const response = await api.get(endpoint);
      const data = response?.data?.data || [];

      const normalized = data.map((item) => ({
        id: item.id,
        title: item.title,
        file_src: api.defaults.baseURL + item.file_src,
        local_url: downloadMap[item.id]?.url || null,
        is_downloaded: Boolean(downloadMap[item.id]),
        is_playing: false,
      }));
      applyList(normalized);
    } catch (error) {
      console.error("Gagal mengambil data music:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [isCategoryModalOpen]);

  useEffect(() => {
    fetchMusic(selectedCategory, { preserveCurrent: true });
  }, [selectedCategory, downloadedTracks]);

  // FORMAT TIME
  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleCategorySelectChange = (e) => {
    setSelectedCategoryEdit(e.target.value);
  };

  const handleAddCustomCategory = () => {
    const val = customCategory.trim();
    if (!val) return;
    setSelectedCategoryEdit(val);
    setCustomCategory("");
  };

  const applyCategoriesToTrack = async () => {
    if (!currentTrack || !selectedCategoryEdit) return;
    try {
      await api.post(`/api/music/${currentTrack.id}/set/${selectedCategoryEdit}`);
      await fetchCategories();
      setIsCategoryModalOpen(false);
    } catch (error) {
      console.error("Gagal mengubah kategori:", error);
    }
  };

  // ===================================================================
  //  PLAY MUSIC
  // ===================================================================
  const playMusic = (index) => {
    if (!audioRef.current) return;

    try { audioRef.current.pause(); } catch { }

    const updated = music_data.map((m, i) => ({
      ...m,
      is_playing: i === index,
    }));

    setMusicData(updated);
    setCurrentIndex(index);
    setProgress(0);

    setTimeout(() => {
      if (!audioRef.current) return;

      const track = updated[index];
      const source = track.local_url || track.file_src;
      audioRef.current.src = source;
      audioRef.current.load();
      audioRef.current.volume = volume;

      audioRef.current
        .play()
        .then(() => { })
        .catch(() => { });
    }, 80);
  };

  // ===================================================================
  //  CONTROLS
  // ===================================================================
  const togglePlay = () => {
    if (!audioRef.current || currentIndex === null) return;

    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => { });
      updatePlaying(true);
    } else {
      audioRef.current.pause();
      updatePlaying(false);
    }
  };

  const updatePlaying = (state) => {
    const updated = music_data.map((m, i) => ({
      ...m,
      is_playing: i === currentIndex ? state : false,
    }));
    setMusicData(updated);
  };

  const handleSeek = (e) => {
    const v = e.target.value;
    audioRef.current.currentTime = v;
    setProgress(v);
  };

  const handleVolume = (e) => {
    const v = e.target.value;
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const updateProgress = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
  };

  const onLoaded = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const pickNextIndex = (direction = "next") => {
    if (!music_data.length) return null;

    if (currentIndex === null) {
      return 0;
    }

    if (shuffle) {
      if (music_data.length === 1) return currentIndex;

      let next = currentIndex;
      while (next === currentIndex) {
        next = Math.floor(Math.random() * music_data.length);
      }
      return next;
    }

    if (direction === "prev") {
      return currentIndex === 0 ? music_data.length - 1 : currentIndex - 1;
    }

    return currentIndex === music_data.length - 1 ? 0 : currentIndex + 1;
  };

  const playNext = () => {
    const nextIndex = pickNextIndex("next");
    if (nextIndex === null) return;
    playMusic(nextIndex);
  };

  const playPrev = () => {
    const prevIndex = pickNextIndex("prev");
    if (prevIndex === null) return;
    playMusic(prevIndex);
  };

  const onEnded = () => {
    if (repeat) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }

    playNext();
  };

  const downloadTrack = async (track) => {
    try {
      const response = await api.get(`/api/music/${track.id}/file`, {
        responseType: "blob",
      });
      await storeDownloadedTrack(track.id, track.title, response.data);
      await refreshDownloadedTracks();
    } catch (error) {
      console.error("Gagal mengunduh musik:", error);
    }
  };

  // ===================================================================
  //  UI
  // ===================================================================
  return (
    <div className="relative pb-[400px] p-6 space-y-10 pt-10">
      <MenuBar title="Music" />

      {/* LIST MUSIC */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1 rounded-full border text-sm transition ${
            selectedCategory === "all"
              ? "bg-green-500 text-white border-green-500"
              : "bg-white text-gray-700 border-gray-300 hover:border-green-500"
          }`}
        >
          All Kategori
        </button>
        <button
          onClick={() => setSelectedCategory("uncategorized")}
          className={`px-3 py-1 rounded-full border text-sm transition ${
            selectedCategory === "uncategorized"
              ? "bg-green-500 text-white border-green-500"
              : "bg-white text-gray-700 border-gray-300 hover:border-green-500"
          }`}
        >
          Uncategorized
        </button>
        <button
          onClick={() => setSelectedCategory("downloaded")}
          className={`px-3 py-1 rounded-full border text-sm transition flex items-center gap-2 ${
            selectedCategory === "downloaded"
              ? "bg-green-500 text-white border-green-500"
              : "bg-white text-gray-700 border-gray-300 hover:border-green-500"
          }`}
        >
          <span>Downloaded</span>
          <span className="text-xs px-2 py-[2px] rounded-full bg-gray-100 text-gray-700">
            {downloadedTracks.length}
          </span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.category}
            onClick={() => setSelectedCategory(cat.category)}
            className={`px-3 py-1 rounded-full border text-sm transition flex items-center gap-2 ${
              selectedCategory === cat.category
                ? "bg-green-500 text-white border-green-500"
                : "bg-white text-gray-700 border-gray-300 hover:border-green-500"
            }`}
          >
            <span className="capitalize">{cat.category}</span>
            <span className="text-xs px-2 py-[2px] rounded-full bg-gray-100 text-gray-700">
              {cat.total}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1">
        {music_data.map((m, i) => (
          <div
            key={i}
            onClick={() => playMusic(i)}
            className="bg-white p-2 flex items-center gap-4 hover:shadow transition cursor-pointer"
          >
            <div className="w-8 h-8 flex justify-center items-center bg-gray-200 text-3xl">
              {m.is_playing ? (
                <div className="flex gap-[3px] items-end">
                  <div className="w-[3px] h-2 bg-green-500 animate-pulse"></div>
                  <div className="w-[3px] h-4 bg-green-500 animate-bounce"></div>
                  <div className="w-[3px] h-3 bg-green-500 animate-pulse"></div>
                </div>
              ) : (
                <MdPlayArrow />
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{m.title}</div>
              {m.is_downloaded && (
                <div className="text-xs text-green-700">Tersimpan offline</div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadTrack(m);
              }}
              disabled={m.is_downloaded}
              className={`p-2 rounded-md text-lg border transition flex items-center justify-center ${
                m.is_downloaded
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:border-green-500"
              }`}
              title={m.is_downloaded ? "Sudah diunduh" : "Download"}
            >
              <MdDownload />
            </button>
          </div>
        ))}
      </div>

      {/* MINI PLAYER */}
      <div className="fixed bottom-0 left-0 w-full backdrop-blur-xl bg-white/70 shadow-2xl border-t p-4 space-y-3 z-50">

        {currentTrack ? (
          <>
            {/* PRESET & MODAL TRIGGER */}
            <div className="mt-2 flex flex-col md:flex-row gap-3 items-start md:items-center">
              <button
                onClick={() => {
                  setSelectedCategoryEdit("");
                  setCustomCategory("");
                  setIsCategoryModalOpen(true);
                }}
                className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800"
              >
                Edit Kategori
              </button>
            </div>

            {/* TITLE */}
            <div className="text-center font-bold text-lg">
              {currentTrack.title}
            </div>

            {/* SEEK */}
            <div className="flex items-center gap-3 text-sm text-gray-600 px-4">
              <span>{formatTime(progress)}</span>

              <input
                type="range"
                min="0"
                max={duration}
                value={progress}
                onChange={handleSeek}
                className="flex-1 accent-green-600"
              />

              <span>{formatTime(duration)}</span>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center justify-center gap-6 text-3xl text-gray-700">

              <button onClick={playPrev} className="hover:text-green-700">
                <MdSkipPrevious />
              </button>

              <button onClick={togglePlay} className="hover:text-green-700">
                {currentTrack.is_playing ? <MdPause /> : <MdPlayArrow />}
              </button>

              <button onClick={playNext} className="hover:text-green-700">
                <MdSkipNext />
              </button>

              <div className="flex items-center gap-2 text-2xl">
                <MdVolumeUp />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolume}
                  className="w-28 accent-green-600 cursor-pointer"
                />
              </div>

              <button
                onClick={() => setRepeat(!repeat)}
                className={`
                  ${repeat ? "text-green-600" : "text-gray-700"}
                  hover:text-green-700
                `}
              >
                <MdRepeat />
              </button>

              <button
                onClick={() => setShuffle(!shuffle)}
                className={`
                  ${shuffle ? "text-green-600" : "text-gray-700"}
                  hover:text-green-700
                `}
              >
                <MdShuffle />
              </button>

            </div>
          </>
        ) : (
          <div className="text-center text-gray-500">Select a music to play</div>
        )}
      </div>

      {/* MODAL EDIT KATEGORI */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Kategori Music</h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-sm text-gray-700">
                {currentTrack ? (
                  <>Track: <span className="font-semibold">{currentTrack.title}</span></>
                ) : (
                  "Pilih track yang sedang diputar untuk mengatur kategori."
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Tambah kategori baru"
                  className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleAddCustomCategory}
                  className="px-3 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800"
                >
                  Tambah
                </button>
              </div>

              <select
                value={selectedCategoryEdit}
                onChange={handleCategorySelectChange}
                className="h-11 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Pilih kategori</option>
                {categories.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.category} ({cat.total})
                  </option>
                ))}
                {selectedCategoryEdit &&
                  !categories.find((c) => c.category === selectedCategoryEdit) && (
                    <option value={selectedCategoryEdit}>{selectedCategoryEdit}</option>
                  )}
              </select>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-md border text-sm hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={applyCategoriesToTrack}
                  disabled={!currentTrack || !selectedCategoryEdit}
                  className={`px-4 py-2 rounded-md text-sm ${
                    !currentTrack || !selectedCategoryEdit
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}
                >
                  Set Kategori
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUDIO ELEMENT */}
      <audio
        ref={audioRef}
        onTimeUpdate={updateProgress}
        onLoadedMetadata={onLoaded}
        onEnded={onEnded}
        crossOrigin="anonymous"
      />
    </div>
  );
}
