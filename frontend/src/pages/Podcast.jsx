import { useEffect, useRef, useState } from "react";
import { MdDownload, MdDownloadDone, MdPause, MdPlayArrow } from "react-icons/md";
import MenuBar from "../components/MenuBar";
import api from "../api/axios";
import {
  getPodcastBlob,
  listStoredPodcastIds,
  listStoredPodcasts,
  savePodcastBlob,
} from "../utils/podcastStorage";

export default function Podcast() {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState({});
  const [downloadedIds, setDownloadedIds] = useState([]);
  const [error, setError] = useState("");
  const [localUrls, setLocalUrls] = useState({});
  const [currentId, setCurrentId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef(null);
  const allocatedUrlsRef = useRef([]);

  const normalizePodcast = (item, idx) => ({
    id: item?.id ?? idx,
    title: item?.title || item?.name || `Podcast ${idx + 1}`,
    description: item?.description || item?.desc || "Episode podcast",
    speaker: item?.speaker || item?.host,
    duration: item?.duration,
  });

  const fetchPodcasts = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/podcast");
      const data = response?.data?.data || [];
      setPodcasts(data.map(normalizePodcast));
    } catch (err) {
      console.error("Gagal mengambil podcast:", err);
      setError("Gagal memuat daftar podcast");
      await loadOfflineOnly();
    } finally {
      setLoading(false);
    }
  };

  const syncDownloads = async () => {
    try {
      const entries = await listStoredPodcasts();
      setDownloadedIds(entries.map((entry) => String(entry.id)));
    } catch (err) {
      console.error("Gagal membaca IndexedDB:", err);
    }
  };

  useEffect(() => {
    fetchPodcasts();
    syncDownloads();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    return () => {
      allocatedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const rememberUrl = (url, id) => {
    allocatedUrlsRef.current.push(url);
    setLocalUrls((prev) => ({ ...prev, [String(id)]: url }));
    return url;
  };

  const getLocalUrlIfAny = async (id) => {
    const key = String(id);
    if (localUrls[key]) return localUrls[key];
    if (!downloadedIds.includes(key)) return null;

    const blob = await getPodcastBlob(key);
    if (!blob) return null;

    return rememberUrl(URL.createObjectURL(blob), key);
  };

  const getPlayableSource = async (id) => {
    const local = await getLocalUrlIfAny(id);
    if (local) return local;
    return `${api.defaults.baseURL}/api/podcast/${id}/stream`;
  };

  const loadOfflineOnly = async () => {
    try {
      const entries = await listStoredPodcasts();
      const ids = entries.map((entry) => String(entry.id));
      setDownloadedIds(ids);
      setPodcasts(
        entries.map((entry, idx) => ({
          id: entry.id,
          title: entry.title || `Offline Podcast ${idx + 1}`,
          description: "Konten tersimpan di perangkat (metadata terbatas).",
          speaker: null,
          duration: null,
        }))
      );
    } catch (offlineErr) {
      console.error("Gagal memuat fallback offline:", offlineErr);
    }
  };

  const handlePlay = async (item) => {
    if (!audioRef.current) return;

    const isSame = currentId === item.id;
    if (isSame && !audioRef.current.paused) {
      audioRef.current.pause();
      return;
    }

    try {
      const source = await getPlayableSource(item.id);
      audioRef.current.src = source;
      setCurrentId(item.id);
      await audioRef.current.play();
    } catch (err) {
      console.error("Gagal memutar audio:", err);
      setError("Gagal memutar audio");
    }
  };

  const handleDownload = async (item) => {
    const key = String(item.id);
    if (downloadedIds.includes(key)) return;

    setDownloading((prev) => ({ ...prev, [key]: true }));
    setError("");

    try {
      const response = await api.get(`/api/podcast/${item.id}/file`, {
        responseType: "blob",
      });

      await savePodcastBlob(key, item.title, response.data);
      rememberUrl(URL.createObjectURL(response.data), key);
      setDownloadedIds((prev) =>
        prev.includes(key) ? prev : [...prev, key]
      );
    } catch (err) {
      console.error("Gagal mengunduh podcast:", err);
      setError("Gagal mengunduh episode");
    } finally {
      setDownloading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const isDownloaded = (id) => downloadedIds.includes(String(id));

  const renderStatus = (item) => {
    if (downloading[String(item.id)]) return "Mengunduh...";
    if (isDownloaded(item.id)) return "Tersimpan";
    return "Stream";
  };

  return (
    <div className="p-6 pt-20 pb-28">
      <MenuBar title="Podcast" />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 border border-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Daftar Podcast</h2>
          <p className="text-gray-600 text-sm">
            Klik kartu untuk memutar, unduh untuk simpan lokal (IndexedDB).
          </p>
        </div>
        <button
          onClick={() => {
            fetchPodcasts();
            syncDownloads();
          }}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition"
        >
          Segarkan
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-24 bg-gray-100 animate-pulse rounded-xl border border-gray-200"
            />
          ))}
        </div>
      ) : podcasts.length === 0 ? (
        <div className="text-gray-600">Belum ada podcast.</div>
      ) : (
        <div className="grid gap-4">
          {podcasts.map((item) => {
            const active = currentId === item.id && isPlaying;
            const downloaded = isDownloaded(item.id);
            const downloadInProgress = downloading[String(item.id)];

            return (
              <div
                key={item.id}
                className="border border-gray-200 rounded-xl p-4 shadow-sm bg-white hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        {renderStatus(item)}
                      </span>
                      {downloaded && (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Offline
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mt-1">
                      {item.title}
                    </h3>
                    {item.speaker && (
                      <p className="text-sm text-gray-600">
                        Pembicara: {item.speaker}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      {item.description}
                    </p>
                    {item.duration && (
                      <p className="text-xs text-gray-500 mt-1">
                        Durasi: {item.duration}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handlePlay(item)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white shadow transition ${active
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                      {active ? (
                        <>
                          <MdPause size={20} />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <MdPlayArrow size={20} />
                          <span>Play</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDownload(item)}
                      disabled={downloaded || downloadInProgress}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${downloaded
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        } ${downloadInProgress ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                    >
                      {downloaded ? (
                        <>
                          <MdDownloadDone size={20} />
                          <span>Tersimpan</span>
                        </>
                      ) : (
                        <>
                          <MdDownload size={20} />
                          <span>{downloadInProgress ? "Mengunduh..." : "Download"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={`fixed w-full mx-auto left-0 inset-x-0 bottom-0 ${
    currentId === null ? "hidden" : ""
  }`}>
        <div className="bg-white border border-gray-200 shadow-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Now Playing</p>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {currentId
                ? podcasts.find((p) => p.id === currentId)?.title || currentId
                : "Belum ada yang diputar"}
            </p>
            {currentId && (
              <p className="text-xs text-gray-500 truncate">
                {isDownloaded(currentId) ? "Offline" : "Streaming"}
              </p>
            )}
          </div>
          <div className="w-full sm:w-auto">
            <audio
              ref={audioRef}
              controls
              className="w-full sm:w-80"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
