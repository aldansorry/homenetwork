const path = require("path");
const fs = require("fs");
const { readDir, readFile } = require("../utils/filesystem.util");
require("dotenv").config();

const videoRoot = "/app/data/video";

// List semua folder video
exports.list = () => {
  const folders = readDir(videoRoot);

  return folders.map((folder) => ({
    title: folder,
    cover_src: `/api/video/${folder}/cover`, // opsional (bisa tidak ada)
    episodes_api: `/api/video/${folder}`,
  }));
};

exports.getCoverPath = (title) => {
  const folderPath = path.join(videoRoot, title);

  // daftar extensi yang didukung
  const possibleExtensions = ["jpg", "jpeg", "png", "webp", "gif"];

  for (const ext of possibleExtensions) {
    const fullPath = path.join(folderPath, `cover.${ext}`);
    if (fs.existsSync(fullPath)) {
      return fullPath; // ketemu file cover
    }
  }

  return null; // jika tidak ada cover
};

exports.getSeries = (title) => {
  const folderPath = path.join(videoRoot, title);
  const folders = readDir(folderPath); // ambil episode mp4

  if (!folders || folders.length === 0) return null;

  return {
    title,
    cover_src: `/api/video/${title}/cover`,
    folder: title,
    series: folders.map((file, i) => ({
      name: file,
    })),
  };
};

exports.getDetail = (title, series) => {
  const folderPath = path.join(videoRoot, title, series);
  const files = readFile(folderPath); // ambil episode mp4

  if (!files || files.length === 0) return null;

  return {
    title,
    cover_src: `/api/video/${title}/cover`,
    folder: title,
    episodes: files.map((file, i) => ({
      episode: i + 1,
      filename: file,
      stream_url: `/api/video/${title}/${series}/stream/${file}`,
    })),
  };
};

// Ambil episode file path
exports.getEpisodePath = (title, series, fileName) => {
  return path.join(videoRoot, title, series, fileName);
};
