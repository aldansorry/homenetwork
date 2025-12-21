import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MenuBar from "../components/MenuBar";
import api from "../api/axios";

export default function VideoDetail() {
  const { title } = useParams();
  const navigate = useNavigate();

  const [videoData, setVideoData] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState({ open: false, item: null });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchVideoDetail = async () => {
      try {
        const res = await api.get(`/api/video/${title}`);
        const raw = res.data.data;

        const series = raw.series.map((ser) => ({
          title: ser.name,
          name: ser.name,
          type: ser.type || "folder",
        }));

        if (series.length === 1 && series[0].type === "folder") {
          navigate(`/video/${title}/${series[0].name}`);
        }

        setVideoData({
          title: raw.title,
          poster_src: `${api.defaults.baseURL}${raw.cover_src}`,
          file_list: series,
        });
      } catch (err) {
        console.error("Gagal fetch video detail:", err);
        setMessage("Gagal mengambil data video");
      }
    };

    fetchVideoDetail();
  }, [title, navigate]);

  const handleItemClick = (item) => {
    if (item.type === "archive") {
      setConfirmArchive({ open: true, item });
      setMessage("");
      return;
    }

    navigate(`/video/${encodeURIComponent(title)}/${encodeURIComponent(item.name)}`);
  };

  const handleCloseModal = () => {
    setConfirmArchive({ open: false, item: null });
  };

  const handleExtract = async () => {
    if (!confirmArchive.item) return;
    setLoading(true);
    setMessage("");
    try {
      const archiveName = encodeURIComponent(confirmArchive.item.name);
      const url = `/api/video/${encodeURIComponent(title)}/${archiveName}/extract`;
      const res = await api.post(url);
      setMessage(res.data?.message || "Extract job dikirim.");
    } catch (err) {
      console.error("Gagal extract archive:", err);
      setMessage("Gagal mengirim extract job.");
    } finally {
      setLoading(false);
      handleCloseModal();
    }
  };

  return (
    <div className="p-6 space-y-10 pt-10 relative">
      <MenuBar title="Video" />

      {/* Poster + Title */}
      <div className="flex items-center gap-6">
        <img
          src={videoData?.poster_src}
          alt={videoData?.title}
          className="w-32 md:w-48 rounded-xl shadow"
        />

        <h1 className="text-3xl font-bold text-gray-800">{videoData?.title}</h1>
      </div>

      {/* Episode Title */}
      <h2 className="text-xl font-semibold">Episode List</h2>

      {/* Episode Grid */}
      <div
        className="grid 
                      grid-cols-2 
                      sm:grid-cols-3 
                      md:grid-cols-4 
                      lg:grid-cols-6 
                      gap-4"
      >
        {videoData?.file_list.map((ep, i) => (
          <button
            key={i}
            onClick={() => handleItemClick(ep)}
            className={`
              p-4 rounded-xl border 
              font-semibold
              shadow-sm hover:shadow-md 
              transition text-center
              ${
                ep.type === "archive"
                  ? "border-amber-300 text-amber-700 bg-amber-100 hover:bg-amber-200 hover:border-amber-400 active:bg-amber-300 active:border-amber-500"
                  : "border-green-300 text-green-700 bg-green-100 hover:bg-green-200 hover:border-green-400 active:bg-green-300 active:border-green-500"
              }
            `}
          >
            {ep.type === "archive" ? "ARCHIVE: " : ""}
            {ep.title}
          </button>
        ))}
      </div>

      {message && (
        <div className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded px-3 py-2 inline-block">
          {message}
        </div>
      )}

      {/* Confirm Extract Modal */}
      {confirmArchive.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="text-lg font-semibold">Extract Archive?</h3>
            <p className="text-sm text-gray-700">{confirmArchive.item?.name}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                disabled={loading}
              >
                Batal
              </button>
              <button
                onClick={handleExtract}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Memproses..." : "Extract"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
