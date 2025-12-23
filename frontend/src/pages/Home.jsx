import { useNavigate } from "react-router-dom";
import { useState } from "react";
import MenuBar from "../components/MenuBar";
import { FaDownload, FaFile, FaFilm, FaMusic, FaPodcast, FaSyncAlt } from "react-icons/fa";
import IconCard from "../components/IconCard";
import api from "../api/axios";

export default function Home() {
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  const handleSyncMedia = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncStatus("Syncing media...");
    try {
      await api.post("/api/sync/media");
      setSyncStatus("Sync completed.");
    } catch (err) {
      console.error("Failed to sync media:", err);
      setSyncStatus("Sync failed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

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
        <div>
          <IconCard
            bgColor="bg-blue-600"
            icon={<FaSyncAlt size={36} />}
            title="Sync Media"
            subtitle={isSyncing ? "Syncing..." : "Update library"}
            action={handleSyncMedia}
          />
        </div>
      </div>
      {syncStatus && (
        <p className="px-6 text-sm text-gray-600">{syncStatus}</p>
      )}
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
