import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MenuBar from "../components/MenuBar";
import api from "../api/axios";

export default function YoutubeDownloader() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [contentType, setContentType] = useState("Music");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await api.get(
        `/api/youtubedownloader?url=${encodeURIComponent(url)}&type=${encodeURIComponent(contentType)}`
      );

      if (res.status === 200) {
        setUrl("");
        setContentType("Music");
        setMessage("Berhasil! Download sedang diproses 🎉");
      }
    } catch (err) {
      setMessage("Terjadi kesalahan! Pastikan URL benar!");
    }
  };

  return (
    <div className="p-6 pt-20">
      <MenuBar title="Youtube Downloader" />

      <div className="flex justify-center items-center mt-10">
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md space-y-4"
        >
          {/* Judul */}
          <h2 className="text-xl font-semibold text-center">
            Masukkan URL Video
          </h2>

          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          >
            <option value="Music">Music</option>
            <option value="Podcast">Podcast</option>
          </select>
          {/* Input URL */}
          <input
            type="text"
            placeholder="https://youtube.com/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />

          {/* Tombol Submit */}
          <button
            type="submit"
            className="w-full bg-red-600 text-white py-2 rounded-md
                       hover:bg-red-700 transition"
          >
            Download Video
          </button>

          {/* Pesan status */}
          {message && (
            <p className="text-center text-sm font-medium text-green-600">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
