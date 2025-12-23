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
          archive: Boolean(ser.archive),
        }));

        if (series.length === 1) {
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
    navigate(`/video/${encodeURIComponent(title)}/${encodeURIComponent(item.name)}`);
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

      {/* Episode List (compact) */}
      <div className="bg-white border rounded-xl shadow-sm divide-y">
        {videoData?.file_list.map((ep, i) => (
          <button
            key={i}
            onClick={() => handleItemClick(ep)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-semibold">
                {i + 1}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{ep.title}</div>
                <div className="text-xs text-gray-500 break-words">{ep.name}</div>
              </div>
            </div>
            {ep.archive && (
              <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-1 rounded-full border border-amber-200">
                Archived
              </span>
            )}
          </button>
        ))}
      </div>

      {message && (
        <div className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded px-3 py-2 inline-block">
          {message}
        </div>
      )}

    </div>
  );
}
