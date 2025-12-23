const path = require("path");
const fs = require("fs");
const { readDir, readFile } = require("../utils/filesystem.util");
const db = require("../utils/db");
require("dotenv").config();

const videoRoot = "/app/data/video";
const archiveExtensions = [
  "7z",
  "zip",
  "rar",
  "tar",
  "tar.gz",
  "tgz",
  "tar.bz2",
  "tbz2",
  "tar.xz",
  "txz",
  "wim",
];

// ========================
// DB-backed listing helpers
// ========================
exports.listFromDb = async () => {
  const result = await db.query(`SELECT DISTINCT title FROM videos ORDER BY title ASC`);
  return result.rows.map((row) => ({
    title: row.title,
    cover_src: `/api/video/${row.title}/cover`,
    episodes_api: `/api/video/${row.title}`,
  }));
};

exports.getSeriesFromDb = async (title) => {
  const res = await db.query(
    `
      SELECT title, series, status
      FROM videos
      WHERE title = $1
      ORDER BY series ASC
    `,
    [title]
  );

  if (!res.rows || res.rows.length === 0) return null;

  return {
    title,
    cover_src: `/api/video/${title}/cover`,
    folder: title,
    series: res.rows.map((row) => ({
      name: row.series,
      type: row.status === "archive" ? "archive" : "folder",
      status: row.status,
    })),
  };
};

exports.getDetailFromDb = async (title, series) => {
  const res = await db.query(
    `
      SELECT path, status
      FROM videos
      WHERE title = $1 AND series = $2
      LIMIT 1
    `,
    [title, series]
  );

  if (!res.rows || res.rows.length === 0) return null;

  const { path: seriesPath, status } = res.rows[0];
  if (status !== "ready") return null;
  if (!seriesPath || !fs.existsSync(seriesPath)) return null;

  const files = readFile(seriesPath);
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

exports.getEpisodePathFromDb = async (title, series, fileName) => {
  const res = await db.query(
    `
      SELECT path, status
      FROM videos
      WHERE title = $1 AND series = $2
      LIMIT 1
    `,
    [title, series]
  );

  if (!res.rows || res.rows.length === 0) return null;
  const { path: seriesPath, status } = res.rows[0];
  if (status !== "ready") return null;
  if (!seriesPath) return null;
  return path.join(seriesPath, fileName);
};

// ========================
// Legacy filesystem helpers (used by queue/archive operations)
// ========================
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
  const files = readFile(folderPath); // ambil file archive

  if ((!folders || folders.length === 0) && (!files || files.length === 0)) return null;

  const archives =
    files
      ?.filter((file) => {
        const lower = file.toLowerCase();
        return archiveExtensions.some((ext) => lower.endsWith(`.${ext.toLowerCase()}`));
      })
      .map((file) => ({
        name: file,
        type: "archive",
      })) || [];

  return {
    title,
    cover_src: `/api/video/${title}/cover`,
    folder: title,
    series: [
      ...folders.map((file) => ({
        name: file,
        type: "folder",
      })),
      ...archives,
    ],
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

exports.getSeriesPath = (title, series) => {
  return path.join(videoRoot, title, series);
};

exports.getArchivePath = (title, series, format = "7z") => {
  const safeFormat = format.replace(/^\./, "") || "7z";
  return path.join(videoRoot, title, `${series}.${safeFormat}`);
};

exports.findArchiveFile = (title, seriesOrFile) => {
  const titlePath = path.join(videoRoot, title);
  const directPath = path.join(titlePath, seriesOrFile);

  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }

  const baseName = exports.getArchiveBaseName(seriesOrFile);
  const files = readFile(titlePath);
  const lowerBase = baseName.toLowerCase();

  for (const file of files) {
    const lowerFile = file.toLowerCase();
    for (const ext of archiveExtensions) {
      const candidate = `${lowerBase}.${ext.toLowerCase()}`;
      if (lowerFile === candidate) {
        return path.join(titlePath, file);
      }
    }
  }

  return null;
};

exports.archiveExtensions = archiveExtensions;

exports.getArchiveBaseName = (archiveName) => {
  const lowerName = archiveName.toLowerCase();

  for (const ext of archiveExtensions) {
    const suffix = `.${ext.toLowerCase()}`;
    if (lowerName.endsWith(suffix)) {
      return archiveName.slice(0, archiveName.length - suffix.length);
    }
  }

  return path.parse(archiveName).name;
};
