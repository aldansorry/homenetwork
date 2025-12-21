const fs = require("fs");
const path = require("path");
const videoService = require("../services/video.service");
const videoQueue = require("../queues/video.queue");

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "y"].includes(String(value).toLowerCase());
};

const supportedArchiveFormats = ["7z", "zip"];
const normalizeFormat = (value = "7z") => {
  const clean = String(value || "7z").replace(/^\./, "").toLowerCase();
  return supportedArchiveFormats.includes(clean) ? clean : "7z";
};

// GET /api/video
exports.getAllVideos = (req, res) => {
  const data = videoService.list();
  res.json({
    status: "success",
    total: data.length,
    data,
  });
};

exports.getVideoSeries = (req, res) => {
  const title = req.params.title;
  const data = videoService.getSeries(title);

  if (!data) {
    return res.status(404).json({
      status: "error",
      message: "Series not found",
    });
  }

  res.json({
    status: "success",
    data,
  });
};

// GET /api/video/:title
exports.getVideoDetail = (req, res) => {
  const title = req.params.title;
  const series = req.params.series;
  const data = videoService.getDetail(title, series);

  if (!data) {
    return res.status(404).json({
      status: "error",
      message: "Video not found",
    });
  }

  res.json({
    status: "success",
    data,
  });
};

exports.getCover = (req, res) => {
  const title = req.params.title;
  const coverPath = videoService.getCoverPath(title);

  if (!coverPath || !fs.existsSync(coverPath)) {
    return res.status(404).send("Cover not found");
  }

  // Tentukan MIME type sesuai extension
  const ext = path.extname(coverPath).toLowerCase();
  let mime = "image/jpeg"; // default

  if (ext === ".png") mime = "image/png";
  if (ext === ".webp") mime = "image/webp";
  if (ext === ".gif") mime = "image/gif";
  if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";

  // Header CORS (jika perlu digunakan image cross-site)
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.writeHead(200, { "Content-Type": mime });

  const stream = fs.createReadStream(coverPath);
  stream.pipe(res);

  stream.on("error", () => {
    return res.status(500).send("Error streaming cover");
  });
};

// GET /api/video/:title/stream/:episode
exports.streamEpisode = (req, res) => {
  const { title, series, episode } = req.params;

  const filePath = videoService.getEpisodePath(title, series, episode);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      status: "error",
      message: "Episode not found",
    });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });

    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

  const chunkSize = end - start + 1;
  const file = fs.createReadStream(filePath, { start, end });

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": "video/mp4",
  });

  file.pipe(res);
};

// POST /api/video/:title/:series/archive
exports.archiveSeries = (req, res) => {
  const { title, series } = req.params;
  const format = normalizeFormat(req.body?.format || req.query?.format || "7z");
  const overwrite = parseBoolean(req.body?.overwrite ?? req.query?.overwrite, false);

  const sourceDir = videoService.getSeriesPath(title, series);
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    return res.status(404).json({
      status: "error",
      message: "Series folder not found",
    });
  }

  const jobId = Date.now().toString();
  videoQueue.push({
    jobId,
    action: "archive",
    title,
    series,
    format,
    overwrite,
  });

  return res.json({
    status: "processing",
    action: "archive",
    jobId,
    title,
    series,
    target: `${series}.${format.replace(/^\./, "")}`,
    message: "Series added to archive queue",
  });
};

// POST /api/video/:title/:series/extract
exports.extractArchive = (req, res) => {
  const { title, series } = req.params;
  const destination = req.body?.destination || req.query?.destination;
  const archiveName = req.body?.archive || req.query?.archive || series;
  const overwrite = parseBoolean(req.body?.overwrite ?? req.query?.overwrite, false);

  const archivePath = videoService.findArchiveFile(title, archiveName);
  if (!archivePath) {
    return res.status(404).json({
      status: "error",
      message: "Archive file not found",
    });
  }

  const jobId = Date.now().toString();
  videoQueue.push({
    jobId,
    action: "extract",
    title,
    series: archiveName,
    archiveName,
    destination,
    overwrite,
  });

  return res.json({
    status: "processing",
    action: "extract",
    jobId,
    title,
    archive: path.basename(archivePath),
    destination: (
      destination ||
      path.join(title, videoService.getArchiveBaseName(path.basename(archivePath)))
    )
      .split(path.sep)
      .join("/"),
    message: "Archive added to extract queue",
  });
};
