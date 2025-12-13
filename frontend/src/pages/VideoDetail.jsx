import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MenuBar from "../components/MenuBar";
import api from "../api/axios";

export default function VideoDetail() {
  const { title } = useParams();
  const navigate = useNavigate();

  const [video_data, setVideoData] = useState(null);

  useEffect(() => {
    const fetchVideoDetail = async () => {
      try {
        const res = await api.get("/api/video/"+title);

        const raw = res.data.data;

        const series = raw.series.map(ser => {
          const filenameWithoutExt = ser.name.replace(/\.[^/.]+$/, ""); // hapus extension

          return {
            title: filenameWithoutExt, // 🔥 sekarang pakai filename tanpa extension
            name: ser.name,
            file_src: `${api.defaults.baseURL}${ser.stream_url}`
          };
        });

        if (series.length == 1) {
          navigate("/video/"+title+"/"+series[0].name);
        }


        setVideoData({
          title: raw.title,
          poster_src: `${api.defaults.baseURL}${raw.cover_src}`,
          file_list: series
        });

      } catch (err) {
        console.error("Gagal fetch video detail:", err);
      }
    };

    fetchVideoDetail();
  }, []);


  return (
    <div className="p-6 space-y-10 pt-10">
      <MenuBar title="Video" />

      {/* Poster + Title */}
      <div className="flex items-center gap-6">
        <img
          src={video_data?.poster_src}
          alt={video_data?.title}
          className="w-32 md:w-48 rounded-xl shadow"
        />

        <h1 className="text-3xl font-bold text-gray-800">{video_data?.title}</h1>
      </div>

      {/* Episode Title */}
      <h2 className="text-xl font-semibold">Episode List</h2>

      {/* Episode Grid */}
      <div className="grid 
                      grid-cols-2 
                      sm:grid-cols-3 
                      md:grid-cols-4 
                      lg:grid-cols-6 
                      gap-4">
        {video_data?.file_list.map((ep, i) => (
          <button
            key={i}
            onClick={() =>
              navigate(
                `/video/${encodeURIComponent(title)}/${encodeURIComponent(
                  ep.name
                )}`
              )
            }
            className="
              p-4 rounded-xl border 
              border-green-300 text-green-700 font-semibold
              bg-green-100 
              hover:bg-green-200 hover:border-green-400
              active:bg-green-300 active:border-green-500
              shadow-sm hover:shadow-md 
              transition text-center
            "
          >
            {ep.title}
          </button>
        ))}
      </div>

    </div>
  );
}
