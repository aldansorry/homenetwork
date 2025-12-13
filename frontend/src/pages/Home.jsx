import { useNavigate } from "react-router-dom";
import MenuBar from "../components/MenuBar";
import { FaDownload, FaFile, FaFilm, FaMusic, FaPodcast } from "react-icons/fa";
import IconCard from "../components/IconCard";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="p-6 pt-20">
      <MenuBar title="Home" />
      <h4>Application</h4>
      <div className="grid gap-6 p-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-8">
        <div>
          <IconCard
            bgColor="bg-red-500"
            icon={<FaDownload size={36} />}
            title="Youtube Downloader"
            subtitle="Music"
            action={() => navigate('/youtube-downloader')}
          />
        </div>
      </div>
      <h4>Essential</h4>
      <div className="grid gap-6 p-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-8">
        <div>
          <IconCard
            bgColor="bg-rose-500"
            icon={<FaFilm size={36} />}
            title="Video"
            subtitle="Video Streamer"
            action={() => navigate('/video')}
          />
        </div>
        <div>
          <IconCard
            bgColor="bg-purple-500"
            icon={<FaMusic size={36} />}
            title="Music"
            subtitle="Music Streamer"
            action={() => navigate('/music')}
          />
        </div>
        <div>
          <IconCard
            bgColor="bg-indigo-500"
            icon={<FaPodcast size={36} />}
            title="Podcast"
            subtitle="Podcast Streamer"
            action={() => navigate('/podcast')}
          />
        </div>
        <div>
          <IconCard
            bgColor="bg-amber-600"
            icon={<FaFile size={36} />}
            title="File"
            subtitle="File Manager"
            action={() => navigate('/file')}
          />
        </div>
      </div>
    </div>
  );
}
