import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MenuBar from "../components/MenuBar";
import api from "../api/axios";

function PosterImage({ src, alt }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="w-full aspect-[2/3] overflow-hidden relative bg-gray-200">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`w-full h-full object-cover transition duration-500 ease-out
          ${loaded ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      />
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
      )}
    </div>
  );
}

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
            <PosterImage src={item.poster_src} alt={item.title} />

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
