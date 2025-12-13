const fs = require("fs");
const path = require("path");
const videoService = require("../services/video.service");

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
