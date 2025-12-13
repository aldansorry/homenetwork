import { useEffect, useState } from "react";
import { FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import MenuBar from "../components/MenuBar";
import api from "../api/axios";

export default function Video() {
  const navigate = useNavigate();

  const [list_video, setListVideo] = useState([]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await api.get("/api/video");

        // Backend format: res.data.data = array
        setListVideo(
          res.data.data.map(v => ({
            title: v.title,
            poster_src: `${api.defaults.baseURL}${v.cover_src}`,
            episodes_api: v.episodes_api
          }))
        );

      } catch (err) {
        console.error("Gagal fetch video:", err);
      }
    };

    fetchVideos();
  }, []);


  return (
    <div className="p-6 pt-20">
      <MenuBar title="Video"/>

      <div
        className="grid 
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-4 
          lg:grid-cols-6 
          gap-6"
      >
        {list_video.map((item, i) => (
          <div
            key={i}
            onClick={() => navigate(`/video/${encodeURIComponent(item.title)}`)}
            className="relative rounded-xl overflow-hidden cursor-pointer 
                       shadow-sm hover:shadow-xl transition group"
          >
            {/* Poster */}
            <div className="w-full aspect-[2/3] overflow-hidden">
              <img
                src={item.poster_src}
                alt={item.title}
                className="w-full h-full object-cover 
                           transition-transform duration-300 
                           group-hover:scale-110"
              />
            </div>

            {/* Title Fade-in */}
            <div
              className="absolute inset-0 flex items-center justify-center 
                         opacity-0 group-hover:opacity-100 
                         transition-opacity duration-300"
            >
              <span
                className="px-3 py-1 text-white text-lg font-bold 
                           bg-black/50 backdrop-blur-sm 
                           rounded-md shadow-md"
              >
                {item.title}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
